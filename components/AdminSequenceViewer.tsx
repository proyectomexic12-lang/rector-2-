import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { Database, FileText, Download, Calendar, User, Search, Lock, BookOpen, FileDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User as UserType } from '../services/authService';
import { generateDocx } from '../services/docxService';
import { SequenceInput } from '../types';

interface AdminSequenceViewerProps {
    userEmail?: string;
    user?: UserType | null;
    creditsLeft?: number | null;
    onSelectSequence?: (seq: any) => void;
}

export const AdminSequenceViewer: React.FC<AdminSequenceViewerProps> = ({ userEmail, user, creditsLeft, onSelectSequence }) => {
    const [sequences, setSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);

    // Unpaid/expired teacher detection: non-admin, non-unlimited user with 0 credits left
    const isUnlimited = user ? authService.isUserUnlimited(user) : true;
    const isUnpaidTeacher = userEmail && user && user.role !== 'admin' && !isUnlimited && (creditsLeft === 0 || creditsLeft === null);

    const loadData = async () => {
        setIsLoading(true);
        let seqData = await authService.getAllSequences();

        if (userEmail) {
            seqData = seqData.filter(s => (s.user_email || '').toLowerCase() === userEmail.toLowerCase());
            
            // Ocultar todas las planeaciones anteriores al inicio de la cuota de la política
            const quotaPolicyStartDate = new Date('2026-08-25T00:00:00.000Z');
            const subStartDate = user && user.unlimited_start_date ? new Date(user.unlimited_start_date) : null;
            const effectiveCountStart = (subStartDate && subStartDate > quotaPolicyStartDate) ? subStartDate : quotaPolicyStartDate;
            seqData = seqData.filter(s => s.timestamp && new Date(s.timestamp) >= effectiveCountStart);

            // Cargar estadísticas
            const s = await authService.getUsageStats(userEmail);
            if (s) {
                s.total = seqData.length;
            }
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

    const handleDownloadDocx = async (seq: any) => {
        try {
            setExportingId(seq.id);
            let content = seq.content;
            if (typeof content === 'string') {
                content = JSON.parse(content);
            }
            const seqInput: SequenceInput = {
                grado: seq.grado || content.grado || '',
                area: seq.area || content.area || '',
                tema: seq.tema || content.tema_principal || '',
                dba: content.dba_utilizado || content.dba || '',
                sesiones: content.actividades?.length || 4,
                ejeCrese: content.eje_crese_utilizado || ''
            };
            await generateDocx(content, seqInput);
        } catch (e) {
            console.error("Error al exportar DOCX:", e);
            alert("No se pudo generar el archivo Word (.docx) de esta planeación.");
        } finally {
            setExportingId(null);
        }
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
                            {userEmail ? 'Mi Historial de Planeaciones (Guardadas en Base de Datos)' : 'Control Admin - Historial Institucional'}
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
            ) : isUnpaidTeacher ? (
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[2rem] p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden my-6 border border-indigo-900">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-500/30">
                        <Lock size={32} />
                    </div>
                    <h4 className="text-2xl font-black tracking-tight mb-3">
                        🔒 Historial de Planeaciones Protegido
                    </h4>
                    <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed mb-6 font-medium">
                        Tus planeaciones guardadas anteriormente se encuentran protegidas en el repositorio de la I.E. Guaimaral. Para volver a acceder, visualizarlas o descargarlas, debes renovar tu suscripción o solicitar la activación al Administrador.
                    </p>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl max-w-md mx-auto border border-white/10 text-xs text-slate-200">
                        <p className="font-bold text-white mb-1">💳 Restablecimiento Automático</p>
                        <p>Tan pronto como el Administrador active tu cuenta o recargue tus créditos, todas tus planeaciones anteriores se restablecerán automáticamente.</p>
                    </div>
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
                                <tr key={seq.id} className="group hover:bg-slate-50/80 transition-colors">
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{seq.user_email}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div 
                                            onClick={() => onSelectSequence && onSelectSequence(seq)} 
                                            className={onSelectSequence ? "cursor-pointer group/title" : ""}
                                        >
                                            <p className="text-sm font-black text-slate-800 group-hover/title:text-blue-600 transition-colors flex items-center gap-1.5">
                                                {seq.tema}
                                                {onSelectSequence && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold opacity-0 group-hover/title:opacity-100 transition-opacity">
                                                        Abrir ↗
                                                    </span>
                                                )}
                                            </p>
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
                                        <div className="flex items-center justify-end gap-2">
                                            {onSelectSequence && (
                                                <button
                                                    onClick={() => onSelectSequence(seq)}
                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                                                    title="Abrir Planeación en el Visor para ver o descargar PDF / Word"
                                                >
                                                    <BookOpen size={14} />
                                                    <span>Abrir / PDF</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDownloadDocx(seq)}
                                                disabled={exportingId === seq.id}
                                                className="px-2.5 py-2 bg-slate-100 hover:bg-blue-50 border border-slate-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                                                title="Descargar directamente en Microsoft Word (.docx)"
                                            >
                                                <FileText size={14} />
                                                <span className="hidden sm:inline">Word</span>
                                            </button>

                                            <button
                                                onClick={() => downloadJson(seq)}
                                                className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                                                title="Descargar copia de respaldo en JSON"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
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

