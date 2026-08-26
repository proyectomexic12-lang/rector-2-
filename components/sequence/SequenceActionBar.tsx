import React, { useState } from 'react';
import { Printer, FileDown, BookOpen, GraduationCap, Copy, ArrowLeft, FileText, ChevronDown } from 'lucide-react';
import { generateDocx } from '../../services/docxService';
import { DidacticSequence, SequenceInput } from '../../types';

interface SequenceActionBarProps {
  onReset: () => void;
  onPrint: (mode: 'all' | 'planning' | 'anexos') => void;
  activeView: 'docente' | 'estudiante';
  setActiveView: (view: 'docente' | 'estudiante') => void;
  editableData?: DidacticSequence;
  input?: SequenceInput;
}

export const SequenceActionBar: React.FC<SequenceActionBarProps> = ({
  onReset,
  onPrint,
  activeView,
  setActiveView,
  editableData,
  input
}) => {
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleCopyText = () => {
    const el = document.getElementById('preview-container');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      alert("¡Texto de la planeación copiado al portapapeles!");
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById('preview-container');
    const html2pdf = (window as any).html2pdf;

    if (el && typeof html2pdf === 'function') {
      try {
        setIsExportingPDF(true);
        const title = editableData?.titulo_secuencia || input?.tema || 'Planeacion_Guaimaral';
        const cleanTitle = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_').substring(0, 50);
        const fileName = `${cleanTitle}.pdf`;

        const opt = {
          margin: [8, 8, 8, 8],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(el).save();
      } catch (err) {
        console.warn("Direct html2pdf export fallback:", err);
        window.print();
      } finally {
        setIsExportingPDF(false);
      }
    } else {
      window.print();
    }
  };

  const handleDownloadDocx = async () => {
    if (!editableData || !input) return;
    try {
      setIsExportingDocx(true);
      await generateDocx(editableData, input);
    } catch (e) {
      console.error("Error al exportar DOCX:", e);
      alert("No se pudo generar el archivo Word (.docx). Revisa la consola.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl sticky top-4 z-50 p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-white/10 mb-6 no-print flex flex-col md:flex-row items-center justify-between gap-3 text-white transition-all">
      
      {/* Izquierda: Botón Volver + Badge Minimalista */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <button
          onClick={() => {
            if (confirm("¿Estás seguro de regresar al inicio? Se descompilará la vista actual.")) {
              onReset();
            }
          }}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700/50 hover:text-white flex items-center gap-2 text-xs font-bold"
          title="Regresar al inicio"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Inicio</span>
        </button>

        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">I.E. Guaimaral Pro</span>
        </div>
      </div>

      {/* Centro: Selector de Vista Minimalista (Segmented Control) */}
      <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 flex items-center gap-1 w-full md:w-auto justify-center">
        <button
          onClick={() => setActiveView('docente')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
            activeView === 'docente'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <BookOpen size={14} />
          <span>Vista Docente</span>
        </button>

        <button
          onClick={() => setActiveView('estudiante')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
            activeView === 'estudiante'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <GraduationCap size={15} />
          <span>Taller Fotocopia</span>
        </button>
      </div>

      {/* Derecha: Acciones de Exportación & Impresión Minimalistas */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
        <button
          onClick={handleCopyText}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 transition-all text-xs font-bold flex items-center gap-1.5"
          title="Copiar texto"
        >
          <Copy size={14} />
          <span className="hidden xl:inline">Copiar</span>
        </button>

        {editableData && (
          <button
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            title="Descargar en Microsoft Word (.docx)"
          >
            <FileText size={14} />
            <span>{isExportingDocx ? 'Word...' : 'DOCX'}</span>
          </button>
        )}

        <button
          onClick={handleDownloadPDF}
          disabled={isExportingPDF}
          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95"
          title="Descargar planeación directamente como archivo PDF"
        >
          <FileDown size={15} className={isExportingPDF ? 'animate-bounce' : ''} />
          <span>{isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
        </button>

        {/* Menú Desplegable Imprimir */}
        <div className="relative">
          <button
            onClick={() => setShowPrintMenu(!showPrintMenu)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Printer size={14} />
            <span>Imprimir</span>
            <ChevronDown size={12} />
          </button>

          {showPrintMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 text-xs font-bold space-y-1 animate-fade-in-up">
              <button
                onClick={() => { onPrint('all'); setShowPrintMenu(false); }}
                className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl transition-colors flex items-center gap-2"
              >
                🖨️ Todo el Documento
              </button>
              <button
                onClick={() => { onPrint('planning'); setShowPrintMenu(false); }}
                className="w-full text-left px-3 py-2 text-blue-400 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                📘 Solo Planeación Docente
              </button>
              <button
                onClick={() => { onPrint('anexos'); setShowPrintMenu(false); }}
                className="w-full text-left px-3 py-2 text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                📝 Solo Taller Estudiante
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
