import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, X, Send } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  highlightNote?: string;
  actionPrompt: string;
}

// Guía reducida: ÚNICAMENTE enfocada en el botón especial de radicación en SIGEP sin salir a otro software
const TOUR_STEPS: TourStep[] = [
  {
    id: 'btn-registrar',
    targetSelector: '#btn-registrar-planeacion, #tour-btn-registrar',
    title: '🚀 Botón Especial: Registrar Planeación en SIGEP',
    description: '¡Excelente, profesor! Ahora ya NO tienes que ir a la otra aplicación para montar tus clases. Desde este mismo botón puedes radicar y sincronizar tus planeaciones al servidor institucional sin salir de aquí.',
    highlightNote: 'Al hacer clic aquí, se abrirá la ventana oficial precargada con todos tus datos para subirla de una vez.',
    actionPrompt: 'Haz clic en el botón Registrar Planeación'
  },
  {
    id: 'btn-confirmar-envio',
    targetSelector: '#tour-btn-confirmar-envio',
    title: '☁️ Confirmar y Subir al Servidor Institucional',
    description: '¡Aquí tienes la formulación oficial de radicación! Tu área, grado y tema ya se colocaron solos. Solo revisa la semana lectiva y presiona este botón para subir la planeación.',
    highlightNote: 'Al presionar este botón, tu planeación se enviará directamente a la plataforma de coordinación (manuel-red.vercel.app) sin tener que ir a otro software.',
    actionPrompt: '¡Presiona Confirmar y Enviar a Revisión!'
  }
];

interface GuidedTourProps {
  isActive: boolean;
  onClose: () => void;
  hasGeneratedSequence?: boolean;
  userEmail?: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onClose,
  hasGeneratedSequence = false,
  userEmail,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
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
    window.addEventListener('guaimaral_planeacion_subida', handleSuccess);
    return () => {
      window.removeEventListener('guaimaral_tour_completed', handleSuccess);
      window.removeEventListener('guaimaral_planeacion_subida', handleSuccess);
    };
  }, []);

  // Control de pasos: 0 = Botón Registrar Planeación, 1 = Modal de Confirmar Envío
  useEffect(() => {
    if (!isActive || isCompleted || !hasGeneratedSequence) return;

    const checkState = () => {
      const modalBtn = document.querySelector('#tour-btn-confirmar-envio');
      if (modalBtn) {
        if (currentStepIndex !== 1) setCurrentStepIndex(1);
        return;
      }

      if (currentStepIndex === 1 && !modalBtn) {
        setCurrentStepIndex(0);
        return;
      }
    };

    checkState();
    const interval = setInterval(checkState, 250);
    return () => clearInterval(interval);
  }, [hasGeneratedSequence, isActive, currentStepIndex, isCompleted]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Medir posición exacta del elemento objetivo con reintentos
  const updateTargetPosition = () => {
    if (!isActive || !currentStep || isCompleted || !hasGeneratedSequence) return;

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
    if (!isActive || isCompleted || !hasGeneratedSequence) return;

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
  }, [currentStepIndex, isActive, currentStep?.targetSelector, isCompleted, hasGeneratedSequence]);

  // Si la guía no está activa o no hay planeación generada, NO MOSTRAR NADA (formulario 100% limpio)
  if (!isActive || !hasGeneratedSequence) return null;

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
            className="w-full mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
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

      {/* 2. Borde Brillante Pulsante sobre el elemento */}
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

      {/* 3. Flecha Animada con mensaje directo */}
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

      {/* 4. Tarjeta Explicativa Flotante con Botón de Cierre */}
      <div
        style={tooltipStyle}
        className="w-[92vw] max-w-[450px] bg-white dark:bg-slate-900 border-2 border-violet-500 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-scale-in pointer-events-auto"
      >
        {/* Encabezado con Botón X de Cierre Inmediato */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              {currentStepIndex + 1}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Guía Oficial · Radicación SIGEP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Directo en la App
            </span>
            <button
              type="button"
              onClick={() => {
                const email = userEmail?.toLowerCase().trim();
                if (email) {
                  localStorage.setItem(`guaimaral_tour_completed_${email}`, 'true');
                }
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Cerrar guía (X)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Contenido Explicativo */}
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {currentStep.title}
          </h3>
          <p className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Nota institucional de blindaje */}
        {currentStep.highlightNote && (
          <div className="p-3.5 bg-violet-50 dark:bg-violet-950/40 rounded-2xl border border-violet-200 dark:border-violet-800/60 flex items-start gap-2.5 text-xs font-medium text-violet-900 dark:text-violet-200">
            <Sparkles size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <span>{currentStep.highlightNote}</span>
          </div>
        )}

        {/* Pie de tarjeta */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (userEmail) {
                try {
                  localStorage.setItem(`guaimaral_tour_completed_${userEmail.toLowerCase().trim()}`, 'true');
                } catch (e) {}
              }
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all cursor-pointer"
            title="Omitir el tutorial y continuar normalmente"
          >
            Entendido / Cerrar
          </button>

          {currentStepIndex === 0 && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('abrir_modal_registrar_planeacion'));
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black shadow-lg shadow-violet-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Abrir Registro</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
