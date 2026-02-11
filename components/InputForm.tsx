import React, { useState } from 'react';
import { SequenceInput } from '../types';
import { GRADOS, AREAS, EJES_CRESE } from '../constants';
import { BookOpen, Calendar, Target, Layers, BrainCircuit, Play, Sparkles, Wand2, PenTool } from 'lucide-react';

import { User } from '../services/authService';

interface InputFormProps {
  input: SequenceInput;
  setInput: React.Dispatch<React.SetStateAction<SequenceInput>>;
  onGenerate: () => void;
  isLoading: boolean;
  user?: User | null;
}

export const InputForm: React.FC<InputFormProps> = ({ input, setInput, onGenerate, isLoading, user }) => {
  const [dbaMode, setDbaMode] = useState<'manual' | 'auto'>('manual');

  // Lógica de filtrado personalizada para docentes de Transición
  const isTransitionTeacher = user?.name.includes("Ibet Charris") || user?.name.includes("Deicy Mercado");

  const filteredGrados = isTransitionTeacher
    ? GRADOS.filter(g => g === "Transición")
    : GRADOS;

  const filteredAreas = isTransitionTeacher
    ? AREAS.filter(a => a.startsWith("Dimensión"))
    : AREAS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({ ...prev, [name]: value }));
  };

  // Validation: If auto mode, DBA is optional (valid). If manual, needs content.
  const isFormValid = input.grado && input.area && input.tema && input.ejeCrese && (dbaMode === 'auto' || (input.dba && input.dba.length > 5));

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 mb-8 no-print relative overflow-hidden ring-1 ring-blue-50">

      {/* Decorative background element - Refined */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -mr-32 -mt-32 opacity-50 z-0 pointer-events-none blur-3xl"></div>

      <div className="relative z-10 mb-8 border-b border-gray-100/50 pb-6 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-white p-2 rounded-2xl shadow-md border border-gray-100 transform hover:scale-105 transition-transform duration-300">
          <img src="/logo_guaimaral.png" alt="Logo I.E. Guaimaral" className="w-24 h-24 object-contain" />
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-2">
            <Layers className="text-blue-600 drop-shadow-sm" />
            Configuración de la Secuencia
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Completa todos los campos para diseñar tu experiencia de aprendizaje.</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">

        {/* Grado */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Grado Escolar</label>
          <div className="relative group transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
            <select
              name="grado"
              value={input.grado}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 text-gray-700 font-medium"
            >
              <option value="">Seleccionar Grado</option>
              {filteredGrados.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="absolute right-3 top-4 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Área */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Área del Conocimiento</label>
          <div className="relative group transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <select
              name="area"
              value={input.area}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 text-gray-700 font-medium"
            >
              <option value="">Seleccionar Área</option>
              {filteredAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="absolute right-3 top-4 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Eje CRESE */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Eje Transversal (CRESE)</label>
          <div className="relative group transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Target className="h-5 w-5" />
            </div>
            <select
              name="ejeCrese"
              value={input.ejeCrese}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm hover:border-blue-300 text-gray-700 font-medium"
            >
              <option value="">Seleccionar Eje</option>
              {EJES_CRESE.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="absolute right-3 top-4 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Sesiones */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Cantidad de Sesiones</label>
          <div className="relative group transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <input
              type="number"
              name="sesiones"
              value={input.sesiones}
              onChange={handleChange}
              min={1}
              max={10}
              className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm hover:border-blue-300 text-gray-700 font-medium"
            />
          </div>
        </div>

        {/* Tema */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Tema Principal</label>
          <input
            type="text"
            name="tema"
            value={input.tema}
            onChange={handleChange}
            placeholder="Ej. El ciclo del agua, Suma de fraccionarios..."
            className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm hover:border-blue-300 text-lg font-medium text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* DBA */}
        <div className="md:col-span-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 text-sm">
            <label className="block font-bold text-blue-900 mb-2 sm:mb-0 uppercase tracking-wide text-xs">Derecho Básico de Aprendizaje (DBA)</label>
            <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-100">
              <button
                onClick={() => { setDbaMode('manual'); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${dbaMode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <PenTool size={12} /> Manual
              </button>
              <button
                onClick={() => { setDbaMode('auto'); setInput(prev => ({ ...prev, dba: '' })) }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${dbaMode === 'auto' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Wand2 size={12} /> Sugerir con IA
              </button>
            </div>
          </div>

          {dbaMode === 'manual' ? (
            <textarea
              name="dba"
              value={input.dba}
              onChange={handleChange}
              rows={3}
              placeholder="Escribe o pega aquí el DBA..."
              className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none shadow-sm text-gray-700"
            />
          ) : (
            <div className="w-full px-4 py-8 bg-white/60 border border-indigo-100 rounded-xl text-center backdrop-blur-sm relative overflow-hidden group hover:border-indigo-300 transition-colors cursor-default">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full text-indigo-600 mb-3 shadow-inner">
                <Wand2 size={28} className="animate-pulse" />
              </div>
              <p className="text-sm font-bold text-indigo-900">Modo Automático Activado</p>
              <p className="text-xs text-indigo-600/80 mt-1 max-w-sm mx-auto">La Inteligencia Artificial seleccionará el <span className="font-bold">DBA Oficial</span> más adecuado para el tema y grado ingresados.</p>
            </div>
          )}
        </div>

      </div>

      <div className="relative z-10 mt-10 pt-6 border-t border-gray-100/50 flex justify-end">
        <button
          onClick={onGenerate}
          disabled={isLoading || !isFormValid}
          className={`relative overflow-hidden flex items-center gap-3 px-10 py-4 rounded-xl text-white font-bold text-lg shadow-xl shadow-blue-500/20 transition-all duration-300 transform ${isLoading || !isFormValid
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30 active:scale-95'
            }`}
        >
          {isLoading ? (
            "Procesando..."
          ) : (
            <>
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="relative z-10">Generar Secuencia</span>
              <Play className="h-4 w-4 ml-1 opacity-60" fill="currentColor" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};