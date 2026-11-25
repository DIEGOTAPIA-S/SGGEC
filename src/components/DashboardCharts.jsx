import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { getEventos } from '../services/eventoService';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d'];

const SectionTitle = ({ title }) => (
    <div style={{ marginBottom: '12px', marginTop: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
    </div>
);

const DashboardCharts = ({ sedes = [], colaboradores = [], affectedColaboradores = [], pdfMode = false }) => {
    const [eventos, setEventos] = useState([]);

    useEffect(() => {
        if (!pdfMode) {
            getEventos().then(ev => setEventos(ev || [])).catch(() => setEventos([]));
        }
    }, [pdfMode, sedes, affectedColaboradores]);

    const cardStyle = pdfMode ? {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '15px',
        boxSizing: 'border-box',
    } : {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    };

    // ── 1. Indicadores Principales (KPIs) ─────────────────────────────────────
    const totalSedes = sedes.length;
    const directCount = sedes.filter(s => s.status === 'affected').length;
    const nearbyCount = sedes.filter(s => s.status === 'nearby').length;
    const operativasCount = Math.max(0, totalSedes - directCount);
    const pctContinuidad = totalSedes > 0 ? Math.round((operativasCount / totalSedes) * 100) : 100;

    const colabRiskCount = Array.isArray(affectedColaboradores) ? affectedColaboradores.length : 0;
    const colabRiskPresencial = (affectedColaboradores || []).filter(c => c.modalidad !== 'Remoto').length;
    const colabRiskRemoto = (affectedColaboradores || []).filter(c => c.modalidad === 'Remoto').length;

    // ── 2. Gráficas de Impacto en Sedes ───────────────────────────────────────
    const cityMap = {};
    sedes.forEach(s => {
        if (!cityMap[s.ciudad]) cityMap[s.ciudad] = { name: s.ciudad, Total: 0, Directa: 0, Cercana: 0 };
        cityMap[s.ciudad].Total += 1;
        if (s.status === 'affected') {
            cityMap[s.ciudad].Directa += 1;
        } else if (s.status === 'nearby') {
            cityMap[s.ciudad].Cercana += 1;
        }
    });
    const cityData = Object.values(cityMap);

    // Estado Sedes Bogotá (Circular)
    const bogotaSedes = sedes.filter(s =>
        s.ciudad && s.ciudad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('bogota')
    );
    const bogotaDirect = bogotaSedes.filter(s => s.status === 'affected').length;
    const bogotaNearby = bogotaSedes.filter(s => s.status === 'nearby').length;
    const bogotaNormal = Math.max(0, bogotaSedes.length - bogotaDirect - bogotaNearby);

    const bogotaPieData = [
        { name: `Afectadas (${bogotaDirect})`, value: bogotaDirect, color: '#ef4444' },
        { name: `Cercanas (${bogotaNearby})`, value: bogotaNearby, color: '#f59e0b' },
        { name: `No Afectadas (${bogotaNormal})`, value: bogotaNormal, color: '#10b981' },
    ].filter(d => d.value > 0);

    // Criticidad Sedes Impactadas (Opción 1)
    const impactSeverityData = [
        { name: `Crítica - Directa (${directCount})`, value: directCount, color: '#dc2626' },
        { name: `Preventiva - Cercana (${nearbyCount})`, value: nearbyCount, color: '#f97316' },
    ].filter(d => d.value > 0);

    // ── 3. Distribución de Personal (Total vs. En Zona de Riesgo) ─────────────
    const totalCol = Array.isArray(colaboradores) ? colaboradores.length : 0;
    const affectedIds = new Set((affectedColaboradores || []).map(c => c.id));

    const porSedeColab = {};
    const porGerencia = {};
    const porModalidad = {};

    (colaboradores || []).forEach(c => {
        const isAff = affectedIds.has(c.id);

        const sName = (c.sede_nombre || 'Sin sede').replace('Colmédica ', '');
        if (!porSedeColab[sName]) porSedeColab[sName] = { name: sName, total: 0, afectados: 0 };
        porSedeColab[sName].total += 1;
        if (isAff) porSedeColab[sName].afectados += 1;

        const g = c.gerencia || c.area || 'General';
        if (!porGerencia[g]) porGerencia[g] = { name: g, total: 0, afectados: 0 };
        porGerencia[g].total += 1;
        if (isAff) porGerencia[g].afectados += 1;

        const mod = c.modalidad || 'Presencial';
        porModalidad[mod] = (porModalidad[mod] || 0) + 1;
    });

    const sedeColabData = Object.values(porSedeColab)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const gerenciaData = Object.values(porGerencia)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    const modalidadData = Object.entries(porModalidad)
        .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    // ── 4. Eventos Registrados ────────────────────────────────────────────────
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

    return (
        <div style={{ padding: '0' }}>
            {/* 4 Tarjetas Ejecutivas Superiores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #1e40af' }}>
                    <h4 style={{ margin: '0', color: '#64748b', fontSize: '0.85rem' }}>Sedes Totales</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{totalSedes}</span>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        {pctContinuidad}% Continuidad Operativa
                    </div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                    <h4 style={{ margin: '0', color: '#ef4444', fontSize: '0.85rem' }}>Afectación Directa</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{directCount}</span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Sedes dentro del polígono</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                    <h4 style={{ margin: '0', color: '#f59e0b', fontSize: '0.85rem' }}>Sedes Cercanas</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{nearbyCount}</span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>En anillo de monitoreo</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #7c3aed' }}>
                    <h4 style={{ margin: '0', color: '#7c3aed', fontSize: '0.85rem' }}>Colaboradores en Riesgo</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{colabRiskCount}</span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {colabRiskCount > 0 ? `Presencial: ${colabRiskPresencial} · Remoto: ${colabRiskRemoto}` : `De ${totalCol} cargados`}
                    </div>
                </div>
            </div>

            {/* BLOQUE 1: IMPACTO EN SEDES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '16px' }}>
                {/* 1. Bar Chart: Impacto por Ciudad */}
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Impacto por Ciudad</h3>
                    <div style={{ height: '280px' }}>
                        <ResponsiveContainer width={pdfMode ? 520 : '100%'} height={pdfMode ? 260 : '100%'}>
                            <BarChart data={cityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                                <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} />
                                <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '11px' }} />
                                <Bar dataKey="Total" fill="#94a3b8" name="Total Sedes" isAnimationActive={false} />
                                <Bar dataKey="Directa" fill="#ef4444" name="Afectadas" isAnimationActive={false} />
                                <Bar dataKey="Cercana" fill="#f59e0b" name="Cercanas" isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Pie Chart: Estado Sedes Bogotá */}
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        Estado Sedes Bogotá ({bogotaSedes.length})
                    </h3>
                    <div style={{ height: '280px' }}>
                        <ResponsiveContainer width={pdfMode ? 300 : '100%'} height={pdfMode ? 260 : '100%'}>
                            <PieChart>
                                <Pie
                                    data={bogotaPieData}
                                    cx="50%"
                                    cy="46%"
                                    innerRadius={48}
                                    outerRadius={76}
                                    paddingAngle={3}
                                    dataKey="value"
                                    isAnimationActive={false}
                                >
                                    {bogotaPieData.map((entry, index) => (
                                        <Cell key={`bog-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Pie Chart: Criticidad (Sedes Impactadas) */}
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        Criticidad (Sedes Impactadas)
                    </h3>
                    <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {impactSeverityData.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '0 15px' }}>
                                Ninguna sede en zona directa o cercana actualmente
                            </p>
                        ) : (
                            <ResponsiveContainer width={pdfMode ? 300 : '100%'} height={pdfMode ? 260 : '100%'}>
                                <PieChart>
                                    <Pie
                                        data={impactSeverityData}
                                        cx="50%"
                                        cy="46%"
                                        innerRadius={48}
                                        outerRadius={76}
                                        paddingAngle={4}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {impactSeverityData.map((entry, index) => (
                                            <Cell key={`crit-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* BLOQUE 2: DISTRIBUCIÓN DE PERSONAL (Solo en vista interactiva) */}
            {!pdfMode && (
                <>
                    <SectionTitle title="Distribución de Personal" />
                    {totalCol === 0 ? (
                        <div style={{ ...cardStyle, padding: '24px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                            <strong>Sin listado de colaboradores cargado.</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                                Cargue el archivo Excel desde la pestaña <strong>💾 Datos → Cargar Personal</strong> para visualizar la distribución por Sede, Gerencia/Área y Modalidad.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div style={cardStyle}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                                    Colaboradores por Sede Asignada
                                </h4>
                                <ResponsiveContainer width="100%" height={230}>
                                    <BarChart data={sedeColabData} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="total" name="Total" fill="#059669" radius={[0, 4, 4, 0]} />
                                        {colabRiskCount > 0 && <Bar dataKey="afectados" name="En Riesgo" fill="#dc2626" radius={[0, 4, 4, 0]} />}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={cardStyle}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                                    Colaboradores por Gerencia / Área
                                </h4>
                                <ResponsiveContainer width="100%" height={230}>
                                    <BarChart data={gerenciaData} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="total" name="Total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                                        {colabRiskCount > 0 && <Bar dataKey="afectados" name="En Riesgo" fill="#dc2626" radius={[0, 4, 4, 0]} />}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={cardStyle}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                                    Colaboradores por Modalidad
                                </h4>
                                <ResponsiveContainer width="100%" height={230}>
                                    <PieChart>
                                        <Pie
                                            data={modalidadData}
                                            cx="50%" cy="46%"
                                            innerRadius={42} outerRadius={72}
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

                    {/* BLOQUE 3: EVENTOS REGISTRADOS */}
                    {eventos.length > 0 && (
                        <>
                            <SectionTitle title={`Eventos Registrados (${eventos.length})`} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                                <div style={cardStyle}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>Por Tipo de Evento</h4>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={tipoData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                                                {tipoData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={cardStyle}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>Por Nivel de Alerta</h4>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={nivelData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                                                {nivelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardCharts;
