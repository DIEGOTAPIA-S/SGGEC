import { useState } from 'react';

// Versión Local-Portable: la autenticación de dos factores no aplica en modo local.
// Se muestra un panel informativo indicando que la 2FA está activa por defecto.
const TwoFactorSetup = ({ onComplete }) => {
    const [acknowledged, setAcknowledged] = useState(false);

    if (acknowledged) {
        return (
            <div className="p-6 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-3 text-green-800 font-bold mb-2">
                    <span className="text-xl">🛡️</span>
                    Modo Local Seguro
                </div>
                <p className="text-sm text-green-700">
                    En la versión portable, la sesión está protegida localmente. No se almacena información en la red.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>🔒</span> Seguridad Local
            </h3>
            <p className="text-sm text-slate-600 mb-4">
                Esta es la <strong>versión portable</strong> del sistema. La autenticación de dos factores (2FA) con Microsoft Authenticator
                está disponible en la versión corporativa con servidor. En este modo, los datos del personal se cargan
                localmente desde un archivo Excel y <strong>nunca se envían a la red</strong>.
            </p>
            <button
                onClick={() => { setAcknowledged(true); if (onComplete) onComplete(); }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
                Entendido
            </button>
        </div>
    );
};

export default TwoFactorSetup;
