export const downloadColaboradoresCSV = (colaboradores, filename = 'colaboradores_afectados.csv') => {
    if (!colaboradores || colaboradores.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Columnas anonimizadas (Cumplimiento estricto PII - sin nombres, cédulas, teléfonos ni correos)
    const headers = [
        "Identificacion", "Identificador_Anonimo", "Area", "Gerencia",
        "Modalidad", "Compañia", "Sede_Asignada", "Ciudad", "Activo"
    ];

    // Mapa de columna → campo en el objeto del colaborador
    const fieldMap = {
        "Identificacion": "identificacion",
        "Identificador_Anonimo": (c) => `${c.nombres || 'Colaborador'} ${c.apellidos || c.id}`,
        "Area": "area",
        "Gerencia": "gerencia",
        "Modalidad": "modalidad",
        "Compañia": "compania",
        "Sede_Asignada": (c) => c.sede_nombre || '',
        "Ciudad": "ciudad",
        "Activo": (c) => c.activo !== undefined ? (c.activo ? 'Sí' : 'No') : 'Sí',
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

