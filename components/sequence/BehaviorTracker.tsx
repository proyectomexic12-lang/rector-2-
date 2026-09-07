import React, { useState, useEffect } from 'react';
import { Users, Plus, Tag, Trash2, X, ChevronLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface BehaviorLog {
  id: string;
  student_name: string;
  tag: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
}

const TAGS = [
  { name: 'Liderazgo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'Participación', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Frustración', color: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Apoyo a Compañeros', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Distracción', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

export const BehaviorTracker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState('');
  const [logs, setLogs] = useState<BehaviorLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos desde Supabase
  useEffect(() => {
    if (!supabase) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      const [studentsRes, logsRes] = await Promise.all([
        supabase.from('behavior_students').select('*').order('created_at', { ascending: true }),
        supabase.from('behavior_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);
      
      if (studentsRes.data) setStudents(studentsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      setIsLoading(false);
    };

    fetchInitialData();

    // Suscripción Realtime (Para ver cambios del celular al instante)
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'behavior_logs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLogs(current => [payload.new as BehaviorLog, ...current].slice(0, 50));
        } else if (payload.eventType === 'DELETE') {
          // If all logs cleared
          setLogs([]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'behavior_students' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStudents(current => [...current, payload.new as Student]);
        } else if (payload.eventType === 'DELETE') {
          setStudents(current => current.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddStudent = async () => {
    if (!newStudent.trim() || !supabase) return;
    const name = newStudent.trim();
    if (students.some(s => s.name === name)) return; // Ya existe

    setNewStudent(''); // Clear input optimistically
    await supabase.from('behavior_students').insert([{ name }]);
  };

  const handleAddLog = async (studentName: string, tag: string) => {
    if (!supabase) return;
    await supabase.from('behavior_logs').insert([{ student_name: studentName, tag }]);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!supabase) return;
    await supabase.from('behavior_students').delete().eq('id', id);
  };

  const clearLogs = async () => {
    if (confirm("¿Limpiar todos los registros de la clase actual?") && supabase) {
      // In a real app we might not delete, just filter by session, but for now we wipe to keep it clean
      await supabase.from('behavior_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setLogs([]);
    }
  };

  if (!isOpen) {
    return (
      <div 
        className="hidden md:flex fixed top-1/3 right-0 z-50 bg-indigo-600 text-white p-3 rounded-l-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors border border-r-0 border-indigo-400 no-print flex-col items-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Users size={20} />
        <span className="text-[10px] font-bold tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>COMPORTAMIENTO</span>
      </div>
    );
  }

  return (
    <div className="hidden md:flex fixed top-20 right-4 z-50 w-80 bg-white shadow-2xl rounded-2xl border border-slate-200 flex-col h-[80vh] overflow-hidden no-print animate-fade-in-up">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2">
          <Users size={18} className="text-indigo-400" />
          Rastreador Social
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Add Student */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newStudent}
            onChange={(e) => setNewStudent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
            placeholder="Añadir alumno..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <button onClick={handleAddStudent} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-indigo-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-10">
            Añade estudiantes para comenzar a registrar su comportamiento.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {students.map(student => (
              <div key={student.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="font-bold text-sm text-slate-800 mb-2 flex justify-between">
                  {student.name}
                  <button onClick={() => handleDeleteStudent(student.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(t => (
                    <button 
                      key={t.name}
                      onClick={() => handleAddLog(student.name, t.name)}
                      className={`text-[10px] px-2 py-1 rounded-md border ${t.color} hover:opacity-80 transition-opacity font-medium`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Logs Activity */}
      <div className="h-40 border-t border-slate-200 bg-white flex flex-col">
        <div className="p-2 bg-slate-100 text-xs font-bold text-slate-500 flex justify-between items-center">
          <span>Registro en vivo</span>
          <button onClick={clearLogs} className="hover:text-red-500">Limpiar</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {logs.map(log => {
            const tagInfo = TAGS.find(t => t.name === log.tag);
            return (
              <div key={log.id} className="text-xs flex items-center gap-2 animate-fade-in">
                <span className="text-slate-400 text-[10px] w-10">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="font-bold text-slate-700">{log.student_name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${tagInfo?.color || 'bg-gray-100'}`}>
                  {log.tag}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
