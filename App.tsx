import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ApiStats } from './components/ApiStats';
import { SequencePreview } from './components/SequencePreview';
import { UserManagement, PasswordChange } from './components/UserManagement';
import { AdminSequenceViewer } from './components/AdminSequenceViewer';
import { SecurityDashboard } from './components/SecurityDashboard';
import { SubscriptionBlockModal } from './components/SubscriptionBlockModal';
import { AdminChatPanel } from './components/AdminChatPanel';
import { ChatWidget } from './components/ChatWidget';
import { PolicyAnnouncementModal } from './components/PolicyAnnouncementModal';
import { SettingsModal } from './components/SettingsModal';
import { SequenceInput, PlanQuotaInfo } from './types';
import { generateDidacticSequence } from './services/geminiService';
import { GraduationCap, Loader2, AlertTriangle, LogOut, User as UserIcon, Shield, LayoutDashboard, Database, Sparkles, ShieldAlert, Upload, MessageCircle, ShieldCheck, MessageSquare, BookOpen, FileCheck2, Settings, Award } from 'lucide-react';
import { Login } from './components/Login';
import { authService, User } from './services/authService';
import { presenceService } from './services/presenceService';
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
  const [activeTab, setActiveTab] = useState<'create' | 'monitor' | 'users' | 'history' | 'security' | 'chat'>('create');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [userQuota, setUserQuota] = useState<PlanQuotaInfo | null>(null);
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

      // FETCH QUOTA & CREDITS
      if (currentUser) {
        authService.getUserQuotaInfo(currentUser).then(quota => {
          setUserQuota(quota);
          if (quota.isUnlimitedAdmin) {
            setCreditsLeft(9999);
          } else {
            setCreditsLeft(quota.remainingQuota);
          }
        });

        // Mostrar comunicado oficial de políticas de una al ingresar (Solo 1 vez en la vida útil)
        const sessionDismissed = sessionStorage.getItem('guaimaral_policy_modal_dismissed');
        const localDismissed = localStorage.getItem('guaimaral_policy_ack_2026');
        if (!sessionDismissed && !localDismissed) {
          setShowPolicyModal(true);
        }
      }
    }
  }, [isAuthenticated, currentUser?.email]);

  // 1.5 Update when activeTab changes (to catch admin changes)
  useEffect(() => {
    if (activeTab === 'create' && isAuthenticated) {
      refreshUser();
      if (currentUser) {
        authService.getUserQuotaInfo(currentUser).then(setUserQuota);
      }
    }
    if (currentUser?.role === 'admin') {
      authService.getAllUsersWithStats().then(setAllUsers);
    }
  }, [activeTab, isAuthenticated, currentUser?.email]);

  // 1.5.5 Presencia en tiempo real (Heartbeat En Línea)
  useEffect(() => {
    if (currentUser?.email) {
      const stopHeartbeat = presenceService.startHeartbeat(currentUser.email);
      return stopHeartbeat;
    }
  }, [currentUser?.email]);

  // 1.6 Periodic Anti-Account Sharing Session Validation
  useEffect(() => {
    if (isAuthenticated && currentUser?.email && currentUser.role !== 'admin') {
      const checkSession = async () => {
        const isValid = await authService.validateSession(currentUser.email);
        if (!isValid) {
          alert("🚨 Sesión Inactivada por Seguridad\n\nTu cuenta ha sido iniciada desde otro dispositivo o navegador. Por políticas de la I.E. Guaimaral, no está permitido compartir cuentas entre docentes. Cada profesor debe usar su propia cuenta personal.");
          handleAppLogout();
        }
      };

      const interval = setInterval(checkSession, 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUser?.email]);

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

  const subscriptionStatus = currentUser ? authService.getSubscriptionStatus(currentUser) : null;
  const isSubscriptionExpired = subscriptionStatus ? subscriptionStatus.status === 'vencido' && currentUser?.role !== 'admin' : false;

  const handleGenerate = async (refinementConfig?: { instruction: string }) => {
    if (isSubscriptionExpired) {
      toast("Tu suscripción mensual ha vencido. Ponte al día con tu saldo acumulado para continuar.", 'error');
      return;
    }

    const now = Date.now();
    if (now - lastGenTime < 10000 && !refinementConfig) {
      toast("Por seguridad, espera unos segundos antes de generar.", 'error');
      return;
    }
    setLastGenTime(now);

    setIsLoading(true);
    setError(null);

    // ANTI-CUENTA COMPARTIDA: Verificar si otra persona inició sesión con este correo
    if (currentUser?.email && currentUser.role !== 'admin') {
      const isSessionValid = await authService.validateSession(currentUser.email);
      if (!isSessionValid) {
        alert("🚨 Sesión Inactivada por Seguridad\n\nTu cuenta ha sido iniciada desde otro dispositivo. Por políticas institucionales de la I.E. Guaimaral, no está permitido compartir cuentas entre docentes. Cada profesor debe usar su propia cuenta personal.");
        handleAppLogout();
        setIsLoading(false);
        return;
      }
    }

    // VALIDACIÓN DE CUOTA Y PLAN (15 Planeaciones / Mes, 40 / Trimestre, o Créditos Básicos)
    if (currentUser) {
      try {
        const currentQuota = await authService.getUserQuotaInfo(currentUser);
        setUserQuota(currentQuota);
        if (!currentQuota.canGenerate) {
          if (currentQuota.reason === 'vencido') {
            toast("Tu suscripción mensual ha vencido. Ponte al día con tu saldo acumulado para continuar.", 'error');
          } else if (currentQuota.reason === 'quota_exceeded') {
            toast(`🚨 Has alcanzado el límite de tu plan (${currentQuota.usedQuota} de ${currentQuota.maxQuota} planeaciones usadas). Contacta a administración para recargas adicionales.`, 'error');
          } else {
            toast(`Has agotado tus ${currentQuota.maxQuota} créditos disponibles.`, 'error');
          }
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error validando cuota", e);
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
        
        // Actualizar cuota inmediatamente para refrescar la UI al instante
        authService.getUserQuotaInfo(currentUser).then(q => {
          setUserQuota(q);
          setCreditsLeft(q.remainingQuota);
        });
        refreshUser();
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

  const handleSelectSequence = (seqRecord: any) => {
    if (!seqRecord || !seqRecord.content) return;
    
    let content = seqRecord.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.error("Error parsing sequence content:", e);
      }
    }

    const loadedInput: SequenceInput = {
      grado: seqRecord.grado || content.grado || '',
      area: seqRecord.area || content.area || '',
      tema: seqRecord.tema || content.tema_principal || '',
      dba: content.dba_utilizado || content.dba || '',
      sesiones: content.actividades?.length || 4,
      ejeCrese: content.eje_crese_utilizado || ''
    };

    setInput(loadedInput);
    setSequence(content);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Planeación "${loadedInput.tema || 'Cargada'}" abierta exitosamente. ¡Puedes verla, editarla o descargarla en PDF/Word!`, 'success');
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
      {/* Header Executive Minimalist */}
      <header className="relative z-40 bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 no-print transition-all duration-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleFullReset}>
            <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 w-10 h-10 flex items-center justify-center shrink-0 group-hover:border-indigo-500 transition-colors">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded" style={{ maxWidth: '32px', maxHeight: '32px' }} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Clases Ideal
              </h1>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                Plataforma Docente IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nav Tools */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {currentUser?.role === 'admin' ? (
                <>
                  <button
                    onClick={() => { setActiveTab('create'); setSequence(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'create' && !sequence ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Nueva Planeación"
                  >
                    <Sparkles size={14} />
                    <span className="hidden md:inline">Planeador</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('monitor')}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'monitor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Monitor en Tiempo Real"
                  >
                    <LayoutDashboard size={14} />
                    <span className="hidden lg:inline">Monitor</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Gestión de Usuarios"
                  >
                    <UserIcon size={14} />
                    <span className="hidden lg:inline">Usuarios</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Repositorio Global"
                  >
                    <Database size={14} />
                    <span className="hidden lg:inline">Historial</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Chat Administrativo"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'security' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Seguridad Administrativa"
                  >
                    <ShieldAlert size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setActiveTab('create'); setSequence(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'create' && !sequence ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Nueva Planeación"
                  >
                    <Sparkles size={14} />
                    <span>Crear Planeación</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Mi Historial de Planeaciones"
                  >
                    <Database size={14} />
                    <span className="hidden sm:inline">Mis Planeaciones</span>
                  </button>
                </>
              )}
              
              {/* Botón Políticas y Planes */}
              <button
                onClick={() => setShowPolicyModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 font-medium text-xs transition-colors"
                title="Términos y Planes de Suscripción"
              >
                <BookOpen size={13} className="text-indigo-400" />
                <span className="hidden md:inline">Planes y Cuotas</span>
              </button>

              <a
                href="https://manuel-red.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
                title="Montar planeaciones institucionales"
              >
                <Upload size={13} />
                <span className="hidden sm:inline">Montar Planeaciones</span>
              </a>
            </div>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            {/* User Quota Status Badge */}
            <div className="flex items-center gap-2 shrink-0">
              {currentUser && (
                userQuota?.isUnlimitedAdmin ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-semibold" title="Acceso Administrativo Ilimitado">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[11px] tracking-wide">ADMIN</span>
                  </div>
                ) : userQuota?.hasPlan ? (
                  <button 
                    onClick={() => setShowPolicyModal(true)}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-slate-200 transition-colors cursor-pointer text-left" 
                    title={`Plan Activo: ${userQuota.usedQuota} de ${userQuota.maxQuota} usadas. Clic para ver detalles.`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${userQuota.remainingQuota > 3 ? 'bg-emerald-400' : userQuota.remainingQuota > 0 ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                    <div className="flex flex-col leading-none">
                      <span className="text-[11px] font-bold text-white">
                        {userQuota.usedQuota} / {userQuota.maxQuota}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {userQuota.maxQuota === 40 ? 'Plan 3M' : 'Plan Mes'}
                      </span>
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowPolicyModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-950/60 transition-colors text-xs font-semibold" 
                    title="Sin Plan Activo. Clic para contratar."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span className="text-[10px] uppercase">Sin Plan</span>
                  </button>
                )
              )}

              <div className="hidden xl:flex flex-col items-end leading-none">
                <span className="text-xs font-semibold text-slate-200">{currentUser?.name}</span>
                <span className="text-[9px] text-slate-500 uppercase mt-0.5">{currentUser?.role}</span>
              </div>

              {/* Settings (Engranaje) Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 ${showSettingsModal ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'}`}
                title="Configuración, Suscripción y Cuenta (⚙️)"
              >
                <Settings size={16} />
              </button>

              <button
                onClick={handleAppLogout}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm flex items-center justify-center shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Profile / Password Modal Overlay */}
        {showProfile && currentUser && (
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:top-full sm:right-4 mt-0 sm:mt-4 z-50 flex items-center justify-center sm:block">
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm sm:hidden" onClick={() => setShowProfile(false)}></div>

            <div className="relative w-[92%] max-w-[400px] sm:w-96 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-100 animate-fade-in-up overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-slate-800 tracking-tight">Mi Cuenta</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configuración de Seguridad</p>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuario Identificado</span>
                  <span className="block text-xs sm:text-sm font-bold text-slate-700 truncate">{currentUser.email}</span>
                </div>
              </div>

              <PasswordChange email={currentUser.email} />

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                  Cerrar
                </button>

                <button
                  onClick={() => { setShowProfile(false); handleAppLogout(); }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5 uppercase tracking-widest"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">

        {/* Tabs Content */}
        {!sequence && (
          <div className="animate-fade-in-up">
            {activeTab === 'monitor' && currentUser?.role === 'admin' && <ApiStats />}
            {activeTab === 'users' && currentUser?.role === 'admin' && <UserManagement />}
            {activeTab === 'history' && (
              <AdminSequenceViewer
                userEmail={currentUser?.role === 'admin' ? undefined : currentUser?.email}
                user={currentUser}
                creditsLeft={creditsLeft}
                onSelectSequence={handleSelectSequence}
              />
            )}
            {activeTab === 'security' && currentUser?.role === 'admin' && <SecurityDashboard />}
            {activeTab === 'chat' && currentUser?.role === 'admin' && <AdminChatPanel currentUser={currentUser} allUsers={allUsers} />}

            {activeTab === 'create' && (
              <>
                {currentUser && !authService.isUserUnlimited(currentUser) && (
                  <div className="max-w-4xl mx-auto mb-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
                          Suscripción Requerida
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                          Activación de Acceso y Planeador Didáctico
                        </h3>
                        <p className="text-xs text-slate-400">
                          Selecciona tu plan institucional para habilitar la generación de planeaciones con IA.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPolicyModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors shadow-sm shrink-0 flex items-center gap-2"
                      >
                        <BookOpen size={14} />
                        <span>Ver Políticas y Planes</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-300">Plan Mensual</span>
                          <span className="font-bold text-white text-base">$15.000 COP</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          15 Planeaciones Didácticas completas por ciclo de 30 días.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/40 space-y-2 relative">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            <Award size={13} /> Plan Trimestral
                          </span>
                          <span className="font-bold text-emerald-400 text-base">$35.000 COP</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          40 Planeaciones Didácticas (Ahorro directo de $10.000 COP).
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Canal de Transferencia Directa (Nequi / BRE-B):</span>
                          <strong className="text-white font-mono text-sm tracking-wider">320 595 7019</strong>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 text-right">
                        <span>Activación y validación inmediata tras reporte</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AVISO A DOCENTES SUBSCRIBIERTOS (POLÍTICA DISPOSITIVOS) */}
                {currentUser && authService.isUserUnlimited(currentUser) && (
                  <div className="max-w-4xl mx-auto mb-8 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 text-xs text-slate-300">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <p className="leading-relaxed">
                      <strong className="text-white">Licencia Personal Activa:</strong> Autorizada para uso en <strong>1 dispositivo móvil y 1 computador personal</strong>. El acceso es personal e intransferible.
                    </p>
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

        {/* Botón Flotante de WhatsApp Solo para Docentes VIP */}
        {currentUser && currentUser.role !== 'admin' && authService.isUserUnlimited(currentUser) && (
          <a
            href="https://wa.me/573205957019?text=Hola,%20soy%20usuario%20Premium%20de%20la%20plataforma%20Guaimaral%20AI.%20Necesito%20soporte%20o%20tengo%20una%20sugerencia:"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1ebe57] hover:scale-110 transition-all z-50 flex items-center justify-center group animate-fade-in-up"
            title="Contactar Soporte Premium"
          >
            <MessageCircle size={32} />
            <span className="absolute right-16 bg-white text-[#25D366] text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap border border-green-100 translate-x-4 group-hover:translate-x-0">
              Soporte VIP
            </span>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
            </span>
          </a>
        )}

        {/* Widget Flotante de Chat para Docentes */}
        {currentUser && <ChatWidget user={currentUser} />}

        {/* Modal Bloqueo por Mora y Suscripción Vencida */}
        {isSubscriptionExpired && currentUser && subscriptionStatus && (
          <SubscriptionBlockModal
            user={currentUser}
            subscriptionStatus={subscriptionStatus}
            onLogout={handleAppLogout}
            onRefresh={() => refreshUser()}
          />
        )}

        {/* Modal Comunicado Oficial y Políticas de Sostenibilidad 2026 */}
        <PolicyAnnouncementModal
          isOpen={showPolicyModal}
          onClose={() => {
            setShowPolicyModal(false);
            sessionStorage.setItem('guaimaral_policy_modal_dismissed', 'true');
            localStorage.setItem('guaimaral_policy_ack_2026', 'true');
          }}
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          onSubscriptionChanged={async () => {
            await refreshUser();
            if (currentUser) {
              const q = await authService.getUserQuotaInfo(currentUser);
              setUserQuota(q);
            }
          }}
        />

        {/* Modal de Configuración, Suscripción y Cuenta (Engranaje) */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          user={currentUser}
          quotaInfo={userQuota}
          onOpenPolicies={() => setShowPolicyModal(true)}
          onSubscriptionChanged={async () => {
            await refreshUser();
            if (currentUser) {
              const q = await authService.getUserQuotaInfo(currentUser);
              setUserQuota(q);
            }
          }}
          onLogout={handleAppLogout}
        />
      </main>
    </div>
  );
}

export default App;