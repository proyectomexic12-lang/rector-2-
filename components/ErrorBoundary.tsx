
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary Component
 * Catches UI crashes and provides a graceful recovery interface.
 * Implements Point #3: Auto-Debugging & Resilience.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[Error Boundary] Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        localStorage.clear(); // Clear potentially corrupted state
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-outfit">
                    <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl border border-red-100 text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>

                        <h1 className="text-2xl font-black text-slate-800 mb-3">Algo no salió bien</h1>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            La plataforma ha detectado una interrupción inesperada. Hemos registrado el error para revisarlo.
                        </p>

                        <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-left border border-slate-100 italic">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Detalle técnico</p>
                            <p className="text-xs text-slate-600 font-mono break-words">{this.state.error?.message || "Error desconocido"}</p>
                        </div>

                        <button
                            onClick={this.handleReset}
                            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 shadow-xl shadow-slate-200"
                        >
                            <RefreshCw size={20} /> Reiniciar Aplicación
                        </button>

                        <p className="mt-6 text-xs text-slate-400 font-medium">
                            Si el problema persiste, contacta al administrador del sistema.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
