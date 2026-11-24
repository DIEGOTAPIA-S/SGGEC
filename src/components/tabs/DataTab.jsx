import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deleteEventos } from '../../services/eventoService';
import { read, utils } from 'xlsx';

/**
 * DataTab — Gestión de datos local (100% en memoria) para versión portable.
 */
const DataTab = ({
    sedes = [],
    zones = [],
    onColaboradoresLoaded,
    onClearColaboradores,
    affectedSedes,
    nearbySedes,
    affectedColaboradores,
    onShowHistory,
    onSave,
    onGenerateReport,
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json(worksheet);

                // Chequeo de columnas requeridas
                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    const requiredCols = ['Identificacion', 'Nombres', 'Apellidos'];
                    const missing = requiredCols.filter(col => !(col in firstRow));
                    
                    if (missing.length > 0) {
                        alert(`❌ Error: El archivo Excel debe contener las columnas: ${missing.join(', ')}`);
                        setUploading(false);
                        return;
                    }
                }

                // Normalización de datos en memoria local (comportamiento idéntico al Backend)
                const parsedColaboradores = jsonData.map((row, idx) => {
                    const id = row['Identificación'] || row['Identificacion'] || row['ID'];
                    
                    if (!id) return null;

                    // idx es el índice de la fila en el Excel (0, 1, 2...). Sumamos 1 para que empiece en 1.
                    const numeroFila = idx + 1;

                    const col = {
                        id: numeroFila,
                        identificacion: `ID-${numeroFila}`,
                        nombres: `Colaborador`,
                        apellidos: `${numeroFila}`,
                        cargo: 'Reservado (PII)',
                        area: row['Area'] ? String(row['Area']).trim() : '',
                        gerencia: row['Gerencia'] ? String(row['Gerencia']).trim() : '',
                        modalidad: row['Modalidad'] ? String(row['Modalidad']).trim() : 'Presencial',
                        direccion: row['Direccion'] ? String(row['Direccion']).trim() : '',
                        telefono: row['Telefono'] ? String(row['Telefono']).replace('.0', '').trim() : '',
                        email: row['Email'] ? String(row['Email']).trim() : '',
                        compania: row['Compañia'] || row['Compania'] ? String(row['Compañia'] || row['Compania']).trim() : '',
                        contacto_emergencia_nombre: row['ContactoEmergencia_Nombre'] ? String(row['ContactoEmergencia_Nombre']).trim() : '',
                        contacto_emergencia_telefono: row['ContactoEmergencia_Telefono'] ? String(row['ContactoEmergencia_Telefono']).replace('.0', '').trim() : '',
                        activo: row['Activo'] !== undefined ? !['no', 'false', '0', 'n'].includes(String(row['Activo']).toLowerCase().trim()) : true,
                        latitud: parseFloat(row['latitud']) || null,
                        longitud: parseFloat(row['longitud']) || null,
                    };

                    // Enlace con Sede pública local
                    if (row['Sede_Asignada'] && sedes.length > 0) {
                        const sedeName = String(row['Sede_Asignada']).toLowerCase().trim();
                        // Intento 1: Match parcial (el nombre de la sede contiene el texto del Excel o viceversa)
                        let matchedSede = sedes.find(s => {
                            const sn = s.nombre.toLowerCase();
                            return sn.includes(sedeName) || sedeName.includes(sn);
                        });
                        // Intento 2: Match por ciudad (el texto del Excel contiene el nombre de la ciudad)
                        if (!matchedSede) {
                            matchedSede = sedes.find(s => sedeName.includes(s.ciudad.toLowerCase()));
                        }
                        // Intento 3: Sede geográficamente más cercana
                        if (!matchedSede && col.latitud && col.longitud) {
                            let minDist = Infinity;
                            sedes.forEach(s => {
                                const d = Math.pow(s.latitud - col.latitud, 2) + Math.pow(s.longitud - col.longitud, 2);
                                if (d < minDist) { minDist = d; matchedSede = s; }
                            });
                        }
                        if (matchedSede) {
                            col.sede_asignada = matchedSede.id;
                            col.sede_nombre = matchedSede.nombre;
                            col.ciudad = matchedSede.ciudad;
                        }
                    } else if (sedes.length > 0 && col.latitud && col.longitud) {
                        // Sin Sede_Asignada en el Excel: asignar la sede más cercana
                        let minDist = Infinity;
                        let closestSede = null;
                        sedes.forEach(s => {
                            const d = Math.pow(s.latitud - col.latitud, 2) + Math.pow(s.longitud - col.longitud, 2);
                            if (d < minDist) { minDist = d; closestSede = s; }
                        });
                        if (closestSede) {
                            col.sede_asignada = closestSede.id;
                            col.sede_nombre = closestSede.nombre;
                            col.ciudad = closestSede.ciudad;
                        }
                    }

                    return col;
                }).filter(Boolean);

                if (onColaboradoresLoaded) {
                    onColaboradoresLoaded(parsedColaboradores);
                }

                alert(`✅ Personal Cargado Exitosamente\n\nRegistros leídos: ${parsedColaboradores.length}\n\n*Nota: Estos datos residen solo en la memoria del navegador. No se guardaron en la red.`);
            } catch (error) {
                alert("❌ Error procesando el archivo Excel localmente: " + error.message);
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            alert("❌ Error leyendo el archivo.");
            setUploading(false);
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ margin: '0 0 10px', color: '#64748b' }}>Datos y Reportes</h4>

            {/* Input de archivo oculto */}
            <input
                type="file"
                accept=".xlsx, .xls"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={onShowHistory} className="btn-layer">
                    <span style={{ fontSize: '1.5rem' }}>📜</span>
                    <span>Historial</span>
                </button>

                {/* Acciones de carga de personal */}
                <button onClick={handleUploadClick} className="btn-layer" disabled={uploading}>
                    <span style={{ fontSize: '1.5rem' }}>{uploading ? '⏳' : '📤'}</span>
                    <span>{uploading ? 'Procesando...' : 'Cargar Personal'}</span>
                </button>

                <button
                    onClick={() => {
                        if (confirm("⚠️ ¿Estás seguro de LIMPIAR el personal en memoria?\n\nEl mapa dejará de mostrar sus ubicaciones.")) {
                            if (onClearColaboradores) onClearColaboradores();
                            alert("✅ Personal limpiado de la memoria.");
                        }
                    }}
                    className="btn-layer"
                    style={{ borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                >
                    <span style={{ fontSize: '1.5rem' }}>👥🗑️</span>
                    <span>Limpiar Memoria</span>
                </button>

                <button
                    onClick={async () => {
                        if (confirm("⚠️ ¿Estás seguro de BORRAR el historial de eventos?\n\nEsto limpiará el mapa de marcas y polígonos.")) {
                            try {
                                await deleteEventos();
                                alert("✅ Historial de eventos eliminado.");
                                window.location.reload();
                            } catch {
                                alert("Error eliminando historial.");
                            }
                        }
                    }}
                    className="btn-layer"
                    style={{ borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                >
                    <span style={{ fontSize: '1.5rem' }}>📍🗑️</span>
                    <span>Borrar Historial</span>
                </button>
            </div>

            {/* Zona de reporte y generación de informes (Siempre disponible) */}
            {(() => {
                const hasSedeImpact = affectedSedes.length > 0 || nearbySedes.length > 0 || affectedColaboradores.length > 0;
                const hasZones = zones && zones.length > 0;
                const boxBg = hasSedeImpact ? '#ffe4e6' : (hasZones ? '#fffbeb' : '#f0f9ff');
                const boxBorder = hasSedeImpact ? '#fca5a5' : (hasZones ? '#fde68a' : '#bae6fd');
                const titleColor = hasSedeImpact ? '#b91c1c' : (hasZones ? '#b45309' : '#0369a1');
                const textColor = hasSedeImpact ? '#7f1d1d' : (hasZones ? '#78350f' : '#0c4a6e');

                return (
                    <div style={{ padding: '15px', background: boxBg, borderRadius: '8px', border: `1px solid ${boxBorder}`, marginTop: '10px' }}>
                        <h5 style={{ margin: '0 0 10px', color: titleColor, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem' }}>
                            {hasSedeImpact ? '🚨 Zona de Riesgo Activa' : (hasZones ? '⚠️ Zona Marcada (Sin Sedes en Polígono)' : '📄 Generación de Informes')}
                        </h5>
                        <div style={{ fontSize: '0.9rem', marginBottom: '12px', color: textColor }}>
                            <div style={{ marginBottom: '4px' }}>🗺️ <strong>{zones ? zones.length : 0}</strong> Zonas/polígonos trazados en mapa</div>
                            <div style={{ marginBottom: '4px' }}>🏢 <strong>{affectedSedes.length}</strong> Sedes directas / <strong>{nearbySedes.length}</strong> Cercanas (&lt;2km)</div>
                            <div>👥 <strong>{affectedColaboradores.length}</strong> Colaboradores en zona trazada</div>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: titleColor, fontStyle: 'italic', marginBottom: '12px' }}>
                            {hasSedeImpact
                                ? '* Las sedes, colaboradores y red de apoyo cercana se incluirán en el PDF.'
                                : '* Puede generar el informe PDF de movilidad o prevención incluso si ninguna sede está dentro del polígono.'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                onClick={() => onSave()}
                                style={{ background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}
                            >
                                Guardar Evento
                            </button>
                            <button
                                onClick={() => onGenerateReport({ includeColaboradoresList: true })}
                                style={{ background: '#10b981', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                            >
                                Generar Informe
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DataTab;
