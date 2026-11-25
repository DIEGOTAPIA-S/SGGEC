/**
 * Motor 100% Local (Offline) de Limpieza, Estandarización y Geocodificación Aproximada
 * de Direcciones Colombianas para las 13 ciudades con sedes de Colmédica.
 *
 * - NO realiza llamadas de red (protege la privacidad de las direcciones de empleados).
 * - Limpia ruido no cartográfico: Apto, Torre, Interior, Bloque, Piso, Casa, Conjunto, Edificio, Barrio, etc.
 * - Detecta automáticamente la ciudad a partir del texto de la dirección/barrio o nomenclatura vial.
 * - Calcula coordenadas (latitud, longitud) basadas en la cuadrícula urbana de cada ciudad.
 */

// Centros y modelos de cuadrícula urbana (Calle / Carrera) para las 13 ciudades de Colmédica
const CITY_MODELS = {
    Bogotá: {
        name: 'Bogotá',
        centerLat: 4.653,
        centerLon: -74.076,
        keywords: [
            'bogota', 'bogotá', 'd.c', 'dc', 'usaquen', 'usaquén', 'chapinero', 'santa fe', 'san cristobal',
            'usme', 'tunjuelito', 'bosa', 'kennedy', 'fontibon', 'fontibón', 'engativa', 'engativá', 'suba',
            'barrios unidos', 'teusaquillo', 'martires', 'mártires', 'antonio nariño', 'puente aranda',
            'candelaria', 'rafael uribe', 'ciudad bolivar', 'ciudad bolívar', 'cedritos', 'colina', 'niza',
            'bulevar', 'salitre', 'hayuelos', 'modelia', 'normandia', 'chico', 'chicó', 'unicentro',
            'santa barbara', 'santa bárbara', 'belaire', 'mazuren', 'mazurén', 'tobaria', 'toberin', 'toberín',
            'tintal', 'castilla', 'marsella', 'galerias', 'galerías', 'palermo', 'soledad', 'restrepo',
            'venecia', 'alcala', 'alcalá', 'autopista norte', 'auto norte', 'autonorte', 'soacha', 'mosquera',
            'funza', 'madrid', 'cota', 'cajica', 'cajicá', 'zipaquira', 'zipaquirá', 'facatativa'
        ],
        // En Bogotá: Calles suben hacia el Norte (Calle 1 ~ 4.590 -> Calle 200 ~ 4.775)
        // Carreras suben hacia el Occidente (Cra 1 ~ -74.060 -> Cra 120 ~ -74.145)
        computeLatLon: (mainType, mainNum, secNum, isSur, isEste) => {
            let calle = 72;
            let cra = 30;
            if (mainType === 'CL' || mainType === 'DG' || mainType === 'AC') {
                calle = isSur ? -mainNum : mainNum;
                cra = isEste ? -secNum : secNum;
            } else {
                cra = isEste ? -mainNum : mainNum;
                calle = isSur ? -secNum : secNum;
            }
            // Limitar a rangos razonables de Bogotá
            calle = Math.max(-90, Math.min(245, calle));
            cra = Math.max(-20, Math.min(160, cra));

            // Interpolación calibrada con las 17 sedes reales de Colmédica en Bogotá:
            // Cl 19 -> 4.62, Cl 63 -> 4.653, Cl 93 -> 4.678, Cl 127 -> 4.708, Cl 140 -> 4.719, Cl 185 -> 4.763
            const lat = 4.596 + (calle * 0.000905);
            // Cra 7 -> -74.035 (Norte) / -74.063 (Centro), Cra 58 -> -74.071, Cra 68 -> -74.088, Cra 103 -> -74.112
            // Ajuste por inclinación de los cerros orientales de Bogotá hacia el este en el norte
            const eastShift = Math.max(0, (calle - 50) * 0.00022);
            const lon = -74.056 - (cra * 0.00068) + eastShift;
            return [lat, lon];
        }
    },
    Chía: {
        name: 'Chía',
        centerLat: 4.864,
        centerLon: -74.052,
        keywords: ['chia', 'chía', 'belenus', 'pradilla', 'la caro', 'sindamanoy', 'yerbabuena', 'fonqueta', 'tiquiza'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            return [
                4.855 + Math.min(40, cl) * 0.0008,
                -74.045 - Math.min(35, kr) * 0.0007
            ];
        }
    },
    Medellín: {
        name: 'Medellín',
        centerLat: 6.235,
        centerLon: -75.575,
        keywords: [
            'medellin', 'medellín', 'el poblado', 'poblado', 'laureles', 'envigado', 'sabaneta', 'bello',
            'itagui', 'itagüí', 'belen', 'belén', 'robledo', 'estadio', 'calasanz', 'las palmas', 'tesoro',
            'oviedo', 'santafe', 'aguacatala', 'guayabal', 'castilla', 'aranjuez', 'manrique', 'buenos aires',
            'rionegro', 'llanogrande', 'la estrella', 'copacabana'
        ],
        // En Medellín: Calle 50 (Colombia) ~ 6.252, Calle 10 (Poblado) ~ 6.209. Cra 43A (Poblado) ~ -75.568, Cra 80 ~ -75.602
        computeLatLon: (mainType, mainNum, secNum, isSur) => {
            let cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            let kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            if (isSur) cl = -cl;
            cl = Math.max(-80, Math.min(130, cl));
            kr = Math.max(1, Math.min(100, kr));
            const lat = 6.200 + (cl * 0.00095);
            const lon = -75.535 - (kr * 0.00078);
            return [lat, lon];
        }
    },
    Cali: {
        name: 'Cali',
        centerLat: 3.437,
        centerLon: -76.535,
        keywords: [
            'cali', 'tequendama', 'imbanaco', 'san fernando', 'ciudad jardin', 'ciudad jardín', 'pance',
            'valle del lili', 'lili', 'ingenio', 'caney', 'limonar', 'capri', 'granada', 'versalles',
            'chipichape', 'mengu', 'sameco', 'flora', 'la flora', 'jamundi', 'jamundí', 'yumbo', 'palmira',
            'alfonso lopez', 'aguablanca', 'melendez', 'meléndez'
        ],
        computeLatLon: (mainType, mainNum, secNum, isOeste, isNorte) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            const lat = 3.445 - (Math.min(120, kr) * 0.00065) + (isNorte ? 0.025 : 0);
            const lon = -76.535 + (Math.min(100, cl) * 0.00045) - (isOeste ? 0.020 : 0);
            return [lat, lon];
        }
    },
    Barranquilla: {
        name: 'Barranquilla',
        centerLat: 10.996,
        centerLon: -74.805,
        keywords: [
            'barranquilla', 'alto prado', 'el prado', 'riomar', 'buenavista', 'villa country', 'boston',
            'recreo', 'delicias', 'ciudad jardin', 'miramar', 'alameda del rio', 'soledad', 'puerto colombia',
            'villa santos', 'paraíso', 'paraiso', 'el golf', 'country', 'olaya', 'murillo'
        ],
        // En Barranquilla: Calles suben hacia el Noroccidente (Cl 76 ~ 11.004), Carreras suben de Sur a Norte (Cra 55 ~ -74.803)
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            const lat = 10.960 + (Math.min(115, cl) * 0.00058);
            const lon = -74.775 - (Math.min(90, Math.max(10, kr)) * 0.00052);
            return [lat, lon];
        }
    },
    Cartagena: {
        name: 'Cartagena',
        centerLat: 10.405,
        centerLon: -75.525,
        keywords: [
            'cartagena', 'bocagrande', 'castillogrande', 'laguito', 'manga', 'pie de la popa', 'popa',
            'cabrero', 'marbella', 'crespo', 'las ramblas', 'serena del mar', 'manzanillo', 'boquilla',
            'torices', 'pie del cerro', 'espinal', 'bosque', 'almirante colon', 'caracoles', 'campestre',
            'recreo', 'concepcion', 'tershera', 'turbaco', 'mamonal', 'barrio chino', 'getsemani'
        ],
        computeLatLon: (mainType, mainNum, secNum, _isSur, _isEste, rawLower) => {
            if (rawLower.includes('ramblas') || rawLower.includes('serena') || rawLower.includes('manzanillo') || rawLower.includes('zona norte')) {
                return [10.515 + ((mainNum % 15) * 0.0004), -75.466 - ((secNum % 15) * 0.0004)];
            }
            if (rawLower.includes('bocagrande') || rawLower.includes('castillogrande') || rawLower.includes('laguito')) {
                return [10.398 + ((mainNum % 12) * 0.0004), -75.557 - ((secNum % 10) * 0.0004)];
            }
            return [
                10.390 + (Math.min(80, mainNum) * 0.0005),
                -75.540 + (Math.min(80, secNum) * 0.0007)
            ];
        }
    },
    Bucaramanga: {
        name: 'Bucaramanga',
        centerLat: 7.116,
        centerLon: -73.114,
        keywords: [
            'bucaramanga', 'cabecera', 'sotomayor', 'floridablanca', 'cañaveral', 'canaveral', 'giron',
            'girón', 'piedecuesta', 'provenza', 'diamante', 'aurora', 'prado', 'mejoras publicas',
            'conucos', 'terrazas', 'san alonso', 'universidad', 'mutis', 'real de minas', 'cacique'
        ],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            // En Bucaramanga: Cl 36 ~ 7.125, Cl 52 ~ 7.115, Cl 105 (Provenza) ~ 7.088; Cra 15 ~ -73.125, Cra 33 ~ -73.110
            const lat = 7.145 - (Math.min(120, cl) * 0.00055);
            const lon = -73.135 + (Math.min(45, kr) * 0.00075);
            return [lat, lon];
        }
    },
    Villavicencio: {
        name: 'Villavicencio',
        centerLat: 4.143,
        centerLon: -73.638,
        keywords: [
            'villavicencio', 'villavo', 'meta', 'barzal', 'buque', 'caudal', 'grama', 'llanocentro',
            'primavera', 'esperanza', 'porfia', 'porfía', 'amarilo', 'hacienda rosablanca', 'macarena',
            'popular', 'recreo', 'vanguardia', 'caños negros', 'catama', 'kirpas', 'conjunto cerrado'
        ],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            // En Villavicencio: Cl 32 # 40A ~ (4.1424, -73.6386), Cl 38 # 33 (Gobernación) ~ (4.1514, -73.6377)
            const lat = 4.118 + (Math.min(60, cl) * 0.00078);
            const lon = -73.612 - (Math.min(55, kr) * 0.00065);
            return [lat, lon];
        }
    },
    Ibagué: {
        name: 'Ibagué',
        centerLat: 4.443,
        centerLon: -75.223,
        keywords: ['ibague', 'ibagué', 'tolima', 'cadiz', 'cádiz', 'piedrapintada', 'macarena', 'vergel', 'jordán', 'jordan', 'salado', 'mirolindo', 'interlaken', 'pola'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            const lat = 4.450 - (Math.min(100, cl) * 0.00030);
            const lon = -75.245 + (Math.min(100, cl) * 0.00070) - (Math.min(15, kr) * 0.0005);
            return [lat, lon];
        }
    },
    Manizales: {
        name: 'Manizales',
        centerLat: 5.056,
        centerLon: -75.486,
        keywords: ['manizales', 'caldas', 'el cable', 'palogrande', 'estrella', 'belen', 'milán', 'milan', 'palermo', 'chipre', 'sultana', 'villamaria', 'la enea', 'florida'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            return [
                5.072 - (Math.min(90, cl) * 0.00028),
                -75.525 + (Math.min(90, cl) * 0.00062) + ((kr - 23) * 0.0004)
            ];
        }
    },
    Pereira: {
        name: 'Pereira',
        centerLat: 4.806,
        centerLon: -75.688,
        keywords: ['pereira', 'risaralda', 'dosquebradas', 'circunvalar', 'pinares', 'alamos', 'álamos', 'cuba', 'cerritos', 'utp', 'maraya', 'providencia', 'corales'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            return [
                4.815 - (Math.min(90, cl) * 0.00042),
                -75.675 - (Math.min(90, cl) * 0.00065) - (Math.min(30, kr) * 0.0004)
            ];
        }
    },
    Neiva: {
        name: 'Neiva',
        centerLat: 2.937,
        centerLon: -75.287,
        keywords: ['neiva', 'huila', 'quirinal', 'altico', 'canaima', 'buganviles', 'santa ines', 'las palmas', 'timanco', 'cándido', 'candido'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            return [
                2.922 + (Math.min(80, cl) * 0.00072),
                -75.296 + (Math.min(50, kr) * 0.00065)
            ];
        }
    },
    Yopal: {
        name: 'Yopal',
        centerLat: 5.332,
        centerLon: -72.392,
        keywords: ['yopal', 'casanare', 'alcaravan', 'bicentenario', 'camoruco', 'llano lindo', 'campiña', 'morichal', 'garzon'],
        computeLatLon: (mainType, mainNum, secNum) => {
            const cl = (mainType === 'CL' || mainType === 'DG') ? mainNum : secNum;
            const kr = (mainType === 'KR' || mainType === 'TV') ? mainNum : secNum;
            return [
                5.352 - (Math.min(60, cl) * 0.00065),
                -72.408 + (Math.min(45, kr) * 0.00062)
            ];
        }
    }
};

/**
 * Limpia una dirección colombiana cruda (como viene de SAP) eliminando apartamento,
 * torre, interior, bloque, piso, conjunto, barrio y estandarizando la nomenclatura vial.
 */
export const cleanColombianAddress = (rawAddress) => {
    if (!rawAddress) return '';
    let s = String(rawAddress).trim();

    // 1. Estandarizar prefijos viales comunes
    s = s
        .replace(/\b(CARRERA|CRA\.?|KRA\.?|KR\.?|CR\.?)\b/gi, 'Carrera')
        .replace(/\b(CALLE|CLL\.?|CL\.?)\b/gi, 'Calle')
        .replace(/\b(DIAGONAL|DIAG\.?|DG\.?)\b/gi, 'Diagonal')
        .replace(/\b(TRANSVERSAL|TRANSV\.?|TV\.?|TRV\.?|TR\.?)\b/gi, 'Transversal')
        .replace(/\b(AVENIDA|AVDA\.?|AV\.?)\b/gi, 'Av.')
        .replace(/\b(AUTOPISTA|AUTOP\.?|AUT\.?)\b/gi, 'Autopista')
        .replace(/\b(NRO\.?|NO\.?|NUM\.?|NÚMERO|NUMERO|N°|º)\s*/gi, '# ');

    // 2. Cortar sufijos de propiedad horizontal / interior que no pertenecen a la vía pública
    //    (Apto, Apartamento, Torre, Interior, Int, Bloque, Blq, Piso, Casa, Manzana, Mz, Lote, Conjunto, Edificio, Barrio, Br, Etapa, Local, Oficina)
    const cutRegex = /\s+(?:,|-|\.)?\s*\b(APTO\.?|APARTAMENTO|AP\.?|TORRE|TRR\.?|INTERIOR|INT\.?|BLOQUE|BLQ\.?|BL\.?|PISO|PI\.?|CASA|CS\.?|MANZANA|MZ\.?|LOTE|LT\.?|CONJUNTO|CONJ\.?|EDIFICIO|EDIF\.?|ED\.?|BARRIO|BRR\.?|BR\.?|ETAPA|ET\.?|LOCAL|LC\.?|OFICINA|OF\.?|URBANIZACION|URB\.?|UNIDAD|UNID\.?|PORTERIA|AGRUPACION)\b.*$/i;
    const cleaned = s.replace(cutRegex, '').replace(/\s+/g, ' ').trim();

    return cleaned || s;
};

/**
 * Detecta la ciudad más probable a partir del texto completo de la dirección, sede o gerencia.
 */
export const detectCityFromText = (rawAddress = '', extraHint = '') => {
    const combined = `${rawAddress} ${extraHint}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Revisar primero ciudades distintas de Bogotá (para que palabras específicas como Villavicencio, Chía, Cali, etc. tengan prioridad)
    const priorityOrder = [
        'Villavicencio', 'Cartagena', 'Barranquilla', 'Bucaramanga', 'Medellín',
        'Cali', 'Chía', 'Ibagué', 'Manizales', 'Pereira', 'Neiva', 'Yopal', 'Bogotá'
    ];

    for (const cityKey of priorityOrder) {
        const model = CITY_MODELS[cityKey];
        if (model.keywords.some(kw => {
            const normKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const regex = new RegExp(`\\b${normKw}\\b`, 'i');
            return regex.test(combined);
        })) {
            return model.name;
        }
    }

    return 'Bogotá'; // Por defecto Bogotá (donde está la mayor concentración de sedes y personal)
};

/**
 * Geocodifica localmente en 0ms una dirección colombiana (cruda o limpia),
 * retornando { latitud, longitud, ciudad, direccionLimpia }.
 */
export const geocodeColombianAddressLocal = (rawAddress, extraHint = '', rowIndex = 1) => {
    const ciudad = detectCityFromText(rawAddress, extraHint);
    const model = CITY_MODELS[ciudad] || CITY_MODELS['Bogotá'];
    const direccionLimpia = cleanColombianAddress(rawAddress);

    const upper = String(direccionLimpia || rawAddress || '').toUpperCase();
    const isSur = /\bSUR\b/.test(upper);
    const isEste = /\bESTE\b/.test(upper);
    const isOeste = /\bOESTE\b/.test(upper);
    const isNorte = /\bNORTE\b/.test(upper);

    // Extraer vía principal (Calle/Diagonal o Carrera/Transversal) y primer/segundo número
    // Ejemplos soportados: "Calle 140 # 11 - 45", "CR 43B 14-44", "Av. Cl. 127 #58-59", "DG 38 SUR 82 30"
    const match = upper.match(/\b(CALLE|CL|CLL|DIAGONAL|DG|DIAG|AC|CARRERA|KR|CR|CRA|KRA|TRANSVERSAL|TV|TRV|TR|AK)\s*(\d{1,3})[A-Z]?(?:\s+BIS)?(?:\s+SUR|\s+NORTE|\s+ESTE|\s+OESTE)?\s*(?:#|NO\.?|NRO\.?|\s)\s*(\d{1,3})/i);

    // Pequeña dispersión determinista por fila (±120 m) para evitar que dos colaboradores de la misma cuadra queden exactamente uno encima del otro
    const jitterLat = (((rowIndex * 37) % 100) - 50) * 0.000018;
    const jitterLon = (((rowIndex * 53) % 100) - 50) * 0.000018;

    if (match) {
        const prefix = match[1].toUpperCase();
        const mainNum = parseInt(match[2], 10) || 50;
        const secNum = parseInt(match[3], 10) || 20;

        const isCalleLike = ['CALLE', 'CL', 'CLL', 'DIAGONAL', 'DG', 'DIAG', 'AC'].includes(prefix);
        const mainType = isCalleLike ? 'CL' : 'KR';

        const [lat, lon] = model.computeLatLon(mainType, mainNum, secNum, isSur || isOeste, isEste || isNorte, upper.toLowerCase());
        return {
            latitud: Number((lat + jitterLat).toFixed(6)),
            longitud: Number((lon + jitterLon).toFixed(6)),
            ciudad: model.name,
            direccionLimpia
        };
    }

    // Fallback si la dirección es rural o un nombre de edificio sin números ("Belenus Chía", "CC Las Ramblas", etc.):
    // Ubicar en torno al centro urbano de la ciudad detectada con dispersión determinista
    const angle = (rowIndex * 137.5) * (Math.PI / 180);
    const radiusDeg = 0.004 + ((rowIndex % 15) * 0.0012);
    return {
        latitud: Number((model.centerLat + Math.sin(angle) * radiusDeg).toFixed(6)),
        longitud: Number((model.centerLon + Math.cos(angle) * radiusDeg).toFixed(6)),
        ciudad: model.name,
        direccionLimpia
    };
};
