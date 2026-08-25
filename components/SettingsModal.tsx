import React, { useState } from 'react';
import { 
  Settings, 
  CreditCard, 
  Shield, 
  BookOpen, 
  User, 
  X, 
  Check, 
  AlertTriangle, 
  UserX, 
  Key, 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Award,
  Layers,
  LogOut
} from 'lucide-react';
import { User as UserType, authService } from '../services/authService';
import { PasswordChange } from './UserManagement';
import { PlanQuotaInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  quotaInfo: PlanQuotaInfo | null;
  onOpenPolicies: () => void;
  onSubscriptionChanged: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  quotaInfo,
  onOpenPolicies,
  onSubscriptionChanged,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'subscription' | 'policies' | 'security'>('subscription');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('Receso o vacaciones escolares');
  const [customReason, setCustomReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleRequestPlan = async (planType: 'mensual' | 'trimestral') => {
    if (!user.email) return;
    setIsProcessing(true);
    try {
      const res = await authService.requestSubscription(user.email, planType);
      setFeedbackMessage(`Solicitud de ${res.planText} enviada exitosamente a la Administración.`);
      onSubscriptionChanged();
    } catch (e) {
      alert("Error al procesar la solicitud.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!user.email) return;
    setIsProcessing(true);
    try {
      const reason = cancelReason === 'Otro' ? (customReason || 'Solicitud del usuario') : cancelReason;
      await authService.cancelSubscription(user.email, reason);
      setFeedbackMessage("Tu suscripción ha sido dada de baja. Para reactivarla en el futuro, aplicará la tarifa de reapertura técnica de $12.000 COP.");
      setShowCancelDialog(false);
      onSubscriptionChanged();
    } catch (e) {
      alert("Error al cancelar la suscripción.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-sans text-slate-200">
      
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Settings Dialog */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-scale-up z-10 flex flex-col max-h-[90vh]">
        
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-slate-700 via-indigo-500 to-emerald-500 shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Configuración y Cuenta
              </h2>
              <p className="text-[11px] text-slate-400">
                {user.email} • {user.role === 'admin' ? 'Administrador' : 'Docente'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'subscription' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <CreditCard size={14} />
            <span>Suscripción y Cuotas</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'policies' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <BookOpen size={14} />
            <span>Políticas del Software</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'security' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Shield size={14} />
            <span>Seguridad y Acceso</span>
          </button>
        </div>

        {/* Notification Banner */}
        {feedbackMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fade-in shrink-0">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{feedbackMessage}</div>
            <button onClick={() => setFeedbackMessage(null)} className="text-emerald-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-xs sm:text-sm text-slate-300 flex-1">
          
          {/* TAB 1: SUSCRIPCIÓN & CUOTAS */}
          {activeTab === 'subscription' && (
            <div className="space-y-5">
              
              {/* Current Status Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${quotaInfo?.isUnlimitedAdmin || (quotaInfo?.hasPlan && (quotaInfo?.remainingQuota || 0) > 0) ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                    <span className="font-semibold text-white text-sm">
                      {quotaInfo?.planName || 'Plan Docente'}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {quotaInfo?.isUnlimitedAdmin ? 'Ilimitado' : `${quotaInfo?.remainingQuota || 0} Disponibles`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Planeaciones Usadas:</span>
                    <strong className="text-slate-200">{quotaInfo?.usedQuota || 0} / {quotaInfo?.maxQuota || 15}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Cuota Máxima:</span>
                    <strong className="text-slate-200">{quotaInfo?.isUnlimitedAdmin ? 'Sin Límite' : `${quotaInfo?.maxQuota || 15} planeaciones`}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[11px] block">Corte / Renovación:</span>
                    <strong className="text-indigo-300 text-[11px]">{quotaInfo?.nextBillingDateStr || 'Ciclo 30 días'}</strong>
                  </div>
                </div>
                
                {quotaInfo?.reason === 'vencido' && (
                  <div className="pt-3 border-t border-red-900/30">
                    <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-red-400" />
                        <span className="text-red-300 font-semibold text-xs">Mora Activa ({quotaInfo.monthsOverdue} meses)</span>
                      </div>
                      <span className="text-red-400 font-bold text-xs">
                        Deuda: ${(quotaInfo.totalDebt || 0).toLocaleString('es-CO')} COP
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Upgrade / Plan Options */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Opciones de Renovación y Planes
                </h4>

                {quotaInfo?.reason === 'cancelado' ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-amber-400 text-xs flex items-center gap-1">
                          Reactivación de Cuenta
                        </strong>
                        <span className="text-amber-400 font-bold text-xs">$27.000 COP</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Incluye tarifa técnica ($12.000) + primer mes ($15.000).</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestPlan('reactivacion' as any)}
                      disabled={isProcessing}
                      className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      Solicitar Reactivación
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-white text-xs">Plan Mensual</strong>
                          <span className="text-slate-300 font-bold text-xs">$15.000 COP</span>
                        </div>
                        <p className="text-[11px] text-slate-400">15 Planeaciones / 30 días</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequestPlan('mensual')}
                        disabled={isProcessing}
                        className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                      >
                        {quotaInfo?.reason === 'vencido' ? 'Saldar y Renovar ($15.000)' : 'Renovar / Solicitar ($15.000)'}
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-indigo-500/40 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-indigo-300 text-xs flex items-center gap-1">
                            <Award size={13} /> Plan Trimestral
                          </strong>
                          <span className="text-emerald-400 font-bold text-xs">$35.000 COP</span>
                        </div>
                        <p className="text-[11px] text-slate-400">40 Planeaciones / 3 meses (Ahorras $10k)</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequestPlan('trimestral')}
                        disabled={isProcessing}
                        className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        {quotaInfo?.reason === 'vencido' ? 'Saldar Deuda y Activar Trimestral' : 'Activar Trimestral ($35.000)'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation Option (Only if active or in mora, but not if already cancelled or free) */}
              {quotaInfo?.hasPlan && quotaInfo?.reason !== 'cancelado' && !quotaInfo?.isUnlimitedAdmin && (
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300">Baja Voluntaria de Suscripción</h5>
                    <p className="text-[11px] text-slate-500">Cancela tu plan activo y suspende el cobro recurrente.</p>
                  </div>

                  {!showCancelDialog && (
                    <button
                      type="button"
                      onClick={() => setShowCancelDialog(true)}
                      className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-medium rounded-lg transition-colors"
                    >
                      Cancelar mi Suscripción
                    </button>
                  )}
                </div>

                {showCancelDialog && (
                  <div className="p-4 bg-slate-950 border border-red-500/40 rounded-xl space-y-3 animate-fade-in text-xs">
                    <div className="flex items-center gap-2 text-red-400 font-semibold">
                      <AlertCircle size={15} />
                      <span>¿Confirmas la cancelación de tu suscripción?</span>
                    </div>

                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Se suspenderá la generación de planeaciones con Inteligencia Artificial. Recuerda que si deseas reactivar tu cuenta en un mes posterior, aplicará la <strong>tarifa de reapertura técnica de $12.000 COP</strong> adicional a la mensualidad.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Motivo de baja:</label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-slate-500 focus:outline-none"
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
                          placeholder="Escribe el motivo..."
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 mt-1 focus:border-slate-500 focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelDialog(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                      >
                        Mantener Activa
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        {isProcessing ? 'Procesando...' : 'Confirmar Cancelación'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

            </div>
          )}

          {/* TAB 2: POLÍTICAS Y CONDICIONES */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-indigo-400" />
                  Reglamento de Uso y Sostenibilidad
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para mantener la plataforma en línea 24/7 y financiar el consumo de tokens de Inteligencia Artificial (Gemini Pro), se establecen las siguientes directrices:
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <strong className="text-white block mb-0.5">1. Facturación Mensual Consecutiva:</strong>
                  <span className="text-slate-400">La cuota de $15.000 COP es de causación mensual consecutiva. Los meses vencidos sin pago son acumulables para reanudar el servicio.</span>
                </div>

                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <strong className="text-white block mb-0.5">2. Tarifa de Reapertura Técnica ($12.000 COP):</strong>
                  <span className="text-slate-400">Si un docente solicita la cancelación de su suscripción y desea reactivarla en el futuro, se liquidará la mensualidad corriente más el costo de reapertura de cuenta y servidor.</span>
                </div>

                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <strong className="text-white block mb-0.5">3. Asignación de Dispositivos:</strong>
                  <span className="text-slate-400">La licencia docente autoriza el uso simultáneo en un máximo de 1 celular y 1 computador de uso personal.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { onClose(); onOpenPolicies(); }}
                className="w-full py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen size={14} />
                <span>Abrir Comunicado Oficial de Políticas Completo</span>
              </button>
            </div>
          )}

          {/* TAB 3: SEGURIDAD Y CUENTA */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={14} className="text-indigo-400" />
                  Credenciales de Acceso
                </h4>
                <p className="text-xs text-slate-400">
                  Actualiza tu contraseña periódicamente para proteger tus planeaciones didácticas.
                </p>
              </div>

              {/* Password Change Component */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <PasswordChange email={user.email} />
              </div>

              {/* Logout Option */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 text-xs">Finalizar sesión en este dispositivo</span>
                <button
                  type="button"
                  onClick={() => { onClose(); onLogout(); }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut size={13} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Clases Ideal AI Platform • I.E. Guaimaral</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
