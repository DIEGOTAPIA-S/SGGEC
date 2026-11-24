import React from 'react';
import { downloadColaboradoresCSV } from '../utils/exportUtils';

/**
 * Banner de alerta de riesgo que aparece cuando hay sedes o colaboradores afectados.
 */
const RiskAlertBanner = ({ affectedSedes, nearbySedes, affectedColaboradores, zones = [], bufferRadiusKm = 2, onGenerateReport }) => {
    const hasSedeImpact = affectedSedes.length > 0 || nearbySedes.length > 0 || affectedColaboradores.length > 0;
    const hasZones = zones && zones.length > 0;
    const radiusLabel = bufferRadiusKm < 1 ? `${bufferRadiusKm * 1000}m` : `${bufferRadiusKm}km`;

    if (!hasSedeImpact && !hasZones) return null;

    if (!hasSedeImpact && hasZones) {
        return (
            <div className="mx-5 mt-5 mb-0 bg-amber-50/95 backdrop-blur-md p-4 rounded-2xl border border-amber-200 shadow-lg flex flex-wrap justify-between items-center gap-4 animate-in fade-in slide-in-from-top duration-500">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 text-white p-3 rounded-xl shadow-lg shadow-amber-500/30">
                        <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                        <h5 className="m-0 text-amber-900 font-bold text-lg flex items-center gap-2">
                            Zona de Monitoreo / Movilidad Trazada (Sin Sedes en Polígono Directo)
                        </h5>
                        <div className="text-sm text-amber-800/90 flex gap-6 mt-1 font-medium">
                            <div>🗺️ <strong>{zones.length}</strong> Zona(s) marcada(s) en el mapa</div>
                            <div>🏢 <strong>0</strong> Sedes dentro del polígono (Impacto indirecto / movilidad)</div>
                        </div>
                    </div>
                </div>
                {onGenerateReport && (
                    <button
                        onClick={onGenerateReport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl cursor-pointer font-bold text-sm flex items-center gap-2 transition-all shadow-md"
                    >
                        📥 Generar Informe PDF
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mx-5 mt-5 mb-0 bg-red-50/90 backdrop-blur-md p-4 rounded-2xl border border-red-200 shadow-lg flex justify-between items-center animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
                <div className="bg-red-500 text-white p-3 rounded-xl shadow-lg shadow-red-500/30 animate-pulse">
                    <span className="text-xl">🚨</span>
                </div>
                <div>
                    <h5 className="m-0 text-red-900 font-bold text-lg flex items-center gap-2">
                        Zona de Riesgo Activa
                    </h5>
                    <div className="text-sm text-red-700/80 flex flex-wrap gap-6 mt-1 font-medium">
                        <div className="flex items-center gap-2">
                            <span className="text-red-500">🏢</span> <strong>{affectedSedes.length}</strong> Sedes directas
                        </div>
                        {nearbySedes.length > 0 && (
                            <div className="flex items-center gap-2 text-amber-800">
                                <span>⚠️</span> <strong>{nearbySedes.length}</strong> Sedes cercanas (&lt; {radiusLabel})
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-red-500">👥</span> <strong>{affectedColaboradores.length}</strong> Colaboradores en zona afectada
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {affectedColaboradores.length > 0 && (
                    <button
                        onClick={() => downloadColaboradoresCSV(affectedColaboradores)}
                        className="bg-white hover:bg-red-50 border border-red-100 px-5 py-2.5 rounded-xl cursor-pointer text-red-700 font-bold text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                    >
                        📊 Descargar Listado de Colaboradores
                    </button>
                )}
                {onGenerateReport && (
                    <button
                        onClick={onGenerateReport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl cursor-pointer font-bold text-sm flex items-center gap-2 transition-all shadow-md"
                    >
                        📥 Generar Informe PDF
                    </button>
                )}
            </div>
        </div>
    );
};

export default RiskAlertBanner;
