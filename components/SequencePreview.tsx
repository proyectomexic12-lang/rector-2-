import React, { useState } from 'react';
import { DidacticSequence, SequenceInput } from '../types';
import { SequenceActionBar } from './sequence/SequenceActionBar';
import { SequenceRefinement } from './sequence/SequenceRefinement';
import { SequenceDocument } from './sequence/SequenceDocument';
import { PedagogicalTimer } from './sequence/PedagogicalTimer';
import { BehaviorTracker } from './sequence/BehaviorTracker';

interface SequencePreviewProps {
  data: DidacticSequence;
  input: SequenceInput;
  onRefine: (instruction: string) => void;
  onReset: () => void;
}

export const SequencePreview: React.FC<SequencePreviewProps> = ({ data, input, onRefine, onReset }) => {
  const [isRefining, setIsRefining] = useState(false);
  const [printMode, setPrintMode] = useState<'all' | 'planning' | 'anexos'>('all');
  
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
      />

      <SequenceRefinement 
        onRefine={handleRefine} 
        isRefining={isRefining} 
      />

      <SequenceDocument 
        editableData={editableData}
        input={input}
        handleUpdateField={handleUpdateField}
        printMode={printMode}
      />
    </div>
  );
};