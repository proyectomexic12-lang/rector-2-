import React, { useState } from 'react';
import { SequenceInput } from '../types';
import { GRADOS, AREAS, EJES_CRESE } from '../constants';
import { BookOpen, Calendar, Target, Layers, BrainCircuit, Play, Sparkles, Wand2, PenTool, Network, CheckCircle2, Cpu, Zap } from 'lucide-react';
import { authService, User } from '../services/authService';
import { useToast } from '../context/ToastContext';

interface InputFormProps {
  input: SequenceInput;
  setInput: React.Dispatch<React.SetStateAction<SequenceInput>>;
  onGenerate: () => void;
  isLoading: boolean;
  user?: User | null;
  creditsLeft?: number | null;
}

export const InputForm: React.FC<InputFormProps> = ({ input, setInput, onGenerate, isLoading, user, creditsLeft }) => {
  const [dbaMode, setDbaMode] = useState<'manual' | 'auto'>('manual');

  const isAdmin = user?.role === 'admin';

  const filteredGrados = isAdmin
    ? GRADOS
    : (user?.grados && user.grados.length > 0)
      ? GRADOS.filter(g => user.grados!.includes(g))
      : GRADOS;

  const filteredAreas = isAdmin
    ? AREAS
    : (user?.areas && user.areas.length > 0)
      ? AREAS.filter(a => user.areas!.includes(a))
      : AREAS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({ ...prev, [name]: value }));
  };

  const { toast } = useToast();

  const handleValidationAndGenerate = () => {
    if (!input.grado) return toast('⚠️ Debes seleccionar un grado escolar.', 'error');
    if (!input.area) return toast('⚠️ Debes seleccionar el área del conocimiento.', 'error');
    if (!input.ejeCrese) return toast('⚠️ Selecciona un eje transversal (CRESE).', 'error');
    if (input.sesiones < 1) return toast('⚠️ La cantidad de sesiones debe ser mayor a 0.', 'error');
    if (!input.tema || input.tema.length < 5) return toast('⚠️ El tema principal debe tener al menos 5 caracteres.', 'error');
    if (dbaMode === 'manual' && (!input.dba || input.dba.length < 5)) return toast('⚠️ Si usas el modo manual, debes escribir un DBA válido.', 'error');
    
    onGenerate();
  };

  const isFormComplete = input.grado && input.area && input.ejeCrese && input.tema.length >= 5;

  return (
    <div className="w-full mb-10 no-print animate-fade-in-up">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
        
        {/* PANEL IZQUIERDO: Configuración (2 Columnas en XL) */}
        <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl p-5 sm:p-8 lg:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-white/60 relative overflow-hidden group">
          {/* Fondo Decorativo */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full -mr-48 -mt-48 opacity-50 z-0 pointer-events-none blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
          
          <div className="relative z-10 mb-8 border-b border-gray-100/80 pb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50 p-3 rounded-3xl shadow-lg border border-white transform hover:scale-105 hover:-rotate-3 transition-all duration-300 w-24 h-24 flex items-center justify-center shrink-0">
              <img src="/logo_guaimaral.png" alt="Logo I.E. Guaimaral" className="institutional-logo w-20 h-20 object-contain drop-shadow-md" style={{ maxWidth: '80px', maxHeight: '80px' }} />
            </div>
            <div className="text-center sm:text-left flex-1 mt-2">
              <h2 className="text-3xl font-black text-slate-800 flex items-center justify-center sm:justify-start gap-3 tracking-tight">
                <Layers className="text-blue-600" size={32} />
                Diseño Pedagógico
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-medium max-w-lg">Configura los cimientos de tu secuencia. La IA unirá estos conceptos para crear una experiencia de aprendizaje inolvidable.</p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            {/* Grado */}
            <div className="group/input">
              <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] group-hover/input:text-blue-500 transition-colors">Grado Escolar</label>
              <div className="relative transform transition-all duration-300 hover:-translate-y-1">
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <select
                  name="grado"
                  value={input.grado}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 hover:shadow-blue-500/5 text-slate-700 font-bold"
                >
                  <option value="" disabled>Seleccionar Grado</option>
                  {filteredGrados.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Área */}
            <div className="group/input">
              <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] group-hover/input:text-blue-500 transition-colors">Área del Conocimiento</label>
              <div className="relative transform transition-all duration-300 hover:-translate-y-1">
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <select
                  name="area"
                  value={input.area}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 hover:shadow-blue-500/5 text-slate-700 font-bold"
                >
                  <option value="" disabled>Seleccionar Área</option>
                  {filteredAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Eje CRESE */}
            <div className="group/input">
              <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] group-hover/input:text-blue-500 transition-colors">Eje Transversal (CRESE)</label>
              <div className="relative transform transition-all duration-300 hover:-translate-y-1">
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <Target className="h-5 w-5" />
                </div>
                <select
                  name="ejeCrese"
                  value={input.ejeCrese}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 hover:shadow-blue-500/5 text-slate-700 font-bold text-sm"
                >
                  <option value="" disabled>Seleccionar Eje</option>
                  {EJES_CRESE.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Sesiones */}
            <div className="group/input">
              <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] group-hover/input:text-blue-500 transition-colors">Sesiones</label>
              <div className="relative transform transition-all duration-300 hover:-translate-y-1">
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <Calendar className="h-5 w-5" />
                </div>
                <input
                  type="number"
                  name="sesiones"
                  value={input.sesiones}
                  onChange={handleChange}
                  min={1}
                  max={10}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm hover:border-blue-300 hover:shadow-blue-500/5 text-slate-700 font-bold"
                />
              </div>
            </div>

            {/* Tema */}
            <div className="md:col-span-2 group/input">
              <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] group-hover/input:text-blue-500 transition-colors">Tema Principal</label>
              <div className="relative transform transition-all duration-300 hover:-translate-y-1">
                <input
                  type="text"
                  name="tema"
                  value={input.tema}
                  onChange={handleChange}
                  placeholder="Ej. El ciclo del agua, Suma de fraccionarios..."
                  className="w-full px-6 py-5 bg-white/50 border border-slate-200/60 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-md hover:border-blue-300 hover:shadow-blue-500/10 text-xl font-black text-slate-800 placeholder-slate-300"
                />
                {input.tema.length > 5 && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500 animate-fade-in">
                    <CheckCircle2 size={24} />
                  </div>
                )}
              </div>
            </div>

            {/* DBA */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-6 rounded-[2rem] border border-blue-100 relative overflow-hidden group/dba">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover/dba:scale-110 transition-transform duration-700">
                <Wand2 size={120} />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 text-sm relative z-10">
                <label className="block font-black text-blue-900 mb-3 sm:mb-0 uppercase tracking-[0.2em] text-[10px]">Derecho Básico de Aprendizaje (DBA)</label>
                <div className="flex bg-white/80 p-1.5 rounded-xl shadow-sm border border-white backdrop-blur-sm">
                  <button
                    onClick={() => { setDbaMode('manual'); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${dbaMode === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                  >
                    <PenTool size={14} /> Manual
                  </button>
                  <button
                    onClick={() => { setDbaMode('auto'); setInput(prev => ({ ...prev, dba: '' })) }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${dbaMode === 'auto' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                  >
                    <Wand2 size={14} /> Sugerir con IA
                  </button>
                </div>
              </div>

              <div className="relative z-10">
                {dbaMode === 'manual' ? (
                  <textarea
                    name="dba"
                    value={input.dba}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Escribe o pega aquí el DBA oficial..."
                    className="w-full px-5 py-4 bg-white/90 border border-blue-200/60 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none shadow-inner text-slate-700 font-medium placeholder-slate-400"
                  />
                ) : (
                  <div className="w-full px-5 py-10 bg-white/60 border border-indigo-100/50 rounded-2xl text-center backdrop-blur-md relative overflow-hidden cursor-default shadow-sm">
                    <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl text-indigo-600 mb-4 shadow-inner ring-1 ring-white">
                      <Zap size={32} className="animate-pulse" />
                    </div>
                    <p className="text-lg font-black text-indigo-950 tracking-tight">Sincronización Automática</p>
                    <p className="text-sm text-indigo-600/80 mt-2 max-w-md mx-auto font-medium">La IA analizará el tema y asignará automáticamente el <span className="font-bold text-indigo-800">DBA Oficial del MEN</span> más preciso para este contexto.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Cerebro IA / Mapa Curricular (1 Columna en XL) */}
        <div className="xl:col-span-1 bg-[#0B1120] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white border border-slate-800">
          {/* Abstract Deep Background */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 bg-mesh-gradient opacity-80 mix-blend-overlay"></div>

          <div className="relative z-10 flex-1">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-blue-50 tracking-tight border-b border-slate-800 pb-6">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Network className="text-blue-400" size={24} />
              </div>
              Orquestador Pedagógico
            </h3>

            <div className="space-y-6">
              {/* Nodo 1: Contexto */}
              <div className={`transition-all duration-700 ease-out ${input.grado && input.area ? 'opacity-100 translate-x-0' : 'opacity-30 -translate-x-8'}`}>
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 rounded-full p-1.5 transition-colors duration-500 ${input.grado ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-slate-800 text-slate-600'}`}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Contexto Base</p>
                    <p className="font-bold text-sm leading-tight text-slate-200">
                      {input.grado ? input.grado : 'Esperando grado...'} <br/>
                      <span className="text-slate-400 font-medium">{input.area ? input.area : 'Esperando área...'}</span>
                    </p>
                  </div>
                </div>
                {input.grado && input.area && <div className="ml-3.5 mt-2 h-8 border-l-2 border-dashed border-slate-700"></div>}
              </div>

              {/* Nodo 2: Tema */}
              <div className={`transition-all duration-700 ease-out delay-100 ${input.tema.length > 3 ? 'opacity-100 translate-x-0' : 'opacity-30 -translate-x-8'}`}>
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 rounded-full p-1.5 transition-colors duration-500 ${input.tema.length > 3 ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-slate-800 text-slate-600'}`}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Núcleo Temático</p>
                    <p className="font-bold text-sm leading-tight text-slate-200 line-clamp-2">
                      {input.tema ? input.tema : 'Esperando tema...'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
                      <Calendar size={14} className="text-blue-500"/> Dividido en {input.sesiones} sesiones
                    </p>
                  </div>
                </div>
                {input.tema.length > 3 && <div className="ml-3.5 mt-2 h-8 border-l-2 border-dashed border-slate-700"></div>}
              </div>

              {/* Nodo 3: Transversalidad */}
              <div className={`transition-all duration-700 ease-out delay-200 ${input.ejeCrese ? 'opacity-100 translate-x-0' : 'opacity-30 -translate-x-8'}`}>
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 rounded-full p-1.5 transition-colors duration-500 ${input.ejeCrese ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-slate-800 text-slate-600'}`}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Transversalidad CRESE</p>
                    <p className="font-bold text-sm leading-tight text-slate-200">
                      {input.ejeCrese ? input.ejeCrese : 'Esperando eje...'}
                    </p>
                    {input.ejeCrese && (
                      <div className="mt-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                          La IA inyectará indicadores de comportamiento socioemocional adaptados a este contexto en <span className="text-blue-300 font-bold">cada actividad</span>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-slate-800">
            <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-1.5 rounded-lg ${isFormComplete && !isLoading ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                  <Cpu className={`${isFormComplete && !isLoading ? 'text-blue-400 animate-pulse' : 'text-slate-600'}`} size={20} />
                </div>
                <span className="text-sm font-black tracking-wide text-slate-200">Motor IA</span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {isLoading 
                  ? <span className="text-blue-300 flex items-center gap-2"><Sparkles size={14} className="animate-spin"/> Sintetizando matriz pedagógica...</span>
                  : isFormComplete 
                    ? <span className="text-green-400">Datos enlazados. Listo para generar.</span>
                    : "Esperando parámetros para ensamblar."}
              </p>
            </div>
            
            {/* Main CTA Button inside the right panel for better visual flow */}
            {(() => {
              const isUnlimited = user ? authService.isUserUnlimited(user) : false;
              const isBlockedByCredits = !isUnlimited && creditsLeft === 0;
              return (
                <button
                  onClick={handleValidationAndGenerate}
                  disabled={isLoading || isBlockedByCredits}
                  className={`w-full mt-6 relative overflow-hidden flex items-center justify-center gap-3 px-8 py-5 rounded-2xl text-white font-black text-lg shadow-2xl transition-all duration-300 transform group ${isLoading || isBlockedByCredits
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-1 hover:shadow-blue-500/40 border border-blue-500/30'
                    }`}
                >
                  {isLoading ? (
                    "Procesando..."
                  ) : isBlockedByCredits ? (
                    "Créditos Agotados"
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out"></div>
                      <Sparkles className="h-5 w-5 animate-pulse relative z-10" />
                      <span className="relative z-10">Generar Planeación</span>
                      <Play className="h-4 w-4 ml-1 opacity-80 relative z-10" fill="currentColor" />
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};