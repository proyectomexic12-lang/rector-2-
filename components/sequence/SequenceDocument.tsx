import React, { useState } from 'react';
import { DidacticSequence, SequenceInput } from '../../types';
import { Sparkles, PenTool, Lock, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { generateExtendedIcfesExam, buildGradeAwareVideoQuery, resolveResourceAction } from '../../services/geminiService';

interface SequenceDocumentProps {
  editableData: DidacticSequence;
  input: SequenceInput;
  handleUpdateField: (path: string, value: any) => void;
  printMode: 'all' | 'planning' | 'anexos';
  activeView?: 'docente' | 'estudiante';
  setActiveView?: (view: 'docente' | 'estudiante') => void;
}

export const SequenceDocument: React.FC<SequenceDocumentProps> = ({
  editableData,
  input,
  handleUpdateField,
  printMode,
  activeView: propActiveView,
  setActiveView: propSetActiveView
}) => {
  const [internalActiveView, setInternalActiveView] = useState<'docente' | 'estudiante'>('docente');
  const activeView = propActiveView || internalActiveView;
  const setActiveView = propSetActiveView || setInternalActiveView;
  const [isGeneratingIcfes, setIsGeneratingIcfes] = useState(false);
  const [icfesError, setIcfesError] = useState('');

  const handleGenerateIcfes = async () => {
    try {
      setIsGeneratingIcfes(true);
      setIcfesError('');
      const newEvaluacion = await generateExtendedIcfesExam(editableData, input);
      handleUpdateField('evaluacion', newEvaluacion);
    } catch (err: any) {
      setIcfesError(err.message || 'Error al generar examen ICFES');
    } finally {
      setIsGeneratingIcfes(false);
    }
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
  }: {
    value: string,
    onSave: (val: string) => void,
    className?: string,
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
    <div className="w-full">
      {/* Split-View Tabs */}
      <div className="flex justify-center gap-4 mb-6 no-print">
        <button
          onClick={() => setActiveView('docente')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
            activeView === 'docente' 
            ? 'bg-slate-800 text-white shadow-md transform scale-105' 
            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={18} />
          Vista Docente (Planeación)
        </button>
        <button
          onClick={() => setActiveView('estudiante')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
            activeView === 'estudiante' 
            ? 'bg-blue-600 text-white shadow-md transform scale-105' 
            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <GraduationCap size={18} />
          Vista Estudiante (Taller)
        </button>
      </div>

      <div id="preview-container" className="bg-white shadow-2xl mx-auto max-w-[21.5cm] min-h-[29.7cm] p-[1cm] md:p-[1.5cm] border border-gray-200 text-black print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0">

      {/* --- SECCIÓN PLANEACIÓN (SOLO DOCENTE) --- */}
      <div className={`${planningClass} ${activeView === 'estudiante' ? 'hidden print:block' : ''}`}>
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="flex gap-4 items-center mb-4 border-b-2 border-slate-900 pb-2 print:mb-2 print:pb-1">
          <div className="w-20 h-20 flex items-center justify-center shrink-0">
            <img src="/logo_guaimaral.png" alt="Logo I.E. Guaimaral" className="institutional-logo w-20 h-20 object-contain" style={{ maxWidth: '80px', maxHeight: '80px' }} />
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
          <div className="border border-gray-400 institutional-section">
            <HeaderBox className="border-0 border-b">DESCRIPCIÓN DE LA SECUENCIA DIDÁCTICA: APRENDIZAJES A LOGRAR</HeaderBox>
            <EditableContent
              value={editableData.descripcion_secuencia}
              onSave={(val) => handleUpdateField('descripcion_secuencia', val)}
              className="min-h-[3rem]"
            />
          </div>
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">OBJETIVO DE APRENDIZAJE</HeaderBox>
            <EditableContent
              value={editableData.objetivo_aprendizaje}
              onSave={(val) => handleUpdateField('objetivo_aprendizaje', val)}
              className="min-h-[2.5rem]"
            />
          </div>
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">CONTENIDOS A DESARROLLAR</HeaderBox>
            <div className="p-2 text-[11px]">
              <p className="text-[9px] text-gray-400 mb-1 no-print italic">Usa el Refinamiento IA para ajustar la lista de contenidos.</p>
              <ul className="list-disc list-inside grid grid-cols-2 gap-x-4">
                {(editableData.contenidos || []).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
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
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">
              DERECHOS BÁSICOS DE APRENDIZAJE / ORIENTACIONES PEDAGÓGICAS
            </HeaderBox>
            <EditableContent
              value={editableData.dba_utilizado || input.dba}
              onSave={(val) => handleUpdateField('dba_utilizado', val)}
              className="min-h-[3rem] font-medium"
            />
          </div>
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
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">METODOLOGÍA</HeaderBox>
            <EditableContent
              value={editableData.metodologia}
              onSave={(val) => handleUpdateField('metodologia', val)}
              className="min-h-[4rem]"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-0 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-r border-gray-400 bg-[#EDF7ED]">NOMBRE DEL RECURSO</HeaderBox>
            <HeaderBox className="border-0 bg-[#EDF7ED]">DESCRIPCIÓN DEL RECURSO</HeaderBox>
          </div>
          <div className="border-l border-r border-b border-gray-400 institutional-section">
            {(editableData.recursos || []).map((rec, i) => {
              const nombreText = (rec?.nombre || "").toString();
              const descText = (rec?.descripcion || "").toString();
              const cleanDesc = descText
                .replace(/\s*\(Ver en YouTube:\s*https?:\/\/[^\)]+\)/gi, "")
                .replace(/\s*\(Ver sección taller_imprimible\)/gi, "")
                .replace(/\s*\(Ver en taller_imprimible\)/gi, "")
                .trim();

              const action = resolveResourceAction(
                nombreText, 
                descText, 
                editableData.tema_principal || input.tema || '', 
                input.grado || ''
              );

              return (
                <div key={i} className="grid grid-cols-2 border-b border-gray-300 last:border-0 text-[10px]">
                  <div className="p-1.5 border-r border-gray-300 font-medium flex flex-col justify-between">
                    <EditableContent
                      value={rec.nombre}
                      onSave={(val) => {
                        const newRecs = [...editableData.recursos];
                        newRecs[i].nombre = val;
                        handleUpdateField('recursos', newRecs);
                      }}
                    />
                    {action.isVideo && action.url && (
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm hover:scale-[1.02] active:scale-95 print:hidden w-fit"
                        title="Abrir video explicativo en YouTube en nueva pestaña"
                      >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span>▶ Ver en YouTube ↗</span>
                      </a>
                    )}
                  </div>
                  <div className="p-1.5 flex flex-col justify-center items-start">
                    <EditableContent
                      value={cleanDesc || rec.descripcion}
                      className="w-full"
                      onSave={(val) => {
                        const newRecs = [...editableData.recursos];
                        newRecs[i].descripcion = val;
                        handleUpdateField('recursos', newRecs);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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

          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">BIBLIOGRAFÍA</HeaderBox>
            <EditableContent
              value={editableData.bibliografia}
              onSave={(val) => handleUpdateField('bibliografia', val)}
              className="min-h-[2.5rem] whitespace-pre-line"
            />
          </div>
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1">
            <HeaderBox className="border-0 border-b">OBSERVACIONES</HeaderBox>
            <EditableContent
              value={editableData.observaciones}
              onSave={(val) => handleUpdateField('observaciones', val)}
              className="min-h-[2.5rem] whitespace-pre-line"
            />
          </div>
          <div className="mt-2 border border-gray-400 institutional-section print:mt-1 bg-blue-50/20">
            <HeaderBox className="border-0 border-b bg-[#EDF7ED] text-emerald-950 font-bold">ADECUACIONES CURRICULARES (DUA / PIAR - INCLUSIÓN EDUCATIVA)</HeaderBox>
            <EditableContent
              value={editableData.adecuaciones_piar || "1. Apoyos Visuales y Gráficos: Esquemas conceptuales y guías paso a paso.\n2. Flexibilización de Tiempos: Tiempo adicional adaptado para lectura y procesamiento de tareas.\n3. Trabajo por Pares y Tutoría: Acompañamiento guiado en mesa de trabajo según el Plan Individual de Ajustes Razonables (PIAR)."}
              onSave={(val) => handleUpdateField('adecuaciones_piar', val)}
              className="min-h-[3rem] whitespace-pre-line p-2 text-[11px]"
            />
          </div>
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

        {/* GLOSARIO Y AULA INVERTIDA */}
        {(editableData.glosario || editableData.aula_invertida) && (
          <div className="mt-4 grid grid-cols-1 gap-4 print:mt-2">
            {editableData.glosario && editableData.glosario.length > 0 && (
              <div className="border border-gray-400 p-3 bg-white institutional-section">
                <HeaderBox className="border-0 border-b -mx-3 -mt-3 mb-2 px-3 py-1">GLOSARIO DE TÉRMINOS CLAVE</HeaderBox>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  {editableData.glosario.map((g, idx) => (
                    <div key={idx} className="flex flex-col border border-gray-200 p-1.5 rounded bg-gray-50">
                      <EditableContent
                        value={g.termino}
                        className="font-bold text-blue-900 border-0 p-0 mb-0.5"
                        onSave={(val) => {
                          const newGlossary = [...editableData.glosario!];
                          newGlossary[idx].termino = val;
                          handleUpdateField('glosario', newGlossary);
                        }}
                      />
                      <EditableContent
                        value={g.definicion}
                        className="italic text-gray-700 border-0 p-0"
                        onSave={(val) => {
                          const newGlossary = [...editableData.glosario!];
                          newGlossary[idx].definicion = val;
                          handleUpdateField('glosario', newGlossary);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {editableData.aula_invertida && (
              <div className="border border-gray-400 p-3 bg-purple-50 institutional-section">
                <HeaderBox className="border-0 border-b -mx-3 -mt-3 mb-2 px-3 py-1 bg-purple-100 text-purple-900">AULA INVERTIDA (FLIPPED CLASSROOM)</HeaderBox>
                <EditableContent
                  value={editableData.aula_invertida}
                  className="whitespace-pre-line text-[11px] text-purple-900"
                  onSave={(val) => handleUpdateField('aula_invertida', val)}
                />
              </div>
            )}
          </div>
        )}

        {/* DETALLE DE SESIONES (ANEXO) */}
        <div className={`mt-6 pt-2 border-t-2 border-dashed border-gray-300 font-sans print:mt-4 print:pt-1 ${activeView === 'estudiante' ? 'hidden print:block' : ''}`}>
          <h3 className="text-center font-bold text-gray-400 uppercase text-[10px] mb-4">- ANEXO 1: DESGLOSE DE SESIONES -</h3>
          <div className="grid gap-2 print:gap-1">
            {(editableData.actividades || []).map((act, idx) => (
              <div key={idx} className="border border-gray-300 rounded p-3 bg-gray-50 break-inside-avoid shadow-sm group activity-block">
                <div className="font-bold text-sm mb-1 text-black flex justify-between">
                  <span>Sesión {act.sesion} ({act.tiempo})</span>
                </div>

                {act.fase_inicio || act.fase_desarrollo || act.fase_cierre ? (
                  <div className="mb-3 flex flex-col gap-3">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-bold text-[11px] text-blue-800 uppercase tracking-wider mb-1 block">Fase de Inicio (Exploración)</span>
                      <EditableContent
                        value={act.fase_inicio || ''}
                        className="whitespace-pre-line leading-relaxed text-gray-800"
                        onSave={(val) => {
                          const newActs = [...editableData.actividades];
                          newActs[idx].fase_inicio = val;
                          handleUpdateField('actividades', newActs);
                        }}
                      />
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-bold text-[11px] text-green-800 uppercase tracking-wider mb-1 block">Fase de Desarrollo (Estructuración)</span>
                      <EditableContent
                        value={act.fase_desarrollo || ''}
                        className="whitespace-pre-line leading-relaxed text-gray-800"
                        onSave={(val) => {
                          const newActs = [...editableData.actividades];
                          newActs[idx].fase_desarrollo = val;
                          handleUpdateField('actividades', newActs);
                        }}
                      />
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-bold text-[11px] text-purple-800 uppercase tracking-wider mb-1 block">Fase de Cierre (Transferencia)</span>
                      <EditableContent
                        value={act.fase_cierre || ''}
                        className="whitespace-pre-line leading-relaxed text-gray-800"
                        onSave={(val) => {
                          const newActs = [...editableData.actividades];
                          newActs[idx].fase_cierre = val;
                          handleUpdateField('actividades', newActs);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <EditableContent
                    value={act.descripcion || ''}
                    className="mb-3 whitespace-pre-line leading-relaxed text-gray-800"
                    onSave={(val) => {
                      const newActs = [...editableData.actividades];
                      newActs[idx].descripcion = val;
                      handleUpdateField('actividades', newActs);
                    }}
                  />
                )}

                {act.preguntas_socraticas && act.preguntas_socraticas.length > 0 && (
                  <div className="mb-3 bg-orange-50 p-2 rounded border border-orange-200">
                    <span className="font-bold text-[11px] text-orange-800 uppercase tracking-wider mb-1 block">🤔 Preguntas Socráticas (Guía para el Docente)</span>
                    <ul className="list-disc pl-4 text-[11px] text-orange-900 leading-relaxed">
                      {(act.preguntas_socraticas || []).map((q, qidx) => (
                        <li key={qidx}>
                          <EditableContent
                            value={q}
                            className="w-full border-0 p-0"
                            onSave={(val) => {
                              const newActs = [...editableData.actividades];
                              if (newActs[idx].preguntas_socraticas) {
                                newActs[idx].preguntas_socraticas![qidx] = val;
                                handleUpdateField('actividades', newActs);
                              }
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                  {Array.isArray(act.materiales) ? act.materiales.join(', ') : (act.materiales || 'Materiales pedagógicos del aula')}
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
        <div className={`mt-8 pt-4 border-t-2 border-dashed border-gray-300 print:break-before-page ${activeView === 'estudiante' ? 'hidden print:block' : ''}`}>
          <h3 className="text-center font-bold text-gray-400 uppercase text-[10px] mb-4">- ANEXO 2: RÚBRICA Y EVALUACIÓN -</h3>

          <div className="mb-6 print:mb-2">
            <h4 className="font-bold text-xs mb-2 text-gray-800">Rúbrica de Desempeño</h4>
            <div className="overflow-hidden border border-gray-300 rounded-lg shadow-sm institutional-section">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    <th className="p-2 text-left w-1/5 border-b border-gray-300">Criterio</th>
                    <th className="p-2 text-center w-1/5 border-b border-l border-gray-300">Bajo</th>
                    <th className="p-2 text-center w-1/5 border-b border-l border-gray-300">Básico</th>
                    <th className="p-2 text-center w-1/5 border-b border-l border-gray-300">Alto</th>
                    <th className="p-2 text-center w-1/5 border-b border-l border-gray-300">Superior</th>
                  </tr>
                </thead>
                <tbody>
                  {(editableData.rubrica || []).map((rub, i) => (
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
                          value={rub.bajo || (rub.criterio ? `Demuestra dificultades iniciales para ${rub.criterio.toLowerCase()} y requiere apoyo pedagógico.` : 'Demuestra dificultades significativas en el criterio y requiere refuerzo.')}
                          onSave={(val) => {
                            const newRub = [...editableData.rubrica];
                            newRub[i].bajo = val;
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
                          value={rub.alto || rub.satisfactorio || ''}
                          onSave={(val) => {
                            const newRub = [...editableData.rubrica];
                            newRub[i].alto = val;
                            handleUpdateField('rubrica', newRub);
                          }}
                        />
                      </td>
                      <td className="text-center text-gray-600 border-b border-l border-gray-300">
                        <EditableContent
                          value={rub.superior || rub.avanzado || ''}
                          onSave={(val) => {
                            const newRub = [...editableData.rubrica];
                            newRub[i].superior = val;
                            handleUpdateField('rubrica', newRub);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Banco de Preguntas (Para el estudiante sí se muestra, pero sin clave) */}
          </div>
          
          <div className="print:mt-1 print:break-before-page">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-xs text-gray-800">Banco de Preguntas (Evaluación por Competencias)</h4>
              
              <button 
                onClick={handleGenerateIcfes}
                disabled={isGeneratingIcfes || (editableData.evaluacion?.length || 0) >= 10}
                className={`no-print flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded shadow-sm transition-all
                  ${(isGeneratingIcfes || (editableData.evaluacion?.length || 0) >= 10) 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                  }`}
              >
                {isGeneratingIcfes ? (
                  <><Loader2 size={12} className="animate-spin" /> Diseñando...</>
                ) : (editableData.evaluacion?.length || 0) >= 10 ? (
                  <><Sparkles size={12} /> Examen Completo</>
                ) : (
                  <><Sparkles size={12} /> Generar Examen ICFES (10 Preguntas)</>
                )}
              </button>
            </div>
            
            {icfesError && (
              <div className="mb-2 text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {icfesError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 print:gap-1">
              {(editableData.evaluacion || []).map((ev, i) => (
                <div key={i} className="border border-gray-300 p-3 rounded bg-gray-50 break-inside-avoid shadow-sm group evaluation-card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-blue-700 mr-2">P{i + 1}.</span>
                      <EditableContent
                        value={ev.pregunta}
                        className="font-bold text-gray-900 border-0 p-0 inline text-[11px]"
                        onSave={(val) => {
                          const newEv = [...(editableData.evaluacion || [])];
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

                  {/* Justificación ICFES (Solo para el docente) */}
                  {ev.justificacion && activeView !== 'estudiante' && (
                    <div className="mt-2 ml-4 text-[9px] bg-blue-50 border border-blue-200 p-2 rounded text-blue-900">
                      <span className="font-bold block mb-1">🧠 Justificación Pedagógica:</span>
                      <EditableContent
                        value={ev.justificacion}
                        className="border-0 p-0"
                        onSave={(val) => {
                          const newEv = [...editableData.evaluacion];
                          newEv[i].justificacion = val;
                          handleUpdateField('evaluacion', newEv);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Clave de Respuestas (Solo para el Docente) */}
            <div className={`mt-6 p-4 bg-slate-900 text-white rounded-xl no-print ${activeView === 'estudiante' ? 'hidden' : ''}`}>
              <h5 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Lock size={12} className="text-blue-400" /> Clave de Respuestas (Teacher Only)
              </h5>
              <div className="grid grid-cols-5 gap-2">
                {(editableData.evaluacion || []).map((ev, i) => (
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

      {/* --- SECCIÓN TALLER IMPRIMIBLE (AMBOS, PERO ESTUDIANTE LO VE PRIMERO EN SU VISTA) --- */}
      <div className={`mt-8 pt-4 border-t-4 border-double border-slate-800 ${anexosClass} print:mt-4 print:pt-2 print:break-before-page`}>
        {/* ENCABEZADO OFICIAL DE FOTOCOPIA */}
        <div className="border-2 border-slate-900 mb-4 p-3 bg-slate-50/50">
          <div className="flex gap-4 items-center border-b border-slate-400 pb-2 mb-2">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src="/logo_guaimaral.png" alt="Logo" className="institutional-logo w-14 h-14 object-contain" style={{ maxWidth: '56px', maxHeight: '56px' }} />
            </div>
            <div className="flex-grow">
              <h3 className="font-black text-base uppercase leading-none text-slate-900">INSTITUCIÓN EDUCATIVA GUAIMARAL</h3>
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider mt-1">Guía & Taller de Aprendizaje Autónomo • {input.area}</p>
            </div>
            <div className="text-right border-l border-slate-400 pl-3 text-[9px] font-bold text-slate-600">
              <p className="uppercase">Código: FORM-GA-04</p>
              <p className="uppercase mt-0.5">Versión: 3.0</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-800 font-bold">
            <div>Estudiante: <span className="font-normal border-b border-slate-400 inline-block w-3/4">___________________________________________</span></div>
            <div>Grado: <span className="font-black text-blue-900">{input.grado}</span> | Fecha: <span className="font-normal border-b border-slate-400 inline-block w-1/2">___________________</span></div>
          </div>
        </div>

        <div className="space-y-4 print:space-y-3">
          {/* I. INTRODUCCIÓN E INSTRUCCIONES */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-1.5">
              <span>📌</span> I. Marco General & Objetivos
            </h4>
            <EditableContent
              value={editableData.taller_imprimible.introduccion}
              onSave={(val) => handleUpdateField('taller_imprimible.introduccion', val)}
              className="text-xs text-slate-700 leading-relaxed mb-2"
            />
            <div className="text-[10px] font-bold text-slate-600 bg-white p-2 rounded border border-slate-200">
              <span className="font-black text-slate-800">Instrucciones: </span>
              <EditableContent
                value={editableData.taller_imprimible.instrucciones}
                onSave={(val) => handleUpdateField('taller_imprimible.instrucciones', val)}
                className="inline border-0 p-0 text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* II. BITÁCORA / TEST INICIAL (LÍNEA BASE) */}
          {editableData.taller_imprimible.bitacora_test_inicial && (
            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-300">
              <h4 className="font-black text-xs uppercase tracking-wider text-amber-950 mb-1 flex items-center gap-1.5">
                <PenTool size={14} className="text-amber-700" /> II. Bitácora de Saberes Previos (Test Inicial)
              </h4>
              <EditableContent
                value={editableData.taller_imprimible.bitacora_test_inicial}
                onSave={(val) => handleUpdateField('taller_imprimible.bitacora_test_inicial', val)}
                className="text-xs text-slate-800 font-medium leading-relaxed"
              />
              <div className="mt-3 border-b border-dashed border-slate-400 h-6 w-full"></div>
              <div className="mt-2 border-b border-dashed border-slate-400 h-6 w-full"></div>
            </div>
          )}

          {/* III. ACTIVIDADES A DESARROLLAR (FOTOCOPIA) */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">
              III. Guía de Trabajo & Ejercicios Prácticos
            </h4>
            {(editableData.taller_imprimible?.ejercicios || []).map((ej, i) => (
              <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <div className="flex gap-2">
                  <span className="font-black text-blue-700 text-xs">{i + 1}.</span>
                  <EditableContent
                    value={ej}
                    onSave={(val) => {
                      const newEjs = [...(editableData.taller_imprimible?.ejercicios || [])];
                      newEjs[i] = val;
                      handleUpdateField('taller_imprimible.ejercicios', newEjs);
                    }}
                    className="text-xs text-slate-800 font-bold leading-relaxed flex-grow"
                  />
                </div>
                <div className="mt-3 border-b border-dashed border-slate-300 h-8 w-full"></div>
                <div className="mt-2 border-b border-dashed border-slate-300 h-8 w-full"></div>
              </div>
            ))}
          </div>

          {/* IV. RETO CREATIVO (HOTS) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
            <h4 className="font-black text-xs uppercase tracking-wider text-blue-950 mb-1 flex items-center gap-1.5">
              <span>🚀</span> IV. Reto Creativo de Aplicación & Pensamiento Crítico
            </h4>
            <EditableContent
              value={editableData.taller_imprimible?.reto_creativo || ''}
              onSave={(val) => handleUpdateField('taller_imprimible.reto_creativo', val)}
              className="text-xs text-slate-800 italic leading-relaxed"
            />
            <div className="mt-3 border-b border-dashed border-blue-300 h-10 w-full"></div>
          </div>

          {/* V. MATRIZ DE AUTOEVALUACIÓN DEL ESTUDIANTE */}
          <div className="mt-4 border border-slate-300 rounded-lg p-3 bg-slate-50/50">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-800 mb-2">
              V. Matriz de Autoevaluación del Estudiante
            </h4>
            <table className="w-full text-[9px] border border-slate-300 bg-white">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase">
                <tr className="border-b border-slate-300">
                  <th className="p-1.5 text-left">Criterio de Evaluación</th>
                  <th className="p-1.5 text-center w-16">Logrado</th>
                  <th className="p-1.5 text-center w-16">En Proceso</th>
                  <th className="p-1.5 text-center w-16">Apoyo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                <tr>
                  <td className="p-1.5">1. Comprendí el tema principal y las instrucciones requeridas.</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                </tr>
                <tr>
                  <td className="p-1.5">2. Desarrollé los ejercicios prácticos con esfuerzo y dedicación.</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                </tr>
                <tr>
                  <td className="p-1.5">3. Demostré creatividad y pensamiento crítico en el reto de aprendizaje.</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                  <td className="p-1.5 text-center border-l border-slate-200">[  ]</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest italic no-print print:mt-4">
          "Calidad humana y excelencia académica para la vida — I.E. Guaimaral 2026"
        </p>
      </div>
      {/* --- FIN TALLER --- */}

    </div>
    </div>
  );
};
