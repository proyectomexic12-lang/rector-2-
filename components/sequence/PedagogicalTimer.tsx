import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square, ChevronRight } from 'lucide-react';

export const PedagogicalTimer: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Default lengths in seconds for a 90 min session (5400s)
  // Activacion: 15m (900s), Desarrollo: 50m (3000s), Cierre: 25m (1500s)
  const TOTAL_TIME = 5400; 
  const PHASE_1_END = 900;
  const PHASE_2_END = 3900;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && seconds < TOTAL_TIME) {
      interval = setInterval(() => {
        setSeconds((sec) => sec + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0 && interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, seconds]);

  const toggle = () => setIsActive(!isActive);
  
  const reset = () => {
    setIsActive(false);
    setSeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Determine current phase and color
  let currentPhase = "Activación";
  let phaseColor = "text-blue-500";
  let bgProgress = "bg-blue-500";

  if (seconds > PHASE_2_END) {
    currentPhase = "Cierre y Evaluación";
    phaseColor = "text-purple-500";
    bgProgress = "bg-purple-500";
  } else if (seconds > PHASE_1_END) {
    currentPhase = "Desarrollo Activo";
    phaseColor = "text-emerald-500";
    bgProgress = "bg-emerald-500";
  }

  const progressPercent = (seconds / TOTAL_TIME) * 100;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-slate-900 text-white rounded-full p-3 shadow-2xl cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border-2 border-slate-700" onClick={() => setIsMinimized(false)} title="Abrir Cronómetro Pedagógico">
        <Clock className="w-6 h-6 text-blue-400" />
      </div>
    );
  }

  return (
    <div className="hidden md:block fixed bottom-4 left-4 z-50 bg-white shadow-2xl rounded-2xl p-4 border border-slate-200 w-80 animate-fade-in-up no-print">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Cronómetro de Sesión
        </h3>
        <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-slate-700">
          <ChevronRight className="w-5 h-5 rotate-90" />
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-black text-slate-800 font-mono tracking-wider">
          {formatTime(seconds)}
        </div>
        <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${phaseColor}`}>
          Fase: {currentPhase}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 relative overflow-hidden">
        <div className={`h-2.5 rounded-full ${bgProgress} transition-all duration-1000 ease-linear`} style={{ width: `${progressPercent}%` }}></div>
        {/* Phase markers */}
        <div className="absolute top-0 left-[16.6%] h-full w-0.5 bg-white/50"></div> {/* 15m mark */}
        <div className="absolute top-0 left-[72.2%] h-full w-0.5 bg-white/50"></div> {/* 65m mark */}
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={toggle} className={`p-3 rounded-xl text-white transition-all shadow-md ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button onClick={reset} className="p-3 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200">
          <Square className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
