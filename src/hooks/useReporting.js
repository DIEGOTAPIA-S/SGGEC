import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import * as turf from '@turf/turf';
import { generatePDFReport } from '../utils/reportGenerator';
import { fetchInfrastructureNearPoint } from '../services/infrastructureService';

/**
 * Custom hook para gestionar la generación de reportes PDF y captura de pantalla.
 */
const useReporting = (user, affectedSedes, nearbySedes, affectedColaboradores, eventDetails, infrastructurePoints, zones = [], allSedes = []) => {
    
    const handleGenerateReport = async (options = {}, sedesWithStatus) => {
        try {
            // Captura del Mapa con html-to-image (más fiable que html2canvas para Leaflet)
            const mapElement = document.getElementById('map-capture');
            let mapImg = null;
            if (mapElement) {
                try {
                    // Esperar un momento para asegurar que las capas estén renderizadas
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    mapImg = await toPng(mapElement, {
                        backgroundColor: '#ffffff',
                        quality: 0.95,
                        pixelRatio: 1.5, // Balance entre calidad y tamaño de archivo
                        filter: (node) => {
                            // Ignorar controles de Leaflet
                            if (node && node.classList) {
                                return !(
                                    node.classList.contains('leaflet-control-container') ||
                                    node.classList.contains('leaflet-draw-toolbar')
                                );
                            }
                            return true;
                        }
                    });
                } catch (mapErr) {
                    console.error("Error capturando Mapa con toPng:", mapErr);
                }
            }

            // Gráficas: No capturamos imagen aquí porque reportGenerator las dibuja de forma nativa
            const chartsImg = null;

            // Gestión de Infraestructura y Sedes de Referencia para el reporte
            let reportInfrastructure = infrastructurePoints;
            let referenceCenter = null;

            if (affectedSedes.length > 0 || nearbySedes.length > 0) {
                const targetSedes = affectedSedes.length > 0 ? affectedSedes : nearbySedes;
                if (!reportInfrastructure || reportInfrastructure.length === 0) {
                    try {
                        const uniquePoints = new Map();
                        const promises = targetSedes.map(sede =>
                            fetchInfrastructureNearPoint(sede.latitud, sede.longitud, 5)
                        );
                        const results = await Promise.all(promises);
                        results.flat().forEach(point => {
                            if (!uniquePoints.has(point.id)) uniquePoints.set(point.id, point);
                        });
                        reportInfrastructure = Array.from(uniquePoints.values());
                    } catch (infraErr) {
                        console.warn("Error auto-fetching infra para reporte:", infraErr);
                    }
                }
            } else if (zones && zones.length > 0) {
                // Si el usuario marcó una zona alejada de cualquier sede (ej. bloqueo vial o movilidad en otra zona de Cartagena),
                // calculamos el centroide del polígono para buscar la red de apoyo y las sedes más cercanas en la ciudad.
                try {
                    const centerPt = turf.centroid(zones[0]);
                    const [lon, lat] = centerPt.geometry.coordinates;
                    referenceCenter = { lat, lon };
                    if (!reportInfrastructure || reportInfrastructure.length === 0) {
                        reportInfrastructure = await fetchInfrastructureNearPoint(lat, lon, 8);
                    }
                } catch (err) {
                    console.warn("Error calculando centroide de zona:", err);
                }
            } else {
                // Si ni siquiera dibujó polígono, usar la posición actual guardada del mapa
                const savedLat = parseFloat(sessionStorage.getItem('map_lat'));
                const savedLng = parseFloat(sessionStorage.getItem('map_lng'));
                if (savedLat && savedLng) {
                    referenceCenter = { lat: savedLat, lon: savedLng };
                    if (!reportInfrastructure || reportInfrastructure.length === 0) {
                        reportInfrastructure = await fetchInfrastructureNearPoint(savedLat, savedLng, 8);
                    }
                }
            }

            generatePDFReport(
                sedesWithStatus,
                affectedSedes,
                nearbySedes,
                eventDetails,
                user,
                mapImg,
                chartsImg,
                reportInfrastructure,
                affectedColaboradores,
                { ...options, referenceCenter, zonesCount: zones ? zones.length : 0 }
            );
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Error general al generar el reporte: " + error.message);
        }
    };

    return { handleGenerateReport };
};

export default useReporting;
