import { useState, useEffect } from 'react';

const NewsFeed = ({ isOpen, onClose, onCrisisDetected }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState('emergencia');
    const [isExpanded, setIsExpanded] = useState(false);


    const topics = {
        emergencia: { label: '🚨 Emergencia', query: 'Bogotá (emergencia OR evacuación OR explosión OR "fuga de gas" OR incendio OR colapso)' },
        crisis: { label: '🤝 Factores Sociales', query: 'Colombia (protesta OR paro OR vandalismo OR violencia OR huelga OR disturbios OR "orden público" OR atentado OR "conflicto social")' },
        desacres: { label: '🌍 Factores Físicos/Ambientales', query: 'Colombia (sismo OR terremoto OR inundación OR derrumbe OR deslizamiento OR vendaval OR erupción OR sequía OR "ola de calor")' },
        servicios: { label: '🔌 Servicios Públicos', query: 'Colombia ("corte de agua" OR apagón OR "corte de luz" OR racionamiento OR "falla eléctrica" OR acueducto OR alcantarillado OR "gas domiciliario" OR "servicios públicos" OR EPM OR Codensa OR "Gas Natural Fenosa" OR "Gases del Caribe" OR "Aguas de Bogotá" OR EAAB OR Emcali OR "interrupción del servicio")' },
        continuidad: { label: '💻 Noticias IT', query: 'Colombia (ciberataque OR hackeo OR ransomware OR "falla de sistema" OR "caída de red" OR "brecha de seguridad" OR "ataque informático" OR phishing OR malware OR "interrupción tecnológica")' },
        movilidad: { label: '🚦 Movilidad', query: 'Bogotá (movilidad OR "cierre via" OR accidente OR transmilenio OR bloqueo)' }
    };


    useEffect(() => {
        if (isOpen) {
            fetchNews(topics[activeTab].query);
        }
    }, [isOpen, activeTab]);

    const fetchNews = async (query) => {
        setLoading(true);
        setError(false);
        const targetUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es-419&gl=CO&ceid=CO:es-419`;

        const parseXmlItems = (xmlText) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const items = xmlDoc.getElementsByTagName("item");
            return Array.from(items).map(item => {
                const rawTitle = item.getElementsByTagName("title")[0]?.textContent || '';
                const parts = rawTitle.split(' - ');
                const title = parts.slice(0, -1).join(' - ') || rawTitle;
                const source = parts[parts.length - 1] || item.getElementsByTagName("source")[0]?.textContent || 'Google News';
                const rawDesc = item.getElementsByTagName("description")[0]?.textContent || '';
                const summary = rawDesc.replace(/<[^>]*>?/gm, '');
                return {
                    title,
                    link: item.getElementsByTagName("link")[0]?.textContent || '',
                    summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
                    source,
                    published: item.getElementsByTagName("pubDate")[0]?.textContent || new Date().toISOString()
                };
            });
        };

        try {
            let parsedNews = [];

            // Intento 1: rss2json API
            try {
                const controller1 = new AbortController();
                const t1 = setTimeout(() => controller1.abort(), 5000);
                const r1 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}`, { signal: controller1.signal });
                clearTimeout(t1);
                if (r1.ok) {
                    const data = await r1.json();
                    if (data && Array.isArray(data.items) && data.items.length > 0) {
                        parsedNews = data.items.map(it => {
                            const rawTitle = it.title || '';
                            const parts = rawTitle.split(' - ');
                            const title = parts.slice(0, -1).join(' - ') || rawTitle;
                            const source = parts[parts.length - 1] || it.author || 'Google News';
                            const summary = (it.description || '').replace(/<[^>]*>?/gm, '');
                            return {
                                title,
                                link: it.link || '',
                                summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
                                source,
                                published: it.pubDate || new Date().toISOString()
                            };
                        });
                    }
                }
            } catch {
                // Continuar al siguiente método
            }

            // Intento 2: allorigins JSON wrapper
            if (parsedNews.length === 0) {
                const controller2 = new AbortController();
                const t2 = setTimeout(() => controller2.abort(), 6000);
                const r2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { signal: controller2.signal });
                clearTimeout(t2);
                if (r2.ok) {
                    const json = await r2.json();
                    if (json && json.contents) {
                        parsedNews = parseXmlItems(json.contents);
                    }
                }
            }

            if (parsedNews.length === 0) {
                setError(true);
            }
            setNews(parsedNews.slice(0, 10));
        } catch (err) {
            console.error("Error fetching news:", err);
            setNews([]);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Calcular tiempo relativo (ej. "hace 2 horas")
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (isNaN(diffInSeconds)) return dateString; // Fallback si no parsea bien

        if (diffInSeconds < 60) return 'hace momentos';
        if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
        return `hace ${Math.floor(diffInSeconds / 86400)} d`;
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: isExpanded ? '800px' : '400px', // Dynamic width
            maxWidth: '100vw',
            background: 'white',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
            zIndex: 5000,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease-in-out, transform 0.3s ease-in-out',
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}>
            {/* Header */}
            <div style={{ padding: '20px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        📰 Sala de Noticias
                    </h2>
                    {/* Expand Toggle Button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Contraer" : "Expandir"}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '4px 8px' }}
                    >
                        {isExpanded ? '⇥⇤' : '⇤⇥'}
                    </button>
                </div>
                <button
                    onClick={onClose}
                    title="Cerrar Noticias"
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    &times;
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                {Object.entries(topics).map(([key, { label }]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === key ? 'white' : '#f8fafc',
                            border: 'none',
                            borderBottom: activeTab === key ? '2px solid #2563eb' : 'none',
                            color: activeTab === key ? '#2563eb' : '#64748b',
                            fontWeight: activeTab === key ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', background: '#f1f5f9' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando noticias... ⏳</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '25px 20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📰</div>
                        <h4 style={{ color: '#334155', margin: '0 0 8px' }}>Monitoreo de Noticias y Alertas</h4>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: '1.5', margin: '0 0 16px' }}>
                            Seleccione una de las fuentes oficiales a continuación para consultar los titulares en tiempo real de esta categoría:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            <a
                                href={`https://news.google.com/search?q=${encodeURIComponent(topics[activeTab].query)}&hl=es-419&gl=CO&ceid=CO%3Aes-419`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ background: '#2563eb', color: 'white', textDecoration: 'none', padding: '11px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', display: 'block' }}
                            >
                                📰 Abrir Google News: {topics[activeTab].label} ↗
                            </a>
                            <a
                                href="https://www.sgc.gov.co/sismos"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ background: '#0f172a', color: 'white', textDecoration: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', display: 'block' }}
                            >
                                🌍 Servicio Geológico Colombiano (SGC) ↗
                            </a>
                            <a
                                href="https://portal.gestiondelriesgo.gov.co/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ background: '#334155', color: 'white', textDecoration: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', display: 'block' }}
                            >
                                🚨 Portal UNGRD - Gestión del Riesgo ↗
                            </a>
                        </div>
                        <button
                            onClick={() => fetchNews(topics[activeTab].query)}
                            style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                            🔄 Actualizar titulares
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {news.map((item, index) => (
                            <div key={index} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
                                <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1rem', lineHeight: '1.4' }}>{item.title}</h4>
                                    {item.summary && (
                                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 10px 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: isExpanded ? 4 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {item.summary}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                                        <span style={{ fontWeight: '500', color: '#475569' }}>{item.source}</span>
                                        <span>{getRelativeTime(item.published)}</span>
                                    </div>
                                </a>
                            </div>
                        ))}
                        {news.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                No se encontraron noticias recientes para este tema.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.7rem', color: '#cbd5e1', background: '#1e293b' }}>
                Fuente: Google News RSS
            </div>
        </div>
    );
};

export default NewsFeed;
