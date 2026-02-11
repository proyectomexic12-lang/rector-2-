import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ApiStats } from './components/ApiStats';
import { SequencePreview } from './components/SequencePreview';
import { UserManagement, PasswordChange } from './components/UserManagement';
import { DidacticSequence, SequenceInput } from './types';
import { generateDidacticSequence } from './services/geminiService';
import { GraduationCap, Loader2, AlertTriangle, LogOut, User as UserIcon, Shield, LayoutDashboard } from 'lucide-react';
import { Login } from './components/Login';
import { authService, User } from './services/authService';
// HistorySidebar removed for total privacy

const initialInput: SequenceInput = {
  grado: '',
  area: '',
  tema: '',
  dba: '',
  sesiones: 0,
  ejeCrese: '',
};

interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  area: string;
  grade: string;
  sequence: DidacticSequence;
}

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  // App State
  const [input, setInput] = useState<SequenceInput>(initialInput);
  const [sequence, setSequence] = useState<DidacticSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Persistent history state removed

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

  // 1. Initial Load (Solo parámetros de entrada - HISTORIAL EFÍMERO POR SEGURIDAD)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const inputKey = authService.getUserStorageKey('guaimaral_input');
      const savedInput = localStorage.getItem(inputKey);

      if (savedInput) {
        try { setInput(JSON.parse(savedInput)); } catch (e) { console.error("Error loading input", e); }
      } else {
        setInput(initialInput);
      }
    }
  }, [isAuthenticated, currentUser]);

  // 2. Persistencia de entrada (No persiste contenido generado)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const inputKey = authService.getUserStorageKey('guaimaral_input');
      localStorage.setItem(inputKey, JSON.stringify(input));
    }
  }, [input, isAuthenticated, currentUser]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getCurrentUser());
  };

  const handleLogout = () => {
    if (confirm("¿Cerrar sesión?")) {
      authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSequence(null);
      setInput(initialInput);
    }
  };

  const handleGenerate = async (refinementConfig?: { instruction: string }) => {
    const now = Date.now();
    if (now - lastGenTime < 10000 && !refinementConfig) {
      setError("Por seguridad, espera unos segundos antes de generar una nueva secuencia.");
      return;
    }
    setLastGenTime(now);

    setIsLoading(true);
    setError(null);
    try {
      const result = await generateDidacticSequence(input, refinementConfig?.instruction);
      setSequence(result);

      // NO GUARDAR EN HISTORIAL PERSISTENTE (Política Efímera solicitada por Rector)
      // Solo se mantiene en memoria mientras la sesión esté abierta o no se reinicie la app.

      // LOG USAGE (Híbrido: Local + Nube si está disponible) - EL CONTADOR SÍ SE GUARDA
      if (currentUser) {
        authService.logUsage(currentUser.email, {
          theme: input.tema,
          area: input.area,
          grade: input.grado
        });
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Fallo en la generación.");
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

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

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
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-2.5 rounded-xl transition-all ${showStats ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}`}
                  title="Panel de Control Rector"
                >
                  <LayoutDashboard size={20} />
                </button>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2">
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
                onClick={handleLogout}
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
          <div className="absolute top-full right-4 mt-4 w-80 bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 animate-fade-in-up z-50">
            <div className="flex items-center gap-3 mb-4 text-slate-800">
              <Shield size={24} className="text-indigo-600" />
              <h3 className="font-black text-lg">Mi Cuenta</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Gestiona tu seguridad, contraseña y acceso.</p>
            <PasswordChange email={currentUser.email} />

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button onClick={() => setShowProfile(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                Cerrar Panel
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Admin Stats Overlay */}
        {showStats && currentUser?.role === 'admin' && (
          <div className="animate-fade-in-up space-y-8 mb-10">
            <ApiStats />
            <UserManagement />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto bg-red-50/90 backdrop-blur border border-red-100 p-5 mb-8 rounded-3xl shadow-xl flex items-center justify-between animate-shake">
            <div className="flex items-center gap-4">
              <div className="bg-red-500 text-white p-2 rounded-xl shadow-lg shadow-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-red-900 font-bold">Error del Sistema</h3>
                <p className="text-red-700/80 text-xs font-medium mt-0.5">{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 bg-white/50 p-2 rounded-xl transition-all">✕</button>
          </div>
        )}

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

        {/* Main Interface */}
        <div className={sequence ? 'hidden' : 'block animate-fade-in-up'}>
          <div className="max-w-4xl mx-auto mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[3px] mb-6 shadow-sm border border-blue-100">
              <GraduationCap size={14} /> Nueva Planificación
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-slate-800 mb-6 tracking-tighter">
              Docente <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">AI Pro</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              Crea secuencias didácticas de alta calidad alineadas con el MEN en segundos. <br />
              <span className="text-red-500 text-xs font-bold uppercase tracking-wider">🔒 Sesión Efímera: El contenido no se guarda al salir o recargar. Descarga tu archivo.</span>
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <InputForm
              input={input}
              setInput={setInput}
              onGenerate={() => handleGenerate()}
              isLoading={isLoading}
              user={currentUser}
            />
          </div>
        </div>

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