import sedesData from '../data/sedes.json';

const LOCAL_STORAGE_KEY = 'sgcn_eventos';

export const getEventos = async () => {
    try {
        const data = sessionStorage.getItem(LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading session storage eventos:", error);
        return [];
    }
};

export const createEvento = async (eventoData) => {
    try {
        const events = await getEventos();
        
        // Reconstruir los objetos de sedes afectadas usando los ids
        const sedesIds = eventoData.sedes_afectadas_ids || [];
        const sedesAfectadas = sedesData.filter(s => sedesIds.includes(s.id));

        const newEvent = {
            id: Date.now(), // ID único basado en timestamp
            tipo: eventoData.tipo || 'General',
            descripcion: eventoData.descripcion || '',
            fecha: new Date().toISOString(),
            nivel_alerta: eventoData.nivel_alerta || 'verde',
            geometria: eventoData.geometria || '',
            sedes_afectadas: sedesAfectadas,
            creado_por: 'Analista de Continuidad'
        };

        events.unshift(newEvent); // Agregar al principio
        sessionStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
        return newEvent;
    } catch (error) {
        console.error("Error creating local evento:", error);
        throw error;
    }
};

export const deleteEventos = async () => {
    try {
        sessionStorage.removeItem(LOCAL_STORAGE_KEY);
        return { status: 'success', message: 'Historial eliminado.' };
    } catch (error) {
        console.error("Error deleting local eventos:", error);
        throw error;
    }
};
