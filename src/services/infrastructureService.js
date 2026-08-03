// Versión Local-Portable: usa apoyo.json para datos locales + OSM como complemento
import axios from 'axios';
import apoyoData from '../data/apoyo.json';

const formatName = (type) => {
    switch (type) {
        case 'police': return 'Estación de Policía';
        case 'fire_station': return 'Estación de Bomberos';
        case 'hospital': return 'Hospital / Clínica';
        default: return 'Infraestructura';
    }
};

export const fetchInfrastructureByBBox = async (south, west, north, east) => {
    try {
        // 1. Filtrar entidades locales del JSON por BBOX (sin llamada de red)
        const localPoints = apoyoData
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

        // 2. Complementar con OSM (Overpass) — solo si hay conexión
        let osmPoints = [];
        try {
            const bbox = `${south},${west},${north},${east}`;
            const query = `
                [out:json][timeout:15];
                (
                  node["amenity"~"police|fire_station|hospital|clinic|doctors"](${bbox});
                  way["amenity"~"police|fire_station|hospital|clinic|doctors"](${bbox});
                );
                out center;
            `;
            const osmResponse = await axios.post('https://overpass-api.de/api/interpreter', query, {
                headers: { 'Content-Type': 'text/plain' },
            });

            osmPoints = osmResponse.data.elements.map(el => {
                const tags = el.tags || {};
                return {
                    id: `osm-${el.id}`,
                    lat: el.lat || (el.center ? el.center.lat : null),
                    lon: el.lon || (el.center ? el.center.lon : null),
                    type: tags.amenity,
                    name: tags.name || formatName(tags.amenity),
                    address: (tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}` : '').trim(),
                    phone: tags.phone || tags['contact:phone'] || tags.mobile || '',
                    isOfficial: false,
                    fuente: 'OpenStreetMap',
                };
            }).filter(p => p.lat && p.lon);
        } catch {
            // Sin conexión o Overpass caído: solo se usan los datos locales
        }

        // 3. Combinar y deduplicar
        const finalPoints = [...localPoints];
        osmPoints.forEach(osmP => {
            const isDuplicate = localPoints.some(localP => {
                const dist = Math.sqrt(Math.pow(localP.lat - osmP.lat, 2) + Math.pow(localP.lon - osmP.lon, 2));
                return dist < 0.0012;
            });
            if (!isDuplicate) finalPoints.push(osmP);
        });

        return finalPoints;
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
