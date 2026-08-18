import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { Database, FileText, Download, Calendar, User, Search, Trash2, Activity, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User as UserType } from '../services/authService';

export const AdminSequenceViewer: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    const [sequences, setSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<any>(null);

    const loadData = async () => {
        setIsLoading(true);
        let seqData = await authService.getAllSequences();

        if (userEmail) {
            seqData = seqData.filter(s => s.user_email.toLowerCase() === userEmail.toLowerCase());
            // Cargar estadísticas también
            const s = await authService.getUsageStats(userEmail);
            setStats(s);
        }

        setSequences(seqData);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();

        // Realtime subscription para cambios en secuencias y logs
        if (supabase) {
            const channel = supabase
                .channel('admin-sequences')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'generated_sequences' }, () => {
                    loadData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs' }, () => {
                    loadData();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, []);

    const filteredSequences = sequences.filter(s =>
        (s.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.tema || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.area || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.grado || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadJson = (sequence: any) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sequence.content, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `secuencia_${sequence.tema}_${sequence.timestamp}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="w-full bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl mb-12 animate-fade-in-up relative overflow-hidden group">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                    <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-200 shrink-0">
                        <Database size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">
                            {userEmail ? 'Repositorio Personal' : 'Repositorio Global'}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                            {userEmail ? 'Mi Historial de Planeaciones' : 'Control Admin - Historial Institucional'}
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-80 group/search">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-600 transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por tema o docente..."
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Teacher Stats Bar - Visible only when viewing personal history */}
            {userEmail && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 relative z-10">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex flex-col items-center sm:items-start gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Generadas</span>
                        <div className="text-5xl font-black tracking-tighter">{stats.total}</div>
                    </div>
                    <div className="bg-white border border-indigo-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center sm:items-start gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Estado del Repositorio</span>
                        <div className="text-2xl font-black text-slate-800">SINCRONIZADO</div>
                        <div className="flex gap-1.5 mt-1">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredSequences.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">No hay planeaciones registradas aún.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Docente</th>
                                <th className="pb-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Tema / Área</th>
                                <th className="pb-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="pb-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSequences.map((seq) => (
                                <tr key={seq.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{seq.user_email}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{seq.tema}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{seq.grado} • {seq.area}</p>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar size={14} />
                                            <span className="text-xs font-medium">{new Date(seq.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => downloadJson(seq)}
                                            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm group-hover:scale-110"
                                            title="Descargar JSON"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Total Planeaciones: {filteredSequences.length}</span>
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Sincronizado con Repositorio Central
                </span>
            </div>
        </div>
    );
};
