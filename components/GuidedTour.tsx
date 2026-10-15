import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2, Send, HelpCircle, Eye } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  highlightNote?: string;
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  actionPrompt?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'grado',
    targetSelector: '#tour-grado',
    title: '👨‍🏫 Paso 1: Selecciona el Grado Escolar',
    description: 'Haz clic en esta casilla y elige el grado de tus estudiantes (por ejemplo: Jardín, Primaria o Secundaria).',
    highlightNote: 'El sistema adaptará el nivel de lenguaje y competencias pedagógicas al grado seleccionado.',
    arrowDirection: 'down',
    actionPrompt: 'Elige el grado para continuar'
  },
  {
    id: 'area',
    targetSelector: '#tour-area',
    title: '📚 Paso 2: Elige el Área del Conocimiento',
    description: 'Selecciona la asignatura o materia oficial que vas a impartir (Matemáticas, Lengua Castellana, Ciencias, etc.).',
    highlightNote: 'Alineado con los estándares curriculares del Ministerio de Educación Nacional (MEN).',
    arrowDirection: 'down',
    actionPrompt: 'Selecciona el área de enseñanza'
  },
  {
    id: 'crese',
    targetSelector: '#tour-crese',
    title: '🤝 Paso 3: Elige el Eje Transversal (CRESE)',
    description: 'Selecciona el componente socioemocional, ciudadano y de resiliencia institucional.',
    highlightNote: 'La planeación incluirá actividades pedagógicas para cultivar empatía y convivencia en el aula.',
    arrowDirection: 'down',
    actionPrompt: 'Selecciona el eje socioemocional'
  },
  {
    id: 'tema',
    targetSelector: '#tour-tema',
    title: '✏️ Paso 4: Escribe el Tema Principal',
    description: 'Escribe aquí qué tema vas a enseñar en la clase (ejemplo: "Los ecosistemas", "Suma de fracciones", etc.).',
    highlightNote: 'Sé lo más específico posible. La IA creará una clase completa y dinámica alrededor de este tema.',
    arrowDirection: 'up',
    actionPrompt: 'Escribe el nombre del tema'
  },
  {
    id: 'btn-generar',
    targetSelector: '#tour-btn-generar',
    title: '⚡ Paso 5: Haz clic en Generar Planeación',
    description: '¡Todo listo! Presiona este botón azul para que la Inteligencia Artificial redacte tu planeación en segundos.',
    highlightNote: 'Creará los momentos de Exploración, Estructuración, Práctica, Transferencia, DUA y evaluación Saber-ICFES.',
    arrowDirection: 'left',
    actionPrompt: '¡Presiona el botón Generar Planeación!'
  },
  {
    id: 'btn-registrar',
    targetSelector: '#tour-btn-registrar',
    title: '🚀 Paso 6: Haz clic en Registrar Planeación',
    description: '¡Tu planeación ya fue generada con éxito! Ahora presiona este botón morado para radicarla en el servidor institucional.',
    highlightNote: 'Este botón abre la ventana oficial de entrega sincronizada con la nube.',
    arrowDirection: 'down',
    actionPrompt: 'Haz clic en Registrar Planeación'
  },
  {
    id: 'btn-confirmar-envio',
    targetSelector: '#tour-btn-confirmar-envio',
    title: '☁️ Paso 7: Confirmar y Enviar a la Web',
    description: 'Verifica la semana lectiva y presiona este botón morado. ¡Tu planeación viajará directamente a https://manuel-red.vercel.app!',
    highlightNote: 'Quedará radicada con hora legal de Colombia y visible para directivos y coordinación.',
    arrowDirection: 'up',
    actionPrompt: 'Presiona Confirmar y Enviar a Revisión'
  }
];

interface GuidedTourProps {
  isActive: boolean;
  onClose: () => void;
  hasGeneratedSequence?: boolean;
  isModalOpen?: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onClose,
  hasGeneratedSequence = false,
  isModalOpen = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Auto-ajustar el paso actual si la planeación ya fue generada o si el modal se abrió
  useEffect(() => {
    if (!isActive) return;

    if (isModalOpen) {
      // Si el modal está abierto, ir al paso 7
      setCurrentStepIndex(6);
    } else if (hasGeneratedSequence && currentStepIndex < 5) {
      // Si ya hay secuencia generada y aún estábamos en el formulario, avanzar al paso 6
      setCurrentStepIndex(5);
    }
  }, [hasGeneratedSequence, isModalOpen, isActive]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Calcular la posición del elemento objetivo
  const updateTargetPosition = () => {
    if (!isActive || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      // Scroll suave hacia el elemento si está fuera de pantalla
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      // Esperar brevemente a que el scroll termine para medir posición exacta
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 150);
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    updateTargetPosition();

    const handleResizeOrScroll = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    const interval = setInterval(handleResizeOrScroll, 400);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      clearInterval(interval);
    };
  }, [currentStepIndex, isActive, currentStep?.targetSelector]);

  if (!isActive) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Posición del Card informativo respecto al elemento destacado
  const padding = 12;
  const isTargetVisible = Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0);

  // Calcular ubicación del tooltip
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999999,
  };

  let arrowStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999999,
  };

  if (targetRect && isTargetVisible) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = window.innerWidth - targetRect.right;

    // Si hay más espacio abajo, colocar abajo; de lo contrario, arriba
    if (spaceBelow > 320 || spaceBelow > spaceAbove) {
      tooltipStyle.top = Math.min(window.innerHeight - 340, targetRect.bottom + 24);
      tooltipStyle.left = Math.max(20, Math.min(window.innerWidth - 440, targetRect.left - 20));
      
      arrowStyle.top = targetRect.bottom + 4;
      arrowStyle.left = targetRect.left + (targetRect.width / 2) - 16;
    } else {
      tooltipStyle.bottom = Math.min(window.innerHeight - 60, (window.innerHeight - targetRect.top) + 24);
      tooltipStyle.left = Math.max(20, Math.min(window.innerWidth - 440, targetRect.left - 20));

      arrowStyle.bottom = (window.innerHeight - targetRect.top) + 4;
      arrowStyle.left = targetRect.left + (targetRect.width / 2) - 16;
    }
  } else {
    // Si el elemento no es visible aún en pantalla, centrar el card
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className="fixed inset-0 z-[9999980] overflow-hidden pointer-events-auto">
      {/* 1. Fondo Oscuro (Spotlight Cutout con SVG Mask) */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none" style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.4))' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Relleno blanco completo = pantalla opaca */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Agujero negro = recorte transparente sobre el elemento para que se vea claro */}
            {isTargetVisible && targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="18"
                ry="18"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Capa gris oscura con el recorte aplicado */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.85)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* 2. Borde Brillante Animado alrededor del elemento actual */}
      {isTargetVisible && targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 rounded-2xl border-4 border-violet-400 dark:border-violet-300 shadow-[0_0_35px_rgba(139,92,246,0.8)] animate-pulse"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 9999985,
          }}
        />
      )}

      {/* 3. Flecha Animada apuntando al elemento */}
      {isTargetVisible && targetRect && (
        <div
          style={arrowStyle}
          className="pointer-events-none animate-bounce flex flex-col items-center justify-center"
        >
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xl flex items-center gap-1 border-2 border-white">
            <span>👇 Haz clic aquí</span>
          </div>
          <svg className="w-8 h-8 text-violet-500 filter drop-shadow-lg -mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21l-9-9h6V3h6v9h6l-9 9z" />
          </svg>
        </div>
      )}

      {/* 4. Tarjeta Flotante Explicativa con Letra Grande y Amigable */}
      <div
        style={tooltipStyle}
        className="w-[90vw] max-w-[440px] bg-white dark:bg-slate-900 border-2 border-violet-500 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-scale-in"
      >
        {/* Cabecera del paso */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              {currentStepIndex + 1}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Guía Paso a Paso ({currentStepIndex + 1} de {TOUR_STEPS.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar guía interactiva"
          >
            <X size={20} />
          </button>
        </div>

        {/* Título en Letra Grande */}
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {currentStep.title}
          </h3>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Nota pedagógica destacada */}
        {currentStep.highlightNote && (
          <div className="p-3.5 bg-violet-50 dark:bg-violet-950/40 rounded-2xl border border-violet-200 dark:border-violet-800/60 flex items-start gap-2.5 text-xs font-medium text-violet-900 dark:text-violet-200">
            <Sparkles size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <span>{currentStep.highlightNote}</span>
          </div>
        )}

        {/* Controles de Navegación del Tutorial */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Anterior
          </button>

          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-7 bg-violet-600 dark:bg-violet-400'
                    : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          >
            <span>{currentStepIndex === TOUR_STEPS.length - 1 ? '¡Finalizar!' : 'Siguiente'}</span>
            {currentStepIndex === TOUR_STEPS.length - 1 ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
