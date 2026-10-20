import React, { useState } from 'react';
import { DidacticSequence, SequenceInput } from '../types';
import { SequenceActionBar } from './sequence/SequenceActionBar';
import { SequenceRefinement } from './sequence/SequenceRefinement';
import { SequenceDocument } from './sequence/SequenceDocument';
import { PedagogicalTimer } from './sequence/PedagogicalTimer';
import { BehaviorTracker } from './sequence/BehaviorTracker';
import { Send, Sparkles } from 'lucide-react';

interface SequencePreviewProps {
  data: DidacticSequence;
  input: SequenceInput;
  onRefine: (instruction: string) => void;
  onReset: () => void;
}

export const SequencePreview: React.FC<SequencePreviewProps> = ({ data, input, onRefine, onReset }) => {
  const [isRefining, setIsRefining] = useState(false);
  const [printMode, setPrintMode] = useState<'all' | 'planning' | 'anexos'>('all');
  const [activeView, setActiveView] = useState<'docente' | 'estudiante'>('docente');
  
  const [editableData, setEditableData] = useState<DidacticSequence>(() => ({
    ...data,
    taller_imprimible: data.taller_imprimible || {
      introduccion: "Taller de aplicación del tema.",
      instrucciones: "Sigue los ejercicios propuestos.",
      ejercicios: ["Ejercicio 1", "Ejercicio 2"],
      reto_creativo: "¡Demuestra tu talento!"
    }
  }));

  // Sync state if new data arrives (e.g., from AI refinement)
  React.useEffect(() => {
    setEditableData({
      ...data,
      taller_imprimible: data.taller_imprimible || {
        introduccion: "Taller de aplicación del tema.",
        instrucciones: "Sigue los ejercicios propuestos.",
        ejercicios: ["Ejercicio 1", "Ejercicio 2"],
        reto_creativo: "¡Demuestra tu talento!"
      }
    });
    setIsRefining(false);
  }, [data]);

  const handleUpdateField = (path: string, value: any) => {
    const newData = { ...editableData };
    const keys = path.split('.');
    let current: any = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setEditableData(newData);
  };

  const handlePrint = (mode: 'all' | 'planning' | 'anexos') => {
    setPrintMode(mode);
    // Give React time to re-render potentially hidden sections before printing
    setTimeout(() => {
      window.print();
      // Reset mode after print dialog closes
      setTimeout(() => setPrintMode('all'), 500);
    }, 100);
  };

  const handleRefine = (instruction: string) => {
    setIsRefining(true);
    onRefine(instruction);
  };

  return (
    <div className="animate-fade-in-up pb-10 relative">
      <BehaviorTracker />
      <PedagogicalTimer />

      <SequenceActionBar 
        onReset={onReset} 
        onPrint={handlePrint}
        activeView={activeView}
        setActiveView={setActiveView}
        editableData={editableData}
        input={input}
      />

      {/* Banner de Radicación Directa en SIGEP (Sin salir a otro software) */}
      <div 
        id="banner-registrar-planeacion" 
        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-800 via-indigo-800 to-blue-800 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-violet-400/30 no-print animate-fade-in-up my-4"
      >
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner border border-white/20">
            <Send size={22} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-black uppercase tracking-wider bg-violet-400/30 text-violet-200 border border-violet-300/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} /> Paso Siguiente
              </span>
              <span className="text-xs font-bold text-sky-200">Sincronización SIGEP-IEG</span>
            </div>
            <h3 className="font-black text-sm sm:text-base mt-1 text-white">
              ¡Tu planeación didáctica está lista! Pulsa el botón para radicarla aquí mismo.
            </h3>
            <p className="text-[11px] text-slate-200 mt-0.5 max-w-2xl leading-relaxed">
              No tienes que ir a otro sitio web ni subir archivos a mano: pulsa <strong>Registrar Planeación</strong> y la información se enviará automáticamente a Coordinación.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('abrir_modal_registrar_planeacion'))}
          className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 font-black text-xs shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Send size={15} />
          <span>Registrar Planeación Ahora</span>
        </button>
      </div>

      <SequenceRefinement 
        onRefine={handleRefine} 
        isRefining={isRefining} 
      />

      <SequenceDocument 
        editableData={editableData}
        input={input}
        handleUpdateField={handleUpdateField}
        printMode={printMode}
        activeView={activeView}
        setActiveView={setActiveView}
      />
    </div>
  );
};