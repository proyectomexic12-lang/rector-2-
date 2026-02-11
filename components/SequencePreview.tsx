import React, { useState } from 'react';
import { DidacticSequence, SequenceInput } from '../types';
import { generateDocx } from '../services/docxService';
import { Printer, FileDown, CheckCircle, Sparkles, Send, School, ExternalLink, PenTool, Lock } from 'lucide-react';

interface SequencePreviewProps {
  data: DidacticSequence;
  input: SequenceInput;
  onRefine: (instruction: string) => void;
  onReset: () => void;
}

export const SequencePreview: React.FC<SequencePreviewProps> = ({ data, input, onRefine, onReset }) => {
  const [refinementText, setRefinementText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [editableData, setEditableData] = useState<DidacticSequence>(() => ({
    ...data,
    taller_imprimible: data.taller_imprimible || {
      introduccion: "Taller de aplicación del tema.",
      instrucciones: "Sigue los ejercicios propuestos.",
      ejercicios: ["Ejercicio 1", "Ejercicio 2"],
      reto_creativo: "¡Demuestra tu talento!"
    }
  }));

  // Sync state if new data arrives (e.g., from AI refinement)
  React.useEffect(() => {
    setEditableData({
      ...data,
      taller_imprimible: data.taller_imprimible || {
        introduccion: "Taller de aplicación del tema.",
        instrucciones: "Sigue los ejercicios propuestos.",
        ejercicios: ["Ejercicio 1", "Ejercicio 2"],
        reto_creativo: "¡Demuestra tu talento!"
      }
    });
  }, [data]);

  const handleUpdateField = (path: string, value: any) => {
    const newData = { ...editableData };
    const keys = path.split('.');
    let current: any = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setEditableData(newData);
  };

  const handleRefineSubmit = () => {
    if (!refinementText.trim()) return;
    setIsRefining(true);
    onRefine(refinementText);
  };

  // State for selective printing
  const [printMode, setPrintMode] = useState<'all' | 'planning' | 'anexos'>('all');

  const handlePrint = (mode: 'all' | 'planning' | 'anexos') => {
    setPrintMode(mode);
    // Give React time to re-render potentially hidden sections before printing
    setTimeout(() => {
      window.print();
      // Reset mode after print dialog closes
      setTimeout(() => setPrintMode('all'), 500);
    }, 100);
  };

  const handleDocx = async () => {
    await generateDocx(editableData, input);
    // Auto-reset after download starts
    setTimeout(() => {
      if (confirm("¿Deseas crear una nueva secuencia?")) {
        onReset();
      }
    }, 1500);
  };

  // Helper for institutional table headers
  const HeaderBox = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-[#EDF7ED] border border-gray-400 px-2 py-1 text-[10px] font-bold text-gray-800 uppercase flex items-center justify-center text-center leading-tight institutional-header ${className}`}>
      {children}
    </div>
  );

  // Helper for content cells with editing
  const EditableContent = ({
    value,
    onSave,
    className = "",
    multiline = true
  }: {
    value: string,
    onSave: (val: string) => void,
    className?: string,
    multiline?: boolean
  }) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onSave(e.currentTarget.innerText)}
      className={`border border-transparent hover:border-indigo-300 hover:bg-indigo-50/30 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none px-2 py-1 text-[11px] text-gray-900 leading-snug transition-all rounded cursor-text ${className}`}
      title="Haz clic para editar"
    >
      {value}
    </div>
  );

  // Classes to hide/show during print based on mode
  const planningClass = printMode === 'anexos' ? 'print:hidden' : '';
  const anexosClass = printMode === 'planning' ? 'print:hidden' : '';

  return (
    <div className="animate-fade-in-up pb-10">

      {/* Action Bar */}
      {/* Premium Action Toolbar */}
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
            onClick={() => {
              const el = document.getElementById('preview-container');
              if (el) {
                navigator.clipboard.writeText(el.innerText);
                alert("¡Texto copiado al portapapeles!");
              }
            }}
            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all font-bold shadow-sm"
            title="Copiar todo el texto"
          >
            <span className="text-lg">📋</span>
            <span className="hidden sm:inline">Copiar</span>
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePrint('all')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 active:scale-95 transition-all font-bold shadow-lg shadow-slate-500/30"
            >
              <Printer className="h-5 w-5" />
              Todo
            </button>
            <button
              onClick={() => handlePrint('planning')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-bold shadow-lg shadow-blue-500/30"
            >
              <PenTool className="h-5 w-5" />
              Sólo Planeación
            </button>
            <button
              onClick={() => handlePrint('anexos')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all font-bold shadow-lg shadow-indigo-500/30"
            >
              <FileDown className="h-5 w-5" />
              Sólo Anexos
            </button>
          </div>

        </div>
      </div>



      {/* Smart Refinement Studio */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-10 no-print shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Sparkles size={120} className="text-blue-600" />
        </div>

        <h3 className="text-blue-900 font-black text-xl mb-3 flex items-center gap-2 relative z-10">
          <div className="bg-blue-100 p-1.5 rounded-lg">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          Estudio de Refinamiento IA
        </h3>

        <p className="text-slate-600 text-sm mb-5 relative z-10 font-medium max-w-2xl">
          ¿Deseas ajustar el resultado? Escribe tu instrucción o usa las <span className="text-blue-700 font-bold">Acciones Rápidas</span> para perfeccionar tu secuencia en un clic.
        </p>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-2 mb-4 relative z-10">
          {["Desarrollar más las actividades", "Simplificar el lenguaje", "Enfocar en evaluación formativa", "Añadir pausa activa divertida"].map((chip) => (
            <button
              key={chip}
              onClick={() => { setRefinementText(chip); }}
              className="text-xs font-bold bg-white text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors shadow-sm"
            >
              ✨ {chip}
            </button>
          ))}
        </div>

        <div className="flex gap-2 relative z-10">
          <input
            type="text"
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
            placeholder="Ej: 'Añade una actividad de cierre más dinámica'..."
            className="flex-1 bg-white border border-blue-200 rounded-xl px-5 py-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-700 font-medium shadow-sm transition-all"
          />
          <button
            onClick={handleRefineSubmit}
            disabled={!refinementText.trim() || isRefining}
            className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-70 disabled:grayscale transform active:scale-95"
          >
            <Send size={18} />
            Refinar
          </button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL - FORMATO GUAIMARAL */}
      <div id="preview-container" className="bg-white shadow-2xl mx-auto max-w-[21.5cm] min-h-[29.7cm] p-[1cm] md:p-[1.5cm] border border-gray-200 text-black print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0">

        {/* --- SECCIÓN PLANEACIÓN --- */}
        <div className={`${planningClass}`}>
          {/* ENCABEZADO INSTITUCIONAL */}
          <div className="flex gap-4 items-center mb-4 border-b-2 border-slate-900 pb-2 print:mb-2 print:pb-1">
            {/* Logo Oficial */}
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/logo_guaimaral.png" alt="Logo I.E. Guaimaral" className="w-full h-full object-contain" />
            </div>

            <div className="flex-grow text-center">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Institución Educativa Guaimaral</h1>
              <div className="mt-2 py-1.5 border-y border-slate-800">
                <h2 className="text-[12px] font-bold uppercase text-slate-700">Proceso: Gestión Académica - Preparación de Clases</h2>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">"Calidad Humana y Excelencia Académica"</p>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE DATOS */}
          <div className="border-2 border-gray-800 mb-4 font-sans print:mb-2">
            <div className="bg-indigo-50 no-print p-2 text-[10px] text-indigo-700 font-bold border-b border-gray-400 flex items-center gap-2">
              <Sparkles size={14} />
              CONSEJO: Puedes editar cualquier texto haciendo clic directamente sobre él. Se guardará para el Word y el PDF.
            </div>
            {/* Fila 1: Título */}
            <div className="flex">
              <div className="w-1/4 p-2 text-[10px] font-bold flex items-center">TÍTULO DE LA SECUENCIA DIDÁCTICA:</div>
              <div className="w-3/4 border-l border-gray-400">
                <EditableContent
                  value={editableData.titulo_secuencia}
                  onSave={(val) => handleUpdateField('titulo_secuencia', val)}
                  className="font-bold text-sm"
                />
              </div>
            </div>
            {/* Fila 2: Área y No. */}
            <div className="flex border-t border-gray-400">
              <div className="flex w-2/3 border-r border-gray-400">
                <div className="w-1/3 p-2 text-[10px] font-bold flex items-center">ÁREA DE CONOCIMIENTO:</div>
                <div className="w-2/3 p-2 text-sm font-medium border-l border-gray-400">{input.area}</div>
              </div>
              <div className="flex w-1/3">
                <div className="w-1/2 p-2 text-[10px] font-bold flex items-center justify-center">SECUENCIA DIDÁCTICA Nº</div>
                <div className="w-1/2 p-2 text-sm font-medium text-center border-l border-gray-400">
                  <EditableContent
                    value={editableData.numero_secuencia || "1"}
                    onSave={(val) => handleUpdateField('numero_secuencia', val)}
                    className="text-center font-bold"
                  />
                </div>
              </div>
            </div>
            {/* Fila 3: Tema */}
            <div className="flex border-t border-gray-400">
              <div className="w-1/6 p-2 text-[10px] font-bold flex items-center">TEMA:</div>
              <div className="w-5/6 p-2 text-sm border-l border-gray-400 font-medium">{input.tema}</div>
            </div>
            {/* Fila 4: Fecha, Grado, Tiempo */}
            <div className="flex border-t border-gray-400">
              <div className="flex w-1/3 border-r border-gray-400">
                <div className="w-1/3 p-2 text-[10px] font-bold">FECHA:</div>
                <div className="w-2/3 p-2 border-l border-gray-400 text-xs">{new Date().toLocaleDateString()}</div>
              </div>
              <div className="flex w-1/3 border-r border-gray-400">
                <div className="w-1/3 p-2 text-[10px] font-bold border-l-0">GRADO:</div>
                <div className="w-2/3 p-2 border-l border-gray-400 text-sm font-bold text-center">{input.grado}</div>
              </div>
              <div className="flex w-1/3">
                <div className="w-1/3 p-2 text-[10px] font-bold border-l-0">TIEMPO:</div>
                <div className="w-2/3 p-2 border-l border-gray-400 text-xs">{input.sesiones} Sesiones</div>
              </div>
            </div>
          </div>

          {/* SECCIONES DEL FORMATO - Estilo Caja Verde */}
          <div className="flex flex-col gap-0.5 print:gap-0">
            {/* Descripción */}
            <div className="border border-gray-400 institutional-section">
              <HeaderBox className="border-0 border-b">DESCRIPCIÓN DE LA SECUENCIA DIDÁCTICA: APRENDIZAJES A LOGRAR</HeaderBox>
              <EditableContent
                value={editableData.descripcion_secuencia}
                onSave={(val) => handleUpdateField('descripcion_secuencia', val)}
                className="min-h-[3rem]"
              />
            </div>
            {/* Objetivo */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">OBJETIVO DE APRENDIZAJE</HeaderBox>
              <EditableContent
                value={editableData.objetivo_aprendizaje}
                onSave={(val) => handleUpdateField('objetivo_aprendizaje', val)}
                className="min-h-[2.5rem]"
              />
            </div>
            {/* Contenidos */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">CONTENIDOS A DESARROLLAR</HeaderBox>
              <div className="p-2 text-[11px]">
                <p className="text-[9px] text-gray-400 mb-1 no-print italic">Usa el Refinamiento IA para ajustar la lista de contenidos.</p>
                <ul className="list-disc list-inside grid grid-cols-2 gap-x-4">
                  {editableData.contenidos.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
            {/* Competencias y Estándar */}
            <div className="mt-2 grid grid-cols-2 gap-1 institutional-section print:mt-1 print:gap-0">
              <div className="border border-gray-400">
                <HeaderBox className="border-0 border-b">COMPETENCIAS DEL MEN</HeaderBox>
                <EditableContent
                  value={editableData.competencias_men}
                  onSave={(val) => handleUpdateField('competencias_men', val)}
                  className="min-h-[6rem]"
                />
              </div>
              <div className="border border-gray-400">
                <HeaderBox className="border-0 border-b">ESTÁNDAR DE COMPETENCIA DEL MEN</HeaderBox>
                <EditableContent
                  value={editableData.estandar}
                  onSave={(val) => handleUpdateField('estandar', val)}
                  className="min-h-[6rem]"
                />
              </div>
            </div>
            {/* DBA */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">DERECHOS BÁSICOS DE APRENDIZAJE (DBA)</HeaderBox>
              <EditableContent
                value={editableData.dba_utilizado || input.dba}
                onSave={(val) => handleUpdateField('dba_utilizado', val)}
                className="min-h-[3rem] font-medium"
              />
            </div>
            {/* CRESE y Corporiedad */}
            <div className="mt-2 border border-gray-400 px-2 py-1 text-[10px] institutional-section print:mt-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-bold">EJE TRANSVERSAL (CRESE):</span>
                <span>{editableData.eje_crese_utilizado || input.ejeCrese || 'Seleccionado por IA'}</span>
                <span className="text-gray-400">|</span>
                <span className="font-bold">CORPORIEDAD / ADI:</span>
                <EditableContent
                  value={editableData.corporiedad_adi}
                  onSave={(val) => handleUpdateField('corporiedad_adi', val)}
                  className="inline-block"
                />
              </div>
            </div>
            {/* Metodología */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">METODOLOGÍA</HeaderBox>
              <EditableContent
                value={editableData.metodologia}
                onSave={(val) => handleUpdateField('metodologia', val)}
                className="min-h-[4rem]"
              />
            </div>
            {/* Recursos */}
            <div className="mt-2 grid grid-cols-2 gap-0 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-r border-gray-400 bg-[#EDF7ED]">NOMBRE DEL RECURSO</HeaderBox>
              <HeaderBox className="border-0 bg-[#EDF7ED]">DESCRIPCIÓN DEL RECURSO</HeaderBox>
            </div>
            <div className="border-l border-r border-b border-gray-400 institutional-section">
              {editableData.recursos.map((rec, i) => (
                <div key={i} className="grid grid-cols-2 border-b border-gray-300 last:border-0 text-[10px]">
                  <EditableContent
                    value={rec.nombre}
                    className="p-1 border-r border-gray-300 font-medium"
                    onSave={(val) => {
                      const newRecs = [...editableData.recursos];
                      newRecs[i].nombre = val;
                      handleUpdateField('recursos', newRecs);
                    }}
                  />
                  <EditableContent
                    value={rec.descripcion}
                    className="p-1"
                    onSave={(val) => {
                      const newRecs = [...editableData.recursos];
                      newRecs[i].descripcion = val;
                      handleUpdateField('recursos', newRecs);
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Evaluación */}
            <div className="mt-2 grid grid-cols-2 gap-0 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-r border-gray-400 bg-[#EDF7ED]">EVALUACIÓN Y PRODUCTOS ASOCIADOS</HeaderBox>
              <HeaderBox className="border-0 bg-[#EDF7ED]">INSTRUMENTOS DE EVALUACIÓN</HeaderBox>
            </div>
            <div className="border-l border-r border-b border-gray-400 grid grid-cols-2 min-h-[5rem] institutional-section">
              <EditableContent
                value={editableData.productos_asociados}
                className="p-2 border-r border-gray-400 whitespace-pre-line"
                onSave={(val) => handleUpdateField('productos_asociados', val)}
              />
              <EditableContent
                value={editableData.instrumentos_evaluacion}
                className="p-2 whitespace-pre-line"
                onSave={(val) => handleUpdateField('instrumentos_evaluacion', val)}
              />
            </div>

            {/* Bibliografía */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">BIBLIOGRAFÍA</HeaderBox>
              <EditableContent
                value={editableData.bibliografia}
                onSave={(val) => handleUpdateField('bibliografia', val)}
                className="min-h-[2.5rem] whitespace-pre-line"
              />
            </div>
            {/* Observaciones */}
            <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
              <HeaderBox className="border-0 border-b">OBSERVACIONES</HeaderBox>
              <EditableContent
                value={editableData.observaciones}
                onSave={(val) => handleUpdateField('observaciones', val)}
                className="min-h-[2.5rem] whitespace-pre-line"
              />
            </div>
            {/* Registro de Seguimiento */}
            <div className="mt-1 border border-gray-400 institutional-section print:mt-0.5">
              <HeaderBox className="border-0 border-b bg-[#f9fafb]">REGISTRO DE SEGUIMIENTO (PARA LLENAR POR EL DOCENTE)</HeaderBox>
              <div className="p-2 min-h-[4rem] text-[10px] text-gray-400 italic">
                Espacio reservado para registrar el avance, dificultades encontradas y ajustes realizados durante la ejecución de la secuencia.
              </div>
            </div>
          </div>

          {/* LISTA DE ASISTENCIA (OPCIONAL/PRINT ONLY) */}
          <div className="mt-4 border-2 border-gray-800 p-2 hidden print:block institutional-section print:mt-2">
            <h3 className="text-[10px] font-bold uppercase mb-2">Control de Asistencia del Día</h3>
            <div className="grid grid-cols-2 gap-x-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex border-b border-gray-300 py-1 text-[9px]">
                  <span className="w-4">{i + 1}.</span>
                  <span className="flex-1">_________________________________________________</span>
                  <span className="w-10">_____</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* --- FIN PLANEACIÓN --- */}

        {/* --- SECCIÓN ANEXOS --- */}
        <div className={`${anexosClass}`}>

          {/* PIAR (ANEXO) */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-300">
            <div className="mt-2 text-black border border-gray-400 print:mt-1">
              <HeaderBox className="border-0 border-b">ADECUACIONES CURRICULARES (PIAR - Inclusión)</HeaderBox>
              <EditableContent
                value={editableData.adecuaciones_piar || "No se generaron adecuaciones específicas."}
                onSave={(val) => handleUpdateField('adecuaciones_piar', val)}
                className="min-h-[3rem] whitespace-pre-line bg-blue-50/10"
              />
            </div>
          </div>

          {/* DETALLE DE SESIONES (ANEXO) */}
          <div className="mt-6 pt-2 border-t-2 border-dashed border-gray-300 font-sans print:mt-4 print:pt-1">
            <h3 className="text-center font-bold text-gray-400 uppercase text-[10px] mb-4">- ANEXO 1: DESGLOSE DE SESIONES -</h3>
            <div className="grid gap-2 print:gap-1">
              {editableData.actividades.map((act, idx) => (
                <div key={idx} className="border border-gray-300 rounded p-3 bg-gray-50 break-inside-avoid shadow-sm group activity-block">
                  <div className="font-bold text-sm mb-1 text-black flex justify-between">
                    <span>Sesión {act.sesion} ({act.tiempo})</span>
                  </div>

                  <EditableContent
                    value={act.descripcion}
                    className="mb-3 whitespace-pre-line leading-relaxed text-gray-800"
                    onSave={(val) => {
                      const newActs = [...editableData.actividades];
                      newActs[idx].descripcion = val;
                      handleUpdateField('actividades', newActs);
                    }}
                  />

                  {act.imprimibles && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800 flex flex-col gap-1 items-start">
                      <span className="font-bold">📄 Material Imprimible:</span>
                      <EditableContent
                        value={act.imprimibles}
                        className="italic w-full border-0 p-0 text-[10px]"
                        onSave={(val) => {
                          const newActs = [...editableData.actividades];
                          newActs[idx].imprimibles = val;
                          handleUpdateField('actividades', newActs);
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 text-[10px] text-gray-600 bg-white p-1 rounded border border-gray-100 italic">
                    <span className="font-bold text-gray-800">Materiales:</span>
                    {act.materiales.join(', ')}
                  </div>

                  {act.adi_especifico && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800 flex flex-col gap-1 items-start">
                      <span className="font-bold flex items-center gap-1">🧘 Momento ADI (Corporiedad):</span>
                      <EditableContent
                        value={act.adi_especifico}
                        className="w-full border-0 p-0 text-[10px]"
                        onSave={(val) => {
                          const newActs = [...editableData.actividades];
                          newActs[idx].adi_especifico = val;
                          handleUpdateField('actividades', newActs);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RÚBRICA Y EVALUACIÓN (ANEXO) */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-300">
            <h3 className="text-center font-bold text-gray-400 uppercase text-[10px] mb-4">- ANEXO 2: RÚBRICA Y EVALUACIÓN -</h3>

            <div className="mb-6 print:mb-2">
              <h4 className="font-bold text-xs mb-2 text-gray-800">Rúbrica de Desempeño</h4>
              <div className="overflow-hidden border border-gray-300 rounded-lg shadow-sm institutional-section">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800">
                      <th className="p-2 text-left w-1/4 border-b border-gray-300">Criterio</th>
                      <th className="p-2 text-center w-1/4 border-b border-l border-gray-300">Básico</th>
                      <th className="p-2 text-center w-1/4 border-b border-l border-gray-300">Satisfactorio</th>
                      <th className="p-2 text-center w-1/4 border-b border-l border-gray-300">Avanzado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableData.rubrica.map((rub, i) => (
                      <tr key={i} className="bg-white">
                        <td className="font-bold text-gray-900 border-b border-gray-300">
                          <EditableContent
                            value={rub.criterio}
                            onSave={(val) => {
                              const newRub = [...editableData.rubrica];
                              newRub[i].criterio = val;
                              handleUpdateField('rubrica', newRub);
                            }}
                          />
                        </td>
                        <td className="text-center text-gray-600 border-b border-l border-gray-300">
                          <EditableContent
                            value={rub.basico}
                            onSave={(val) => {
                              const newRub = [...editableData.rubrica];
                              newRub[i].basico = val;
                              handleUpdateField('rubrica', newRub);
                            }}
                          />
                        </td>
                        <td className="text-center text-gray-600 border-b border-l border-gray-300">
                          <EditableContent
                            value={rub.satisfactorio}
                            onSave={(val) => {
                              const newRub = [...editableData.rubrica];
                              newRub[i].satisfactorio = val;
                              handleUpdateField('rubrica', newRub);
                            }}
                          />
                        </td>
                        <td className="text-center text-gray-600 border-b border-l border-gray-300">
                          <EditableContent
                            value={rub.avanzado}
                            onSave={(val) => {
                              const newRub = [...editableData.rubrica];
                              newRub[i].avanzado = val;
                              handleUpdateField('rubrica', newRub);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print:mt-1">
              <h4 className="font-bold text-xs mb-2 text-gray-800">Banco de Preguntas (Evaluación por Competencias)</h4>
              <div className="grid grid-cols-1 gap-2 print:gap-1">
                {editableData.evaluacion.map((ev, i) => (
                  <div key={i} className="border border-gray-300 p-3 rounded bg-gray-50 break-inside-avoid shadow-sm group evaluation-card">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-blue-700 mr-2">P{i + 1}.</span>
                        <EditableContent
                          value={ev.pregunta}
                          className="font-bold text-gray-900 border-0 p-0 inline text-[11px]"
                          onSave={(val) => {
                            const newEv = [...editableData.evaluacion];
                            newEv[i].pregunta = val;
                            handleUpdateField('evaluacion', newEv);
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase border border-gray-300 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap bg-gray-100">{ev.tipo}</span>
                    </div>

                    {/* Opciones A, B, C, D */}
                    {ev.opciones && ev.opciones.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 ml-4">
                        {ev.opciones.map((opt, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[10px] text-gray-700">
                            <span className="font-bold text-blue-600">{String.fromCharCode(65 + idx)}.</span>
                            <EditableContent
                              value={opt}
                              className="border-0 p-0"
                              onSave={(val) => {
                                const newEv = [...editableData.evaluacion];
                                if (newEv[i].opciones) {
                                  newEv[i].opciones![idx] = val;
                                  handleUpdateField('evaluacion', newEv);
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Clave de Respuestas (Solo para el Docente) */}
              <div className="mt-6 p-4 bg-slate-900 text-white rounded-xl no-print">
                <h5 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Lock size={12} className="text-blue-400" /> Clave de Respuestas (Teacher Only)
                </h5>
                <div className="grid grid-cols-5 gap-2">
                  {editableData.evaluacion.map((ev, i) => (
                    <div key={i} className="flex gap-2 text-[10px]">
                      <span className="text-slate-500">{i + 1}.</span>
                      <span className="font-bold text-blue-400">{ev.respuesta_correcta || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* --- FIN ANEXOS --- */}

        {/* --- SECCIÓN TALLER IMPRIMIBLE --- */}
        <div className={`mt-8 pt-4 border-t-4 border-double border-gray-400 ${anexosClass} print:mt-4 print:pt-2`}>
          <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4 print:mb-2 print:pb-2">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                <img src="/logo_guaimaral.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-black text-xl uppercase leading-none text-slate-800">Taller de Aplicación</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Guía de Aprendizaje Institucional</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-gray-600">
              <p>Nombre: _________________________________________________</p>
              <p className="mt-2">Grado: {input.grado} | Fecha: ___________________</p>
            </div>
          </div>

          <div className="space-y-4 print:space-y-2">
            <div>
              <h4 className="font-bold text-sm text-gray-800 border-b border-gray-200 pb-1 mb-2">Introducción</h4>
              <EditableContent
                value={editableData.taller_imprimible.introduccion}
                onSave={(val) => handleUpdateField('taller_imprimible.introduccion', val)}
                className="text-xs italic text-gray-600 leading-relaxed"
              />
            </div>

            <div>
              <h4 className="font-bold text-sm text-gray-800 border-b border-gray-200 pb-1 mb-2">Instrucciones</h4>
              <EditableContent
                value={editableData.taller_imprimible.instrucciones}
                onSave={(val) => handleUpdateField('taller_imprimible.instrucciones', val)}
                className="text-xs text-gray-700 font-medium"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-800 border-b border-gray-200 pb-1 mb-2">Actividades a Desarrollar</h4>
              {editableData.taller_imprimible.ejercicios.map((ej, i) => (
                <div key={i} className="pl-2 border-l-2 border-gray-100 pb-2">
                  <div className="flex gap-3">
                    <span className="font-bold text-gray-400 text-xs">{i + 1}.</span>
                    <EditableContent
                      value={ej}
                      onSave={(val) => {
                        const newEjs = [...editableData.taller_imprimible.ejercicios];
                        newEjs[i] = val;
                        handleUpdateField('taller_imprimible.ejercicios', newEjs);
                      }}
                      className="text-xs text-gray-800 leading-relaxed"
                    />
                  </div>
                  <div className="mt-4 border-b border-dashed border-gray-200 h-12 w-full"></div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <PenTool size={16} /> Reto Creativo
              </h4>
              <EditableContent
                value={editableData.taller_imprimible.reto_creativo}
                onSave={(val) => handleUpdateField('taller_imprimible.reto_creativo', val)}
                className="text-xs text-slate-700 italic"
              />
            </div>
          </div>

          <p className="mt-12 text-center text-[9px] text-gray-400 uppercase tracking-widest italic no-print print:mt-4">
            "Educar es dar al cuerpo y al alma toda la belleza y perfección de que son capaces"
          </p>
        </div>
        {/* --- FIN TALLER --- */}

      </div>
    </div>
  );
};