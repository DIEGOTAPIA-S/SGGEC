import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DashboardCharts = ({ sedes = [], affectedColaboradores = [], pdfMode = false }) => {
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

    const totalSedes = sedes.length;
    const directCount = sedes.filter(s => s.status === 'affected').length;
    const nearbyCount = sedes.filter(s => s.status === 'nearby').length;
    const colabCount = Array.isArray(affectedColaboradores) ? affectedColaboradores.length : 0;

    // 1. Datos para Gráfica de Barras: Impacto por Ciudad
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

    // 2. Datos para Gráfica Circular de Bogotá (Afectadas, Cercanas y No Afectadas)
    const bogotaSedes = sedes.filter(s =>
        s.ciudad && s.ciudad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('bogota')
    );
    const bogotaDirect = bogotaSedes.filter(s => s.status === 'affected').length;
    const bogotaNearby = bogotaSedes.filter(s => s.status === 'nearby').length;
    const bogotaNormal = bogotaSedes.length - bogotaDirect - bogotaNearby;

    const bogotaPieData = [
        { name: `Afectadas (${bogotaDirect})`, value: bogotaDirect, color: '#ef4444' },
        { name: `Cercanas (${bogotaNearby})`, value: bogotaNearby, color: '#f59e0b' },
        { name: `No Afectadas (${bogotaNormal})`, value: bogotaNormal, color: '#10b981' },
    ].filter(d => d.value > 0);

    // 3. Datos para Criticidad por Tipo de Impacto (Opción 1: Directa = Crítica, Cercana = Preventiva/Alta)
    const impactSeverityData = [
        { name: `Crítica - Directa (${directCount})`, value: directCount, color: '#dc2626' },
        { name: `Preventiva - Cercana (${nearbyCount})`, value: nearbyCount, color: '#f97316' },
    ].filter(d => d.value > 0);

    return (
        <div style={{ padding: '0' }}>
            {/* 4 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #1e40af' }}>
                    <h4 style={{ margin: '0', color: '#64748b', fontSize: '0.85rem' }}>Sedes Totales</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{totalSedes}</span>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                    <h4 style={{ margin: '0', color: '#ef4444', fontSize: '0.85rem' }}>Afectación Directa</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{directCount}</span>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                    <h4 style={{ margin: '0', color: '#f59e0b', fontSize: '0.85rem' }}>Sedes Cercanas</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{nearbyCount}</span>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center', borderLeft: '4px solid #7c3aed' }}>
                    <h4 style={{ margin: '0', color: '#7c3aed', fontSize: '0.85rem' }}>Colaboradores en Riesgo</h4>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{colabCount}</span>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>(En zona trazada)</div>
                </div>
            </div>

            {/* Charts Row */}
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

                {/* 3. Pie Chart: Criticidad (Opción 1: Directa vs Cercana) */}
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
        </div>
    );
};

export default DashboardCharts;
