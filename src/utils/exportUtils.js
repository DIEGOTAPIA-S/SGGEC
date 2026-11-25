export const downloadColaboradoresCSV = (colaboradores, filename = 'colaboradores_afectados.csv') => {
    if (!colaboradores || colaboradores.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Columnas anonimizadas para cruce manual con el Excel local del analista:
    // Sin Nombres, sin Cédula, sin ID SAP, sin Celular ni Correo.
    // Incluye Consecutivo, Fila exacta del Excel, Compañía, Jerarquía (Gerencia), Dirección y Sede Cercana.
    const headers = [
        "Consecutivo", "Fila_Excel", "Compañia", "Jerarquia_Gerencia",
        "Direccion", "Ciudad_Detectada", "Sede_Mas_Cercana"
    ];

    // Mapa de columna → campo en el objeto del colaborador
    const fieldMap = {
        "Consecutivo": (c) => `Colaborador ${c.id}`,
        "Fila_Excel": (c) => c.fila_excel || (c.id + 1),
        "Compañia": (c) => c.compania || 'Colmédica',
        "Jerarquia_Gerencia": (c) => c.gerencia || '',
        "Direccion": (c) => c.direccion || '',
        "Ciudad_Detectada": (c) => c.ciudad || '',
        "Sede_Mas_Cercana": (c) => c.sede_nombre || '',
    };

    const rows = colaboradores.map(c => {
        return headers.map(header => {
            const field = fieldMap[header];
            const val = typeof field === 'function' ? field(c) : (c[field] ?? '');
            const stringVal = String(val).replace(/"/g, '""');
            return `"${stringVal}"`;
        }).join(';');
    });

    // BOM UTF-8 para que Excel abra correctamente los caracteres especiales
    const csvContent = "\uFEFF" + headers.join(';') + "\n" + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

