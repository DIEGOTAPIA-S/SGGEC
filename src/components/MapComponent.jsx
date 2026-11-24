import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, ZoomControl } from 'react-leaflet'; // Added Polygon, useMap, ZoomControl
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { normalIcon, dangerIcon, warningIcon } from '../utils/mapIcons';
import MapDrawControl from './MapDrawControl';
import SearchControl from './SearchControl';

// Fix for default marker icon in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Internal component to handle programmatic map movements
const MapController = ({ focusLocation }) => {
    const map = useMap();
    useEffect(() => {
        if (focusLocation && focusLocation.coords) {
            map.flyTo(focusLocation.coords, focusLocation.zoom || 8, {
                animate: true,
                duration: 2
            });
        }
    }, [focusLocation, map]);
    return null;
};

// Guarda la posición y zoom del mapa en localStorage al moverse
// Al recargar, el mapa vuelve al último lugar visto por el usuario
const MapPositionSaver = () => {
    const map = useMap();
    useEffect(() => {
        const savePosition = () => {
            const center = map.getCenter();
            sessionStorage.setItem('map_lat', center.lat);
            sessionStorage.setItem('map_lng', center.lng);
            sessionStorage.setItem('map_zoom', map.getZoom());
        };
        map.on('moveend', savePosition);
        map.on('zoomend', savePosition);
        return () => {
            map.off('moveend', savePosition);
            map.off('zoomend', savePosition);
        };
    }, [map]);
    return null;
};

const MapComponent = ({ sedes, onAnalysisUpdate, children, focusLocation, bufferRadiusKm = 2, externalZoneTrigger = null }) => {
    const [analyzedSedes, setAnalyzedSedes] = useState([]);
    const [zones, setZones] = useState([]);
    const [programmaticPolygons, setProgrammaticPolygons] = useState([]);

    const handleZoneCreated = (geoJson, layer) => {
        const newZones = [...zones, geoJson];
        setZones(newZones);
        analyzeImpact(newZones, sedes, bufferRadiusKm);
    };

    const handleZoneDeleted = () => {
        setZones([]);
        setProgrammaticPolygons([]);
        setAnalyzedSedes(sedes.map(s => ({ ...s, status: 'normal' })));
        onAnalysisUpdate && onAnalysisUpdate([], [], []);
    };

    const analyzeImpact = (currentZones, currentSedes, radiusKm = bufferRadiusKm) => {
        if (!currentZones.length || !currentSedes) {
            setAnalyzedSedes(currentSedes ? currentSedes.map(s => ({ ...s, status: 'normal' })) : []);
            onAnalysisUpdate && onAnalysisUpdate([], [], []);
            return;
        }

        const affected = [];
        const nearby = [];

        const updatedSedes = currentSedes.map(sede => {
            const point = turf.point([sede.longitud, sede.latitud]);
            let status = 'normal';

            const isInside = currentZones.some(zone => {
                // Ensure we have a polygon
                if (zone.geometry.type !== 'Polygon') return false;
                return turf.booleanPointInPolygon(point, zone);
            });

            if (isInside) {
                status = 'affected';
                affected.push(sede);
            } else {
                // Configurable buffer check (0.5km, 1km, 2km, 5km, 10km)
                const isNearby = currentZones.some(zone => {
                    if (zone.geometry.type !== 'Polygon') return false;
                    const buffered = turf.buffer(zone, radiusKm, { units: 'kilometers' });
                    return turf.booleanPointInPolygon(point, buffered);
                });

                if (isNearby) {
                    status = 'nearby';
                    nearby.push(sede);
                }
            }
            return { ...sede, status };
        });

        setAnalyzedSedes(updatedSedes);
        onAnalysisUpdate && onAnalysisUpdate(affected, nearby, currentZones);
    };

    useEffect(() => {
        if (sedes && sedes.length > 0) {
            analyzeImpact(zones, sedes, bufferRadiusKm);
        }
    }, [sedes, bufferRadiusKm]);

    // Soporte para inyectar zonas automáticas (ej. Círculo de impacto por Sismo o Importación de Escenario .json)
    useEffect(() => {
        if (!externalZoneTrigger) return;
        if (externalZoneTrigger.type === 'clear') {
            handleZoneDeleted();
            return;
        }
        if (externalZoneTrigger.zones && Array.isArray(externalZoneTrigger.zones)) {
            const newZones = externalZoneTrigger.replace ? externalZoneTrigger.zones : [...zones, ...externalZoneTrigger.zones];
            setZones(newZones);
            const polyCoordsList = newZones
                .filter(z => z?.geometry?.type === 'Polygon')
                .map(z => ({
                    coords: z.geometry.coordinates[0].map(c => [c[1], c[0]]),
                    color: z.properties?.color || '#dc2626'
                }));
            setProgrammaticPolygons(polyCoordsList);
            analyzeImpact(newZones, sedes, bufferRadiusKm);
        }
    }, [externalZoneTrigger]);

    // Restaurar la última posición guardada en sessionStorage (o inicio por defecto: Bogotá)
    const savedLat = parseFloat(sessionStorage.getItem('map_lat')) || 4.6097;
    const savedLng = parseFloat(sessionStorage.getItem('map_lng')) || -74.0817;
    const savedZoom = parseInt(sessionStorage.getItem('map_zoom')) || 6;

    return (
        <div className="card" style={{ height: '100%', width: '100%', padding: 0, overflow: 'hidden', borderRadius: '0' }}>
            <MapContainer center={[savedLat, savedLng]} zoom={savedZoom} style={{ height: '100%', width: '100%' }} preferCanvas={true} zoomControl={false}>
                <ZoomControl position="topright" />
                <MapController focusLocation={focusLocation} />
                <MapPositionSaver />  {/* Guarda posicion automaticamente */}
                <SearchControl />
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    crossOrigin="anonymous"
                />
                {children}
                <MapDrawControl onCreated={handleZoneCreated} onDeleted={handleZoneDeleted} />

                {programmaticPolygons.map((poly, idx) => (
                    <Polygon
                        key={`prog-poly-${idx}`}
                        positions={poly.coords}
                        pathOptions={{ color: poly.color, fillColor: poly.color, fillOpacity: 0.2, weight: 2 }}
                    />
                ))}

                {(analyzedSedes.length > 0 ? analyzedSedes : sedes).map((sede) => (
                    <Marker
                        key={sede.id}
                        position={[sede.latitud, sede.longitud]}
                        zIndexOffset={1000}
                        icon={sede.status === 'affected' ? dangerIcon : (sede.status === 'nearby' ? warningIcon : normalIcon)}
                    >
                        <Popup>
                            <div style={{ minWidth: '200px' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>{sede.nombre}</h3>
                                <p style={{ margin: '0', fontSize: '0.9em', color: '#64748b' }}>{sede.direccion}</p>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    marginTop: '5px',
                                    color: 'white',
                                    background: sede.status === 'affected' ? '#ef4444' : (sede.status === 'nearby' ? '#f59e0b' : '#3b82f6')
                                }}>
                                    {sede.status === 'affected' ? '⚠️ Afectada' : (sede.status === 'nearby' ? '⚠️ Cercana (2km)' : '✅ Operativa')}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;
