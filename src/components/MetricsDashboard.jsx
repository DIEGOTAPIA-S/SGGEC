import { useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { getEventos } from '../services/eventoService';
import { fetchColaboradores } from '../services/colaboradoresService';
import sedesData from '../data/sedes.json';
import apoyoData from '../data/apoyo.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d'];

const MetricCard = ({ icon, label, value, color = '#2563eb', subtext }) => (
    <div style={{
        background: 'white', borderRadius: '12px', padding: '18px',
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column', gap: '4px'
    }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span style={{ fontSize: '1.9rem', fontWeight: 800, color }}>{value}</span>
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{label}</span>
        {subtext && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{subtext}</span>}
    </div>
);

const SectionTitle = ({ title, subtitle }) => (
    <div style={{ marginBottom: '12px', marginTop: '28px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{subtitle}</p>}
    </div>
);

const MetricsDashboard = () => {
    const [eventos, setEventos] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [loading, setLoading] = useState(true);
    const dashboardRef = useRef(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ev, col] = await Promise.all([getEventos(), fetchColaboradores()]);
            setEventos(ev || []);
            setColaboradores(col || []);
        } catch (e) {
            console.error('Error cargando métricas de sesión:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ── 1. Métricas de Capacidad Instalada Nacional (Sedes y Red de Apoyo) ────
    const totalSedes = sedesData.length;
    const ciudadesSet = new Set(sedesData.map(s => s.ciudad));
    const totalCiudades = ciudadesSet.size;
    const totalApoyo = apoyoData.length;
    const totalHospitales = apoyoData.filter(a => a.tipo === 'hospital').length;
    const totalBomberos = apoyoData.filter(a => a.tipo === 'fire_station').length;
    const totalPolicia = apoyoData.filter(a => a.tipo === 'police').length;

    // Distribución de Sedes por Ciudad
    const sedesPorCiudadMap = {};
    sedesData.forEach(s => {
        const c = s.ciudad || 'Otra';
        sedesPorCiudadMap[c] = (sedesPorCiudadMap[c] || 0) + 1;
    });
    const sedesCiudadData = Object.entries(sedesPorCiudadMap)
        .map(([ciudad, sedes]) => ({ ciudad, sedes }))
        .sort((a, b) => b.sedes - a.sedes);

    // Distribución de Red de Apoyo por Tipo
    const apoyoTipoData = [
        { name: `Hospitales / Clínicas (${totalHospitales})`, value: totalHospitales, color: '#059669' },
        { name: `Policía / CAI (${totalPolicia})`, value: totalPolicia, color: '#2563eb' },
        { name: `Bomberos (${totalBomberos})`, value: totalBomberos, color: '#d97706' },
    ];

    // ── 2. Métricas de Colaboradores en Memoria Volátil (sessionStorage) ──────
    const totalCol = colaboradores.length;
    const geoReferenciados = colaboradores.filter(c => c.latitud && c.longitud).length;
    const pctGeo = totalCol ? Math.round((geoReferenciados / totalCol) * 100) : 0;

    const porGerencia = {};
    const porSedeColab = {};
    const porModalidad = {};

    colaboradores.forEach(c => {
        const g = c.gerencia || c.area || 'Sin clasificar';
        porGerencia[g] = (porGerencia[g] || 0) + 1;

        const sName = c.sede_nombre || 'Sin sede asignada';
        porSedeColab[sName] = (porSedeColab[sName] || 0) + 1;

        const mod = c.modalidad || 'Presencial';
        porModalidad[mod] = (porModalidad[mod] || 0) + 1;
    });

    const gerenciaData = Object.entries(porGerencia)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    const sedeColabData = Object.entries(porSedeColab)
        .map(([name, total]) => ({ name: name.replace('Colmédica ', ''), total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const modalidadData = Object.entries(porModalidad)
        .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    // ── 3. Métricas de Eventos Evaluados en la Sesión Actual ──────────────────
    const totalEventosSesion = eventos.length;
    const eventosRojo = eventos.filter(e => e.nivel_alerta === 'rojo').length;

    const eventosPorTipo = {};
    eventos.forEach(ev => {
        eventosPorTipo[ev.tipo] = (eventosPorTipo[ev.tipo] || 0) + 1;
    });
    const tipoData = Object.entries(eventosPorTipo)
        .map(([tipo, value], i) => ({ name: tipo, value, color: COLORS[i % COLORS.length] }))
        .sort((a, b) => b.value - a.value);

    const nivelData = [
        { name: 'Azul (Informativo)', value: eventos.filter(e => e.nivel_alerta === 'verde').length, color: '#3b82f6' },
        { name: 'Amarillo (Moderado)', value: eventos.filter(e => e.nivel_alerta === 'amarillo').length, color: '#eab308' },
        { name: 'Naranja (Alto)', value: eventos.filter(e => e.nivel_alerta === 'naranja').length, color: '#f97316' },
        { name: 'Rojo (Crítico)', value: eventos.filter(e => e.nivel_alerta === 'rojo').length, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // ── 4. Exportar PDF Ejecutivo de la Sesión ────────────────────────────────
    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Encabezado
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('SGCN — Dashboard Ejecutivo de Continuidad (Sesión Activa)', 14, 12);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Modo Local Portable (100% Memoria Volátil sessionStorage · PII Anonimizado)', 14, 18);
        doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 23);

        let y = 36;

        // KPIs
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Indicadores de Capacidad Instalada y Sesión Actual', 14, y);
        y += 5;

        const kpis = [
            ['Sedes Corporativas Colmédica', `${totalSedes} sedes en ${totalCiudades} ciudades`],
            ['Red de Apoyo Oficial Local (Offline)', `${totalApoyo} entidades (Salud: ${totalHospitales}, Policía: ${totalPolicia}, Bomberos: ${totalBomberos})`],
            ['Colaboradores Cargados en Memoria (Sesión)', `${totalCol} (${pctGeo}% georreferenciados)`],
            ['Eventos Evaluados en la Sesión Actual', `${totalEventosSesion} (Nivel Rojo Crítico: ${eventosRojo})`],
        ];

        autoTable(doc, {
            startY: y,
            head: [['Indicador', 'Valor / Estado en Sesión']],
            body: kpis,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;

        // Sedes por Ciudad
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. Cobertura de Sedes Corporativas por Ciudad', 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Ciudad', 'Cantidad de Sedes Activas']],
            body: sedesCiudadData.map(d => [d.ciudad, d.sedes]),
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;

        // Colaboradores por Sede / Gerencia (si se cargó Excel en la sesión)
        if (totalCol > 0) {
            if (y > 220) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('3. Distribución de Colaboradores en Memoria (Anonimizado)', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Sede Asignada (Top 10)', 'Colaboradores']],
                body: sedeColabData.map(d => [`Colmédica ${d.name}`, d.total]),
                theme: 'striped',
                headStyles: { fillColor: [5, 150, 105] },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 10;
        }

        // Eventos registrados en la sesión
        if (eventos.length > 0) {
            if (y > 220) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('4. Eventos Registrados en la Sesión Activa', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Hora', 'Tipo', 'Nivel Alerta', 'Sedes Impactadas', 'Descripción']],
                body: eventos.map(e => [
                    new Date(e.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                    e.tipo,
                    (e.nivel_alerta || 'verde').toUpperCase(),
                    e.sedes_afectadas?.length || 0,
                    (e.descripcion || '').substring(0, 90)
                ]),
                theme: 'striped',
                headStyles: { fillColor: [124, 58, 237] },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
        }

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} — SGCN v2.1 Portable (Memoria Volátil)`, 105, 290, { align: 'center' });
        }

        doc.save(`SGCN_Metricas_Sesion_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            📊 Calculando métricas de la sesión activa...
        </div>
    );

    return (
        <div ref={dashboardRef} style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>

            {/* Header con explicación clara de volatilidad */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                        📊 Dashboard Ejecutivo — Cobertura Nacional y Sesión Activa
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
                        🔒 <strong>Modo Local Volátil (<code>sessionStorage</code>):</strong> Refleja la capacidad instalada nacional y los datos cargados en la sesión actual (se destruyen al cerrar la pestaña).
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={loadData} style={{
                        padding: '7px 14px', fontSize: '0.8rem',
                        background: '#f1f5f9', color: '#334155',
                        border: '1px solid #cbd5e1', borderRadius: '20px', cursor: 'pointer',
                        fontWeight: 600
                    }}>
                        🔄 Actualizar Datos
                    </button>
                    <button onClick={exportPDF} style={{
                        padding: '7px 16px', fontSize: '0.82rem',
                        background: '#2563eb', color: 'white',
                        border: 'none', borderRadius: '20px', cursor: 'pointer',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                        ⬇️ Descargar PDF de Métricas
                    </button>
                </div>
            </div>

            {/* KPI Cards Coherentes con la Versión Portable */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '14px', marginBottom: '8px' }}>
                <MetricCard icon="🏢" label="Sedes Colmédica Activas" value={totalSedes} color="#2563eb" subtext={`Cobertura en ${totalCiudades} ciudades`} />
                <MetricCard icon="🚑" label="Red de Apoyo Oficial Local" value={totalApoyo} color="#059669" subtext={`${totalHospitales} Salud · ${totalPolicia} Policía · ${totalBomberos} Bomberos`} />
                <MetricCard icon="👥" label="Personal en Memoria (Sesión)" value={totalCol} color="#7c3aed" subtext={totalCol > 0 ? `${pctGeo}% georreferenciados (PII Anónimo)` : 'Cargue Excel en pestaña Datos'} />
                <MetricCard icon="📝" label="Eventos Guardados en Sesión" value={totalEventosSesion} color="#d97706" subtext="Temporales durante esta sesión" />
                <MetricCard icon="🔴" label="Eventos Críticos (Nivel Rojo)" value={eventosRojo} color="#dc2626" subtext="Registrados en la sesión activa" />
            </div>

            {/* SECCIÓN 1: CAPACIDAD INSTALADA NACIONAL (Siempre tiene datos reales) */}
            <SectionTitle
                title="1. Capacidad Instalada y Red de Apoyo Local por Ciudad"
                subtitle="Datos oficiales embebidos localmente en el ejecutable (100% disponibles sin conexión a bases de datos externas)"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Sedes Corporativas Colmédica por Ciudad</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={sedesCiudadData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ciudad" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={45} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="sedes" name="Sedes Colmédica" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Composición Red de Apoyo ({totalApoyo} entidades)</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={apoyoTipoData}
                                cx="50%" cy="48%"
                                innerRadius={42} outerRadius={70}
                                dataKey="value"
                                isAnimationActive={false}
                            >
                                {apoyoTipoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECCIÓN 2: DISTRIBUCIÓN DEL PERSONAL CARGADO EN LA SESIÓN ACTUAL */}
            <SectionTitle
                title="2. Distribución del Personal Cargado en Memoria (Sesión Actual)"
                subtitle="Datos procesados localmente en RAM (sessionStorage) con anonimización estricta de PII"
            />
            {totalCol === 0 ? (
                <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📤</div>
                    <strong>No se ha cargado archivo Excel de colaboradores en esta sesión.</strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Cuando cargue el archivo Excel desde la pestaña <strong>💾 Datos → Cargar Personal</strong>, aquí verá automáticamente la distribución por Sede Asignada, Gerencia/Área y Modalidad (Presencial vs. Remoto).
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Top Sedes por Colaboradores Asignados</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={sedeColabData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="total" name="Colaboradores" fill="#059669" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Colaboradores por Gerencia / Área (Top 8)</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={gerenciaData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="total" name="Colaboradores" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Colaboradores por Modalidad</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={modalidadData}
                                    cx="50%" cy="48%"
                                    innerRadius={40} outerRadius={70}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    fontSize={10}
                                >
                                    {modalidadData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* SECCIÓN 3: EVENTOS EVALUADOS EN LA SESIÓN ACTUAL */}
            <SectionTitle
                title="3. Eventos Registrados durante la Sesión Activa"
                subtitle="Escenarios guardados temporalmente con el botón '💾 Guardar Evento' durante esta sesión de trabajo"
            />
            {totalEventosSesion === 0 ? (
                <div style={{ background: 'white', borderRadius: '12px', padding: '28px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', marginBottom: '24px' }}>
                    <strong>Aún no ha guardado eventos en esta sesión.</strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Cuando registre uno o varios incidentes/simulacros con el botón <strong>💾 Guardar Evento</strong>, aquí se graficará la distribución por Tipo de Evento y Nivel de Alerta de la sesión.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Eventos de la Sesión por Tipo</h4>
                        <ResponsiveContainer width="100%" height={190}>
                            <PieChart>
                                <Pie data={tipoData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                                    {tipoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Eventos de la Sesión por Nivel de Alerta</h4>
                        <ResponsiveContainer width="100%" height={190}>
                            <PieChart>
                                <Pie data={nivelData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                                    {nivelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricsDashboard;
