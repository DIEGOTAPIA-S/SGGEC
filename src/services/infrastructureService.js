// Versión Local-Portable 100% Autónoma: utiliza exclusivamente apoyo.json (Bogotá + 12 ciudades nacionales)
// sin enviar coordenadas a servidores externos como overpass-api.de.
import apoyoData from '../data/apoyo.json';

export const fetchInfrastructureByBBox = async (south, west, north, east) => {
    try {
        // Filtrar entidades oficiales locales del JSON por BBOX (100% en memoria RAM, sin llamadas de red)
        return apoyoData
            .filter(el => {
                const lat = parseFloat(el.latitud);
                const lon = parseFloat(el.longitud);
                return lat >= south && lat <= north && lon >= west && lon <= east;
            })
            .map(el => ({
                id: `local-${el.id}`,
                lat: parseFloat(el.latitud),
                lon: parseFloat(el.longitud),
                type: el.tipo,
                name: el.nombre,
                address: el.direccion || 'No registrada',
                phone: el.telefono || '',
                isOfficial: true,
                fuente: el.fuente || 'Base de datos interna',
            }));
    } catch (error) {
        console.error('[Local] Error en fetchInfrastructureByBBox:', error);
        return [];
    }
};

export const fetchInfrastructureNearPoint = async (lat, lon, radiusKm = 5) => {
    const latOffset = radiusKm / 111;
    const lonOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    return await fetchInfrastructureByBBox(
        lat - latOffset, lon - lonOffset,
        lat + latOffset, lon + lonOffset
    );
};
