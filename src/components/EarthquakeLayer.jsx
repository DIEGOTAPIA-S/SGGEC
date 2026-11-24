import { useState, useEffect } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import axios from 'axios';

/**
 * EarthquakeLayer — Capa de sismos en Colombia (USGS Earthquake API Oficial).
 *
 * Diseño:
 * - Utiliza la API oficial de USGS (https://earthquake.usgs.gov/fdsnws/event/1/query)
 *   filtrada para las coordenadas de Colombia (-4.5 a 13.5 Lat, -82.0 a -66.5 Lon),
 *   que cuenta con cabeceras CORS (*) compatibles con ejecución local (file:///).
 * - El MONITOREO siempre está activo → el contador en la Sidebar se actualiza
 *   aunque la capa no esté visible en el mapa.
 * - El DIBUJO de círculos en el mapa solo ocurre cuando visible=true.
 */
const EarthquakeLayer = ({ visible, onAlertsUpdate }) => {
    const [earthquakes, setEarthquakes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Monitoreo SIEMPRE activo (independiente de visible)
    useEffect(() => {
        const fetchEarthquakes = async () => {
            setLoading(true);
            try {
                // Consultar sismos recientes en el cuadrante de Colombia (últimos 7 días para asegurar datos visibles en monitoreo)
                const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const USGS_COLOMBIA_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&minlatitude=-4.5&maxlatitude=13.5&minlongitude=-82.0&maxlongitude=-66.5&orderby=time&limit=50`;

                const response = await axios.get(USGS_COLOMBIA_URL);
                if (!response.data || !response.data.features) return;

                const colQuakes = response.data.features.map(q => {
                    // USGS entrega geometry.coordinates en orden GeoJSON estándar: [Lon, Lat, Depth]
                    const [lon, lat, depth] = q.geometry.coordinates;
                    const timeMs = q.properties.time;
                    const localTimeStr = timeMs ? new Date(timeMs).toLocaleString('es-CO') : 'Reciente';
                    return {
                        id: q.id,
                        lat,
                        lon,
                        depth: depth ?? 0,
                        mag: q.properties.mag ?? 0,
                        magType: q.properties.magType || 'ML',
                        place: q.properties.place || 'Colombia',
                        localTime: localTimeStr,
                        status: q.properties.status || 'reviewed',
                        url: q.properties.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`
                    };
                });

                setEarthquakes(colQuakes);

                // Notificar al Dashboard para el contador en la Sidebar (espera coordinates: [Lat, Lon])
                if (onAlertsUpdate) {
                    const alerts = colQuakes.map(q => ({
                        mag: q.mag,
                        place: q.place,
                        time: q.localTime,
                        id: q.id,
                        coordinates: [q.lat, q.lon, q.depth]
                    }));
                    onAlertsUpdate(alerts);
                }
            } catch (error) {
                console.error("Error fetching USGS earthquake data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEarthquakes();
        // Actualizar cada 5 minutos
        const interval = setInterval(fetchEarthquakes, 5 * 60 * 1000);
        return () => clearInterval(interval);

    }, []);

    // El DIBUJO en el mapa solo se renderiza cuando la capa está activa
    if (!visible) return null;

    const getColor = (mag) => {
        if (mag >= 5.0) return '#dc2626'; // Rojo - Fuerte
        if (mag >= 4.0) return '#ea580c'; // Naranja - Medio
        return '#ca8a04'; // Amarillo - Leve
    };

    const getRadius = (mag) => Math.max(mag * 4, 6);

    return (
        <>
            {earthquakes.map((quake) => (
                <CircleMarker
                    key={quake.id}
                    center={[quake.lat, quake.lon]}
                    pathOptions={{
                        color: getColor(quake.mag),
                        fillColor: getColor(quake.mag),
                        fillOpacity: 0.65,
                        weight: 1.5
                    }}
                    radius={getRadius(quake.mag)}
                >
                    <Popup>
                        <div className="p-2 min-w-[220px]">
                            <h3 className="font-bold text-slate-800 text-lg border-b pb-1 mb-2">
                                ⚡ Sismo Detectado (USGS)
                            </h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p><strong className="text-slate-900">Magnitud:</strong> {quake.mag} {quake.magType}</p>
                                <p><strong className="text-slate-900">Ubicación:</strong> {quake.place}</p>
                                <p><strong className="text-slate-900">Fecha/Hora:</strong> {quake.localTime}</p>
                                <p><strong className="text-slate-900">Profundidad:</strong> {quake.depth} km</p>
                                <p><strong className="text-slate-900">Estado:</strong> {quake.status === 'reviewed' ? 'Revisado' : 'Automático'}</p>
                                <a
                                    href={quake.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mt-3 text-blue-600 hover:underline font-medium"
                                >
                                    Ver detalle oficial en USGS ↗
                                </a>
                            </div>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </>
    );
};

export default EarthquakeLayer;
