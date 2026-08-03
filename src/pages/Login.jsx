import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const result = await login(username);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen font-sans">
            {/* Left Side - Brand & Design */}
            <div className="hidden lg:flex flex-1 relative flex-col justify-end p-10 overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>

                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-full h-96 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>

                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-blue-400/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)]"></div>
                <div className="absolute top-1/3 left-1/3 w-64 h-64 border border-white/10 rounded-full"></div>

                <div className="relative z-10 text-white">
                    <div className="mb-6 inline-block p-3 bg-blue-600/30 backdrop-blur-md rounded-xl border border-blue-400/40 shadow-lg">
                        <span className="text-3xl">🌐</span>
                    </div>
                    <h1 className="text-5xl font-extrabold mb-4 text-white tracking-tight drop-shadow-md">
                        Continuidad <span className="text-blue-400">del Negocio</span>
                    </h1>
                    <p className="text-xl text-slate-200 max-w-lg leading-relaxed font-light">
                        Sistema de georreferenciación para la gestión de crisis.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-[500px] flex flex-col justify-center p-10 bg-white">
                <div className="w-full max-w-sm mx-auto">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl mb-5 text-white shadow-lg shadow-blue-500/50">
                            🛡️
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Bienvenido
                        </h2>
                        <p className="text-slate-500">
                            Identifíquese para acceder a la plataforma.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-slate-700">Su Nombre / Identificador</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Ej. Juan Pérez"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base transition-all bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:shadow-blue-600/40 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Ingresando...' : 'Acceder al Panel'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-5 p-4 rounded-xl text-sm flex items-start gap-3 border bg-red-50 text-red-700 border-red-200">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="font-bold mb-0.5">Error</p>
                                <p className="leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center text-xs text-slate-400 font-medium uppercase tracking-wide">
                        SISTEMA DE GESTIÓN DE CONTINUIDAD DEL NEGOCIO
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
