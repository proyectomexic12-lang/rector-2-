import { Cpu, Zap, Info, BarChart, Server } from 'lucide-react';
import { modelHealthStatus, apiMetrics, getAvailableKeysInfo } from '../services/geminiService';
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export const ApiStats: React.FC = () => {
    // Force re-render periodically for local metrics
    const [, setTick] = useState(0);
    const [cloudMetrics, setCloudMetrics] = useState<any>(null);

    const keysInfo = getAvailableKeysInfo();

    const fetchGlobalMetrics = async () => {
        if (!supabase || keysInfo.length === 0) return;

        try {
            const newCloudMetrics: any = {};
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

            for (const kInfo of keysInfo) {
                const label = kInfo.label;
                // Total success
                const { count: success } = await supabase
                    .from('api_key_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('key_name', label)
                    .eq('status', 'success');

                // Total errors
                const { count: errors } = await supabase
                    .from('api_key_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('key_name', label)
                    .eq('status', 'error');

                // Today success
                const { count: todaySuccess } = await supabase
                    .from('api_key_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('key_name', label)
                    .eq('status', 'success')
                    .gte('timestamp', todayStart);

                // Last Action
                const { data: lastActionData } = await supabase
                    .from('api_key_logs')
                    .select('timestamp, action')
                    .eq('key_name', label)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                newCloudMetrics[label] = {
                    success: success || 0,
                    errors: errors || 0,
                    today: todaySuccess || 0,
                    requests: (success || 0) + (errors || 0),
                    lastUsed: lastActionData ? new Date(lastActionData.timestamp).toLocaleTimeString() : "---",
                    lastAction: lastActionData?.action || "---"
                };
            }
            setCloudMetrics(newCloudMetrics);
        } catch (e) {
            // Manejo silencioso de métricas de nube si la tabla aún no existe
        }
    };

    useEffect(() => {
        fetchGlobalMetrics();
        const interval = setInterval(() => setTick(t => t + 1), 5000);

        if (supabase) {
            const channel = supabase
                .channel('api-monitor')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'api_key_logs' }, () => {
                    fetchGlobalMetrics();
                })
                .subscribe();

            return () => {
                clearInterval(interval);
                supabase.removeChannel(channel);
            };
        }

        return () => clearInterval(interval);
    }, []);

    const providerName = import.meta.env.VITE_AI_PROVIDER === 'google' ? 'Google Gemini Native' : 'Groq Cloud Omni-Layer';

    return (
        <div className="w-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 shadow-2xl mb-12 animate-fade-in-up relative overflow-hidden group transition-all duration-500 hover:shadow-blue-500/10 hover:border-blue-200/50">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-colors duration-700"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/10 transition-colors duration-700"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-xl group-hover:rotate-3 transition-transform duration-500">
                            <Cpu size={32} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Monitor AI ({keysInfo.length} Canales)</h3>
                            <div className="bg-blue-600/10 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-200 animate-pulse flex items-center gap-1">
                                <Server size={10} /> {providerName}
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400">Modelos & Red:</span>
                            <span className="flex gap-2 flex-wrap ml-1">
                                {Object.entries(modelHealthStatus).map(([name, status]) => (
                                    <div key={name} title={`${name}: ${status}`} className="flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200/50">
                                        <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500 shadow-sm shadow-green-500/40' : status === 'offline' ? 'bg-red-500' : 'bg-blue-400 animate-pulse'}`}></div>
                                        <span className="text-[9px] text-slate-600 font-bold lowercase">{name}</span>
                                    </div>
                                ))}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/50 px-5 py-3 rounded-2xl border border-white/50 backdrop-blur-sm self-start md:self-center">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Rotación Failover</span>
                        <span className="text-sm font-black text-green-600">{keysInfo.length} LLAVES EN LINEA</span>
                    </div>
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30"></div>
                        <div className="relative w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    </div>
                </div>
            </div>

            {/* Banner de Alerta Inteligente para el Administrador */}
            {keysInfo.some(k => (apiMetrics[k.id]?.errors || 0) > 0) && (
                <div className="mb-8 p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-red-500/10 border-2 border-amber-400/40 rounded-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl animate-bounce">⚠️</span>
                        <div>
                            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Aviso de Cuota / Conmutación Activa</h4>
                            <p className="text-[11px] font-medium text-amber-800">
                                Una de tus llaves registró error o límite de tasa (429). El orquestador activó el salto automático hacia las llaves restantes para que tus profesores no se detengan.
                            </p>
                        </div>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-3 py-1.5 rounded-xl whitespace-nowrap shadow-sm">
                        Failover Protegido
                    </span>
                </div>
            )}

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${keysInfo.length >= 4 ? 'xl:grid-cols-4' : ''} gap-6 relative z-10 mb-10`}>
                {keysInfo.map((kInfo, i) => {
                    const keyName = kInfo.id;
                    const label = kInfo.label;
                    const localData = apiMetrics[keyName] || { requests: 0, success: 0, errors: 0, tokens: 0, lastUsed: "", label };
                    const cloudData = cloudMetrics?.[label];
                    
                    const requests = Math.max(localData.requests, cloudData?.requests || 0);
                    const success = Math.max(localData.success, cloudData?.success || 0);
                    const errors = Math.max(localData.errors, cloudData?.errors || 0);
                    const today = Math.max(localData.success, cloudData?.today || 0);
                    const tokens = localData.tokens || 0;
                    const lastUsed = localData.lastUsed || cloudData?.lastUsed || "---";
                    const lastAction = (cloudData?.lastAction && cloudData.lastAction !== "---") 
                        ? cloudData.lastAction 
                        : (localData.lastUsed ? "Operación local exitosa" : "En espera");
                    
                    const metrics = { requests, success, errors, today, lastUsed, lastAction };
                    const successRate = metrics.requests > 0 ? (metrics.success / metrics.requests) * 100 : 100;

                    return (
                        <div key={i} className="bg-white/60 border border-white/80 p-5 rounded-[2rem] hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group/card relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover/card:bg-blue-500/20 transition-colors"></div>

                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider truncate">Canal {i + 1}: {label}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Live</span>
                                    <Zap size={16} className={metrics.errors > 2 && successRate < 50 ? "text-red-500" : "text-amber-500 animate-pulse"} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                <div className="bg-green-50/70 p-2 rounded-xl border border-green-100">
                                    <span className="text-[8px] font-black text-green-700 uppercase tracking-wider block mb-0.5">Éxitos</span>
                                    <span className="text-xl font-black text-green-600 leading-none">{metrics.success}</span>
                                </div>
                                <div className="bg-red-50/70 p-2 rounded-xl border border-red-100">
                                    <span className="text-[8px] font-black text-red-700 uppercase tracking-wider block mb-0.5">Fallos</span>
                                    <span className={`text-xl font-black leading-none ${metrics.errors > 0 ? 'text-red-600' : 'text-slate-400'}`}>{metrics.errors}</span>
                                </div>
                                <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                                    <span className="text-[8px] font-black text-blue-700 uppercase tracking-wider block mb-0.5">Total</span>
                                    <span className="text-xl font-black text-blue-900 leading-none">{metrics.requests}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Última Acción:</span>
                                <div className="bg-slate-100/60 px-2.5 py-1 rounded-lg border border-slate-200/50 truncate flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-blue-600 italic tracking-tight">{metrics.lastAction}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{successRate.toFixed(0)}% Efectivo</span>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full transition-all duration-1000 ${successRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : successRate > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${successRate}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-[9px] font-black">
                                <span className="text-slate-500 uppercase flex items-center gap-1">
                                    <BarChart size={10} /> {metrics.requests} Peticiones <span className="text-indigo-600 font-bold">({tokens.toLocaleString()} tokens)</span>
                                </span>
                                <span className="text-slate-400 uppercase bg-white px-2 py-0.5 rounded-full border border-slate-100">{metrics.lastUsed || "---"}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-8 border-t border-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <Info size={16} className="text-blue-600" />
                    <span>Conmutación automática por error activa (Failover Round-Robin + Supabase Persistence)</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Canales Saludables:</span>
                    <div className="flex gap-1.5">
                        {keysInfo.map((_, i) => (
                            <div key={i} className="w-5 h-1.5 bg-green-500/20 rounded-full overflow-hidden" title={`Canal ${i + 1} Activo`}>
                                <div className="w-full h-full bg-green-500 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Panel de Registro de Fallos (Logs) */}
            <div className="mt-8 pt-6 border-t border-slate-200/50 relative z-10">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Registro Activo de Fallos en APIs
                </h4>
                <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
                    {keysInfo.every(k => !apiMetrics[k.id]?.errorLogs?.length) ? (
                        <div className="text-center py-6 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            No se han registrado fallos en esta sesión. Todo funcionando perfectamente.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keysInfo.map(kInfo => {
                                const logs = apiMetrics[kInfo.id]?.errorLogs || [];
                                return logs.map((log, idx) => (
                                    <div key={`${kInfo.id}-${idx}`} className="flex items-start gap-3 text-[10px] sm:text-xs font-mono bg-slate-800/50 p-2.5 rounded-lg border border-red-500/20">
                                        <span className="text-red-400 font-bold whitespace-nowrap">[{log.time}]</span>
                                        <span className="text-slate-300 font-bold text-blue-400">{kInfo.label}:</span>
                                        <span className="text-red-300 flex-1 break-words">{log.message}</span>
                                    </div>
                                ));
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
