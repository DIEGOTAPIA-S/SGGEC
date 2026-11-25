import { useEffect, useRef } from 'react';
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

// Convierte cualquier capa de Leaflet (Polygon, Rectangle, Circle) a un Polygon GeoJSON válido para Turf
const layerToGeoJson = (layer) => {
    if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        const radiusKm = layer.getRadius() / 1000;
        return turf.circle([center.lng, center.lat], radiusKm, { units: 'kilometers', steps: 64 });
    }
    if (typeof layer.toGeoJSON === 'function') {
        return layer.toGeoJSON();
    }
    return null;
};

const MapDrawControl = ({ onZonesChange }) => {
    const map = useMap();
    const featureGroupRef = useRef(new L.FeatureGroup());
    const customPinsRef = useRef([]);
    const pinsLayerRef = useRef(new L.FeatureGroup());
    const connectBtnRef = useRef(null);
    const clearAllBtnRef = useRef(null);

    const onZonesChangeRef = useRef(onZonesChange);
    useEffect(() => { onZonesChangeRef.current = onZonesChange; }, [onZonesChange]);

    // Extrae todas las zonas que existen realmente en featureGroupRef y notifica a MapComponent
    const syncActiveZones = () => {
        const layers = featureGroupRef.current.getLayers();
        const activeGeoJsons = layers.map(layerToGeoJson).filter(Boolean);

        if (clearAllBtnRef.current) {
            const hasShapesOrPins = layers.length > 0 || customPinsRef.current.length > 0;
            clearAllBtnRef.current.style.display = hasShapesOrPins ? 'flex' : 'none';
        }

        if (onZonesChangeRef.current) {
            onZonesChangeRef.current(activeGeoJsons);
        }
    };

    const removePinsUI = () => {
        pinsLayerRef.current.clearLayers();
        customPinsRef.current = [];
        if (connectBtnRef.current) {
            connectBtnRef.current.style.display = 'none';
        }
        if (clearAllBtnRef.current) {
            const hasShapes = featureGroupRef.current.getLayers().length > 0;
            clearAllBtnRef.current.style.display = hasShapes ? 'flex' : 'none';
        }
    };

    const updateConnectButton = () => {
        if (connectBtnRef.current) {
            connectBtnRef.current.style.display = customPinsRef.current.length >= 3 ? 'flex' : 'none';
        }
        if (clearAllBtnRef.current) {
            const hasShapesOrPins = featureGroupRef.current.getLayers().length > 0 || customPinsRef.current.length > 0;
            clearAllBtnRef.current.style.display = hasShapesOrPins ? 'flex' : 'none';
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
            position: absolute; bottom: 75px; left: 50%;
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

        L.DomEvent.on(btn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            const coords = customPinsRef.current;
            if (coords.length < 3) return;

            const pointsCollection = turf.featureCollection(
                coords.map(c => turf.point([c[1], c[0]])) // [lon, lat]
            );
            const hull = turf.convex(pointsCollection);

            if (!hull) {
                alert('No se pudo crear la zona. Asegúrate de que los pines no estén todos en línea recta.');
                return;
            }

            hull.properties = { source: 'custom-pins' };

            const hullCoords = hull.geometry.coordinates[0].map(c => [c[1], c[0]]);
            const polygonLayer = L.polygon(hullCoords, {
                color: '#7c3aed',
                fillColor: '#7c3aed',
                fillOpacity: 0.2,
                weight: 2
            });
            featureGroupRef.current.addLayer(polygonLayer);

            removePinsUI();
            syncActiveZones();
        });

        // --- Botón de 1 clic: "🗑️ Limpiar Zona(s) / Pines" ---
        const clearBtn = L.DomUtil.create('button');
        clearBtn.innerHTML = '🗑️ Borrar Zona(s) del Mapa';
        clearBtn.style.cssText = `
            display: none; align-items: center; gap: 6px;
            position: absolute; bottom: 30px; left: 50%;
            transform: translateX(-50%);
            z-index: 5000;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            padding: 8px 18px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.82rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(239,68,68,0.45);
            white-space: nowrap;
        `;
        clearAllBtnRef.current = clearBtn;
        map.getContainer().appendChild(clearBtn);

        L.DomEvent.on(clearBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            featureGroupRef.current.clearLayers();
            removePinsUI();
            syncActiveZones();
        });

        //Cuando una capa se quita del featureGroup (incluso antes de pulsar "Save" en el bote de basura de Leaflet Draw),
        //actualizamos inmediatamente las zonas activas para que las sedes se desmarquen en tiempo real
        featureGroupRef.current.on('layerremove', () => {
            syncActiveZones();
        });

        // Si el usuario activa el bote de basura de Leaflet Draw, limpia todas las figuras de inmediato en 1 clic
        map.on(L.Draw.Event.DELETESTART, () => {
            // Al tocar una figura en modo borrar, Leaflet la remueve de featureGroupRef y dispara 'layerremove'
            // También limpiamos cualquier pin morado suelto
            pinsLayerRef.current.clearLayers();
            customPinsRef.current = [];
            if (connectBtnRef.current) connectBtnRef.current.style.display = 'none';
        });

        // Si el usuario empieza a dibujar una nueva figura mientras el modo borrar estaba abierto sin darle a "Save",
        // evitamos que Leaflet restaure las figuras que el usuario ya había tocado para borrar
        map.on(L.Draw.Event.DRAWSTART, () => {
            syncActiveZones();
        });

        map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;

            // Si es un marcador personalizado (pin suelto)
            if (layer instanceof L.Marker) {
                const latlng = layer.getLatLng();
                customPinsRef.current.push([latlng.lat, latlng.lng]);

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
                return;
            }

            // Zonas normales (polígono, círculo, rectángulo)
            featureGroupRef.current.addLayer(layer);
            syncActiveZones();
        });

        map.on(L.Draw.Event.EDITED, () => {
            syncActiveZones();
        });

        // Actualizar sedes afectadas en tiempo real mientras se arrastran los vértices, el radio o el centro en modo "Edit layers"
        map.on(L.Draw.Event.EDITVERTEX, () => {
            syncActiveZones();
        });
        map.on(L.Draw.Event.EDITRESIZE, () => {
            syncActiveZones();
        });
        map.on(L.Draw.Event.EDITMOVE, () => {
            syncActiveZones();
        });
        map.on(L.Draw.Event.EDITSTOP, () => {
            syncActiveZones();
        });

        map.on(L.Draw.Event.DELETED, () => {
            removePinsUI();
            syncActiveZones();
        });
        map.on(L.Draw.Event.DELETESTOP, () => {
            syncActiveZones();
        });

        return () => {
            map.removeControl(drawControl);
            if (connectBtnRef.current) map.getContainer().removeChild(connectBtnRef.current);
            if (clearAllBtnRef.current) map.getContainer().removeChild(clearAllBtnRef.current);
        };
    }, [map]);

    return null;
};

export default MapDrawControl;
