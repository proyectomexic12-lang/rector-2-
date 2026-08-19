import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Eye, AlertCircle, History, ShieldCheck, UserX, Globe } from 'lucide-react';
import { authService } from '../services/authService';

export const SecurityDashboard: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await authService.getSecurityLogs();
            setLogs(data);
            setIsLoading(false);
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityStyle = (severity: string) => {
        if (severity === 'high') return 'bg-red-50 text-red-700 border-red-200 shadow-sm';
        if (severity === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
        return 'bg-emerald-50/80 text-emerald-900 border-emerald-200/60 shadow-sm';
    };

    return (
        <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[3rem] p-6 sm:p-12 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] mb-12 animate-fade-in-up relative overflow-hidden group">
            {/* Security Background Pattern - Light Version */}
            <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="relative z-10">
                <header className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-8">
                    <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-4 mb-3">
                            <div className="p-4 bg-red-600 rounded-[1.5rem] text-white shadow-lg shadow-red-500/20">
                                <ShieldAlert size={32} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Centro de <span className="text-red-600">Ciberseguridad</span></h2>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Estatus: Sistema Acorazado v5.0</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-8 py-5 bg-white rounded-3xl border border-slate-100 text-center min-w-[140px] shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amenazas</p>
                            <p className="text-3xl font-black text-red-600">{logs.filter(l => l.severity === 'high').length}</p>
                        </div>
                        <div className="px-8 py-5 bg-slate-900 rounded-3xl text-center min-w-[140px] shadow-xl shadow-slate-900/20 transform hover:scale-105 transition-transform">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                            <p className="text-xl font-black text-emerald-400 tracking-tighter">BLINDADO</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Log Terminal Layer */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Terminal size={20} className="text-slate-400" />
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Auditoría de Integridad</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">En Vivo</span>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-4 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                    <p className="font-black text-xs uppercase tracking-widest">Escaneando integridad...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-400" />
                                    <p className="text-slate-800 font-bold text-lg mb-1">Cero Amenazas</p>
                                    <p className="text-slate-400 text-sm font-medium">El sistema opera bajo los parámetros de seguridad esperados.</p>
                                </div>
                            ) : (
                                logs.map((log, i) => {
                                    const isHigh = log.severity === 'high';
                                    const isMedium = log.severity === 'medium';
                                    return (
                                    <div key={i} className={`p-6 rounded-[2rem] border-2 ${getSeverityStyle(log.severity)} flex items-start gap-5 transition-all hover:shadow-md hover:scale-[1.01]`}>
                                        <div className={`p-3 rounded-2xl shrink-0 ${isHigh ? 'bg-red-600 text-white' : isMedium ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                                            {isHigh ? <UserX size={20} /> : isMedium ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-black text-sm text-slate-900 tracking-tight">{log.email}</span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-2 py-1 rounded-md border border-slate-200/50">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-3">{log.event}</p>
                                            <div className="flex items-center gap-6 border-t border-black/5 pt-3">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    <Globe size={12} className="text-blue-500" /> {log.ip || 'INTERNAL_ACCESS'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate">
                                                    <Terminal size={12} className="text-slate-500" /> {log.userAgent?.split(' ')[0] || 'ExecutiveAgent'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Info Section */}
                    <div className="space-y-8">
                        <div className="p-10 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-3xl rounded-full"></div>

                            <History size={32} className="text-red-500 mb-6" />
                            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Capas de Blindaje</h3>
                            <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">
                                Arquitectura de seguridad multincapa activa y vigilante 24/7.
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Inyecciones SQL</span>
                                        <span className="text-[10px] font-black text-emerald-400">ACTIVADO</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-emerald-500 rounded-full w-full"></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Fuerza Bruta</span>
                                        <span className="text-[10px] font-black text-emerald-400">ACTIVADO</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-emerald-500 rounded-full w-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Cifrado AES-256</span>
                                        <span className="text-[10px] font-black text-emerald-400">ACTIVADO</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-emerald-500 rounded-full w-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Eye size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Vigilancia en Nube</h3>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">Sincronización Cloud</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Todos los eventos de integridad son replicados en el repositorio central de Supabase.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
