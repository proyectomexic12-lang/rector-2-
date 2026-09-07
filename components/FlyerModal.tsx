import React from 'react';

interface FlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlyerModal: React.FC<FlyerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <h3 className="text-lg font-bold text-white">Flyer Promocional & Agendamiento de Citas</h3>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/flyer_docentes.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition flex items-center gap-1"
            >
              <span>↗️ Abrir Flyer Completo</span>
            </a>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-full transition flex items-center gap-1"
            >
              <span>🖨️ Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Embedded Iframe Flyer */}
        <div className="w-full h-[75vh]">
          <iframe
            src="/flyer_docentes.html"
            title="Flyer Promocional Docente AI Pro"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};
