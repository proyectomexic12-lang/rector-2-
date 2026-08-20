import React, { useState } from 'react';
import { Layers, Play, CheckCircle, Loader2, Save } from 'lucide-react';
import { generateDidacticSequence } from '../../services/geminiService';
import { SequenceInput, DidacticSequence } from '../../types';
import { GRADOS, AREAS } from '../../constants';

interface SavedSequence {
  id: string;
  date: number;
  input: SequenceInput;
  data: DidacticSequence;
}

export const BulkGenerator: React.FC = () => {
  const [grado, setGrado] = useState('');
  const [area, setArea] = useState('');
  const [temasList, setTemasList] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{tema: string, status: 'pending'|'success'|'error'}[]>([]);

  const startBatch = async () => {
    const temas = temasList.split('\n').map(t => t.trim()).filter(t => t.length > 2);
    if (!grado || !area || temas.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: temas.length });
    
    const newResults: { tema: string; status: 'pending' | 'success' | 'error' }[] = temas.map(t => ({ tema: t, status: 'pending' }));
    setResults(newResults);

    for (let i = 0; i < temas.length; i++) {
      const tema = temas[i];
      const input: SequenceInput = {
        grado,
        area,
        tema,
        dba: '',
        sesiones: 4,
        ejeCrese: ''
      };

      try {
        const sequenceData = await generateDidacticSequence(input);
        
        // Save to Library
        const savedRaw = localStorage.getItem('saved_sequences');
        const savedData: SavedSequence[] = savedRaw ? JSON.parse(savedRaw) : [];
        savedData.push({
          id: Math.random().toString(36).substr(2, 9),
          date: Date.now(),
          input,
          data: sequenceData
        });
        localStorage.setItem('saved_sequences', JSON.stringify(savedData));

        newResults[i].status = 'success';
      } catch (error) {
        console.error(error);
        newResults[i].status = 'error';
      }
      
      setResults([...newResults]);
      setProgress({ current: i + 1, total: temas.length });
      
      // Breve pausa para no saturar la API
      await new Promise(r => setTimeout(r, 2000));
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 mb-8 relative overflow-hidden ring-1 ring-indigo-50 animate-fade-in-up">
      <div className="relative z-10 mb-8 border-b border-gray-100/50 pb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Layers className="text-indigo-600" />
          Fábrica en Cascada (Generación Masiva)
        </h2>
        <p className="text-gray-500 text-sm mt-1 font-medium">Ingresa múltiples temas y el agente trabajará en segundo plano guardándolos en tu biblioteca.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Grado Compartido</label>
          <select value={grado} onChange={e => setGrado(e.target.value)} disabled={isProcessing} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">Seleccionar Grado...</option>
            {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Área Compartida</label>
          <select value={area} onChange={e => setArea(e.target.value)} disabled={isProcessing} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">Seleccionar Área...</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Lista de Temas (Uno por línea)</label>
          <textarea
            value={temasList}
            onChange={e => setTemasList(e.target.value)}
            disabled={isProcessing}
            rows={5}
            placeholder="Ejemplo:&#10;Ecosistemas colombianos&#10;Ciclo del agua&#10;Sistema solar"
            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end relative z-10 border-t border-gray-100 pt-6">
        <button
          onClick={startBatch}
          disabled={isProcessing || !grado || !area || !temasList.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : <Play />}
          {isProcessing ? `Procesando (${progress.current}/${progress.total})` : 'Iniciar Cascada'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200 relative z-10">
          <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Progreso de la Cola</h4>
          <div className="space-y-2">
            {results.map((res, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <span className="font-medium text-slate-700">{res.tema}</span>
                {res.status === 'pending' && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                {res.status === 'success' && <div className="flex items-center gap-1 text-emerald-600 font-bold"><Save size={14}/> Guardado</div>}
                {res.status === 'error' && <span className="text-red-500 font-bold text-xs">Error</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
