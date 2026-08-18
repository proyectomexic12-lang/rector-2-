import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ApiStats } from './components/ApiStats';
import { SequencePreview } from './components/SequencePreview';
import { UserManagement, PasswordChange } from './components/UserManagement';
import { AdminSequenceViewer } from './components/AdminSequenceViewer';
import { SecurityDashboard } from './components/SecurityDashboard';
import { SequenceInput } from './types';
import { generateDidacticSequence } from './services/geminiService';
import { GraduationCap, Loader2, AlertTriangle, LogOut, User as UserIcon, Shield, LayoutDashboard, Database, Sparkles, ShieldAlert, Upload } from 'lucide-react';
import { Login } from './components/Login';
import { authService } from './services/authService';
import { useAuth } from './context/AuthContext';
import { useSequence } from './context/SequenceContext';
import { useToast } from './context/ToastContext';

const initialInput: SequenceInput = {
  grado: '',
  area: '',
  tema: '',
  dba: '',
  sesiones: 0,
  ejeCrese: '',
};

function App() {
  // Auth State from Context
  const { isAuthenticated, currentUser, login, logout, refreshUser } = useAuth();
  
  // Global App State (Context)
  const { input, setInput, sequence, setSequence, isLoading, setIsLoading, setError } = useSequence();
  
  // UX State
  const { toast } = useToast();
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'create' | 'monitor' | 'users' | 'history' | 'security'>('create');
  const [showProfile, setShowProfile] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);

  const loadingMessages = [
    "Analizando el DBA y contexto...",
    "Diseñando estrategias pedagógicas...",
    "Estructurando actividades paso a paso...",
    "Creando rúbricas de evaluación...",
    "Finalizando documento..."
  ];

  const [lastGenTime, setLastGenTime] = useState(0);

  // 0. Loading cycle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // 1. Initial Load & Input Persistence
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const inputKey = authService.getUserStorageKey('guaimaral_input');
      const savedInput = localStorage.getItem(inputKey);

      if (savedInput) {
        try { setInput(JSON.parse(savedInput)); } catch (e) { console.error("Error loading input", e); }
      } else {
        setInput(initialInput);
      }

      // FETCH CREDITS
      if (currentUser) {
        const isUnlim = authService.isUserUnlimited(currentUser);
        if (isUnlim) {
          setCreditsLeft(9999);
        } else {
          authService.getUsageStats(currentUser.email).then(stats => {
            const userMax = currentUser.custom_credits !== undefined && currentUser.custom_credits !== null ? currentUser.custom_credits : 6;
            setCreditsLeft(Math.max(0, userMax - stats.week));
          });
        }
      }
    }
  }, [isAuthenticated, currentUser?.email]);

  // 1.5 Update when activeTab changes (to catch admin changes)
  useEffect(() => {
    if (activeTab === 'create' && isAuthenticated) {
      refreshUser();
    }
  }, [activeTab, isAuthenticated]);

  // 2. Persistencia de entrada (No persiste contenido generado)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const inputKey = authService.getUserStorageKey('guaimaral_input');
      localStorage.setItem(inputKey, JSON.stringify(input));
    }
  }, [input, isAuthenticated, currentUser]);

  const handleAppLogout = () => {
    logout();
    setSequence(null);
    setInput(initialInput);
  };

  const handleGenerate = async (refinementConfig?: { instruction: string }) => {
    const now = Date.now();
    if (now - lastGenTime < 10000 && !refinementConfig) {
      toast("Por seguridad, espera unos segundos antes de generar.", 'error');
      return;
    }
    setLastGenTime(now);

    setIsLoading(true);
    setError(null);

    // CRÉDITOS SEMANALES: Bloqueo si el usuario supera su límite (Exento si es ilimitado o admin)
    const isUnlimitedUser = currentUser && authService.isUserUnlimited(currentUser);
    const maxCredits = currentUser?.custom_credits !== undefined && currentUser?.custom_credits !== null ? currentUser.custom_credits : 6;
    if (currentUser && !isUnlimitedUser) {
      try {
        const stats = await authService.getUsageStats(currentUser.email);
        if (stats.week >= maxCredits) {
          toast(`Has agotado tus ${maxCredits} créditos semanales. Tu saldo se recargará el próximo lunes.`, 'error');
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error validando créditos", e);
      }
    }

    try {
      const result = await generateDidacticSequence(input, refinementConfig?.instruction);
      setSequence(result);

      // SAVE & LOG TO CLOUD
      if (currentUser) {
        await authService.saveAndLogSequence(currentUser, result, {
          theme: input.tema,
          area: input.area,
          grade: input.grado
        });
        
        // Descontar 1 crédito localmente para refrescar la UI al instante
        setCreditsLeft(prev => prev !== null ? Math.max(0, prev - 1) : null);
        refreshUser(); // Refrescar los stats locales después de generar
      }
      
      toast("¡Planeación generada con éxito!", 'success');

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fallo en la generación.";
      setError(msg);
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSequence(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFullReset = () => {
    if (confirm("¿Restablecer parámetros actuales?")) {
      setSequence(null);
      setInput(initialInput);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEdit = () => {
    setSequence(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!isAuthenticated) return <Login onLogin={login} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-outfit pb-20 relative selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar removed per Rector's request */}

      {/* Header */}
      <header className="relative z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 no-print transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={handleFullReset}>
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
              <img src="/logo_guaimaral.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none group-hover:text-blue-700 transition-colors">
                I.E. Guaimaral
              </h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px] mt-1">
                AI <span className="text-blue-600">Planner</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nav Tools */}
            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
              {currentUser?.role === 'admin' ? (
                <>
                  <button
                    onClick={() => { setActiveTab('create'); setSequence(null); }}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'create' && !sequence ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Nueva Planeación"
                  >
                    <Sparkles size={20} />
                  </button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button
                    onClick={() => setActiveTab('monitor')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'monitor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Monitor en Tiempo Real"
                  >
                    <LayoutDashboard size={20} />
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Gestión de Usuarios"
                  >
                    <UserIcon size={20} />
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Repositorio Global"
                  >
                    <Database size={20} />
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'security' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Seguridad Administrativa"
                  >
                    <ShieldAlert size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setActiveTab('create'); setSequence(null); }}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'create' && !sequence ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Nueva Planeación"
                  >
                    <Sparkles size={20} />
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                    title="Mi Historial de Planeaciones"
                  >
                    <Database size={20} />
                  </button>
                </>
              )}
              
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              
              <a
                href="https://manuel-red.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 px-4 rounded-xl transition-all bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 font-bold text-xs uppercase tracking-wider"
                title="Ir a montar planeaciones"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Montar Planeaciones</span>
              </a>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            {/* User Profile & Credits */}
            <div className="flex items-center gap-3 pl-2">
              
              {/* Credits Badge (Para todos los usuarios autenticados) */}
              {currentUser && (
                authService.isUserUnlimited(currentUser) ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm" title="Tu cuenta cuenta con Plan Ilimitado">
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Créditos:</span>
                    <span className="text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                      <span>∞</span> Ilimitados
                    </span>
                  </div>
                ) : creditsLeft !== null && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm" title={`Te quedan ${creditsLeft} créditos esta semana (Se renuevan cada Lunes)`}>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Créditos:</span>
                    <span className="text-xs font-black bg-white px-2 py-0.5 rounded-md border border-amber-100 text-amber-600 shadow-inner">
                      {creditsLeft}/{(currentUser.custom_credits !== undefined && currentUser.custom_credits !== null ? currentUser.custom_credits : 6)}
                    </span>
                  </div>
                )
              )}

              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-black text-slate-800 leading-none">{currentUser?.name}</span>
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{currentUser?.role}</span>
              </div>

              <button
                onClick={() => setShowProfile(!showProfile)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-sm ${showProfile ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-200'}`}
                title="Mi Cuenta"
              >
                <UserIcon size={18} />
              </button>

              <button
                onClick={handleAppLogout}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Profile / Password Modal Overlay */}
        {showProfile && currentUser && (
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:top-full sm:right-4 mt-0 sm:mt-4 z-50 flex items-center justify-center sm:block">
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm sm:hidden" onClick={() => setShowProfile(false)}></div>

            <div className="relative w-[90%] max-w-[400px] sm:w-96 bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-fade-in-up overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800 tracking-tight">Mi Cuenta</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configuración de Seguridad</p>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuario Identificado</span>
                  <span className="block text-sm font-bold text-slate-700 truncate">{currentUser.email}</span>
                </div>
              </div>

              <PasswordChange email={currentUser.email} />

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setShowProfile(false)}
                  className="px-6 py-2 rounded-xl text-xs font-black text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all uppercase tracking-widest"
                >
                  Cerrar Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Tabs Content */}
        {!sequence && (
          <div className="animate-fade-in-up">
            {activeTab === 'monitor' && currentUser?.role === 'admin' && <ApiStats />}
            {activeTab === 'users' && currentUser?.role === 'admin' && <UserManagement />}
            {activeTab === 'history' && (
              <AdminSequenceViewer userEmail={currentUser?.role === 'admin' ? undefined : currentUser?.email} />
            )}
            {activeTab === 'security' && currentUser?.role === 'admin' && <SecurityDashboard />}

            {activeTab === 'create' && (
              <>
                {currentUser && !authService.isUserUnlimited(currentUser) && (
                  <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-br from-rose-500 via-red-500 to-red-700 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl shadow-red-500/40 text-center animate-fade-in-up border-4 border-white/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
                    
                    <AlertTriangle size={56} className="mx-auto mb-5 drop-shadow-lg opacity-90 animate-bounce" />
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 drop-shadow-md">
                      ⚠️ ¡Atención Profesores!
                    </h3>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed opacity-95 mb-6 text-red-50">
                      Hace 6 meses pagaron 20 mil pesos por la plataforma demo.<br/>
                      <strong className="font-black text-white bg-black/20 px-4 py-1.5 rounded-xl mt-3 inline-block shadow-inner backdrop-blur-sm">
                        Es momento de renovar su suscripción para generar planeaciones sin límites.
                      </strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-left">
                      <div className="bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-md">
                        <div className="text-red-200 text-xs font-black uppercase tracking-widest mb-1">Plan Mensual</div>
                        <div className="text-3xl font-black text-white mb-2">$15.000<span className="text-sm font-bold text-red-200">/mes</span></div>
                        <ul className="text-xs text-red-100 space-y-1 font-medium">
                          <li>✅ Acceso Ilimitado</li>
                          <li>✅ Descargas en PDF</li>
                        </ul>
                      </div>
                      <div className="bg-white text-red-700 border-2 border-red-300 p-4 rounded-2xl shadow-xl transform md:-translate-y-2 relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest shadow-md">Más Popular</div>
                        <div className="text-red-900 text-xs font-black uppercase tracking-widest mb-1">Plan Trimestral</div>
                        <div className="text-3xl font-black mb-2">$35.000<span className="text-sm font-bold text-red-700">/3 meses</span></div>
                        <ul className="text-xs space-y-1 font-bold">
                          <li>⭐ Promoción especial</li>
                          <li>⭐ Ahorras $10.000</li>
                        </ul>
                      </div>
                      <div className="bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-md">
                        <div className="text-red-200 text-xs font-black uppercase tracking-widest mb-1">Plan Semestral</div>
                        <div className="text-3xl font-black text-white mb-2">$75.000<span className="text-sm font-bold text-red-200">/6 meses</span></div>
                        <ul className="text-xs text-red-100 space-y-1 font-medium">
                          <li>🚀 Ahorras $15.000</li>
                          <li>🚀 Soporte Prioritario</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-black/30 border border-white/20 p-5 rounded-2xl inline-block backdrop-blur-md max-w-2xl mx-auto">
                      <p className="text-sm sm:text-base font-black text-white mb-2">
                        💳 Para activar tu cuenta, transfiere por <span className="text-purple-300">Nequi</span> al:
                      </p>
                      <div className="text-4xl font-black text-white tracking-widest bg-black/40 py-3 rounded-xl mb-3 shadow-inner">
                        320 595 7019
                      </div>
                      <p className="text-xs sm:text-sm text-red-100 font-bold uppercase tracking-wider">
                        Envía el pantallazo del pago a este mismo número por WhatsApp para activación inmediata.
                      </p>
                    </div>
                  </div>
                )}

                <div className="max-w-4xl mx-auto mb-16 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[3px] mb-6 shadow-sm border border-blue-100">
                    <GraduationCap size={14} /> Nueva Planeación
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black text-slate-800 mb-6 tracking-tighter">
                    Docente <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">AI Pro</span>
                  </h2>
                  <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
                    Crea planeaciones didácticas de alta calidad alineadas con el MEN en segundos. <br />
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">🔒 Persistencia Activa: Tus planeaciones se guardan automáticamente en el repositorio.</span>
                  </p>
                </div>

                <div className="max-w-5xl mx-auto">
                  <InputForm
                    input={input}
                    setInput={setInput}
                    onGenerate={() => handleGenerate()}
                    isLoading={isLoading}
                    user={currentUser}
                    creditsLeft={creditsLeft}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Message (now managed primarily by Toasts, but keeping this for legacy massive errors if needed, though we can hide it) */}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-12 rounded-[3rem] shadow-2xl text-center relative overflow-hidden animate-pulse">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse"></div>
                <div className="relative inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-2xl">
                  <Loader2 size={40} className="animate-spin" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">IA Generando...</h3>
              <p className="text-blue-600 font-black text-xs uppercase tracking-[3px] h-4 mb-8">{loadingMessages[loadingStep]}</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-1000"
                  style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}


        {sequence && (
          <div className="animate-fade-in-up max-w-6xl mx-auto">
            <div className="mb-10 no-print flex justify-between items-center">
              <button
                onClick={handleEdit}
                className="group flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg transition-all font-bold"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Nueva Consulta
              </button>

              <div className="flex gap-2">
                <div className="px-5 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} /> Vista Protegida
                </div>
              </div>
            </div>

            {/* ALERTAS DE INCOHERENCIA */}
            {sequence.alertas_generadas && sequence.alertas_generadas.length > 0 && (
              <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm animate-soft-bounce relative overflow-hidden no-print">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <AlertTriangle size={100} className="text-amber-500" />
                </div>
                <div className="flex gap-4 relative z-10">
                  <div className="bg-amber-100 p-3 rounded-xl text-amber-600 h-fit">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-amber-900 font-bold text-lg mb-2">Ajuste Curricular Automático</h3>
                    <div className="space-y-2">
                      {sequence.alertas_generadas.map((alerta, i) => (
                        <div key={i} className="flex gap-2 text-amber-800 bg-amber-100/50 px-3 py-2 rounded-lg text-sm font-medium border border-amber-200">
                          <span>•</span>
                          <p>{alerta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <SequencePreview
              data={sequence}
              input={input}
              onRefine={(instruction) => handleGenerate({ instruction })}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;