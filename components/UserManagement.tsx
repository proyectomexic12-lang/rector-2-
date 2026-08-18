import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { authService, User } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { AREAS, GRADOS } from '../constants';
import { Users, RefreshCw, Shield, FileText, Download, Upload, Check, X, AlertTriangle, Key, Clock } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [areaManagementUser, setAreaManagementUser] = useState<User | null>(null);
    const [tempAreas, setTempAreas] = useState<string[]>([]);
    const [tempGrados, setTempGrados] = useState<string[]>([]);
    const [activeModalTab, setActiveModalTab] = useState<'areas' | 'grados'>('areas');
    const [userSequences, setUserSequences] = useState<Record<string, any[]>>({});
    const [isLoadingSeqs, setIsLoadingSeqs] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

    const openManagement = (user: User) => {
        setAreaManagementUser(user);
        setTempAreas(user.areas && user.areas.length > 0 ? [...user.areas] : [...AREAS]);
        setTempGrados(user.grados && user.grados.length > 0 ? [...user.grados] : [...GRADOS]);
        setActiveModalTab('areas');
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
                grados: tempGrados
            });
            setAreaManagementUser(null);
            await fetchUsers();
            alert("✅ Cambios guardados correctamente.");
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
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monitor de Actividad Institucional</p>
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
                                <th className="pb-4 text-center">Planeaciones</th>
                                <th className="pb-4 text-right pr-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600">
                            {users.map((user, i) => (
                                <React.Fragment key={i}>
                                    <tr className={`group transition-colors border-b border-slate-100 ${expandedUser === user.email ? 'bg-indigo-50/30' : 'hover:bg-white/50'}`}>
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${onlineUsers[user.email.toLowerCase()] ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
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
                                        <td className="py-4 text-center font-bold text-slate-800">{user.stats?.total || 0}</td>
                                        <td className="py-4 text-right pr-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openManagement(user)} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center gap-2">
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
                                            <td colSpan={4} className="p-8">
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
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* MODAL — FUERA del div con backdrop-blur para que el fixed funcione correctamente */}
            {areaManagementUser && ReactDOM.createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '32px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px', backgroundColor: 'rgba(15,23,42,0.80)', backdropFilter: 'blur(6px)' }}>
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>

                        {/* Header */}
                        <header className="bg-slate-900 px-8 pt-7 pb-0 text-white rounded-t-3xl shrink-0">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Permisos del Docente</p>
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
                                {(['areas', 'grados'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveModalTab(tab)}
                                        className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 -mb-[2px] ${activeModalTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab === 'areas' ? `Materias (${tempAreas.length})` : `Grados (${tempGrados.length})`}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {/* Barra acciones */}
                        <div className="px-8 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {activeModalTab === 'areas' ? tempAreas.length : tempGrados.length} de {activeModalTab === 'areas' ? AREAS.length : GRADOS.length} seleccionados
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => handleSelectAll(activeModalTab)} className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">✓ Todo</button>
                                <button onClick={() => handleClearAll(activeModalTab)} className="text-[9px] font-black text-red-500 uppercase bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all">✕ Ninguno</button>
                            </div>
                        </div>

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto p-8" style={{ minHeight: 0 }}>
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
                        </div>

                        {/* Footer */}
                        <footer className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between rounded-b-3xl shrink-0">
                            <div className="text-[9px] font-black text-slate-400 uppercase">
                                <span className="text-blue-600 text-sm font-black">{tempAreas.length}</span> materias · <span className="text-blue-600 text-sm font-black">{tempGrados.length}</span> grados
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setAreaManagementUser(null)} disabled={isSaving} className="px-5 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-all">Cancelar</button>
                                <button
                                    onClick={saveSettings}
                                    disabled={isSaving}
                                    className={`px-7 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 hover:-translate-y-0.5'
                                        }`}
                                >
                                    {isSaving ? <><RefreshCw size={13} className="animate-spin" /> Guardando...</> : <><Check size={13} /> Guardar Cambios</>}
                                </button>
                            </div>
                        </footer>

                    </div>
                </div>
                , document.body)}
        </>
    );
};

export const PasswordChange: React.FC<{ email: string }> = ({ email }) => {
    const [newPass, setNewPass] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'none', text: string }>({ type: 'none', text: '' });
    const [isChanging, setIsChanging] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleChange = async () => {
        if (newPass.length < 6) {
            setMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }
        setIsChanging(true);
        setMsg({ type: 'none', text: '' });
        try {
            await authService.changePassword(email, newPass);
            setMsg({ type: 'success', text: '¡Contraseña actualizada correctamente!' });
            setNewPass('');
            setTimeout(() => setMsg({ type: 'none', text: '' }), 5000);
        } catch (error) {
            setMsg({ type: 'error', text: 'Error al actualizar. Intenta de nuevo.' });
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div className="mt-4 p-4 sm:p-5 bg-slate-50 rounded-3xl border border-slate-200/60 shadow-inner">
            <div className="flex items-center gap-3 mb-5">
                <div className="bg-white p-2.5 rounded-2xl shadow-sm text-indigo-600 border border-slate-100">
                    <Key size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">Seguridad de la Cuenta</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Acceso Personal</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative group">
                    <input
                        type={showPass ? "text" : "password"}
                        value={newPass}
                        onChange={e => { setNewPass(e.target.value); if (msg.type !== 'none') setMsg({ type: 'none', text: '' }); }}
                        placeholder="Nueva contraseña de acceso"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all pr-12 shadow-sm"
                    />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors" type="button">
                        {showPass ? <Clock size={18} /> : <Shield size={18} />}
                    </button>
                    {newPass.length > 0 && (
                        <div className="mt-2 flex gap-1 px-1">
                            {[1, 2, 3, 4].map((step) => (
                                <div key={step} className={`h-1 flex-1 rounded-full transition-all duration-500 ${newPass.length >= step * 2 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleChange}
                    disabled={isChanging || !newPass}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all flex items-center justify-center gap-3 shadow-xl ${isChanging || !newPass
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-slate-900 text-white hover:bg-indigo-600 hover:-translate-y-0.5 active:scale-95 shadow-indigo-500/10'
                        }`}
                >
                    {isChanging ? (
                        <><RefreshCw size={14} className="animate-spin" /> Actualizando...</>
                    ) : 'Confirmar Cambio'}
                </button>
            </div>

            {msg.type !== 'none' && (
                <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 border animate-fade-in-up ${msg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 italic font-bold text-xs'
                    : 'bg-red-50 text-red-700 border-red-100 font-bold text-xs'
                    }`}>
                    {msg.type === 'success' ? <Shield size={14} /> : <AlertTriangle size={14} />}
                    {msg.text}
                </div>
            )}
        </div>
    );
};
