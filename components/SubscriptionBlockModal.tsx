import React from 'react';
import { User } from '../services/authService';
import { SubscriptionStatus } from '../types';
import { ShieldAlert, MessageCircle, RefreshCw, LogOut, Calendar, AlertTriangle, CreditCard, DollarSign } from 'lucide-react';

interface SubscriptionBlockModalProps {
    user: User;
    subscriptionStatus: SubscriptionStatus;
    onLogout: () => void;
    onRefresh: () => void;
}

export const SubscriptionBlockModal: React.FC<SubscriptionBlockModalProps> = ({
    user,
    subscriptionStatus,
    onLogout,
    onRefresh
}) => {
    const formatCOP = (val: number) => '$' + val.toLocaleString('es-CO') + ' COP';

    const whatsappMessage = encodeURIComponent(
        `Hola Administrador, soy el docente *${user.name}* (${user.email}).\n` +
        `Mi suscripción mensual a la plataforma Rector venció el *${subscriptionStatus.nextBillingDateStr}*.\n` +
        `Tengo un saldo acumulado en mora de *${formatCOP(subscriptionStatus.totalDebt)}* (${subscriptionStatus.monthsOverdue} mes(es)).\n` +
        `Por favor indíqueme los medios de pago para cancelar y reactivar mi cuenta.`
    );

    const whatsappUrl = `https://wa.me/573000000000?text=${whatsappMessage}`;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-red-100 overflow-hidden relative transform transition-all">
                {/* Header decorativo */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                        <ShieldAlert size={160} />
                    </div>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                        <AlertTriangle size={36} className="text-white animate-bounce" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Acceso Suspendido por Mora</h2>
                    <p className="text-red-100 text-xs font-semibold mt-1">Suscripción Mensual Vencida • Plataforma Rector</p>
                </div>

                {/* Contenido principal */}
                <div className="p-6 space-y-6">
                    <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 text-slate-700 text-xs leading-relaxed">
                        <p className="font-semibold text-red-900 mb-1">Estimado/a docente {user.name}:</p>
                        Tu periodo de suscripción mensual ha expirado. De acuerdo con las políticas de uso de la plataforma, el acceso a la Inteligencia Artificial y la generación de secuencias pedagógicas se suspende hasta cancelar las mensualidades adeudadas.
                    </div>

                    {/* Resumen de Deuda Acumulada */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">
                                <Calendar size={12} className="text-slate-400" />
                                <span>Fecha Vencimiento</span>
                            </div>
                            <div className="font-black text-slate-800 text-sm">
                                {subscriptionStatus.nextBillingDateStr}
                            </div>
                            <div className="text-[10px] font-bold text-red-600 mt-1">
                                ⏱️ {subscriptionStatus.daysOverdue} días de retraso
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase tracking-wider mb-1">
                                <DollarSign size={12} className="text-red-500" />
                                <span>Saldo Pendiente (Mora)</span>
                            </div>
                            <div className="font-black text-red-700 text-base">
                                {formatCOP(subscriptionStatus.totalDebt)}
                            </div>
                            <div className="text-[10px] font-black text-red-800 uppercase mt-1">
                                📌 {subscriptionStatus.monthsOverdue} Mes(es) Acumulados
                            </div>
                        </div>
                    </div>

                    {/* Información aclaratoria de tarifas */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-[11px] text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                            <CreditCard size={14} /> Detalle de la Cuota Recurrente:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            <li>Valor mensual: <span className="font-bold text-slate-800">{formatCOP(subscriptionStatus.monthlyPrice)}</span> por mes reservado.</li>
                            <li>Las mensualidades son acumulativas para mantener la custodia de tus secuencias y el servicio activo.</li>
                        </ul>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-2.5 pt-2">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <MessageCircle size={18} />
                            Reportar Pago o Solicitar Reactivación
                        </a>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onRefresh}
                                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                                <RefreshCw size={14} />
                                Verificar mi Pago
                            </button>
                            <button
                                onClick={onLogout}
                                className="py-2.5 px-4 rounded-xl border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                                <LogOut size={14} />
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
