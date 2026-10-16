import React, { useState, useEffect } from 'react';
import { 
    School, 
    Lock, 
    ArrowRight, 
    ShieldCheck, 
    Mail, 
    Info, 
    AlertTriangle, 
    Eye, 
    EyeOff, 
    Building2, 
    Search, 
    Sparkles, 
    ArrowLeft, 
    ChevronRight, 
    Plus, 
    CheckCircle2, 
    Globe, 
    ExternalLink 
} from 'lucide-react';
import { authService } from '../services/authService';
import { institutionService } from '../services/institutionService';
import { Institution } from '../types';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    // Estado de vista: 'portal' muestra el catálogo SaaS de colegios, 'login' muestra el formulario del colegio elegido
    const [view, setView] = useState<'portal' | 'login'>('portal');
    const [institutions, setInstitutions] = useState<Institution[]>(() => institutionService.getInstitutions());
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Formulario de login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordHint, setShowPasswordHint] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    // Modal de solicitud de nuevo colegio
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCity, setNewSchoolCity] = useState('');
    const [newSchoolEmail, setNewSchoolEmail] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    // Autenticación con Google (Google Sign-In)
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [googleName, setGoogleName] = useState('');
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = institutionService.subscribe(() => {
            setInstitutions(institutionService.getInstitutions());
        });
        return unsubscribe;
    }, []);

    // Seleccionar colegio y pasar al login personalizado
    const handleSelectInstitution = (inst: Institution) => {
        setSelectedInstitution(inst);
        institutionService.setActiveOverride(inst.id);
        setError(null);
        setView('login');
    };

    // Acceso directo SuperAdmin
    const handleSuperAdminAccess = () => {
        const guaimaral = institutionService.getInstitutionById('guaimaral');
        setSelectedInstitution(guaimaral);
        institutionService.setActiveOverride(null);
        setEmail('admin@guaimaral.edu.co');
        setPassword('admin2026');
        setError(null);
        setView('login');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // --- ANTI-SQL INJECTION & SANITIZATION LAYER ---
        const trimmedEmail = email.trim().toLowerCase();
        const forbiddenChars = /['"%;\\]/;

        if (forbiddenChars.test(trimmedEmail)) {
            setError("Intento de acceso no autorizado. Formato de correo no válido.");
            authService.logSecurityEvent(trimmedEmail || "unknown", "Detección de Carácter Inválido en Login", "high");
            setIsLoading(false);
            return;
        }

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
        }, 1200);
    };

    const handleGoogleSignIn = (targetEmail?: string, targetName?: string) => {
        const finalEmail = (targetEmail || googleEmail).trim().toLowerCase();
        const finalName = (targetName || googleName).trim();

        if (!finalEmail || !finalEmail.includes('@')) {
            setError("Ingresa una cuenta de Google válida.");
            return;
        }

        setIsGoogleLoading(true);
        setError(null);

        setTimeout(async () => {
            try {
                const targetInst = selectedInstitution || institutionService.getInstitutionById('guaimaral');
                const user = await authService.loginWithGoogle(finalEmail, finalName, targetInst.id);
                if (user) {
                    setShowGoogleModal(false);
                    onLogin();
                } else {
                    setError("No se pudo completar el acceso con Google.");
                    setIsGoogleLoading(false);
                }
            } catch (err: any) {
                setError(err.message || "Error al autenticar con Google.");
                setIsGoogleLoading(false);
            }
        }, 600);
    };

    const handleRegisterSchool = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchoolName.trim()) return;

        try {
            const created = institutionService.createInstitution({
                name: newSchoolName.trim().toUpperCase(),
                shortName: newSchoolName.trim().split(' ').slice(0, 3).join(' '),
                lema: 'Innovación y Excelencia Curricular',
                daneCode: '1' + Math.floor(10000000000 + Math.random() * 90000000000).toString(),
                nit: '900.' + Math.floor(100000 + Math.random() * 900000) + '-1'
            });

            setRegisterSuccess(true);
            setTimeout(() => {
                setShowRegisterModal(false);
                setRegisterSuccess(false);
                setNewSchoolName('');
                setNewSchoolCity('');
                setNewSchoolEmail('');
                handleSelectInstitution(created);
            }, 1500);
        } catch (e) {
            console.error(e);
        }
    };

    const filteredInstitutions = institutions.filter(inst => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        return (
            inst.name.toLowerCase().includes(query) ||
            inst.shortName.toLowerCase().includes(query) ||
            (inst.formatSchema?.daneCode && inst.formatSchema.daneCode.includes(query))
        );
    });

    // =========================================================================
    // VISTA 1: PORTAL SAAS MULTI-COLEGIO
    // =========================================================================
    if (view === 'portal') {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 font-outfit relative overflow-x-hidden selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
                {/* Glow decorativo de fondo */}
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-blue-600/10 to-transparent blur-3xl pointer-events-none z-0"></div>
                <div className="fixed -bottom-20 right-0 w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-3xl pointer-events-none z-0"></div>

                {/* Navbar Superior del SaaS */}
                <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-8 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
                                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                                    <Building2 className="text-indigo-400" size={20} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                                        Clases Ideal <span className="text-indigo-400">SaaS</span>
                                    </h1>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Multi-Colegio
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">Ecosistema Curricular con IA para Instituciones Educativas</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSuperAdminAccess}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                title="Acceso con credenciales de Administrador General"
                            >
                                <ShieldCheck size={14} className="text-indigo-400" />
                                <span className="hidden sm:inline">SuperAdmin</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Contenido Principal: Hero & Selector de Instituciones */}
                <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 flex-1 w-full flex flex-col justify-center">
                    {/* Hero Header */}
                    <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4 shadow-inner">
                            <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                            <span>Portal Oficial de Acceso a Campus Inteligentes</span>
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight sm:leading-none mb-4">
                            Selecciona tu <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-200 bg-clip-text text-transparent">Institución Educativa</span>
                        </h2>
                        <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
                            Ingresa al entorno y planificador curricular adaptado al modelo pedagógico, sistema de evaluación y directrices oficiales de tu colegio.
                        </p>

                        {/* Barra de Búsqueda Interactiva */}
                        <div className="mt-8 max-w-md mx-auto relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre de colegio o código DANE..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xl"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Grid de Colegios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                        {filteredInstitutions.map((inst) => {
                            const isGuaimaral = inst.id === 'guaimaral';
                            return (
                                <div
                                    key={inst.id}
                                    onClick={() => handleSelectInstitution(inst)}
                                    className={`group relative rounded-3xl p-6 sm:p-7 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
                                        isGuaimaral
                                            ? 'bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-900/95 border-2 border-indigo-500/60 shadow-2xl shadow-indigo-950/60 hover:border-indigo-400 hover:-translate-y-1'
                                            : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 hover:-translate-y-1 shadow-xl'
                                    }`}
                                >
                                    {/* Badge Superior */}
                                    <div className="flex items-center justify-between gap-2 mb-5">
                                        <div className="flex items-center gap-1.5">
                                            {isGuaimaral ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                                                    Sede Principal
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                                    Campus Afiliado
                                                </span>
                                            )}
                                        </div>
                                        {inst.formatSchema?.daneCode && (
                                            <span className="text-[10px] text-slate-500 font-mono font-semibold">
                                                DANE: {inst.formatSchema.daneCode}
                                            </span>
                                        )}
                                    </div>

                                    {/* Logo y Nombre */}
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white p-2 shrink-0 shadow-lg border border-slate-700/50 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                                            <img
                                                src={inst.logoUrl || '/logo.png'}
                                                alt={inst.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/logo.png';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-indigo-300 transition-colors line-clamp-2">
                                                {inst.name}
                                            </h3>
                                            <p className="text-xs text-slate-400 font-medium italic mt-1 line-clamp-1">
                                                "{inst.formatSchema?.lema || 'Excelencia y Liderazgo Académico'}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Características pedagógicas */}
                                    <div className="space-y-2 mb-6 pt-4 border-t border-slate-800/80">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Momentos Curriculares:</span>
                                            <span className="text-slate-200 font-semibold text-[11px] truncate max-w-[170px]">
                                                {inst.formatSchema?.momento1Name || 'Inicio'} → {inst.formatSchema?.momento2Name || 'Desarrollo'} → {inst.formatSchema?.momento3Name || 'Cierre'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Modelo Institucional:</span>
                                            <span className="text-indigo-400 font-semibold text-[11px]">
                                                {isGuaimaral ? 'MEN + ADI + CRESE' : (inst.formatSchema?.customFormatNotes ? 'Personalizado' : 'Estándar MEN')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Botón de Acceso */}
                                    <div className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        isGuaimaral 
                                            ? 'bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30' 
                                            : 'bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white'
                                    }`}>
                                        <span>Entrar al Campus</span>
                                        <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Tarjeta de Registro de Nuevo Colegio */}
                        <div
                            onClick={() => setShowRegisterModal(true)}
                            className="rounded-3xl p-6 sm:p-7 bg-slate-900/40 border border-dashed border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-950/20 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center group min-h-[280px]"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mb-4 shadow-inner">
                                <Plus size={26} />
                            </div>
                            <h3 className="text-base font-black text-white mb-2 group-hover:text-indigo-300 transition-colors">
                                ¿Deseas afiliar tu colegio?
                            </h3>
                            <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
                                Habilita el entorno inteligente de Clases Ideal con el formato y directrices propias de tu institución educativa.
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 size={13} /> Registrar Nueva Institución
                            </span>
                        </div>
                    </div>
                </main>

                {/* Footer SaaS */}
                <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-4 sm:px-8 py-5 text-center text-xs text-slate-500">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p>© {new Date().getFullYear()} Clases Ideal AI SaaS • Ecosistema Pedagógico Multi-Colegio Colombiano</p>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSuperAdminAccess}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                            >
                                Consola de Administración SaaS
                            </button>
                        </div>
                    </div>
                </footer>

                {/* Modal Rápido de Registro de Nueva Institución */}
                {showRegisterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">Afiliación SaaS</h3>
                                        <p className="text-[11px] text-slate-400">Registra un nuevo colegio en la plataforma</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRegisterModal(false)}
                                    className="text-slate-400 hover:text-white text-lg p-1"
                                >
                                    ✕
                                </button>
                            </div>

                            {registerSuccess ? (
                                <div className="py-8 text-center animate-fade-in">
                                    <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
                                    <h4 className="text-lg font-bold text-white mb-1">¡Institución Creada!</h4>
                                    <p className="text-xs text-slate-400">Abriendo el entorno de acceso del nuevo colegio...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleRegisterSchool} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Nombre Oficial de la Institución
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={newSchoolName}
                                            onChange={(e) => setNewSchoolName(e.target.value)}
                                            placeholder="Ej: Colegio Mayor de Cúcuta"
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Ciudad / Municipio
                                        </label>
                                        <input
                                            type="text"
                                            value={newSchoolCity}
                                            onChange={(e) => setNewSchoolCity(e.target.value)}
                                            placeholder="Ej: San José de Cúcuta"
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Correo de Coordinación / Contacto
                                        </label>
                                        <input
                                            type="email"
                                            value={newSchoolEmail}
                                            onChange={(e) => setNewSchoolEmail(e.target.value)}
                                            placeholder="coordinacion@colegio.edu.co"
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="pt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRegisterModal(false)}
                                            className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-bold text-xs"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                                        >
                                            Crear Colegio
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // VISTA 2: FORMULARIO DE LOGIN DEL COLEGIO SELECCIONADO
    // =========================================================================
    const activeInst = selectedInstitution || institutionService.getInstitutionById('guaimaral');
    const isGuaimaral = activeInst.id === 'guaimaral';

    return (
        <div className="min-h-screen h-screen bg-slate-50 flex items-center justify-center font-outfit p-3 sm:p-6 overflow-hidden selection:bg-blue-100 relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-mesh-gradient opacity-30 mix-blend-multiply pointer-events-none"></div>

            {/* Main Container */}
            <div className="w-full max-w-[940px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col md:flex-row overflow-hidden relative z-10 my-auto animate-fade-in">
                
                {/* Left Side: Branding de la Institución Educativa */}
                <div className="w-full md:w-5/12 bg-[#f0f7ff]/80 relative p-6 sm:p-8 flex flex-col items-center justify-between overflow-hidden border-b md:border-b-0 md:border-r border-blue-50 shrink-0">
                    <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute top-[-30px] left-[-30px] w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none"></div>

                    {/* Botón Volver al Portal SaaS */}
                    <div className="w-full flex items-center justify-between mb-4 z-10">
                        <button
                            onClick={() => {
                                setView('portal');
                                setError(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 border border-slate-200/80 text-xs font-bold transition-all shadow-xs"
                            title="Volver al Portal de Colegios"
                        >
                            <ArrowLeft size={14} />
                            <span>Cambiar de Colegio</span>
                        </button>
                    </div>

                    <div className="relative z-10 w-full flex flex-col items-center text-center my-auto">
                        <div className="relative group mb-4">
                            <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 group-hover:opacity-40 transition-all duration-700"></div>
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-3xl p-3 shadow-xl border border-blue-100 flex items-center justify-center transform hover:rotate-2 transition-transform">
                                <img 
                                    src={activeInst.logoUrl || '/logo.png'} 
                                    alt={activeInst.name} 
                                    className="w-full h-full object-contain rounded-xl"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                                />
                            </div>
                        </div>

                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug mb-1">
                            {activeInst.name}
                        </h2>
                        <p className="text-slate-500 font-medium text-xs max-w-[260px] leading-relaxed mb-4">
                            "{activeInst.formatSchema?.lema || 'Calidad Humana y Excelencia Académica'}"
                        </p>

                        <div className="flex flex-wrap justify-center gap-1.5">
                            <div className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-100 flex items-center gap-1">
                                <ShieldCheck size={12} className="text-blue-500" />
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Campus Seguro</span>
                            </div>
                            {activeInst.formatSchema?.daneCode && (
                                <div className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-100 flex items-center gap-1">
                                    <School size={12} className="text-indigo-500" />
                                    <span className="text-[9px] font-mono font-bold text-slate-600">DANE: {activeInst.formatSchema.daneCode}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full text-center pt-4 z-10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Plataforma Clases Ideal AI
                        </span>
                    </div>
                </div>

                {/* Right Side: Formulario de Login */}
                <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
                    <div className="max-w-xs sm:max-w-sm mx-auto w-full">
                        <div className="mb-6 text-center md:text-left">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-100">
                                <Building2 size={12} />
                                <span>{activeInst.shortName}</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Ingreso de Personal</h1>
                            <p className="text-slate-500 text-xs font-medium">Ingresa con tus credenciales asignadas.</p>
                        </div>

                        {/* Botón Oficial de Acceso con Google */}
                        <div className="mb-5">
                            <button
                                type="button"
                                onClick={() => {
                                    setError(null);
                                    setShowGoogleModal(true);
                                }}
                                disabled={isLoading || isGoogleLoading}
                                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl font-semibold text-xs text-slate-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] group"
                            >
                                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    />
                                </svg>
                                <span>Continuar con Google</span>
                            </button>

                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                    <span className="bg-white px-2">o con tu correo institucional</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[1.5px] ml-1 flex items-center gap-1">
                                    <Mail size={12} className="text-blue-600" /> Correo Institucional
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={isGuaimaral ? "profesor@guaimaral.edu.co" : "tu-correo@institucion.edu.co"}
                                    className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[1.5px] ml-1 flex items-center gap-1">
                                    <Lock size={12} className="text-blue-600" /> Contraseña
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
                                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${isLoading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98]'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            <span>Autenticando en Campus...</span>
                                        </>
                                    ) : (
                                        <>
                                            Acceder al Campus <ArrowRight size={14} />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-5 text-center flex flex-col items-center gap-2">
                            <button
                                onClick={() => setShowPasswordHint(!showPasswordHint)}
                                className="text-[11px] text-slate-400 hover:text-blue-600 transition-colors font-bold inline-flex items-center gap-1"
                            >
                                <Info size={12} /> ¿Problemas para ingresar?
                            </button>

                            {showPasswordHint && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left animate-fade-in-up w-full">
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                        Favor contactar a la Rectoría / Coordinación de tu institución para restablecer o solicitar tu usuario.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setView('portal');
                                    setError(null);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition-colors mt-2"
                            >
                                ← Volver al Portal de Colegios (SaaS)
                            </button>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                &copy; {new Date().getFullYear()} {activeInst.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Auténtico de Acceso con Google */}
            {showGoogleModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                    onClick={() => !isGoogleLoading && setShowGoogleModal(false)}
                >
                    <div 
                        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-scale-in text-slate-800 font-outfit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Oficial Estilo Google */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100 shadow-sm mb-3">
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Acceder con Google</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Selecciona o ingresa tu cuenta para continuar en <strong className="text-slate-800">Clases Ideal AI</strong>
                            </p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mt-2.5 border border-blue-100">
                                <Building2 size={12} />
                                <span>Colegio: {activeInst.name}</span>
                            </div>
                        </div>

                        {/* Formulario de Cuenta Google */}
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleGoogleSignIn();
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Nombre Completo del Docente
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={googleName}
                                    onChange={(e) => setGoogleName(e.target.value)}
                                    placeholder="Ej: Lic. Carlos Rodríguez"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Correo de Google (@gmail.com o institucional)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={googleEmail}
                                    onChange={(e) => setGoogleEmail(e.target.value)}
                                    placeholder="profesor@gmail.com o @colegio.edu.co"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            {/* Cuentas rápidas de demostración de un clic */}
                            <div className="pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                    O ingresa en 1 clic como docente de prueba:
                                </span>
                                <div className="space-y-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleGoogleSignIn('profesor.demo@gmail.com', 'Prof. Demo Google')}
                                        disabled={isGoogleLoading}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-left transition-all text-xs group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                                                G
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-[11px]">Prof. Demo Google</p>
                                                <p className="text-[10px] text-slate-400">profesor.demo@gmail.com</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                                            Elegir →
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Aviso de Privacidad Oficial Estilo Google */}
                            <p className="text-[10px] text-slate-400 leading-relaxed text-center pt-2">
                                Para continuar, Google compartirá tu nombre, dirección de correo electrónico y preferencia de idioma con Clases Ideal AI SaaS.
                            </p>

                            <div className="pt-2 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowGoogleModal(false)}
                                    disabled={isGoogleLoading}
                                    className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isGoogleLoading}
                                    className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isGoogleLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            <span>Validando...</span>
                                        </>
                                    ) : (
                                        <span>Confirmar Acceso</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
