// Versión Local-Portable: los procesos son parte de cada sede (sedes.json).
// Este servicio es un stub que evita errores en componentes que lo importen.

export const getProcesos = async () => {
    console.warn('[Local] getProcesos: los procesos están embebidos en sedes.json.');
    return [];
};

export const createProceso = async (procesoData) => {
    console.warn('[Local] createProceso no persiste en la versión portable.');
    return { ...procesoData, id: Date.now() };
};

export const updateProceso = async (id, procesoData) => {
    console.warn('[Local] updateProceso no persiste en la versión portable.');
    return { id, ...procesoData };
};

export const deleteProceso = async (id) => {
    console.warn('[Local] deleteProceso no persiste en la versión portable.');
    return { success: true };
};
