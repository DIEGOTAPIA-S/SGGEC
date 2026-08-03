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
                        <div style={{ minWidth: '200px' }}>
                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                                {colab.nombres} {colab.apellidos}
                            </h3>
                            <p style={{ margin: 0, fontWeight: 500, color: '#64748b', fontSize: '0.9rem' }}>{colab.cargo}</p>
                            <p style={{ margin: '5px 0 0 0', lineHeight: '1.4', fontSize: '0.85rem', color: '#94a3b8' }}>
                                <strong>Área:</strong> {colab.area}<br />
                                <strong>Gerencia:</strong> {colab.gerencia}<br />
                                <strong>Compañía:</strong> {colab.compania || 'N/A'}<br />
                                <strong>Modalidad:</strong> {colab.modalidad}
                            </p>
                            {colab.sede_asignada && (
                                <div style={{ marginTop: '8px', padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem' }}>
                                    🏢 Sede: {colab.sede_nombre || 'Asignada'}
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

