// Versión Local-Portable: lee entidades de apoyo desde el archivo JSON estático
import apoyoData from '../data/apoyo.json';

export const getEntidadesApoyo = async (tipo = null) => {
    if (tipo) {
        return apoyoData.filter(e => e.tipo === tipo);
    }
    return apoyoData;
};

export const getEntidadApoyo = async (id) => {
    const found = apoyoData.find(e => e.id === id || e.id === Number(id));
    if (!found) throw new Error(`Entidad de apoyo con id ${id} no encontrada`);
    return found;
};
