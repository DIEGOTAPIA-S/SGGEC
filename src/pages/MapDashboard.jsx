import { useState, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import Sidebar from '../components/Sidebar';
import DashboardCharts from '../components/DashboardCharts';
import MetricsDashboard from '../components/MetricsDashboard';
import EventHistoryModal from '../components/EventHistoryModal';
import SedeListModal from '../components/SedeListModal';
import AffectedListTable from '../components/AffectedListTable';
import InstructionsModal from '../components/InstructionsModal';
import EventRegistrationPanel from '../components/EventRegistrationPanel';
import InfrastructureLayer from '../components/InfrastructureLayer';
import ColaboradoresLayer from '../components/ColaboradoresLayer';
import HeatmapLayer from '../components/HeatmapLayer';
import WeatherLayer from '../components/WeatherLayer';
import EarthquakeLayer from '../components/EarthquakeLayer';
import NewsFeed from '../components/NewsFeed';

// Componentes y Hooks refactorizados
import DashboardHeader from '../components/DashboardHeader';
import RiskAlertBanner from '../components/RiskAlertBanner';
import SideDrawer from '../components/SideDrawer';
import GlassCard from '../components/GlassCard';
import useMapLayers from '../hooks/useMapLayers';
import useAnalysis from '../hooks/useAnalysis';
import useReporting from '../hooks/useReporting';

import { createEvento } from '../services/eventoService';
import useIdleTimer from '../hooks/useIdleTimer';
import sedesData from '../data/sedes.json';

const MapDashboard = () => {
    const { user, logout } = useAuth();
    const [sedes, setSedes] = useState([]);
    const [filteredSedes, setFilteredSedes] = useState([]);
    const [colaboradores, setColaboradores] = useState(() => {
        try {
            const cached = sessionStorage.getItem('sgcn_colaboradores');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [loadingColaboradores, setLoadingColaboradores] = useState(false);
    
    // Hooks de Lógica Extraída
    const layers = useMapLayers();
    const analysis = useAnalysis(sedes, colaboradores);
    
    const [infrastructurePoints, setInfrastructurePoints] = useState([]);
    const [earthquakeAlerts, setEarthquakeAlerts] = useState([]);
    const [emergencyAlert, setEmergencyAlert] = useState(null);
    const [focusLocation, setFocusLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [bufferRadiusKm, setBufferRadiusKm] = useState(2);
    const [externalZoneTrigger, setExternalZoneTrigger] = useState(null);

    // Estado de Eventos (Se mantiene aquí por ser el dueño del formulario)
    const [eventDetails, setEventDetails] = useState({
        description: '',
        type: 'Servicios Públicos',
        nivel_alerta: 'verde',
    });

    const reporting = useReporting(user, analysis.affectedSedes, analysis.nearbySedes, analysis.affectedColaboradores, eventDetails, infrastructurePoints, analysis.zones, sedes);

    // Timer de inactividad
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const [idleCountdown, setIdleCountdown] = useState(120);

    useIdleTimer({
        onWarning: useCallback(() => {
            setShowIdleWarning(true);
            setIdleCountdown(120);
        }, []),
        onLogout: useCallback(() => {
            setShowIdleWarning(false);
            logout();
        }, [logout]),
        idleMinutes: 28,
        warningMinutes: 2,
    });

    useEffect(() => {
        if (!showIdleWarning) return;
        if (idleCountdown <= 0) { logout(); return; }
        const t = setTimeout(() => setIdleCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [showIdleWarning, idleCountdown, logout]);

    const [showCharts, setShowCharts] = useState(false);
    const [showMetricsPanel, setShowMetricsPanel] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showList, setShowList] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Carga de inicial de Sedes estática local
    useEffect(() => {
        setSedes(sedesData);
        setFilteredSedes(sedesData);
    }, []);

    const handleFilter = (criteria) => {
        let result = [...sedes];
        if (criteria.search) {
            const term = criteria.search.toLowerCase();
            result = result.filter(s =>
                s.nombre.toLowerCase().includes(term) ||
                s.ciudad.toLowerCase().includes(term) ||
                (s.procesos && s.procesos.some(p => p.nombre.toLowerCase().includes(term)))
            );
        }
        if (criteria.criticality) {
            result = result.filter(s => s.procesos && s.procesos.some(p => p.criticidad === criteria.criticality));
        }
        if (criteria.minRto !== null) {
            result = result.filter(s => s.procesos && s.procesos.some(p => p.rto >= criteria.minRto));
        }
        if (criteria.maxRto !== null) {
            result = result.filter(s => s.procesos && s.procesos.some(p => p.rto <= criteria.maxRto));
        }
        setFilteredSedes(result);
    };

    const handleAnalysisUpdate = analysis.handleAnalysisUpdate;

    const handleSaveEvent = async () => {
        if (!eventDetails.description) {
            alert("Por favor ingrese una descripción del evento.");
            return;
        }
        try {
            const eventoData = {
                tipo: eventDetails.type,
                descripcion: eventDetails.description,
                nivel_alerta: eventDetails.nivel_alerta || 'verde',
                geometria: JSON.stringify(analysis.zones),
                sedes_afectadas_ids: [...analysis.affectedSedes, ...analysis.nearbySedes].map(s => s.id)
            };
            await createEvento(eventoData);
            alert("Evento registrado exitosamente.");
            setEventDetails(prev => ({ ...prev, description: '', nivel_alerta: 'verde' }));
        } catch (error) {
            alert("Error guardando evento.");
            console.error(error);
        }
    };

    const sedesWithStatus = filteredSedes.map(s => {
        const isAffected = analysis.affectedSedes.some(a => a.id === s.id);
        const isNearby = analysis.nearbySedes.some(n => n.id === s.id);
        return { ...s, status: isAffected ? 'affected' : (isNearby ? 'nearby' : 'normal') };
    });

    const handleLocate = (item) => {
        if (item?.latitud && item?.longitud) {
            setFocusLocation({ coords: [item.latitud, item.longitud], zoom: 18 });
        }
    };

    // Exportar escenario (polígonos + descripción + radio) a un archivo .json local
    const handleExportScenario = () => {
        if (!analysis.zones || analysis.zones.length === 0) {
            alert("Dibuje primero al menos una zona o polígono en el mapa para exportar el escenario.");
            return;
        }
        const scenarioData = {
            version: '2.1',
            exportedAt: new Date().toISOString(),
            exportedBy: user?.name || 'Analista SGCN',
            eventDetails,
            bufferRadiusKm,
            zones: analysis.zones
        };
        const blob = new Blob([JSON.stringify(scenarioData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Escenario_SGCN_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Importar escenario (.json) enviado por otro analista
    const handleImportScenario = (file) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed.zones || !Array.isArray(parsed.zones) || parsed.zones.length === 0) {
                    alert("❌ El archivo JSON no contiene zonas geográficas válidas.");
                    return;
                }
                if (parsed.eventDetails) setEventDetails(parsed.eventDetails);
                if (parsed.bufferRadiusKm) setBufferRadiusKm(parsed.bufferRadiusKm);
                setExternalZoneTrigger({ zones: parsed.zones, replace: true, timestamp: Date.now() });

                // Volar al centroide de la primera zona importada
                const centerPt = turf.centroid(parsed.zones[0]);
                const [lon, lat] = centerPt.geometry.coordinates;
                setFocusLocation({ coords: [lat, lon], zoom: 13, timestamp: Date.now() });
                alert(`✅ Escenario cargado exitosamente (${parsed.zones.length} zona(s)).`);
            } catch (err) {
                alert("❌ Error al leer el archivo de escenario: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-screen flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
            {/* Banner de inactividad */}
            {showIdleWarning && (
                <div className="fixed top-0 left-0 right-0 z-[10000] bg-crisis text-white p-3 flex justify-between items-center shadow-2xl animate-pulse">
                    <span className="font-bold flex items-center gap-2">⚠️ <span className="hidden sm:inline">Tu sesión cerrará pronto:</span> {Math.floor(idleCountdown / 60)}:{String(idleCountdown % 60).padStart(2, '0')}</span>
                    <button onClick={() => { setShowIdleWarning(false); setIdleCountdown(120); }} className="bg-white text-crisis px-6 py-1.5 rounded-xl font-black text-xs uppercase tracking-tighter">Seguir Trabajando</button>
                </div>
            )}

            <DashboardHeader user={user} logout={logout} />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar Glass */}
                <Sidebar
                    className="glass-panel border-none"
                    zones={analysis.zones}
                    bufferRadiusKm={bufferRadiusKm}
                    affectedSedes={analysis.affectedSedes}
                    affectedColaboradores={analysis.affectedColaboradores}
                    nearbySedes={analysis.nearbySedes}
                    onSave={handleSaveEvent}
                    onGenerateReport={() => reporting.handleGenerateReport({ includeColaboradoresList: true, bufferRadiusKm }, sedesWithStatus)}
                    onExportScenario={handleExportScenario}
                    onImportScenario={handleImportScenario}
                    onShowList={() => setShowList(true)}
                    onShowHistory={() => setShowHistory(true)}
                    onToggleCharts={() => setShowCharts(!showCharts)}
                    showCharts={showCharts}
                    onToggleMetrics={() => setShowMetricsPanel(!showMetricsPanel)}
                    showMetricsPanel={showMetricsPanel}
                    
                    onToggleEarthquakes={layers.toggleEarthquakes}
                    showEarthquakes={layers.showEarthquakes}
                    onToggleWeather={layers.toggleWeather}
                    showWeather={layers.showWeather}
                    onToggleTraffic={layers.toggleTraffic}
                    showTraffic={layers.showTraffic}
                    onToggleInfrastructure={layers.toggleInfrastructure}
                    showInfrastructure={layers.showInfrastructure}
                    onToggleColaboradores={layers.toggleColaboradores}
                    showColaboradores={layers.showColaboradores}
                    onToggleHeatmap={layers.toggleHeatmap}
                    showHeatmap={layers.showHeatmap}
                    onToggleNews={layers.toggleNews}
                    showNews={layers.showNews}

                    onSimulateAlert={() => setEmergencyAlert({ id: 'sim-' + Date.now(), mag: 6.2, place: "SIMULACRO: Mesa de los Santos, Santander", localTime: new Date().toLocaleString('es-CO'), closestSedeName: "Colmédica Bucaramanga", closestSedeCity: "Bucaramanga", closestSedeDistKm: 34, isNearColmedicaCity: true, coordinates: [-73.12, 6.79] })}
                    onShowHelp={() => setShowHelp(true)}
                    onSearchColaborador={setSearchTerm}
                    colaboradores={colaboradores}
                    sedes={sedes}
                    earthquakeAlerts={earthquakeAlerts}
                    onLocate={handleLocate}
                    onColaboradoresLoaded={(data) => {
                        setColaboradores(data);
                        sessionStorage.setItem('sgcn_colaboradores', JSON.stringify(data));
                        layers.setShowColaboradores(true);
                        const firstValid = data.find(c => c.latitud && c.longitud);
                        if (firstValid) {
                            setFocusLocation({ coords: [firstValid.latitud, firstValid.longitud], zoom: 6, timestamp: Date.now() });
                        }
                    }}
                    onClearColaboradores={() => {
                        setColaboradores([]);
                        sessionStorage.removeItem('sgcn_colaboradores');
                    }}
                />

                <main className="flex-1 overflow-y-auto relative bg-slate-50 custom-scrollbar">
                    {layers.showNews && <NewsFeed isOpen={true} onClose={layers.toggleNews} />}

                    <div id="map-capture" className="h-[65vh] min-h-[500px] relative shadow-2xl overflow-hidden border-b border-white/5">
                        <MapComponent
                            sedes={filteredSedes}
                            onAnalysisUpdate={handleAnalysisUpdate}
                            focusLocation={focusLocation}
                            bufferRadiusKm={bufferRadiusKm}
                            externalZoneTrigger={externalZoneTrigger}
                        >
                            <EarthquakeLayer
                                visible={layers.showEarthquakes}
                                sedes={sedes}
                                onAlertsUpdate={setEarthquakeAlerts}
                                onRealEarthquakeAlert={(quakeAlert) => {
                                    setEmergencyAlert(prev => prev || quakeAlert);
                                }}
                            />
                            <WeatherLayer visible={layers.showWeather} sedes={sedes} />
                            <InfrastructureLayer visible={layers.showInfrastructure} onUpdate={setInfrastructurePoints} />
                            <ColaboradoresLayer visible={layers.showColaboradores} colaboradores={colaboradores} />
                            <HeatmapLayer visible={layers.showHeatmap} points={colaboradores} />
                        </MapComponent>

                        {loadingColaboradores && (
                            <div className="absolute inset-0 z-[5000] bg-slate-950/30 backdrop-blur-[4px] flex items-center justify-center">
                                <div className="glass-panel p-6 rounded-3xl shadow-2xl flex items-center gap-4 font-black text-white tracking-wider">
                                    <span className="animate-spin text-3xl">⏳</span> CARGANDO PERSONAL...
                                </div>
                            </div>
                        )}

                        {layers.showTraffic && (
                            <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col animate-in fade-in duration-500">
                                <button 
                                    onClick={layers.toggleTraffic} 
                                    className="absolute top-4 right-4 z-[2001] w-8 h-8 flex items-center justify-center bg-white/90 text-slate-900 rounded-full shadow-lg hover:bg-white transition-colors font-bold text-xl border border-slate-200"
                                    title="Cerrar Mapa de Tráfico"
                                >
                                    &times;
                                </button>
                                <iframe 
                                    src="https://embed.waze.com/iframe?zoom=12&lat=4.711&lon=-74.072&ct=livemap" 
                                    className="flex-1 border-none w-full h-full" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>

                    <RiskAlertBanner 
                        affectedSedes={analysis.affectedSedes} 
                        nearbySedes={analysis.nearbySedes} 
                        affectedColaboradores={analysis.affectedColaboradores}
                        zones={analysis.zones}
                        bufferRadiusKm={bufferRadiusKm}
                        onGenerateReport={() => reporting.handleGenerateReport({ includeColaboradoresList: true, bufferRadiusKm }, sedesWithStatus)}
                    />

                    <div className="p-8">
                        {/* Event Registration (Could also be a Drawer, but keeping here for context) */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
                             <EventRegistrationPanel 
                                eventDetails={eventDetails} 
                                onChange={(e) => setEventDetails(prev => ({...prev, [e.target.name]: e.target.value}))} 
                                onSave={handleSaveEvent}
                                onGenerateReport={() => reporting.handleGenerateReport({ includeColaboradoresList: true, bufferRadiusKm }, sedesWithStatus)}
                                bufferRadiusKm={bufferRadiusKm}
                                onBufferRadiusChange={setBufferRadiusKm}
                            />
                        </div>

                        {showCharts && (
                            <div className="animate-in fade-in slide-in-from-bottom duration-1000">
                                <GlassCard title="Análisis de Impacto y Métricas de Continuidad" icon="📊" className="mb-8" light={true}>
                                    <div id="charts-capture">
                                        <DashboardCharts
                                            sedes={sedesWithStatus}
                                            colaboradores={colaboradores}
                                            affectedColaboradores={analysis.affectedColaboradores}
                                        />
                                    </div>
                                </GlassCard>
                                <GlassCard title="Sedes en Punto de Control" icon="🏢" light={true}>
                                    <AffectedListTable affectedSedes={analysis.affectedSedes} nearbySedes={analysis.nearbySedes} />
                                </GlassCard>
                            </div>
                        )}
                    </div>

                    {/* Captura Fantasma para PDF */}
                    <div id="charts-capture-hidden" className="absolute -top-[10000px] left-0 w-[1200px] h-[800px] z-[-1000] bg-white text-slate-900">
                        <DashboardCharts sedes={sedesWithStatus} affectedColaboradores={analysis.affectedColaboradores} pdfMode={true} />
                    </div>
                </main>
            </div>

            {/* Side Drawers (Replaces Modals) */}
            <SideDrawer 
                isOpen={showHistory} 
                onClose={() => setShowHistory(false)} 
                title="Historial de Eventos" 
                width="w-[500px]"
            >
                <EventHistoryModal isInsideDrawer onClose={() => setShowHistory(false)} />
            </SideDrawer>

            {showList && (
                <SedeListModal sedes={sedesWithStatus} onClose={() => setShowList(false)} />
            )}

            {showHelp && <InstructionsModal onClose={() => setShowHelp(false)} />}

            {/* Alerta de Emergencia Sísmica Automática */}
            {emergencyAlert && (
                <div className="fixed bottom-8 right-8 glass-panel border-l-8 border-crisis p-6 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(239,68,68,0.5)] z-[10000] max-w-md animate-in zoom-in slide-in-from-right duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-crisis/10 blur-3xl rounded-full -mr-16 -mt-16" />
                    <div className="flex justify-between items-start mb-4 relative">
                        <div>
                            <h2 className="text-crisis font-black text-xl tracking-tighter flex items-center gap-2">
                                🚨 SISMO DETECTADO EN COLOMBIA
                            </h2>
                            {emergencyAlert.localTime && (
                                <p className="text-xs text-slate-300 mt-0.5">🕒 {emergencyAlert.localTime} {emergencyAlert.depth ? `• Prof: ${emergencyAlert.depth} km` : ''}</p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (emergencyAlert.id) {
                                    const seen = JSON.parse(sessionStorage.getItem('sgcn_seen_quakes') || '[]');
                                    if (!seen.includes(emergencyAlert.id)) {
                                        sessionStorage.setItem('sgcn_seen_quakes', JSON.stringify([...seen, emergencyAlert.id]));
                                    }
                                }
                                setEmergencyAlert(null);
                            }}
                            className="text-3xl leading-none text-white/40 hover:text-white ml-3"
                            title="Descartar alerta"
                        >
                            ×
                        </button>
                    </div>
                    <div className="bg-crisis/20 p-4 rounded-2xl mb-4 border border-crisis/30 relative">
                        <p className="font-black text-white text-2xl mb-1 tracking-tight">Magnitud {emergencyAlert.mag}</p>
                        <p className="text-crisis-200 text-xs font-semibold uppercase tracking-wider">{emergencyAlert.place}</p>
                        {emergencyAlert.closestSedeName && (
                            <div className={`mt-3 p-2.5 rounded-xl text-xs font-bold border ${emergencyAlert.isNearColmedicaCity ? 'bg-red-950/80 border-red-400 text-red-200' : 'bg-slate-900/70 border-white/10 text-slate-200'}`}>
                                🏢 Sede Colmédica más cercana:<br />
                                <span className="text-white text-sm">{emergencyAlert.closestSedeName}</span> ({emergencyAlert.closestSedeCity}) a <strong>{emergencyAlert.closestSedeDistKm} km</strong> del epicentro
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (emergencyAlert.id) {
                                const seen = JSON.parse(sessionStorage.getItem('sgcn_seen_quakes') || '[]');
                                if (!seen.includes(emergencyAlert.id)) {
                                    sessionStorage.setItem('sgcn_seen_quakes', JSON.stringify([...seen, emergencyAlert.id]));
                                }
                            }
                            layers.setShowEarthquakes(true);
                            const eqLon = emergencyAlert.coordinates[0];
                            const eqLat = emergencyAlert.coordinates[1];
                            // Calcular radio de impacto sísmico automático según magnitud (ej. Mag 4.0 -> 15km, Mag 5.0 -> 35km, Mag 6.0+ -> 60km)
                            const mag = parseFloat(emergencyAlert.mag) || 4.0;
                            const autoRadiusKm = mag >= 6.0 ? 60 : (mag >= 5.0 ? 35 : (mag >= 4.0 ? 20 : 12));
                            const quakeCircle = turf.circle([eqLon, eqLat], autoRadiusKm, { units: 'kilometers', steps: 64 });
                            quakeCircle.properties = { source: 'earthquake-auto', color: '#dc2626' };

                            setExternalZoneTrigger({ zones: [quakeCircle], replace: true, timestamp: Date.now() });
                            setEventDetails({
                                type: 'Físico Ambiental',
                                nivel_alerta: mag >= 5.0 ? 'rojo' : (mag >= 4.0 ? 'naranja' : 'amarillo'),
                                description: `EVALUACIÓN AUTOMÁTICA DE SISMO (USGS): Magnitud ${emergencyAlert.mag} registrado en ${emergencyAlert.place} (${emergencyAlert.localTime || 'Reciente'}). Se traza automáticamente geocerca de evaluación sísmica con radio de ${autoRadiusKm} km alrededor del epicentro.${emergencyAlert.closestSedeName ? ` Sede Colmédica más próxima: ${emergencyAlert.closestSedeName} (${emergencyAlert.closestSedeCity}) a ${emergencyAlert.closestSedeDistKm} km.` : ''}`
                            });
                            setFocusLocation({ coords: [eqLat, eqLon], zoom: 9, timestamp: Date.now() });
                            setEmergencyAlert(null);
                        }}
                        className="w-full bg-crisis hover:bg-red-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-crisis/40 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    >
                        📍 Activar Capa y Evaluar Afectación
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapDashboard;
