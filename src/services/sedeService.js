// Versión Local-Portable: lee sedes desde el archivo JSON estático
import sedesData from '../data/sedes.json';

export const getSedes = async () => {
    return sedesData;
};

// Las siguientes funciones retornan datos locales simulados.
// En la versión portable las sedes son de solo lectura (información pública).
export const createSede = async (sedeData) => {
    console.warn('[Local] createSede no persiste cambios en la versión portable.');
    return { ...sedeData, id: Date.now() };
};

export const updateSede = async (id, sedeData) => {
    console.warn('[Local] updateSede no persiste cambios en la versión portable.');
    return { id, ...sedeData };
};

export const deleteSede = async (id) => {
    console.warn('[Local] deleteSede no persiste cambios en la versión portable.');
    return { success: true };
};
