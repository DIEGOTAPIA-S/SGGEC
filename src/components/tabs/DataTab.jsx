import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deleteEventos } from '../../services/eventoService';
import { read, utils, writeFile } from 'xlsx';
import { geocodeColombianAddressLocal } from '../../utils/colombianGeocoder';

/**
 * DataTab — Gestión de datos local (100% en memoria) para versión portable.
 */
const DataTab = ({
    sedes = [],
    zones = [],
    bufferRadiusKm = 2,
    onColaboradoresLoaded,
    onClearColaboradores,
    affectedSedes,
    nearbySedes,
    affectedColaboradores,
    onShowHistory,
    onSave,
    onGenerateReport,
    onExportScenario,
    onImportScenario,
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const scenarioInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    // Genera y descarga localmente una plantilla Excel (.xlsx) con las columnas de SAP soportadas
    const handleDownloadTemplate = () => {
        const sampleRows = [
            {
                Compañia: 'Colmédica Medicina Prepagada',
                Cedula: '10000001',
                'ID SAP': '800001',
                Nombres: 'PEREZ GOMEZ JUAN CARLOS',
                Cargo: 'Analista de Operaciones',
                Jerarquia: 'Gerencia de Operaciones',
                Direccion: 'Cl. 140 # 11-45 Apto 402 Torre B Barrio Cedritos',
                Celular: '3000000001',
                Correo: 'ejemplo1@colmedica.com'
            },
            {
                Compañia: 'Colmédica Medicina Prepagada',
                Cedula: '10000002',
                'ID SAP': '800002',
                Nombres: 'RODRIGUEZ LOPEZ MARIA FERNANDA',
                Cargo: 'Profesional de Salud',
                Jerarquia: 'Gerencia Médica',
                Direccion: 'Cl 32 # 40A-31 Casa 5 Barrio Barzal Alto, Villavicencio',
                Celular: '3000000002',
                Correo: 'ejemplo2@colmedica.com'
            },
            {
                Compañia: 'Colmédica Medicina Prepagada',
                Cedula: '10000003',
                'ID SAP': '800003',
                Nombres: 'MARTINEZ DIAZ ANDRES FELIPE',
                Cargo: 'Ejecutivo Servicio al Cliente',
                Jerarquia: 'Gerencia Regional Antioquia',
                Direccion: 'Cra 43B # 14-44 Oficina 301 Barrio El Poblado, Medellín',
                Celular: '3000000003',
                Correo: 'ejemplo3@colmedica.com'
            }
        ];
        const ws = utils.json_to_sheet(sampleRows);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Colaboradores_SAP');
        writeFile(wb, 'Plantilla_Colaboradores_SGCN.xlsx');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validación de seguridad de archivo (extensión y tamaño máximo 15 MB para evitar DoS en memoria del navegador)
        const validExt = /\.(xlsx|xls)$/i.test(file.name);
        if (!validExt) {
            alert("❌ Archivo no permitido: Solo se aceptan archivos Excel (.xlsx o .xls).");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            alert("❌ El archivo excede el límite de seguridad de 15 MB.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert("❌ El archivo Excel está vacío.");
                    setUploading(false);
                    return;
                }

                // Buscador flexible de columnas (ignora mayúsculas, tildes y espacios)
                const getField = (row, candidates) => {
                    const keys = Object.keys(row);
                    for (const cand of candidates) {
                        const normCand = cand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                        const foundKey = keys.find(k => {
                            const normK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                            return normK === normCand || normK.includes(normCand);
                        });
                        if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
                            return row[foundKey];
                        }
                    }
                    return '';
                };

                // Normalización en memoria local con Anonimización PII y Geocodificación Local de Direcciones Colombianas
                let geocodedByAddressCount = 0;
                const parsedColaboradores = jsonData.map((row, idx) => {
                    // Verificar que la fila no esté completamente vacía
                    const hasAnyValue = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
                    if (!hasAnyValue) return null;

                    // Consecutivo 1, 2, 3... y Fila real en Excel (idx + 2 porque la fila 1 es el encabezado)
                    const consecutivo = idx + 1;
                    const filaExcel = idx + 2;

                    const rawDireccion = String(getField(row, ['Direccion', 'Dirección', 'Domicilio', 'Residencia'])).trim();
                    const rawGerencia = String(getField(row, ['Jerarquia', 'Jerarquía', 'Gerencia', 'Dependencia', 'Vicepresidencia'])).trim();
                    const rawArea = String(getField(row, ['Area', 'Área', 'Cargo', 'Posicion', 'Posición'])).trim();
                    const rawCompania = String(getField(row, ['Compañia', 'Compañía', 'Compania', 'Empresa', 'Sociedad'])).trim();
                    const rawModalidad = String(getField(row, ['Modalidad', 'Tipo Trabajo', 'Trabajo'])).trim() || 'Presencial';
                    const rawSede = String(getField(row, ['Sede_Asignada', 'Sede', 'Centro'])).trim();
                    const rawCiudad = String(getField(row, ['Ciudad', 'Municipio'])).trim();

                    // Coordenadas explícitas (si el Excel ya las trae)
                    let lat = parseFloat(getField(row, ['latitud', 'lat', 'latitude']));
                    let lon = parseFloat(getField(row, ['longitud', 'lon', 'lng', 'longitude']));
                    let ciudadDetectada = rawCiudad;
                    let direccionLimpia = rawDireccion;

                    // Si el Excel de SAP NO trae latitud/longitud pero sí trae Dirección, la limpiamos y geocodificamos localmente
                    if ((isNaN(lat) || isNaN(lon) || !lat || !lon) && rawDireccion) {
                        const geo = geocodeColombianAddressLocal(rawDireccion, `${rawCiudad} ${rawSede} ${rawGerencia}`, consecutivo);
                        lat = geo.latitud;
                        lon = geo.longitud;
                        if (!ciudadDetectada) ciudadDetectada = geo.ciudad;
                        direccionLimpia = geo.direccionLimpia;
                        geocodedByAddressCount++;
                    }

                    // ANONIMIZACIÓN ESTRICTA:
                    // Se descartan Nombres, Apellidos, Cédula, ID SAP, Celular y Correo.
                    // Se conserva el Consecutivo (Colaborador # / Fila Excel), Compañía, Jerarquía (Gerencia) y Dirección para cruce manual con el Excel local del analista.
                    const col = {
                        id: consecutivo,
                        fila_excel: filaExcel,
                        identificacion: `Colaborador ${consecutivo} (Fila ${filaExcel})`,
                        nombres: `Colaborador`,
                        apellidos: `${consecutivo}`,
                        cargo: 'Reservado (PII)',
                        area: rawArea || rawGerencia || 'General',
                        gerencia: rawGerencia || 'Sin gerencia',
                        modalidad: rawModalidad,
                        direccion: rawDireccion || direccionLimpia || 'Sin dirección',
                        direccion_limpia: direccionLimpia || rawDireccion || '',
                        telefono: 'Reservado (PII)',
                        email: 'Reservado (PII)',
                        compania: rawCompania || 'Colmédica',
                        contacto_emergencia_nombre: 'Reservado (PII)',
                        contacto_emergencia_telefono: 'Reservado (PII)',
                        activo: true,
                        ciudad: ciudadDetectada || 'Bogotá',
                        latitud: !isNaN(lat) ? lat : null,
                        longitud: !isNaN(lon) ? lon : null,
                    };

                    // Enlace con la Sede de Colmédica más cercana a la dirección del colaborador
                    if (rawSede && sedes.length > 0) {
                        const sedeName = rawSede.toLowerCase();
                        let matchedSede = sedes.find(s => {
                            const sn = s.nombre.toLowerCase();
                            return sn.includes(sedeName) || sedeName.includes(sn);
                        });
                        if (!matchedSede) {
                            matchedSede = sedes.find(s => sedeName.includes(s.ciudad.toLowerCase()));
                        }
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
                        let minDist = Infinity;
                        let closestSede = null;
                        sedes.forEach(s => {
                            const d = Math.pow(s.latitud - col.latitud, 2) + Math.pow(s.longitud - col.longitud, 2);
                            if (d < minDist) { minDist = d; closestSede = s; }
                        });
                        if (closestSede) {
                            col.sede_asignada = closestSede.id;
                            col.sede_nombre = closestSede.nombre;
                            if (!rawCiudad) col.ciudad = closestSede.ciudad;
                        }
                    }

                    return col;
                }).filter(Boolean);

                if (onColaboradoresLoaded) {
                    onColaboradoresLoaded(parsedColaboradores);
                }

                alert(`✅ Personal Cargado y Georreferenciado Exitosamente\n\n• Total registros procesados: ${parsedColaboradores.length}\n• Direcciones estandarizadas y ubicadas localmente: ${geocodedByAddressCount}\n• Privacidad (PII): Nombres, Cédula, ID SAP, Celular y Correo fueron descartados. Cada registro se identifica por su consecutivo (Colaborador 1, 2... y Fila de Excel) para cruce manual con su archivo local.`);
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

            <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px dashed #94a3b8',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}
            >
                <span>📋</span>
                <span>Descargar Plantilla Excel (.xlsx)</span>
            </button>

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
                            <div style={{ marginBottom: '4px' }}>🏢 <strong>{affectedSedes.length}</strong> Sedes directas / <strong>{nearbySedes.length}</strong> Cercanas (&lt;{bufferRadiusKm < 1 ? `${bufferRadiusKm * 1000}m` : `${bufferRadiusKm}km`})</div>
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

                        {/* Exportar / Importar Escenario (.json) entre Analistas — 100% Local */}
                        {(onExportScenario || onImportScenario) && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${boxBorder}` }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: titleColor, marginBottom: '8px' }}>
                                    🔄 Compartir Escenario con otro Analista (.json local)
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    ref={scenarioInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file && onImportScenario) onImportScenario(file);
                                        if (scenarioInputRef.current) scenarioInputRef.current.value = '';
                                    }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={onExportScenario}
                                        style={{ background: 'white', color: '#334155', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                                    >
                                        📤 Exportar Zona
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scenarioInputRef.current?.click()}
                                        style={{ background: 'white', color: '#334155', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                                    >
                                        📥 Cargar Zona
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

export default DataTab;
