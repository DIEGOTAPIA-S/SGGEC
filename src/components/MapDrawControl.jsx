import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as turf from '@turf/turf';
import 'leaflet-draw';

window.type = true;

// Ícono especial para pines personalizados del usuario
const customPinIcon = L.divIcon({
    html: `<div style="
        width: 30px; height: 30px;
        background: #7c3aed;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

const MapDrawControl = ({ onCreated, onDeleted }) => {
    const map = useMap();
    const featureGroupRef = useRef(new L.FeatureGroup());
    const customPinsRef = useRef([]);
    const pinsLayerRef = useRef(new L.FeatureGroup());
    const connectBtnRef = useRef(null);
    // Refs estables para los callbacks — evitan que el useEffect se re-ejecute
    const onCreatedRef = useRef(onCreated);
    const onDeletedRef = useRef(onDeleted);
    useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
    useEffect(() => { onDeletedRef.current = onDeleted; }, [onDeleted]);

    const removePinsUI = () => {
        pinsLayerRef.current.clearLayers();
        customPinsRef.current = [];
        if (connectBtnRef.current) {
            connectBtnRef.current.style.display = 'none';
        }
    };

    const updateConnectButton = () => {
        if (!connectBtnRef.current) return;
        if (customPinsRef.current.length >= 3) {
            connectBtnRef.current.style.display = 'flex';
        } else {
            connectBtnRef.current.style.display = 'none';
        }
    };

    useEffect(() => {
        map.addLayer(featureGroupRef.current);
        map.addLayer(pinsLayerRef.current);

        const drawControl = new L.Control.Draw({
            position: 'topright',
            edit: {
                featureGroup: featureGroupRef.current,
                remove: true,
            },
            draw: {
                marker: {
                    icon: customPinIcon,
                },
                circlemarker: false,
                polyline: false,
                rectangle: true,
                circle: true,
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#ef4444' }
                }
            }
        });

        map.addControl(drawControl);

        // --- Botón flotante "Conectar Pines" ---
        const btn = L.DomUtil.create('button');
        btn.innerHTML = '🔗 Conectar Pines y Crear Zona';
        btn.style.cssText = `
            display: none; align-items: center; gap: 6px;
            position: absolute; bottom: 80px; left: 50%;
            transform: translateX(-50%);
            z-index: 5000;
            background: #7c3aed;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(124,58,237,0.5);
            white-space: nowrap;
        `;
        connectBtnRef.current = btn;
        map.getContainer().appendChild(btn);

        L.DomEvent.on(btn, 'click', () => {
            const coords = customPinsRef.current;
            if (coords.length < 3) return;

            // turf.convex() calcula el "casco convexo" — ordena automáticamente los puntos
            // en sentido horario correcto, evitando que el polígono se cruce
            const pointsCollection = turf.featureCollection(
                coords.map(c => turf.point([c[1], c[0]])) // [lon, lat]
            );
            const hull = turf.convex(pointsCollection);

            if (!hull) {
                alert('No se pudo crear la zona. Asegúrate de que los pines no estén todos en línea recta.');
                return;
            }

            hull.properties = { source: 'custom-pins' };

            // Dibujar el polígono en el mapa usando las coordenadas ya ordenadas por turf
            const hullCoords = hull.geometry.coordinates[0].map(c => [c[1], c[0]]); // [lat, lon] para Leaflet
            const polygonLayer = L.polygon(hullCoords, {
                color: '#7c3aed',
                fillColor: '#7c3aed',
                fillOpacity: 0.2,
                weight: 2
            });
            featureGroupRef.current.addLayer(polygonLayer);

            // Limpiar pines sueltos
            removePinsUI();

            // Disparar análisis
            if (onCreatedRef.current) onCreatedRef.current(hull, polygonLayer);
        });

        // Botón para limpiar pines sueltos
        const clearBtn = L.DomUtil.create('button');
        clearBtn.innerHTML = '❌ Limpiar Pines';
        clearBtn.style.cssText = `
            display: none; align-items: center; gap: 6px;
            position: absolute; bottom: 40px; left: 50%;
            transform: translateX(-50%);
            z-index: 5000;
            background: #ef4444;
            color: white;
            border: none;
            padding: 7px 16px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(239,68,68,0.4);
            white-space: nowrap;
        `;
        map.getContainer().appendChild(clearBtn);

        L.DomEvent.on(clearBtn, 'click', () => {
            removePinsUI();
            clearBtn.style.display = 'none';
        });

        // Event listeners de Leaflet Draw
        map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;

            // Si es un marcador personalizado (pin suelto)
            if (layer instanceof L.Marker) {
                const latlng = layer.getLatLng();
                customPinsRef.current.push([latlng.lat, latlng.lng]);

                // Agregar número al pin
                const num = customPinsRef.current.length;
                const numberedIcon = L.divIcon({
                    html: `<div style="
                        width: 28px; height: 28px;
                        background: #7c3aed;
                        border: 3px solid white;
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        color: white; font-weight: bold; font-size: 0.8rem;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                    ">${num}</div>`,
                    className: '',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });
                const numberedMarker = L.marker([latlng.lat, latlng.lng], { icon: numberedIcon });
                numberedMarker.bindTooltip(`Pin ${num}`, { permanent: false });
                pinsLayerRef.current.addLayer(numberedMarker);

                updateConnectButton();
                clearBtn.style.display = customPinsRef.current.length >= 1 ? 'flex' : 'none';
                return; // No lo agrega al featureGroup principal ni llama onCreated
            }

            // Zonas normales (polígono, círculo, rectángulo)
            featureGroupRef.current.addLayer(layer);
            let geoJson = layer.toGeoJSON();
            if (layer instanceof L.Circle) {
                const center = layer.getLatLng();
                const radius = layer.getRadius() / 1000;
                geoJson = turf.circle([center.lng, center.lat], radius, { units: 'kilometers', steps: 64 });
            }
            if (onCreatedRef.current) onCreatedRef.current(geoJson, layer);
        });

        map.on(L.Draw.Event.DELETED, () => {
            removePinsUI();
            if (onDeletedRef.current) onDeletedRef.current();
        });

        return () => {
            map.removeControl(drawControl);
            if (connectBtnRef.current) map.getContainer().removeChild(connectBtnRef.current);
            if (clearBtn) map.getContainer().removeChild(clearBtn);
        };
    }, [map]); // ← Solo depende de map; los callbacks van por ref

    return null;
};

export default MapDrawControl;

