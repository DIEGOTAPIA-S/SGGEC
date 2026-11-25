import React from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

const colaboradorIcon = L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    className: 'custom-colab-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
});

const createClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    let size = 36;
    let bg = '#3b82f6';
    if (count > 100) { size = 50; bg = '#1d4ed8'; }
    else if (count > 30) { size = 44; bg = '#2563eb'; }
    else if (count > 10) { size = 40; bg = '#3b82f6'; }

    return L.divIcon({
        html: `<div style="
            background: ${bg};
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold; font-size: ${size > 44 ? '14px' : '12px'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${count}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
};

const ColaboradoresLayer = ({ visible, colaboradores }) => {
    const map = useMap();

    if (!visible || !colaboradores || colaboradores.length === 0) return null;

    const validPoints = colaboradores.filter(c => c.latitud && c.longitud);

    return (
        <MarkerClusterGroup
            chunkedLoading
            chunkInterval={100}
            chunkDelay={20}
            maxClusterRadius={60}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            disableClusteringAtZoom={18}
            iconCreateFunction={createClusterIcon}
        >
            {validPoints.map((colab) => (
                <Marker
                    key={colab.id}
                    position={[colab.latitud, colab.longitud]}
                    icon={colaboradorIcon}
                >
                    <Popup>
                        <div style={{ minWidth: '210px' }}>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                                Colaborador {colab.id} <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>(Fila Excel #{colab.fila_excel || (colab.id + 1)})</span>
                            </h3>
                            <p style={{ margin: '4px 0 0 0', lineHeight: '1.45', fontSize: '0.83rem', color: '#475569' }}>
                                <strong>Compañía:</strong> {colab.compania || 'Colmédica'}<br />
                                <strong>Jerarquía / Gerencia:</strong> {colab.gerencia || 'N/A'}<br />
                                <strong>Dirección:</strong> {colab.direccion || 'N/A'}<br />
                                <strong>Ciudad detectada:</strong> {colab.ciudad || 'N/A'}
                            </p>
                            {colab.sede_asignada && (
                                <div style={{ marginTop: '8px', padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                    🏢 Sede más cercana: {colab.sede_nombre || 'Asignada'}
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MarkerClusterGroup>
    );
};

export default ColaboradoresLayer;

