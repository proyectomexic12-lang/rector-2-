import React from 'react';
import { Printer, FileDown, CheckCircle, PenTool } from 'lucide-react';

interface SequenceActionBarProps {
  onReset: () => void;
  onPrint: (mode: 'all' | 'planning' | 'anexos') => void;
}

export const SequenceActionBar: React.FC<SequenceActionBarProps> = ({ onReset, onPrint }) => {
  const handleCopyText = () => {
    const el = document.getElementById('preview-container');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      alert("¡Texto copiado al portapapeles!");
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('preview-container');
    if (!element) return;
    
    const opt = {
      margin:       10,
      filename:     'Planeacion_Docente_Guaimaral.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf().set(opt).from(element).save();
    } else {
      alert("La librería de PDF está cargando, intenta en un segundo.");
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md sticky top-20 z-40 p-3 rounded-2xl shadow-lg border border-white/50 mb-8 no-print flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-xl ring-1 ring-blue-50">
      <div className="flex items-center gap-4 pl-2">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-green-500/30">
          <CheckCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Secuencia Lista</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-xs font-bold uppercase text-green-600 tracking-wider">Formato Institucional v2.1</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button
          onClick={() => {
            if (confirm("Si vuelves al inicio, se borrará lo hecho anteriormente. ¿Estás seguro?")) {
              onReset();
            }
          }}
          className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all font-bold shadow-sm"
        >
          <span className="text-lg">↩️</span>
          <span className="hidden sm:inline">Volver</span>
        </button>

        <button
          onClick={handleCopyText}
          className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all font-bold shadow-sm"
          title="Copiar todo el texto"
        >
          <span className="text-lg">📋</span>
          <span className="hidden sm:inline">Copiar</span>
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all font-bold shadow-lg shadow-indigo-500/30"
          >
            <FileDown className="h-5 w-5" />
            PDF Nativo
          </button>
          
          <button
            onClick={() => onPrint('all')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 active:scale-95 transition-all font-bold shadow-lg shadow-slate-500/30"
          >
            <Printer className="h-5 w-5" />
            Imprimir Todo
          </button>
          <button
            onClick={() => onPrint('planning')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-bold shadow-lg shadow-blue-500/30"
          >
            <PenTool className="h-5 w-5" />
            Sólo Planeación
          </button>
          <button
            onClick={() => onPrint('anexos')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all font-bold shadow-lg shadow-indigo-500/30"
          >
            <FileDown className="h-5 w-5" />
            Sólo Anexos
          </button>
        </div>
      </div>
    </div>
  );
};
