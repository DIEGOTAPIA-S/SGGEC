import React from 'react';

/**
 * MetricsTab — Control unificado para desplegar el panel de Análisis de Impacto y Métricas.
 */
const MetricsTab = ({ showCharts, onToggleCharts }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h4 style={{ margin: '0 0 10px', color: '#64748b' }}>Métricas y Análisis</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <button onClick={onToggleCharts} className={`btn-layer ${showCharts ? 'active-blue' : ''}`}>
                <span style={{ fontSize: '1.6rem' }}>📊</span>
                <span>{showCharts ? 'Ocultar Análisis de Impacto y Métricas' : 'Ver Análisis de Impacto y Métricas'}</span>
            </button>
        </div>
        <p style={{ fontSize: '0.83rem', color: '#64748b', marginTop: '6px', textAlign: 'justify', lineHeight: 1.5 }}>
            Despliega en la parte inferior del mapa el panel ejecutivo unificado con:
            <br />• <strong>Impacto por Ciudad</strong> y <strong>Estado Sedes Bogotá</strong>.
            <br />• <strong>Criticidad</strong> y detalle de sedes impactadas.
            <br />• <strong>Distribución de Personal</strong> (Total vs. En Riesgo por Sede, Área y Modalidad).
            <br />• <strong>Resumen de Eventos Registrados</strong>.
        </p>
    </div>
);

export default MetricsTab;
