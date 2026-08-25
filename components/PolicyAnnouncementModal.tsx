import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Zap, 
  Layers, 
  X, 
  Award,
  AlertTriangle,
  Lock,
  RefreshCw,
  Info,
  ChevronDown,
  UserX,
  Send,
  Check,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { authService } from '../services/authService';

interface PolicyAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  onSubscriptionChanged?: () => void;
}

export const PolicyAnnouncementModal: React.FC<PolicyAnnouncementModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  onSubscriptionChanged
}) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Cancellation Flow State
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('Receso o vacaciones escolares');
  const [customReason, setCustomReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 30) {
          setShowScrollHint(false);
        } else {
          setShowScrollHint(true);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleRequestPlan = async (planType: 'mensual' | 'trimestral') => {
    if (!userEmail) {
      alert("Por favor inicia sesión para realizar esta solicitud.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await authService.requestSubscription(userEmail, planType);
      setActionSuccessMessage(`Solicitud registrada formalmente. Se ha notificado a la Administración para la activación de tu ${res.planText}.`);
      if (onSubscriptionChanged) onSubscriptionChanged();
    } catch (e) {
      alert("Error de red al registrar la solicitud. Intente nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancelSubscription = async () => {
    if (!userEmail) return;
    setIsProcessing(true);
    try {
      const finalReason = cancelReason === 'Otro' ? (customReason || 'Solicitud voluntaria del titular') : cancelReason;
      await authService.cancelSubscription(userEmail, finalReason);
      onClose(); // Cerrar modal inmediatamente tras cancelar
      if (onSubscriptionChanged) onSubscriptionChanged();
    } catch (e) {
      alert("Error al procesar la cancelación.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-16 pb-12 font-sans antialiased text-slate-100 selection:bg-indigo-500 selection:text-white">
      
      {/* Backdrop (Sin evento onClick para forzar lectura) */}
      <div className="fixed inset-0" aria-hidden="true" />

      {/* Main Executive Container */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up z-10 my-auto">
        
        {/* Sleek Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-slate-700 via-indigo-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Normativa Institucional • 2026
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-emerald-400 font-medium">Oficial</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Términos de Servicio y Asignación de Cuotas
              </h2>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {actionSuccessMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {actionSuccessMessage}
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div 
          ref={scrollContainerRef}
          className="p-6 sm:p-7 space-y-6 max-h-[66vh] overflow-y-auto custom-scrollbar relative text-xs sm:text-sm text-slate-300 leading-relaxed"
        >
          
          {/* Institutional Statement */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 space-y-1.5">
            <p className="text-xs text-slate-300 leading-relaxed">
              {userName ? `Estimado(a) docente ` : 'Estimados docentes: '}
              <strong className="text-white font-semibold">{userName || ''}</strong>. Con el propósito de garantizar la <span className="text-slate-100 font-semibold">sostenibilidad técnica del servidor</span>, la disponibilidad 24/7 y la respuesta de alta velocidad de los modelos de Inteligencia Artificial para la I.E. Guaimaral, se rigen las siguientes condiciones de suscripción:
            </p>
          </div>

          {/* Pricing & Tier Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tier 1: Plan Mensual */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Plan Mensual
                  </span>
                  <Calendar size={15} className="text-slate-500" />
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">$15.000</span>
                    <span className="text-xs text-slate-400 font-medium">COP / ciclo 30 días</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/50 flex items-center justify-center font-bold text-[11px]">
                      15
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      15 Planeaciones Didácticas / mes
                    </span>
                  </div>

                  <ul className="text-[11px] text-slate-400 space-y-1.5 pl-0.5">
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Rúbricas, Adaptaciones DUA y PIAR</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Taller imprimible y Evaluación Saber</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Descarga directa en PDF y Word</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => handleRequestPlan('mensual')}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard size={13} />
                  <span>Activar / Renovar Plan Mensual</span>
                </button>
              </div>
            </div>

            {/* Tier 2: Plan Trimestral */}
            <div className="bg-slate-950/60 border border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between relative shadow-lg shadow-indigo-950/20">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={13} className="text-indigo-400" /> Plan Trimestral
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-[10px] font-semibold text-indigo-300">
                    Ahorro $10.000
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">$35.000</span>
                    <span className="text-xs text-slate-400 font-medium">COP / período 90 días</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center justify-center font-bold text-[11px]">
                      40
                    </div>
                    <span className="text-xs font-semibold text-emerald-300">
                      40 Planeaciones para el período
                    </span>
                  </div>

                  <ul className="text-[11px] text-slate-300 space-y-1.5 pl-0.5">
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Cobertura de períodos y bimestres completos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Cuota ampliada sin cortes mensuales</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 shrink-0" />
                      <span>Prioridad en tiempo de respuesta de servidor</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => handleRequestPlan('trimestral')}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Zap size={13} className="text-amber-300" />
                  <span>Activar Plan Trimestral</span>
                </button>
              </div>
            </div>

          </div>

          {/* Section: Políticas de Cobro y Mora */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-200">
              <Clock size={15} className="text-indigo-400 shrink-0" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Política de Facturación Mensual y Suspensión por Mora
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El canon de <strong className="text-slate-200">$15.000 COP</strong> es de causación mensual consecutiva para sostener la infraestructura. Al vencer el ciclo de 30 días sin registrar el pago, el servicio suspende automáticamente la emisión de nuevas planeaciones. Si se acumulan períodos impagos (ej. 2 meses = $30.000 COP), se deberá saldar el total adeudado para reanudar el acceso.
            </p>
          </div>

          {/* Section: Cancelación y Tarifa de Reapertura */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200">
                <UserX size={15} className="text-amber-400 shrink-0" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Cancelación Voluntaria y Costo de Reapertura Técnica
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Cualquier docente puede cancelar su suscripción en cualquier momento. Si tras la cancelación voluntaria el usuario decide reincorporarse en un ciclo posterior, se facturará la mensualidad corriente (<strong className="text-slate-200">$15.000 COP</strong>) más un <strong className="text-amber-300">cargo único de reapertura de cuenta y servidor de $12.000 COP</strong> (Total: $27.000 COP).
            </p>

            {/* Cancel Action */}
            {!showCancelDialog ? (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Gestión de cuenta personal</span>
                {/* Botón de Cancelar oculto temporalmente por solicitud del admin */}
              </div>
            ) : (
              <div className="mt-3 p-3.5 bg-slate-900 border border-red-500/30 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>Confirmación de cancelación de suscripción</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Se suspenderá la generación de planeaciones. Para reactivar el servicio en el futuro, aplicará el cargo de reapertura de $12.000 COP.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Motivo:</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2 focus:border-slate-600 focus:outline-none"
                  >
                    <option value="Receso o vacaciones escolares">Receso o vacaciones escolares</option>
                    <option value="Ajuste presupuestal temporal">Ajuste presupuestal temporal</option>
                    <option value="Período académico culminado">Período académico culminado</option>
                    <option value="Otro">Otro motivo</option>
                  </select>

                  {cancelReason === 'Otro' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Indique el motivo..."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg p-2 mt-1 focus:border-slate-600 focus:outline-none"
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelDialog(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Mantener Activa
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancelSubscription}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Procesando...' : 'Confirmar Baja'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Recargas */}
          <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <RefreshCw size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-300">Ampliación de cuota:</strong> Los docentes que requieran planeaciones complementarias antes del vencimiento de su ciclo pueden solicitar recargas de saldo puntuales a la Administración institucional.
            </p>
          </div>

        </div>

        {/* Scroll hint button */}
        {showScrollHint && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-[11px] font-medium px-3.5 py-1 rounded-full border border-slate-700 backdrop-blur-md flex items-center gap-1.5 animate-bounce transition-all shadow-md"
          >
            <span>Desplazar abajo</span>
            <ChevronDown size={12} />
          </button>
        )}

        {/* Modal Footer (Un solo botón para forzar aceptación sin opción de cancelar por ahora) */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex justify-center sticky bottom-0 z-20">
          {/* Botón de Cancelar oculto temporalmente por solicitud del admin */}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Check size={14} />
            <span>Aceptar Políticas y Continuar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
