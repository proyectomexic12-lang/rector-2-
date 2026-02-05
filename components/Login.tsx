import React, { useState, useEffect } from 'react';
import { School, UserCircle, Lock, ArrowRight, ShieldCheck, Mail, Info } from 'lucide-react';
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

    // Initial state empty
    useEffect(() => {
        setEmail('');
        setPassword('');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Simulation of network delay for feedback
        setTimeout(async () => {
            const user = await authService.login(email, password);
            if (user) {
                onLogin();
            } else {
                setError("Acceso denegado. Verifica tus credenciales institucionales.");
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-outfit">
            {/* Neural Background Effect */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            </div>

            <main className="w-full max-w-[440px] relative z-10">
                <div className="dark-glass rounded-[40px] p-8 md:p-12 shadow-2xl border border-white/10 animate-fade-in-up">

                    {/* Brand Section */}
                    <div className="text-center mb-10">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                            <div className="relative w-24 h-24 bg-white rounded-3xl p-3 shadow-2xl transform hover:scale-105 transition-transform duration-500 overflow-hidden flex items-center justify-center border border-gray-100 italic">
                                <img src="/logo_guaimaral.png" alt="Logo I.E. Guaimaral" className="w-full h-full object-contain" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-[#1e293b]">
                                <ShieldCheck size={18} />
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            Docente AI <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Pro</span>
                        </h1>
                        <p className="text-slate-400 font-medium">Gestión Curricular Inteligente v2.1</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                                <Mail size={12} className="text-blue-400" /> Correo Institucional
                            </label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@guaimaral.edu.co"
                                    className="w-full pl-5 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:bg-white/10 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-medium text-white placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                                <Lock size={12} className="text-blue-400" /> Contraseña
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-5 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:bg-white/10 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-medium text-white placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 text-red-400 text-xs font-bold p-4 rounded-2xl flex items-center gap-3 border border-red-500/20 animate-shake">
                                <div className="bg-red-500 text-white rounded-full p-1 shrink-0">
                                    <Lock size={12} />
                                </div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full relative overflow-hidden group py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] ${isLoading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_40px_-10px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_50px_-10px_rgba(37,99,235,0.4)] hover:-translate-y-0.5'
                                }`}
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Autorizando...</span>
                                    </>
                                ) : (
                                    <>
                                        Acceder al Panel <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    {/* Footer / Hints */}
                    <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-4">
                        <button
                            onClick={() => setShowPasswordHint(!showPasswordHint)}
                            className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2 mx-auto"
                        >
                            <Info size={14} /> ¿Necesitas ayuda con el acceso?
                        </button>

                        {showPasswordHint && (
                            <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 animate-fade-in-up">
                                <p className="text-[12px] text-blue-300 font-medium">
                                    Utiliza tu correo institucional y la contraseña asignada por administración (ej. guaimaral2026).
                                </p>
                            </div>
                        )}

                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                            Diseñado exclusivamente para la <br />
                            <span className="text-slate-400">Institución Educativa Guaimaral &copy; {new Date().getFullYear()}</span>
                        </p>
                    </div>
                </div>

                {/* Decorative Tags */}
                <div className="mt-6 flex justify-center gap-4 animate-fade-in-up animation-delay-2000 opacity-0 fill-mode-forwards">
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        SECURE STORAGE
                    </div>
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        API GEMINI 2.0
                    </div>
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        MEN STANDARDS
                    </div>
                </div>
            </main>
        </div>
    );
};

