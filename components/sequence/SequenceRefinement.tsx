import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

interface SequenceRefinementProps {
  onRefine: (instruction: string) => void;
  isRefining: boolean;
}

export const SequenceRefinement: React.FC<SequenceRefinementProps> = ({ onRefine, isRefining }) => {
  const [refinementText, setRefinementText] = useState("");

  const handleRefineSubmit = () => {
    if (!refinementText.trim()) return;
    onRefine(refinementText);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-10 no-print shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Sparkles size={120} className="text-blue-600" />
      </div>

      <h3 className="text-blue-900 font-black text-xl mb-3 flex items-center gap-2 relative z-10">
        <div className="bg-blue-100 p-1.5 rounded-lg">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        Estudio de Refinamiento IA
      </h3>

      <p className="text-slate-600 text-sm mb-5 relative z-10 font-medium max-w-2xl">
        ¿Deseas ajustar el resultado? Escribe tu instrucción o usa las <span className="text-blue-700 font-bold">Acciones Rápidas</span> para perfeccionar tu secuencia en un clic.
      </p>

      {/* Quick Chips */}
      <div className="flex flex-wrap gap-2 mb-4 relative z-10">
        {["Desarrollar más las actividades", "Simplificar el lenguaje", "Enfocar en evaluación formativa", "Añadir pausa activa divertida"].map((chip) => (
          <button
            key={chip}
            onClick={() => setRefinementText(chip)}
            className="text-xs font-bold bg-white text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors shadow-sm"
          >
            ✨ {chip}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 relative z-10">
        <input
          type="text"
          value={refinementText}
          onChange={(e) => setRefinementText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
          placeholder="Ej: 'Añade una actividad de cierre más dinámica'..."
          className="flex-1 bg-white border border-blue-200 rounded-xl px-4 sm:px-5 py-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-700 font-medium text-xs sm:text-sm shadow-sm transition-all"
        />
        <button
          onClick={handleRefineSubmit}
          disabled={!refinementText.trim() || isRefining}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 sm:px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale transform active:scale-95 text-xs sm:text-sm"
        >
          <Send size={16} />
          <span>{isRefining ? 'Refinando...' : 'Refinar'}</span>
        </button>
      </div>
    </div>
  );
};
