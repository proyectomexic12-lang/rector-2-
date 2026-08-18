import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { authService, User } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { AREAS, GRADOS } from '../constants';
import { Users, RefreshCw, Shield, FileText, Download, Upload, Check, X, AlertTriangle, Key, Clock, CreditCard, Sparkles, Zap } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [areaManagementUser, setAreaManagementUser] = useState<User | null>(null);
    const [tempAreas, setTempAreas] = useState<string[]>([]);
    const [tempGrados, setTempGrados] = useState<string[]>([]);
    const [tempIsUnlimited, setTempIsUnlimited] = useState<boolean>(false);
    const [tempCustomCredits, setTempCustomCredits] = useState<number>(6);
    const [tempStartDate, setTempStartDate] = useState<string>('');
    const [tempMonthlyPrice, setTempMonthlyPrice] = useState<number>(15000);
    const [tempSubscriptionMonths, setTempSubscriptionMonths] = useState<number>(1);
    const [activeModalTab, setActiveModalTab] = useState<'areas' | 'grados' | 'creditos'>('areas');
    const [userSequences, setUserSequences] = useState<Record<string, any[]>>({});
    const [isLoadingSeqs, setIsLoadingSeqs] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const formatCOP = (val?: number | null) => {
        const num = val !== undefined && val !== null && !isNaN(val) ? val : 15000;
        return '$' + num.toLocaleString('es-CO') + ' COP';
    };

    const getNextBillingDateStr = (startDateStr?: string | null, months: number = 1) => {
        const start = startDateStr ? new Date(startDateStr + 'T12:00:00') : new Date();
        if (isNaN(start.getTime())) return '';
        const next = new Date(start);
        next.setMonth(next.getMonth() + months);
        return next.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // SEGURIDAD DE CLAVE MAESTRA DE CRÉDITOS
    const [isCreditsUnlocked, setIsCreditsUnlocked] = useState<boolean>(false);
    const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
    const [creditPasswordInput, setCreditPasswordInput] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [targetUserForCredits, setTargetUserForCredits] = useState<User | null>(null);

    const MASTER_CREDIT_PASSWORD = 'Jesusnavas19*';

    const fetchUsers = async () => {
        setIsRefreshing(true);
        const data = await authService.getAllUsersWithStats();
        const sorted = data.sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0));
        setUsers(sorted);
        setIsRefreshing(false);
    };

    const toggleSequences = async (email: string) => {
        if (expandedUser === email) { setExpandedUser(null); return; }
        setIsLoadingSeqs(true);
        setExpandedUser(email);
        const allSeqs = await authService.getAllSequences();
        const filtered = allSeqs.filter(s => (s.user_email || '').toLowerCase() === email.toLowerCase());
        setUserSequences(prev => ({ ...prev, [email]: filtered }));
        setIsLoadingSeqs(false);
    };

    const downloadJson = (sequence: any) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sequence.content, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", dataStr);
        a.setAttribute("download", `secuencia_${sequence.tema}_${new Date(sequence.timestamp).getTime()}.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    useEffect(() => {
        fetchUsers();
        if (supabase) {
            const channel = supabase
                .channel('realtime-stats')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => fetchUsers())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs' }, () => fetchUsers())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'generated_sequences' }, () => fetchUsers())
                .subscribe();

            const currentUser = authService.getCurrentUser();
            const sub = authService.trackPresence(currentUser!, (state) => {
                setOnlineUsers({ ...state });
            });
            if (sub) setOnlineUsers({ ...sub.presenceState() });

            return () => {
                if (sub) sub.unsubscribe();
                supabase.removeChannel(channel);
            };
        }
    }, []);

    const handleManualSync = async () => {
        setIsRefreshing(true);
        const result = await authService.migrationLocalToCloud();
        if (result.success) {
            alert(`Sincronización exitosa: ${result.count} secuencias migradas.`);
            fetchUsers();
        } else {
            alert("Error en la sincronización: " + (result.message || "Error desconocido"));
        }
        setIsRefreshing(false);
    };

    const openManagement = (user: User, initialTab: 'areas' | 'grados' | 'creditos' = 'areas') => {
        if (initialTab === 'creditos' && !isCreditsUnlocked) {
            setTargetUserForCredits(user);
            setCreditPasswordInput('');
            setPasswordError('');
            setShowPasswordModal(true);
            return;
        }

        setAreaManagementUser(user);
        setTempAreas(user.areas && user.areas.length > 0 ? [...user.areas] : [...AREAS]);
        setTempGrados(user.grados && user.grados.length > 0 ? [...user.grados] : [...GRADOS]);
        setTempIsUnlimited(!!user.is_unlimited || user.role === 'admin' || (user.email || '').toLowerCase().includes('demo'));
        setTempCustomCredits(user.custom_credits !== undefined && user.custom_credits !== null ? user.custom_credits : 6);
        setTempStartDate(user.unlimited_start_date || new Date().toISOString().substring(0, 10));
        setTempMonthlyPrice(user.monthly_price || 15000);
        setTempSubscriptionMonths(user.subscription_months || 1);
        setActiveModalTab(initialTab);
    };

    const verifyMasterPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (creditPasswordInput === MASTER_CREDIT_PASSWORD) {
            setIsCreditsUnlocked(true);
            setShowPasswordModal(false);
            setPasswordError('');
            if (targetUserForCredits) {
                openManagement(targetUserForCredits, 'creditos');
            }
        } else {
            setPasswordError('🔒 Contraseña de créditos incorrecta. Acceso denegado.');
        }
    };

    const handleTabSwitch = (tab: 'areas' | 'grados' | 'creditos') => {
        if (tab === 'creditos' && !isCreditsUnlocked) {
            setTargetUserForCredits(areaManagementUser);
            setCreditPasswordInput('');
            setPasswordError('');
            setShowPasswordModal(true);
            return;
        }
        setActiveModalTab(tab);
    };

    const toggleArea = (area: string) => setTempAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
    const toggleGrado = (grado: string) => setTempGrados(prev => prev.includes(grado) ? prev.filter(g => g !== grado) : [...prev, grado]);
    const handleSelectAll = (type: 'areas' | 'grados') => { if (type === 'areas') setTempAreas([...AREAS]); else setTempGrados([...GRADOS]); };
    const handleClearAll = (type: 'areas' | 'grados') => { if (type === 'areas') setTempAreas([]); else setTempGrados([]); };

    const saveSettings = async () => {
        if (!areaManagementUser) return;
        setIsSaving(true);
        try {
            await authService.updateUserSettings(areaManagementUser.email, {
                areas: tempAreas,
                grados: tempGrados,
                is_unlimited: tempIsUnlimited,
                custom_credits: tempCustomCredits,
                unlimited_start_date: tempIsUnlimited ? (tempStartDate || new Date().toISOString()) : null,
                monthly_price: tempMonthlyPrice,
                subscription_months: tempSubscriptionMonths
            });
            setAreaManagementUser(null);
            await fetchUsers();
            alert("✅ Cambios y permisos guardados correctamente.");
        } catch (error) {
            console.error(error);
            alert("❌ Error al guardar los cambios en la nube. Intenta de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="w-full bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl mb-12 animate-fade-in-up relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                        <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100 shrink-0">
                            <Users size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">Gestión Docente</h3>
                            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monitor de Actividad Institucional & Créditos</p>
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    {Object.keys(onlineUsers).length} En Línea
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                        <button onClick={fetchUsers} disabled={isRefreshing} className={`p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm ${isRefreshing ? 'opacity-50' : ''}`}>
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleManualSync} className="px-5 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                            <Upload size={14} /> Sincronizar
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                                <th className="pb-4 pl-4">Usuario</th>
                                <th className="pb-4">Rol / Permisos</th>
                                <th className="pb-4 text-center">Créditos Semanales</th>
                                <th className="pb-4 text-center">Planeaciones</th>
                                <th className="pb-4 text-right pr-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600">
                            {users.map((user, i) => {
                                const isUserUnlimited = authService.isUserUnlimited(user);
                                return (
                                <React.Fragment key={i}>
                                    <tr className={`group transition-colors border-b border-slate-100 ${expandedUser === user.email ? 'bg-indigo-50/30' : 'hover:bg-white/50'}`}>
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${onlineUsers[(user.email || '').toLowerCase()] ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.name}</div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {user.role}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.areas?.length || 0) > 0 && <span className="text-[7px] font-bold text-slate-400 uppercase">{user.areas?.length} Áreas</span>}
                                                    {(user.grados?.length || 0) > 0 && <span className="text-[7px] font-bold text-slate-400 uppercase">{user.grados?.length} Grados</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            {isUserUnlimited ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm">
                                                        <span>∞</span> Ilimitado ({formatCOP(user.monthly_price)} / {user.subscription_months === 3 ? '3 meses' : user.subscription_months === 6 ? '6 meses' : 'mes'})
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-500">
                                                        📅 Próximo pago: {getNextBillingDateStr(user.unlimited_start_date, user.subscription_months || 1)}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400">
                                                        {user.stats?.week || 0} gastados esta semana
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${(user.stats?.week || 0) >= (user.custom_credits ?? 6) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                                        <CreditCard size={10} /> {user.stats?.week || 0} / {user.custom_credits ?? 6} gastados
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400">
                                                        {Math.max(0, (user.custom_credits ?? 6) - (user.stats?.week || 0))} restantes
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 text-center font-bold text-slate-800">{user.stats?.total || 0}</td>
                                        <td className="py-4 text-right pr-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openManagement(user, 'creditos')} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-sm">
                                                    <CreditCard size={12} /> Créditos
                                                </button>
                                                <button onClick={() => openManagement(user, 'areas')} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center gap-2">
                                                    <Shield size={12} /> Permisos
                                                </button>
                                                <button onClick={() => toggleSequences(user.email)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${expandedUser === user.email ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-600'}`}>
                                                    <FileText size={12} /> {expandedUser === user.email ? 'Cerrar' : 'Ver'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedUser === user.email && (
                                        <tr className="bg-indigo-50/10">
                                            <td colSpan={5} className="p-8">
                                                <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden min-h-[200px]">
                                                    {isLoadingSeqs ? (
                                                        <div className="py-12 flex flex-col items-center gap-3">
                                                            <RefreshCw size={24} className="text-indigo-600 animate-spin" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Cargando...</span>
                                                        </div>
                                                    ) : (userSequences[user.email]?.length || 0) === 0 ? (
                                                        <div className="py-12 text-center text-slate-400 italic font-medium">No se encontraron planeaciones.</div>
                                                    ) : (
                                                        <div className="max-h-80 overflow-y-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-slate-50 sticky top-0">
                                                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                                        <th className="px-6 py-3">Tema</th>
                                                                        <th className="px-6 py-3">Área / Grado</th>
                                                                        <th className="px-6 py-3 text-right">Acción</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {userSequences[user.email]?.map((seq) => (
                                                                        <tr key={seq.id} className="hover:bg-slate-50/50">
                                                                            <td className="px-6 py-4 font-black text-slate-800 text-xs">{seq.tema}</td>
                                                                            <td className="px-6 py-4 text-[10px] text-slate-500 font-bold">{seq.area} • {seq.grado}</td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <button onClick={() => downloadJson(seq)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                                                                    <Download size={14} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );})}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* MODAL CLAVE MAESTRA */}
            {showPasswordModal && ReactDOM.createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="bg-slate-900 text-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400">
                                    <Key size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white">Acceso a Créditos</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguridad Administrador</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                            Ingresa la clave maestra para administrar cuotas de créditos y suscripciones ilimitadas de los docentes.
                        </p>

                        <form onSubmit={verifyMasterPassword} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Contraseña Maestra de Créditos:</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={creditPasswordInput}
                                    onChange={(e) => setCreditPasswordInput(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                                />
                            </div>

                            {passwordError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {passwordError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="w-1/2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20"
                                >
                                    Desbloquear
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL CONFIGURACIÓN DOCENTE — FUERA del div con backdrop-blur para que el fixed funcione correctamente */}
            {areaManagementUser && ReactDOM.createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '32px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px', backgroundColor: 'rgba(15,23,42,0.80)', backdropFilter: 'blur(6px)' }}>
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>

                        {/* Header */}
                        <header className="bg-slate-900 px-8 pt-7 pb-0 text-white rounded-t-3xl shrink-0">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Permisos & Créditos del Docente</p>
                                    <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black shrink-0">
                                            {areaManagementUser.name.charAt(0)}
                                        </span>
                                        {areaManagementUser.name}
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-1 ml-11">{areaManagementUser.email}</p>
                                </div>
                                <button onClick={() => setAreaManagementUser(null)} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all mt-1">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex gap-1 border-b border-white/10">
                                {(['areas', 'grados', 'creditos'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabSwitch(tab)}
                                        className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 -mb-[2px] ${activeModalTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab === 'areas' ? `Materias (${tempAreas.length})` : tab === 'grados' ? `Grados (${tempGrados.length})` : `💳 Créditos`}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {/* Barra acciones */}
                        {activeModalTab !== 'creditos' ? (
                            <div className="px-8 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {activeModalTab === 'areas' ? tempAreas.length : tempGrados.length} de {activeModalTab === 'areas' ? AREAS.length : GRADOS.length} seleccionados
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSelectAll(activeModalTab)} className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">✓ Todo</button>
                                    <button onClick={() => handleClearAll(activeModalTab)} className="text-[9px] font-black text-red-500 uppercase bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all">✕ Ninguno</button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-8 py-3 border-b border-amber-100 flex items-center justify-between shrink-0 bg-amber-50/50">
                                <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} className="text-amber-600" /> Administración de Créditos Gratuitos & Semanales
                                </p>
                            </div>
                        )}

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto p-8" style={{ minHeight: 0 }}>
                            {activeModalTab !== 'creditos' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(activeModalTab === 'areas' ? AREAS : GRADOS).map((item) => {
                                        const isSelected = (activeModalTab === 'areas' ? tempAreas : tempGrados).includes(item);
                                        return (
                                            <button
                                                key={item}
                                                onClick={() => activeModalTab === 'areas' ? toggleArea(item) : toggleGrado(item)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isSelected
                                                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-md shadow-blue-100'
                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'
                                                    }`}>
                                                    {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <span className="text-[12px] font-bold leading-tight">{item}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {/* Card de consumo semanal actual */}
                                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-3 relative overflow-hidden border border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400">
                                                    <CreditCard size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Consumo Semanal Actual</p>
                                                    <h4 className="text-lg font-black tracking-tight text-white">
                                                        {areaManagementUser.stats?.week || 0} planeaciones generadas esta semana
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-3xl font-black text-amber-400">
                                                    {tempIsUnlimited ? '∞' : Math.max(0, tempCustomCredits - (areaManagementUser.stats?.week || 0))}
                                                </span>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {tempIsUnlimited ? 'Ilimitados' : 'Disponibles'}
                                                </p>
                                            </div>
                                        </div>

                                        {!tempIsUnlimited && (
                                            <div className="space-y-1.5 pt-2">
                                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                                                    <div
                                                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(100, Math.max(5, ((areaManagementUser.stats?.week || 0) / tempCustomCredits) * 100))}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase px-1">
                                                    <span>{areaManagementUser.stats?.week || 0} de {tempCustomCredits} usados</span>
                                                    <span>{Math.max(0, tempCustomCredits - (areaManagementUser.stats?.week || 0))} restantes</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Opción 1: Créditos Infinitos Toggle & Control de Cobro */}
                                    <div className={`p-6 rounded-3xl border-2 transition-all ${tempIsUnlimited ? 'bg-emerald-50/60 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${tempIsUnlimited ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    ∞
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-slate-800">Créditos Infinitos / Suscripción Ilimitada</h4>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">El docente genera sin límite semanal. Cobro mensual recurrente ($15/mes).</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextVal = !tempIsUnlimited;
                                                    setTempIsUnlimited(nextVal);
                                                    if (nextVal && !tempStartDate) {
                                                        setTempStartDate(new Date().toISOString().substring(0, 10));
                                                    }
                                                }}
                                                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tempIsUnlimited ? 'bg-emerald-600' : 'bg-slate-300'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${tempIsUnlimited ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {tempIsUnlimited && (
                                            <div className="mt-5 pt-4 border-t border-emerald-200/80 space-y-4">

                                                {/* Planes Automáticos de Suscripción */}
                                                <div>
                                                    <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-2">🎁 Selecciona un Plan Automático (Tarifa Especial):</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        {[
                                                            { months: 1, price: 15000, label: '1 Mes', badge: 'Mensual' },
                                                            { months: 3, price: 35000, label: '3 Meses', badge: 'Oferta 35k' },
                                                            { months: 6, price: 75000, label: '6 Meses', badge: 'Oferta 75k' },
                                                        ].map(plan => {
                                                            const isSelected = tempSubscriptionMonths === plan.months && tempMonthlyPrice === plan.price;
                                                            return (
                                                                <button
                                                                    key={plan.months}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTempSubscriptionMonths(plan.months);
                                                                        setTempMonthlyPrice(plan.price);
                                                                    }}
                                                                    className={`p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${isSelected
                                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]'
                                                                        : 'bg-white text-slate-700 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50'
                                                                        }`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                                                                            {plan.badge}
                                                                        </span>
                                                                        {isSelected && <Check size={14} className="text-white" />}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-black text-sm">{plan.label}</h5>
                                                                        <p className={`text-xs font-bold ${isSelected ? 'text-emerald-100' : 'text-emerald-700'}`}>
                                                                            ${(plan.price / 1000).toLocaleString('es-CO')}k COP
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                                                    <div>
                                                        <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">📅 Fecha de Activación / Inicio:</label>
                                                        <input
                                                            type="date"
                                                            value={tempStartDate ? tempStartDate.substring(0, 10) : new Date().toISOString().substring(0, 10)}
                                                            onChange={(e) => setTempStartDate(e.target.value)}
                                                            className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">💰 Precio del Plan (COP):</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">$</span>
                                                            <input
                                                                type="number"
                                                                min="1000"
                                                                step="1000"
                                                                value={tempMonthlyPrice}
                                                                onChange={(e) => setTempMonthlyPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                                                className="w-full bg-white border border-emerald-300 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card resumen automático de renovación */}
                                                <div className="bg-emerald-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                                                    <div>
                                                        <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest block">Resumen de Renovación Automática</span>
                                                        <h5 className="text-xs font-bold text-white mt-0.5">
                                                            {formatCOP(tempMonthlyPrice)} • Plan de {tempSubscriptionMonths} {tempSubscriptionMonths === 1 ? 'Mes' : 'Meses'}
                                                        </h5>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-emerald-300 uppercase block">Próximo Cobro</span>
                                                        <span className="text-xs font-black text-amber-300">
                                                            {getNextBillingDateStr(tempStartDate, tempSubscriptionMonths)}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>

                                    {/* Opción 2: Asignar Cuota Personalizada */}
                                    {!tempIsUnlimited && (
                                        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-700">
                                                    <Zap size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-slate-800">Límite Semanal de Créditos</h4>
                                                    <p className="text-xs text-slate-500 font-medium">Asigna la cantidad exacta de planeaciones gratuitas que el docente puede generar cada semana.</p>
                                                </div>
                                            </div>

                                            {/* Selector rápido */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {[6, 10, 15, 20, 50, 100].map((count) => (
                                                    <button
                                                        key={count}
                                                        type="button"
                                                        onClick={() => setTempCustomCredits(count)}
                                                        className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all border ${tempCustomCredits === count
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-400'
                                                            }`}
                                                    >
                                                        {count} créditos {count === 6 ? '(Estándar)' : ''}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Input manual */}
                                            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0">Límite Personalizado:</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="9999"
                                                    value={tempCustomCredits}
                                                    onChange={(e) => setTempCustomCredits(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                />
                                                <span className="text-xs font-bold text-slate-400">planeaciones por semana</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <footer className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between rounded-b-3xl shrink-0">
                            <div className="text-[9px] font-black text-slate-400 uppercase">
                                {tempIsUnlimited ? (
                                    <span className="text-emerald-600 font-black flex items-center gap-1">
                                        <span>∞</span> Estado: Créditos Ilimitados
                                    </span>
                                ) : (
                                    <span>
                                        <span className="text-blue-600 text-sm font-black">{tempAreas.length}</span> materias · <span className="text-blue-600 text-sm font-black">{tempGrados.length}</span> grados · <span className="text-amber-600 text-sm font-black">{tempCustomCredits}</span> créditos/sem
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setAreaManagementUser(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                    Cancelar
                                </button>
                                <button onClick={saveSettings} disabled={isSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </footer>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
