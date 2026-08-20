import React, { useState, useEffect } from 'react';
import { School, Lock, ArrowRight, ShieldCheck, Mail, Info, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordHint, setShowPasswordHint] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Initial state empty
    useEffect(() => {
        setEmail('');
        setPassword('');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // --- ANTI-SQL INJECTION & SANITIZATION LAYER ---
        const trimmedEmail = email.trim().toLowerCase();
        const forbiddenChars = /['"%;\\]/; // Bloquear caracteres de inyección SQL sin alterar guiones o contraseñas

        if (forbiddenChars.test(trimmedEmail)) {
            setError("Intento de acceso no autorizado. Formato de correo no válido.");
            authService.logSecurityEvent(trimmedEmail || "unknown", "Detección de Carácter Inválido en Login", "high");
            setIsLoading(false);
            return;
        }

        // Simulation of network delay for feedback
        setTimeout(async () => {
            try {
                const user = await authService.login(trimmedEmail, password);
                if (user) {
                    onLogin();
                } else {
                    setError("Acceso denegado. Verifica tus credenciales institucionales.");
                    setIsLoading(false);
                }
            } catch (err: any) {
                setError(err.message || "Error de seguridad inesperado.");
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen h-screen bg-slate-50 flex items-center justify-center font-outfit p-3 sm:p-6 overflow-hidden selection:bg-blue-100 relative">
            {/* Ambient Background Fallback Mesh */}
            <div className="absolute inset-0 bg-mesh-gradient opacity-30 mix-blend-multiply pointer-events-none"></div>

            {/* Main Container */}
            <div className="w-full max-w-[920px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col md:flex-row overflow-hidden relative z-10 my-auto">

                {/* Left Side: Branding & Illustration */}
                <div className="w-full md:w-5/12 bg-[#f0f7ff]/80 relative p-5 sm:p-6 flex flex-col items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-blue-50 shrink-0">
                    <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute top-[-30px] left-[-30px] w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10 w-full flex flex-row md:flex-col items-center justify-between md:justify-center text-left md:text-center gap-4">
                        <div className="relative group shrink-0">
                            <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 group-hover:opacity-40 transition-all duration-700"></div>
                            <div className="relative w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-lg border border-blue-50 flex items-center justify-center transform hover:rotate-3 transition-transform">
                                <img src="/logo_guaimaral.png" alt="Logo Institucional" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-1">
                                Docente <span className="text-blue-600">AI</span> Pro
                            </h2>
                            <p className="text-slate-500 font-medium text-xs max-w-[240px] leading-relaxed hidden sm:block">
                                Planificación Didáctica con Inteligencia Artificial
                            </p>
                        </div>

                        <div className="hidden md:flex flex-wrap justify-center gap-1.5 mt-2">
                            <div className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-100 flex items-center gap-1">
                                <ShieldCheck size={12} className="text-blue-500" />
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-wider">Acceso Seguro</span>
                            </div>
                            <div className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-100 flex items-center gap-1">
                                <School size={12} className="text-indigo-500" />
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-wider">I.E. Guaimaral</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full md:w-7/12 p-5 sm:p-8 flex flex-col justify-center bg-white">
                    <div className="max-w-xs sm:max-w-sm mx-auto w-full">
                        <div className="mb-4 text-center md:text-left">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-0.5">Ingreso de Personal</h1>
                            <p className="text-slate-400 text-xs font-medium">Ingresa tus credenciales institucionales.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[1.5px] ml-1 flex items-center gap-1">
                                    <Mail size={11} className="text-blue-500" /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@guaimaral.edu.co"
                                    className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[1.5px] ml-1 flex items-center gap-1">
                                    <Lock size={11} className="text-blue-500" /> Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={isPasswordVisible ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        title={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2 border border-red-100 animate-shake">
                                    <AlertTriangle size={13} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${isLoading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98]'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            <span>Autenticando...</span>
                                        </>
                                    ) : (
                                        <>
                                            Acceder al Panel <ArrowRight size={14} />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setShowPasswordHint(!showPasswordHint)}
                                className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors font-bold inline-flex items-center gap-1"
                            >
                                <Info size={12} /> ¿Problemas para ingresar?
                            </button>

                            {showPasswordHint && (
                                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-left animate-fade-in-up">
                                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                                        Favor contactar a la Rectoría / Coordinación de la I.E. Guaimaral para restablecer tu contraseña.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                &copy; {new Date().getFullYear()} I.E. Guaimaral • San José de Cúcuta
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
