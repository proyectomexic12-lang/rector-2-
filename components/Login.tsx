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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-outfit p-0 sm:p-6 md:p-12 overflow-hidden selection:bg-blue-100">
            {/* Main Container mirroring the split layout of the reference */}
            <div className="w-full max-w-[1100px] h-full min-h-[600px] bg-white sm:rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col md:flex-row overflow-hidden relative">

                {/* Left Side: Illustration & Branding (Inspired by the drawing) */}
                <div className="w-full md:w-1/2 bg-[#f0f7ff] relative p-12 flex flex-col items-center justify-center overflow-hidden">
                    {/* Abstract Decorative Elements (Circles/Waves from image) */}
                    <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-blue-100/50 rounded-full blur-3xl"></div>

                    {/* Central Illustration Area */}
                    <div className="relative z-10 w-full max-w-sm">
                        <div className="relative flex flex-col items-center">
                            {/* Institutions Logo with Halo */}
                            <div className="relative mb-8 group">
                                <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 group-hover:opacity-40 transition-all duration-700"></div>
                                <div className="relative w-32 h-32 bg-white rounded-[2.5rem] p-5 shadow-2xl border border-blue-50 overflow-hidden flex items-center justify-center transform hover:rotate-3 transition-transform">
                                    <img src="/logo_guaimaral.png" alt="Logo Institucional" className="w-full h-full object-contain" />
                                </div>
                            </div>

                            {/* Visual Teaser */}
                            <div className="text-center space-y-4">
                                <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">
                                    Docente <span className="text-blue-600">AI</span> Pro
                                </h2>
                                <p className="text-slate-500 font-medium max-w-[280px] mx-auto text-sm leading-relaxed">
                                    Transformando la planeación pedagógica con inteligencia artificial avanzada.
                                </p>
                            </div>

                            {/* Floating Stats or Tags like in image */}
                            <div className="mt-12 flex gap-3">
                                <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 animate-float">
                                    <ShieldCheck size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Acceso Seguro</span>
                                </div>
                                <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 animate-float [animation-delay:1s]">
                                    <School size={14} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">I.E. Guaimaral</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form (Clean & Professional) */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Ingreso de Personal</h1>
                            <p className="text-slate-400 text-sm font-medium">Ingresa tus credenciales institucionales para continuar.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                                    <Mail size={12} className="text-blue-500" /> Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ejemplo@guaimaral.edu.co"
                                        className="w-full pl-5 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                                    <Lock size={12} className="text-blue-500" /> Contraseña
                                </label>
                                <div className="relative group">
                                    <input
                                        type={isPasswordVisible ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        title={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-3xl flex items-center gap-3 border border-red-100 animate-shake">
                                    <AlertTriangle size={14} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full relative py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all overflow-hidden ${isLoading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:shadow-[0_25px_50px_-10px_rgba(37,99,235,0.5)] hover:-translate-y-1 active:scale-[0.98]'
                                    }`}
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            <span>Autenticando...</span>
                                        </>
                                    ) : (
                                        <>
                                            Acceder al Panel <ArrowRight size={16} />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => setShowPasswordHint(!showPasswordHint)}
                                className="text-xs text-slate-400 hover:text-blue-600 transition-colors font-bold inline-flex items-center gap-2"
                            >
                                <Info size={14} /> ¿Problemas con tu acceso?
                            </button>

                            {showPasswordHint && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left animate-fade-in-up">
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Favor contactar al área de sistemas de la institución para restablecer credenciales.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Rights */}
                        <div className="mt-auto pt-10 text-center">
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                &copy; {new Date().getFullYear()} Francisco de Paula Santander
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
