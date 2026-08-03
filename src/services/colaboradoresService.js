let localColaboradores = [];

export const fetchColaboradores = async () => {
    try {
        const cached = sessionStorage.getItem('sgcn_colaboradores');
        return cached ? JSON.parse(cached) : localColaboradores;
    } catch (error) {
        console.error("Error fetching local colaboradores:", error);
        return [];
    }
};

export const uploadColaboradoresExcel = async (file) => {
    // Procesado del lado del cliente en DataTab.jsx
    return { created: 0, updated: 0 };
};

export const deleteColaboradores = async () => {
    try {
        sessionStorage.removeItem('sgcn_colaboradores');
        localColaboradores = [];
        return { message: "Personal eliminado de la memoria temporal." };
    } catch (error) {
        console.error("Error clearing local colaboradores:", error);
        throw error;
    }
};
