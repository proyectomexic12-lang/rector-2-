import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  highlightNote?: string;
  actionPrompt: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'grado',
    targetSelector: '#tour-grado',
    title: '👨‍🏫 Paso 1: Selecciona el Grado Escolar',
    description: 'Haz clic en esta casilla y elige el grado de tus estudiantes (por ejemplo: Jardín, 1°, 4°, etc.).',
    highlightNote: 'El sistema adaptará el nivel de lenguaje y competencias pedagógicas al grado seleccionado.',
    actionPrompt: 'Elige un grado para avanzar al siguiente campo'
  },
  {
    id: 'area',
    targetSelector: '#tour-area',
    title: '📚 Paso 2: Elige el Área del Conocimiento',
    description: 'Selecciona la materia oficial que vas a impartir (Matemáticas, Lengua Castellana, Ciencias, Inglés, etc.).',
    highlightNote: 'Alineado con los estándares curriculares del Ministerio de Educación Nacional (MEN).',
    actionPrompt: 'Selecciona el área de enseñanza para avanzar'
  },
  {
    id: 'crese',
    targetSelector: '#tour-crese',
    title: '🤝 Paso 3: Elige el Eje Transversal (CRESE)',
    description: 'Selecciona el componente de formación ciudadana, socioemocional y de convivencia escolar.',
    highlightNote: 'La planeación incluirá actividades pedagógicas para cultivar empatía y convivencia en el aula.',
    actionPrompt: 'Selecciona el eje socioemocional para avanzar'
  },
  {
    id: 'tema',
    targetSelector: '#tour-tema',
    title: '✏️ Paso 4: Escribe el Tema Principal',
    description: 'Escribe aquí qué tema vas a enseñar en la clase (ejemplo: "Los ecosistemas", "Suma de fracciones", etc.).',
    highlightNote: 'Al terminar de escribir el tema, presiona Enter o haz clic fuera del campo para continuar.',
    actionPrompt: 'Escribe el tema de la clase'
  },
  {
    id: 'btn-generar',
    targetSelector: '#tour-btn-generar',
    title: '⚡ Paso 5: Haz clic en Generar Planeación',
    description: '¡Todo listo! Presiona este botón azul para que la Inteligencia Artificial redacte tu planeación completa.',
    highlightNote: 'Al darle clic, espera unos segundos a que la IA ensamble los 4 momentos pedagógicos, DUA y evaluación.',
    actionPrompt: '¡Presiona el botón Generar Planeación!'
  },
  {
    id: 'btn-registrar',
    targetSelector: '#tour-btn-registrar',
    title: '🚀 Botón Morado: Registrar Planeación',
    description: '¡Excelente, profesor! Ahora ya NO vas a tener que ir a la otra aplicación para montar tus clases. Desde este mismo botón morado puedes montar y sincronizar tus planeaciones al servidor institucional sin salir de aquí.',
    highlightNote: 'Al hacer clic aquí, se abrirá la misma ventana oficial con los mismos datos para subirla de una vez.',
    actionPrompt: 'Haz clic en el botón morado Registrar Planeación'
  },
  {
    id: 'btn-confirmar-envio',
    targetSelector: '#tour-btn-confirmar-envio',
    title: '☁️ Confirmar y Subir al Servidor Institucional',
    description: '¡Aquí tienes la misma formulación oficial para subir tu planeación! Tu área, grado y tema ya se colocaron solos. Solo revisa la semana lectiva y presiona este botón morado para subir la planeación que elijas.',
    highlightNote: 'Al presionar este botón, tu planeación se subirá automáticamente a la otra plataforma (manuel-red.vercel.app) donde se alojan todas las planeaciones oficiales.',
    actionPrompt: '¡Presiona Confirmar y Enviar a Revisión!'
  }
];

interface GuidedTourProps {
  isActive: boolean;
  onClose: () => void;
  hasGeneratedSequence?: boolean;
  isLoading?: boolean;
  userEmail?: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onClose,
  hasGeneratedSequence = false,
  isLoading = false,
  userEmail,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [canAdvanceTema, setCanAdvanceTema] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');

  // Escuchar evento de envío exitoso desde cualquier parte de la app
  useEffect(() => {
    const handleSuccess = (e: any) => {
      setIsCompleted(true);
      if (e?.detail?.mensaje) {
        setCompletionMessage(e.detail.mensaje);
      }
    };

    window.addEventListener('guaimaral_tour_completed', handleSuccess);
    return () => window.removeEventListener('guaimaral_tour_completed', handleSuccess);
  }, []);

  // Auto-detección inteligente del flujo y avance obligatorio por interacción real
  useEffect(() => {
    if (!isActive || isCompleted) return;

    const checkState = () => {
      const modalBtn = document.querySelector('#tour-btn-confirmar-envio');
      
      // 1. Si el modal de confirmación está abierto en el DOM, ir estrictamente al paso 7
      if (modalBtn) {
        if (currentStepIndex !== 6) setCurrentStepIndex(6);
        return;
      }

      // 2. Si estábamos en el paso 7 y el modal se cerró:
      // Si se cerró sin evento de éxito previo, volver al paso 6 para que la pantalla no se quede trabada
      if (currentStepIndex === 6 && !modalBtn) {
        setCurrentStepIndex(5);
        return;
      }

      // 3. Si ya hay planeación generada y el modal no está abierto, ir al paso 6 (Botón morado)
      const regBtn = document.querySelector('#tour-btn-registrar');
      if (regBtn && hasGeneratedSequence) {
        if (currentStepIndex < 5) setCurrentStepIndex(5);
        return;
      }

      // 4. Verificar si el tema ya tiene contenido para habilitar el avance al botón generar
      const temaInput = document.querySelector('#tour-tema') as HTMLInputElement | null;
      if (temaInput && temaInput.value.trim().length >= 4) {
        setCanAdvanceTema(true);
      } else {
        setCanAdvanceTema(false);
      }
    };

    checkState();
    const interval = setInterval(checkState, 250);
    return () => clearInterval(interval);
  }, [hasGeneratedSequence, isActive, currentStepIndex, isCompleted]);

  // Event Listeners en los campos para obligar el flujo real
  useEffect(() => {
    if (!isActive || isCompleted) return;

    const gradoEl = document.querySelector('#tour-grado') as HTMLSelectElement | null;
    const areaEl = document.querySelector('#tour-area') as HTMLSelectElement | null;
    const creseEl = document.querySelector('#tour-crese') as HTMLSelectElement | null;
    const temaEl = document.querySelector('#tour-tema') as HTMLInputElement | null;

    const handleGradoChange = (e: Event) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val) setTimeout(() => setCurrentStepIndex(1), 200);
    };

    const handleAreaChange = (e: Event) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val) setTimeout(() => setCurrentStepIndex(2), 200);
    };

    const handleCreseChange = (e: Event) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val) setTimeout(() => setCurrentStepIndex(3), 200);
    };

    const handleTemaInput = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      if (val.trim().length >= 4) setCanAdvanceTema(true);
    };

    const handleTemaKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const val = (e.target as HTMLInputElement).value;
        if (val.trim().length >= 4) {
          e.preventDefault();
          setTimeout(() => setCurrentStepIndex(4), 150);
        }
      }
    };

    const handleTemaBlur = (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      if (val.trim().length >= 4 && currentStepIndex === 3) {
        setTimeout(() => setCurrentStepIndex(4), 250);
      }
    };

    if (gradoEl) gradoEl.addEventListener('change', handleGradoChange);
    if (areaEl) areaEl.addEventListener('change', handleAreaChange);
    if (creseEl) creseEl.addEventListener('change', handleCreseChange);
    if (temaEl) {
      temaEl.addEventListener('input', handleTemaInput);
      temaEl.addEventListener('keydown', handleTemaKeyDown);
      temaEl.addEventListener('blur', handleTemaBlur);
    }

    return () => {
      if (gradoEl) gradoEl.removeEventListener('change', handleGradoChange);
      if (areaEl) areaEl.removeEventListener('change', handleAreaChange);
      if (creseEl) creseEl.removeEventListener('change', handleCreseChange);
      if (temaEl) {
        temaEl.removeEventListener('input', handleTemaInput);
        temaEl.removeEventListener('keydown', handleTemaKeyDown);
        temaEl.removeEventListener('blur', handleTemaBlur);
      }
    };
  }, [isActive, currentStepIndex, isCompleted]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Medir posición exacta del elemento objetivo
  const updateTargetPosition = () => {
    if (!isActive || !currentStep || isCompleted) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 100);
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isActive || isCompleted) return;

    updateTargetPosition();

    const handleResizeOrScroll = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    const interval = setInterval(handleResizeOrScroll, 250);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      clearInterval(interval);
    };
  }, [currentStepIndex, isActive, currentStep?.targetSelector, isCompleted]);

  if (!isActive) return null;

  // PANTALLA FINAL DE CELEBRACIÓN / ÉXITO AL ENVIAR LA PLANEACIÓN
  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in pointer-events-auto">
        <div className="w-[92vw] max-w-[480px] bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl shadow-2xl p-7 text-center flex flex-col items-center gap-4 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            🎉 Entrega Institucional Exitosa
          </span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            ¡Planeación Radicada con Éxito!
          </h3>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            Profesor, tu planeación ya fue enviada y quedó alojada directamente en la plataforma oficial (<span className="font-bold text-violet-600 dark:text-violet-400">manuel-red.vercel.app</span>).
          </p>
          {completionMessage && (
            <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {completionMessage}
            </div>
          )}
          <div className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            ✓ Quedó registrada con fecha y hora oficial para coordinación sin necesidad de abrir la otra aplicación.
          </div>
          <button
            type="button"
            onClick={() => {
              if (userEmail) {
                try {
                  localStorage.setItem(`guaimaral_tour_completed_${userEmail.toLowerCase().trim()}`, 'true');
                } catch (e) {}
              }
              setIsCompleted(false);
              onClose();
            }}
            className="w-full mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>Finalizar y Continuar</span>
          </button>
        </div>
      </div>
    );
  }

  const padding = 10;
  const isTargetVisible = Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0);

  // Posicionamiento inteligente del tooltip flotante
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

    if (spaceBelow > 320 || spaceBelow > spaceAbove) {
      tooltipStyle.top = Math.min(window.innerHeight - 340, targetRect.bottom + 22);
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 440, targetRect.left - 20));

      arrowStyle.top = targetRect.bottom + 2;
      arrowStyle.left = targetRect.left + (targetRect.width / 2) - 16;
    } else {
      tooltipStyle.bottom = Math.min(window.innerHeight - 60, (window.innerHeight - targetRect.top) + 22);
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 440, targetRect.left - 20));

      arrowStyle.bottom = (window.innerHeight - targetRect.top) + 2;
      arrowStyle.left = targetRect.left + (targetRect.width / 2) - 16;
    }
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className="fixed inset-0 z-[9999980] overflow-hidden pointer-events-none">
      {/* 1. Recorte SVG con fondo oscuro / spotlight */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none" style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.4))' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {isTargetVisible && targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.82)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* 2. Bloqueadores invisibles alrededor del target */}
      {isTargetVisible && targetRect && (
        <>
          <div
            className="fixed pointer-events-auto cursor-not-allowed"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, targetRect.top - padding),
              zIndex: 9999982,
            }}
          />
          <div
            className="fixed pointer-events-auto cursor-not-allowed"
            style={{
              top: targetRect.bottom + padding,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999982,
            }}
          />
          <div
            className="fixed pointer-events-auto cursor-not-allowed"
            style={{
              top: targetRect.top - padding,
              left: 0,
              width: Math.max(0, targetRect.left - padding),
              height: targetRect.height + padding * 2,
              zIndex: 9999982,
            }}
          />
          <div
            className="fixed pointer-events-auto cursor-not-allowed"
            style={{
              top: targetRect.top - padding,
              left: targetRect.right + padding,
              right: 0,
              height: targetRect.height + padding * 2,
              zIndex: 9999982,
            }}
          />
        </>
      )}

      {/* 3. Borde Brillante Pulsante sobre el elemento */}
      {isTargetVisible && targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-4 border-violet-400 dark:border-violet-300 shadow-[0_0_40px_rgba(139,92,246,0.9)] animate-pulse"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 9999985,
          }}
        />
      )}

      {/* 4. Flecha Animada con mensaje directo */}
      {isTargetVisible && targetRect && (
        <div
          style={arrowStyle}
          className="pointer-events-none animate-bounce flex flex-col items-center justify-center"
        >
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5 border-2 border-white">
            <span>👇 {currentStep.actionPrompt}</span>
          </div>
          <svg className="w-8 h-8 text-violet-500 filter drop-shadow-lg -mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21l-9-9h6V3h6v9h6l-9 9z" />
          </svg>
        </div>
      )}

      {/* 5. Tarjeta Explicativa Flotante con Letra Grande */}
      <div
        style={tooltipStyle}
        className="w-[92vw] max-w-[450px] bg-white dark:bg-slate-900 border-2 border-violet-500 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-scale-in pointer-events-auto"
      >
        {/* Encabezado sin botón X */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              {currentStepIndex + 1}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Paso {currentStepIndex + 1} de {TOUR_STEPS.length} · Guía Obligatoria
            </span>
          </div>
          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Flujo Guiado
          </span>
        </div>

        {/* Estado especial durante la generación */}
        {isLoading && currentStepIndex === 4 ? (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm sm:text-base">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <span>⏳ Espera a que se genere la planeación...</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              La Inteligencia Artificial está redactando la secuencia didáctica completa con todos sus momentos pedagógicos. En pocos segundos terminará y la flecha te llevará directamente al botón morado para registrarla.
            </p>
          </div>
        ) : (
          <>
            {/* Título en Letra Grande */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Nota pedagógica o institucional */}
            {currentStep.highlightNote && (
              <div className="p-3.5 bg-violet-50 dark:bg-violet-950/40 rounded-2xl border border-violet-200 dark:border-violet-800/60 flex items-start gap-2.5 text-xs font-medium text-violet-900 dark:text-violet-200">
                <Sparkles size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <span>{currentStep.highlightNote}</span>
              </div>
            )}
          </>
        )}

        {/* Pie de tarjeta: Indicador de acción obligatoria en pantalla */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            <span>Selecciona o interactúa en pantalla</span>
          </div>

          {/* Botón contextual de avance para el campo Tema si ya escribió */}
          {currentStepIndex === 3 && canAdvanceTema && (
            <button
              type="button"
              onClick={() => setCurrentStepIndex(4)}
              className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 animate-pulse"
            >
              <span>Ir a Generar</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
