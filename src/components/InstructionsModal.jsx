import React, { useState } from 'react';

const InstructionsModal = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState('monitoreo');

    const sections = {
        monitoreo: '🗺️ Capas y Monitoreo',
        herramientas: '📐 Geocercas y Distancias',
        reportes: '📊 Análisis y Reportes',
        emergencia: '🚨 Protocolos y Datos',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 10000
        }}>
            <div style={{
                background: '#f8fafc', borderRadius: '14px', width: '92%', maxWidth: '880px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)', position: 'relative',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ background: '#0f172a', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>📖 Manual de Uso — SGCN v2.1</h2>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '2rem',
                        cursor: 'pointer',
                        lineHeight: 1,
                        opacity: 0.7,
                        transition: 'opacity 0.2s',
                        padding: '5px'
                    }} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.7}>×</button>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', background: '#1e293b', borderBottom: '2px solid #334155', flexWrap: 'wrap' }}>
                    {Object.entries(sections).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            style={{
                                padding: '10px 20px', background: 'none', border: 'none',
                                color: activeSection === key ? '#38bdf8' : '#94a3b8',
                                borderBottom: activeSection === key ? '2px solid #38bdf8' : '2px solid transparent',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeSection === key ? '700' : '400',
                                marginBottom: '-2px', transition: 'color 0.2s'
                            }}
                        >{label}</button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '25px' }}>

                    {/* --- 1. CAPAS Y MONITOREO --- */}
                    {activeSection === 'monitoreo' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                            {[
                                { icon: '⚡', color: '#dc2626', title: 'Sismos en Tiempo Real (USGS)', desc: 'Monitoreo automático permanente en Colombia. Muestra alerta inmediata indicando cuál es la sede Colmédica más cercana y a cuántos kilómetros del epicentro se encuentra.' },
                                { icon: '🚑', color: '#059669', title: 'Red de Apoyo Nacional (13 Ciudades)', desc: 'Visualiza hospitales, clínicas, estaciones de bomberos y CAI/Policía oficiales cercanos a todas las sedes de Colmédica a nivel nacional.' },
                                { icon: '👥', color: '#7c3aed', title: 'Personal Georreferenciado (Anónimo)', desc: 'Muestra la ubicación de los colaboradores cargados desde Excel mediante identificadores anónimos (ID-1, ID-2) protegiendo sus datos personales (PII).' },
                                { icon: '🔥', color: '#ea580c', title: 'Mapa de Calor', desc: 'Visualiza la concentración geográfica de colaboradores como una capa de intensidad térmica sobre el mapa.' },
                                { icon: '☁️', color: '#0ea5e9', title: 'Clima y Radar de Lluvias', desc: 'Consulta la temperatura, velocidad del viento y condición meteorológica actual en cada sede junto con el radar de precipitaciones.' },
                                { icon: '🚗', color: '#f97316', title: 'Tráfico en Vivo (Waze)', desc: 'Visor integrado para consultar congestiones, cierres viales y movilidad en tiempo real.' },
                                { icon: '📰', color: '#2563eb', title: 'Sala de Noticias (⚙️ Ajustes)', desc: 'Monitoreo de titulares clasificados en 6 categorías: Emergencias, Factores Sociales, Físico-Ambientales, Servicios Públicos, IT y Movilidad.' },
                                { icon: '🔍', color: '#334155', title: 'Búsqueda Universal y de Calles', desc: 'Use la lupa lateral para localizar sedes o colaboradores, o el buscador superior derecho del mapa para volar a cualquier ciudad o dirección.' },
                            ].map(item => (
                                <div key={item.title} style={{ background: 'white', borderRadius: '10px', padding: '15px', display: 'flex', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${item.color}` }}>
                                    <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{item.icon}</span>
                                    <div>
                                        <strong style={{ color: '#0f172a', fontSize: '0.93rem' }}>{item.title}</strong>
                                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- 2. GEOCERCAS Y DISTANCIAS --- */}
                    {activeSection === 'herramientas' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                { icon: '📍', color: '#7c3aed', title: 'Geocerca con Pines (Casco Convexo)', desc: 'Active el marcador en la barra derecha del mapa, coloque 3 o más pines alrededor del área de crisis y pulse "🔗 Conectar Pines y Crear Zona" para cerrar el polígono automáticamente.' },
                                { icon: '⬠', color: '#dc2626', title: 'Polígonos, Círculos y Rectángulos', desc: 'Dibuje una o múltiples zonas de impacto simultáneas en el mapa utilizando las herramientas de polígono libre, círculo o rectángulo.' },
                                { icon: '📏', color: '#0284c7', title: 'Tarjeta de Distancias y Regla de Rutas', desc: 'Al trazar una zona aparece abajo a la izquierda la tarjeta "📏 Distancia a Sedes" (toque cualquier sede para ver su línea punteada en km/m). También puede usar la herramienta de Línea (╱) para medir rutas calle por calle.' },
                                { icon: '📐', color: '#f59e0b', title: 'Radio de Sedes Cercanas Configurable', desc: 'En el panel "📝 Registro de Evento" puede ajustar el anillo naranja de sedes cercanas entre 500 m, 1 km, 2 km, 5 km o 10 km según la magnitud del evento.' },
                                { icon: '✏️', color: '#10b981', title: 'Edición y Borrado en 1 Clic', desc: 'Use el icono ✏️ para mover vértices en tiempo real y pulse "✅ Terminar Edición y Guardar". Para limpiar el mapa rápidamente, pulse "🗑️ Borrar Zona(s) del Mapa".' },
                                { icon: '🔄', color: '#6366f1', title: 'Compartir Escenario (.json)', desc: 'En la pestaña "💾 Datos" use "📤 Exportar Zona" y "📥 Cargar Zona" para compartir polígonos y escenarios de crisis con otros analistas.' },
                            ].map(item => (
                                <div key={item.title} style={{ background: 'white', borderRadius: '10px', padding: '16px', display: 'flex', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${item.color}` }}>
                                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{item.icon}</span>
                                    <div>
                                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{item.title}</strong>
                                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- 3. ANÁLISIS Y REPORTES --- */}
                    {activeSection === 'reportes' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                { icon: '📥', color: '#10b981', title: 'Reporte PDF Ejecutivo (Con o Sin Sedes en Polígono)', desc: 'Genera el documento PDF oficial con captura limpia del mapa, estadísticas, gráficas, tabla de sedes con distancia exacta al evento, colaboradores en riesgo (anonimizados) y red de apoyo cercana. Funciona también para bloqueos de movilidad alejados de las sedes.' },
                                { icon: '📊', color: '#2563eb', title: 'Panel Unificado de Análisis y Métricas', desc: 'Desde la pestaña "📊 Métricas" despliegue el panel inferior con: % de Continuidad Operativa, Impacto por Ciudad, Estado Sedes Bogotá (17), Criticidad, Distribución de Personal (Total vs. En Riesgo) y Eventos Registrados.' },
                                { icon: '💾', color: '#0f172a', title: 'Registro e Historial de Eventos', desc: 'Seleccione el tipo de evento, el nivel de alerta (Azul, Amarillo, Naranja o Rojo), agregue la descripción detallada y pulse "💾 Guardar Evento" para almacenarlo en el historial de la sesión.' },
                                { icon: '📋', color: '#7c3aed', title: 'Exportación CSV de Colaboradores en Riesgo', desc: 'Cuando existen colaboradores dentro de un polígono activo, el banner superior permite descargar en un clic el listado CSV anonimizado para cruce operativo.' },
                            ].map(item => (
                                <div key={item.title} style={{ background: 'white', borderRadius: '10px', padding: '16px', display: 'flex', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${item.color}` }}>
                                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{item.icon}</span>
                                    <div>
                                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{item.title}</strong>
                                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- 4. PROTOCOLOS Y DATOS --- */}
                    {activeSection === 'emergencia' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                <h3 style={{ color: '#dc2626', marginTop: 0, fontSize: '1rem' }}>🚨 Protocolo Rápido ante Sismo o Crisis</h3>
                                <ol style={{ paddingLeft: '20px', color: '#475569', fontSize: '0.85rem', lineHeight: 1.75, marginBottom: 0 }}>
                                    <li>Si ocurre un sismo en Colombia, aparecerá la <strong>alerta roja automática</strong> indicando la sede Colmédica más cercana.</li>
                                    <li>Pulse <strong>"📍 Activar Capa y Evaluar Afectación"</strong>: el sistema trazará automáticamente el círculo de impacto según la magnitud y llenará la descripción del evento.</li>
                                    <li>Para otros incidentes (bloqueos, incendios, orden público), trace la zona en el mapa y elija el <strong>Radio de Sedes Cercanas (500 m a 10 km)</strong>.</li>
                                    <li>Verifique las distancias en la tarjeta flotante <strong>📏 Distancia a Sedes</strong>.</li>
                                    <li>Pulse <strong>"📥 Generar Informe PDF"</strong> y <strong>"💾 Guardar Evento"</strong>.</li>
                                </ol>
                            </div>
                            <div style={{ background: 'white', padding: '18px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                <h3 style={{ color: '#7c3aed', marginTop: 0, fontSize: '1rem' }}>🔒 Gestión de Personal y Privacidad (PII)</h3>
                                <div style={{ marginBottom: '14px' }}>
                                    <strong style={{ color: '#334155', fontSize: '0.86rem' }}>📤 Carga y Anonimización Automática:</strong>
                                    <ol style={{ paddingLeft: '20px', color: '#475569', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '5px' }}>
                                        <li>Abra la pestaña <strong>💾 Datos → Cargar Personal</strong> y seleccione el archivo Excel.</li>
                                        <li>El sistema descarta nombres, cédulas, teléfonos, correos y direcciones, asignando un código por fila (<code>ID-1</code>, <code>Colaborador 1</code>).</li>
                                    </ol>
                                </div>
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                                    <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>🗑️ Limpieza de Sesión y Timeout (30 min):</strong>
                                    <p style={{ color: '#7f1d1d', fontSize: '0.81rem', margin: '5px 0 0 0', lineHeight: 1.5 }}>
                                        Al finalizar, pulse <strong>Limpiar Memoria</strong> y <strong>Borrar Historial</strong> en la pestaña Datos. Además, al cerrar la pestaña o tras 30 minutos de inactividad, toda la sesión se destruye automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 25px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: 'white' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#0f172a', color: 'white', border: 'none',
                            padding: '10px 28px', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: '600', fontSize: '0.9rem'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstructionsModal;
