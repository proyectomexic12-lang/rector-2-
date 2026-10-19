import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, AlertCircle, RefreshCw, Sparkles, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { DidacticSequence, SequenceInput } from '../../types';
import { authService } from '../../services/authService';
import { apiSyncService, RevisionMetadata } from '../../services/apiSyncService';


interface EnviarRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  secuencia: DidacticSequence;
  input?: SequenceInput;
  onSuccess?: (mensaje: string) => void;
}

interface WeekOption {
  numero: number;
  label: string;
  es_actual: boolean;
  es_institucional: boolean;
  fecha_lunes: string;
}

const DEFAULT_AREAS = [
  'Matemáticas',
  'Humanidades y Lengua Castellana',
  'Idioma Extranjero (Inglés)',
  'Ciencias Naturales y Ed. Ambiental',
  'Física',
  'Química',
  'Biología',
  'Ciencias Sociales, Historia y Geografía',
  'Constitución Política y Cátedra de la Paz',
  'Educación Artística y Cultural',
  'Educación Física, Recreación y Deportes',
  'Educación Ética y en Valores Humanos',
  'Educación Religiosa',
  'Tecnología e Informática',
  'Filosofía',
  'Ciencias Económicas y Políticas',
  'Cátedra de Estudios Afrocolombianos',
  'Lectura Crítica'
];

const DEFAULT_GRADES = [
  { value: 'Prejardín', label: 'Prejardín' },
  { value: 'Jardín', label: 'Jardín' },
  { value: 'Transición', label: 'Transición' },
  { value: '1°', label: '1° Primaria' },
  { value: '2°', label: '2° Primaria' },
  { value: '3°', label: '3° Primaria' },
  { value: '4°', label: '4° Primaria' },
  { value: '5°', label: '5° Primaria' },
  { value: '6°', label: '6° Secundaria' },
  { value: '7°', label: '7° Secundaria' },
  { value: '8°', label: '8° Secundaria' },
  { value: '9°', label: '9° Secundaria' },
  { value: '10°', label: '10° Media Technical' },
  { value: '11°', label: '11° Media Technical' }
];

function mapToSigepGrade(gStr?: string): string {
  if (!gStr) return '';
  const clean = gStr.toLowerCase().trim();
  if (clean.includes('prejard')) return 'Prejardín';
  if (clean.includes('jard')) return 'Jardín';
  if (clean.includes('transic')) return 'Transición';
  if (clean.includes('primero') || clean === '1' || clean.includes('1°')) return '1°';
  if (clean.includes('segundo') || clean === '2' || clean.includes('2°')) return '2°';
  if (clean.includes('tercero') || clean === '3' || clean.includes('3°')) return '3°';
  if (clean.includes('cuarto') || clean === '4' || clean.includes('4°')) return '4°';
  if (clean.includes('quinto') || clean === '5' || clean.includes('5°')) return '5°';
  if (clean.includes('sexto') || clean === '6' || clean.includes('6°')) return '6°';
  if (clean.includes('septimo') || clean.includes('séptimo') || clean === '7' || clean.includes('7°')) return '7°';
  if (clean.includes('octavo') || clean === '8' || clean.includes('8°')) return '8°';
  if (clean.includes('noveno') || clean === '9' || clean.includes('9°')) return '9°';
  if (clean.includes('decimo') || clean.includes('décimo') || clean === '10' || clean.includes('10°')) return '10°';
  if (clean.includes('undecimo') || clean.includes('undécimo') || clean.includes('once') || clean === '11' || clean.includes('11°')) return '11°';
  return gStr;
}

function mapToSigepArea(aStr?: string): string {
  if (!aStr) return '';
  const clean = aStr.toLowerCase().trim();
  if (clean.includes('lengua') || clean.includes('castellana') || clean.includes('español')) return 'Humanidades y Lengua Castellana';
  if (clean.includes('ingl') || clean.includes('extranjero')) return 'Idioma Extranjero (Inglés)';
  if (clean.includes('naturales') || clean.includes('ambiental')) return 'Ciencias Naturales y Ed. Ambiental';
  if (clean.includes('sociales') || clean.includes('historia')) return 'Ciencias Sociales, Historia y Geografía';
  if (clean.includes('paz') || clean.includes('constitu')) return 'Constitución Política y Cátedra de la Paz';
  if (clean.includes('artíst') || clean.includes('artist')) return 'Educación Artística y Cultural';
  if (clean.includes('física') && clean.includes('educación')) return 'Educación Física, Recreación y Deportes';
  if (clean.includes('ética') || clean.includes('valores')) return 'Educación Ética y en Valores Humanos';
  if (clean.includes('relig')) return 'Educación Religiosa';
  if (clean.includes('tecnolog') || clean.includes('informát')) return 'Tecnología e Informática';
  if (clean.includes('filosof')) return 'Filosofía';
  if (clean.includes('económ') || clean.includes('polític')) return 'Ciencias Económicas y Políticas';
  if (clean.includes('afro')) return 'Cátedra de Estudios Afrocolombianos';
  if (clean.includes('crítica') || clean.includes('lectura')) return 'Lectura Crítica';
  if (clean.includes('matem')) return 'Matemáticas';
  if (clean.includes('física') || clean === 'fisica') return 'Física';
  if (clean.includes('química') || clean === 'quimica') return 'Química';
  if (clean.includes('biolog') || clean.includes('biológ')) return 'Biología';
  return aStr;
}

function detectArea(input?: SequenceInput, secuencia?: DidacticSequence): string {
  const direct = input?.area || (secuencia as any)?.area || (secuencia as any)?.asignatura || '';
  if (direct && direct.trim()) return mapToSigepArea(direct.trim());

  const comp = (secuencia?.competencias_men || '').toLowerCase();
  const tema = (secuencia?.tema_principal || secuencia?.titulo_secuencia || '').toLowerCase();
  const full = `${comp} ${tema}`;

  if (full.includes('lectura') || full.includes('crítica') || full.includes('critica')) return 'Lectura Crítica';
  if (full.includes('matemática') || full.includes('algebra') || full.includes('geometría') || full.includes('estadística')) return 'Matemáticas';
  if (full.includes('lengua') || full.includes('castellana') || full.includes('español') || full.includes('literatura')) return 'Humanidades y Lengua Castellana';
  if (full.includes('inglés') || full.includes('ingles') || full.includes('english')) return 'Idioma Extranjero (Inglés)';
  if (full.includes('naturales') || full.includes('ambiental') || full.includes('ecosistema') || full.includes('biología') || full.includes('celular')) return 'Ciencias Naturales y Ed. Ambiental';
  if (full.includes('sociales') || full.includes('historia') || full.includes('geografía') || full.includes('democracia')) return 'Ciencias Sociales, Historia y Geografía';
  if (full.includes('paz') || full.includes('constitución') || full.includes('ciudadanía')) return 'Constitución Política y Cátedra de la Paz';
  if (full.includes('tecnología') || full.includes('informática') || full.includes('computación') || full.includes('programación')) return 'Tecnología e Informática';
  if (full.includes('física') || full.includes('newton') || full.includes('fuerza') || full.includes('energía')) return 'Física';
  if (full.includes('química') || full.includes('átomo') || full.includes('reacciones')) return 'Química';
  if (full.includes('filosofía') || full.includes('ética') || full.includes('moral')) return 'Filosofía';
  if (full.includes('artística') || full.includes('dibujo') || full.includes('teatro') || full.includes('música')) return 'Educación Artística y Cultural';
  if (full.includes('deporte') || full.includes('educación física') || full.includes('motricidad')) return 'Educación Física, Recreación y Deportes';

  return direct || 'Lectura Crítica';
}

function detectGrado(input?: SequenceInput, secuencia?: DidacticSequence): string {
  const direct = input?.grado || (secuencia as any)?.grado || '';
  if (direct && direct.trim()) return mapToSigepGrade(direct.trim());

  const text = `${secuencia?.titulo_secuencia || ''} ${secuencia?.tema_principal || ''}`.toLowerCase();
  if (text.includes('transición') || text.includes('transicion')) return 'Transición';
  if (text.includes('1°') || text.includes('primero') || text.includes('grado 1')) return '1°';
  if (text.includes('2°') || text.includes('segundo') || text.includes('grado 2')) return '2°';
  if (text.includes('3°') || text.includes('tercero') || text.includes('grado 3')) return '3°';
  if (text.includes('4°') || text.includes('cuarto') || text.includes('grado 4')) return '4°';
  if (text.includes('5°') || text.includes('quinto') || text.includes('grado 5')) return '5°';
  if (text.includes('6°') || text.includes('sexto') || text.includes('grado 6')) return '6°';
  if (text.includes('7°') || text.includes('séptimo') || text.includes('septimo')) return '7°';
  if (text.includes('8°') || text.includes('octavo')) return '8°';
  if (text.includes('9°') || text.includes('noveno')) return '9°';
  if (text.includes('10°') || text.includes('décimo') || text.includes('decimo')) return '10°';
  if (text.includes('11°') || text.includes('undécimo') || text.includes('once')) return '11°';

  return '1°';
}

function getMondayOfWeek(week: number, year: number = new Date().getFullYear()): string {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const y = ISOweekStart.getFullYear();
  const m = String(ISOweekStart.getMonth() + 1).padStart(2, '0');
  const d = String(ISOweekStart.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSundayOfWeek(week: number, year: number = new Date().getFullYear()): string {
  const monStr = getMondayOfWeek(week, year);
  const parts = monStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getColombiaDate(): Date {
  const now = new Date();
  try {
    const colStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    return new Date(colStr);
  } catch (e) {
    return now;
  }
}

function weekNumber(d: Date = new Date()): number {
  const target = new Date(d.getTime());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

// Regla Institucional:
// Permite registrar la semana actual, semanas pendientes y hasta 4 semanas hacia adelante (planificación anticipada)
function getMaxAllowedWeek(d: Date = getColombiaDate()): number {
  const currWeek = weekNumber(d);
  return Math.min(52, currWeek + 4);
}

function generateDynamicWeeks(currentWeek: number, maxAllowedWeek: number, year: number = new Date().getFullYear()): WeekOption[] {
  const weeks: WeekOption[] = [];
  
  // Lista desde maxAllowedWeek hacia atrás hasta la semana 1 (arrastrados/pendientes)
  for (let w = maxAllowedWeek; w >= 1; w--) {
    const isSiguiente = w > currentWeek;
    const isActual = w === currentWeek;
    const fechaLunes = getMondayOfWeek(w, year);
    
    let label = `Semana ${w}`;
    if (isSiguiente) {
      label = `Semana ${w} (Planificación Anticipada)`;
    } else if (isActual) {
      label = `Semana ${w} (Semana Actual - En Curso)`;
    } else {
      label = `Semana ${w} (Anterior / Pendiente)`;
    }
    
    weeks.push({
      numero: w,
      label,
      es_actual: isActual,
      es_institucional: true,
      fecha_lunes: fechaLunes
    });
  }
  return weeks;
}

export const EnviarRevisionModal: React.FC<EnviarRevisionModalProps> = ({
  isOpen,
  onClose,
  secuencia,
  input,
  onSuccess
}) => {
  // Reloj institucional en vivo
  const [liveClockStr, setLiveClockStr] = useState<string>('');

  const nowInit = getColombiaDate();
  const initialIsoWeek = weekNumber(nowInit);
  const initialMaxWeek = getMaxAllowedWeek(nowInit);
  const initialDynamicWeeks = generateDynamicWeeks(initialIsoWeek, initialMaxWeek, nowInit.getFullYear());

  // Catálogos sincronizados desde SIGEP
  const [semanasList, setSemanasList] = useState<WeekOption[]>(initialDynamicWeeks);
  const [areasList, setAreasList] = useState<string[]>(DEFAULT_AREAS);
  const [gradosList, setGradosList] = useState<{ value: string; label: string }[]>(DEFAULT_GRADES);
  const [misAreas, setMisAreas] = useState<string[]>([]);
  const [currentAcademicWeek, setCurrentAcademicWeek] = useState<number>(initialIsoWeek);
  const [maxWeekLimit, setMaxWeekLimit] = useState<number>(initialMaxWeek);
  const [fechaMaxima, setFechaMaxima] = useState<string>(getSundayOfWeek(initialMaxWeek, nowInit.getFullYear()));
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);

  // Estados del Formulario
  const [area, setArea] = useState<string>('');
  const [grado, setGrado] = useState<string>('');
  const [semana, setSemana] = useState<number>(initialMaxWeek);
  const [fechaAplicacion, setFechaAplicacion] = useState<string>(getMondayOfWeek(initialMaxWeek, nowInit.getFullYear()));
  const [duracionClases, setDuracionClases] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reloj en vivo sincronizado con Hora Colombia (America/Bogota)
  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      try {
        const colFormatter = new Intl.DateTimeFormat('es-CO', {
          timeZone: 'America/Bogota',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        let str = colFormatter.format(now);
        str = str.replace(/a.s*m./i, 'AM').replace(/p.s*m./i, 'PM');
        setLiveClockStr(str + ' (Hora Col)');
      } catch (e) {
        setLiveClockStr(now.toLocaleDateString('es-CO') + ' · ' + now.toLocaleTimeString('es-CO'));
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Cargar configuración en vivo desde la API oficial de SIGEP
  useEffect(() => {
    if (!isOpen) return;

    const currentUser = authService.getCurrentUser();
    const email = currentUser?.email || '';

    // Mapeo inicial inteligente a partir de la planeación activa
    const initArea = detectArea(input, secuencia);
    const initGrado = detectGrado(input, secuencia);
    const initSesiones = Math.min(5, Math.max(1, input?.sesiones || (secuencia?.actividades ? secuencia.actividades.length : 1)));

    const now = getColombiaDate();
    const currIsoWeek = weekNumber(now);
    const maxAllowed = getMaxAllowedWeek(now);
    const dynamicWeeks = generateDynamicWeeks(currIsoWeek, maxAllowed, now.getFullYear());

    if (initArea) setArea(initArea);
    if (initGrado) setGrado(initGrado);
    setDuracionClases(initSesiones);
    setErrorMessage(null);
    setCurrentAcademicWeek(currIsoWeek);
    setMaxWeekLimit(maxAllowed);
    setSemanasList(dynamicWeeks);
    setSemana(currIsoWeek);
    setFechaAplicacion(getMondayOfWeek(currIsoWeek, now.getFullYear()));
    setFechaMaxima(getSundayOfWeek(maxAllowed, now.getFullYear()));

    // Consulta en vivo mediante apiSyncService
    setIsLoadingConfig(true);
    apiSyncService.getConfigEntrega(email)
      .then(data => {
        if (data) {
          if (data.semanas && data.semanas.length > 0) {
            setSemanasList(data.semanas);
          }
          const serverMaxW = data.semana_abierta_max || data.semana_maxima_permitida;
          if (serverMaxW) {
            setMaxWeekLimit(Math.max(serverMaxW, currIsoWeek + 4));
          }
          if (data.areas) setAreasList(data.areas);
          if (data.grados) setGradosList(data.grados);
          if (data.fecha_maxima) setFechaMaxima(data.fecha_maxima);
          if (data.semana_actual) {
            setCurrentAcademicWeek(data.semana_actual);
          }
          if (data.docente_asignaciones?.areas?.length > 0) {
            setMisAreas(data.docente_asignaciones.areas);
          }
        }
      })
      .catch(err => {
        console.warn('ℹ️ Usando cálculo dinámico institucional de semanas:', err.message);
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, [isOpen, input, secuencia]);

  if (!isOpen) return null;

  // Sincronizar fecha al cambiar semana
  const handleSemanaChange = (w: number) => {
    setSemana(w);
    const matched = semanasList.find(s => s.numero === w);
    if (matched && matched.fecha_lunes) {
      setFechaAplicacion(matched.fecha_lunes);
    } else {
      setFechaAplicacion(getMondayOfWeek(w));
    }
  };

  // Sincronizar semana al cambiar fecha
  const handleFechaChange = (dateVal: string) => {
    setFechaAplicacion(dateVal);
    if (dateVal) {
      try {
        const parts = dateVal.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const w = weekNumber(d);
          setSemana(w);
        }
      } catch (e) {}
    }
  };

  // Calcular semana ISO de la fecha actual seleccionada
  let isoWeekDisplay = semana;
  try {
    if (fechaAplicacion) {
      const parts = fechaAplicacion.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        isoWeekDisplay = weekNumber(d);
      }
    }
  } catch (e) {}

  // Enviar a SIGEP con la regla estricta de viernes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area) {
      setErrorMessage("Seleccione el área o asignatura.");
      return;
    }
    if (!grado) {
      setErrorMessage("Seleccione el grado académico.");
      return;
    }

    // Validación institucional de semana (permite semana actual, pendientes y hasta 4 semanas hacia adelante)
    if (semana > maxWeekLimit) {
      setErrorMessage(`No está permitido registrar la Semana ${semana}. El límite permitido de entrega anticipada es hasta la Semana ${maxWeekLimit}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const metadata: RevisionMetadata = {
        area,
        grado,
        numero_semana: semana,
        fecha_aplicacion: fechaAplicacion,
        duracion_clases: duracionClases
      };

      const res = await apiSyncService.enviarPlaneacionARevision(secuencia, input, null, metadata);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('guaimaral_tour_completed', { detail: { mensaje: res.mensaje } }));
      }

      if (onSuccess) {
        onSuccess(res.mensaje || "Planeación enviada exitosamente a SIGEP-IEG.");
      } else {
        alert(`✅ ¡Planeación enviada con éxito a SIGEP-IEG!\n\n${res.mensaje || 'Quedó registrada para revisión por coordinación.'}`);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al enviar la planeación a revisión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-[620px] overflow-hidden flex flex-col max-h-[92vh] transition-all transform animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Registrar Planeación</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                Sincronizado con SIGEP
              </span>
              {isLoadingConfig && <RefreshCw size={12} className="animate-spin text-slate-400" />}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Valores oficiales obtenidos en tiempo real de la base de datos de la institución
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Reloj Institucional (Idéntico a SIGEP) */}
        {liveClockStr && (
          <div className="px-6 pt-3">
            <div className="text-center font-bold text-sky-600 dark:text-sky-300 text-xs bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 py-2 px-3 rounded-xl shadow-sm">
              🗓️ Fecha y Hora Actual: <span className="font-extrabold text-sky-700 dark:text-sky-200">{liveClockStr}</span>
            </div>
          </div>
        )}

        {/* Tarjeta de Resumen Automático de la Planeación Activa */}
        <div className="px-6 pt-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-sky-500/10 border border-violet-200/80 dark:border-violet-800/50 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  <Sparkles size={12} className="text-violet-600 dark:text-violet-400" />
                  <span>Datos Detectados Automáticamente</span>
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate mt-1">
                  {secuencia?.titulo_secuencia || secuencia?.tema_principal || input?.tema || 'Planeación Pedagógica Activa'}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    <BookOpen size={11} /> {area || 'Área Detectada'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                    <GraduationCap size={11} /> {gradosList.find(g => g.value === grado)?.label || grado || 'Grado Detectado'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    <Clock size={11} /> {duracionClases} {duracionClases === 1 ? 'Clase' : 'Clases'}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                ✓ Precargado
              </span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Área / Asignatura (Colombia) * */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Área / Asignatura (Colombia) <span className="text-rose-500">*</span>
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            >
              <option value="">Seleccione el área o asignatura...</option>
              {area && !areasList.includes(area) && !misAreas.includes(area) && (
                <option value={area}>{area} (Detectada de la planeación)</option>
              )}
              {misAreas.length > 0 && (
                <optgroup label="⭐ Mis Asignaturas Asignadas">
                  {misAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label={misAreas.length > 0 ? "Otras Áreas Institucionales" : "Áreas Oficiales"}>
                {areasList.filter(a => !misAreas.includes(a)).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 2. Grado Académico (Colombia) * */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Grado Académico (Colombia) <span className="text-rose-500">*</span>
            </label>
            <select
              value={grado}
              onChange={(e) => setGrado(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            >
              <option value="">Seleccione el grado académico...</option>
              {grado && !gradosList.some(g => g.value === grado) && (
                <option value={grado}>{grado} (Detectado de la planeación)</option>
              )}
              {gradosList.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Semana Lectiva a Registrar (Siguiente, Actual o Anteriores) * */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Semana Lectiva a Registrar (Siguiente, Actual o Anteriores) <span className="text-rose-500">*</span>
            </label>
            <select
              value={semana}
              onChange={(e) => handleSemanaChange(parseInt(e.target.value, 10))}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            >
              {semanasList.length > 0 ? (
                semanasList.map((s) => (
                  <option key={s.numero} value={s.numero}>
                    {s.label}
                  </option>
                ))
              ) : (
                <>
                  <option value={35}>Semana 35 (Semana Actual - En Curso)</option>
                  <option value={34}>Semana 34 (Anterior)</option>
                  <option value={33}>Semana 33 (Anterior)</option>
                  <option value={32}>Semana 32 (Anterior)</option>
                </>
              )}
            </select>
          </div>

          {/* 4. Fecha de Aplicación (Inicio de Clases) * */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Fecha de Aplicación (Inicio de Clases) <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={fechaAplicacion}
              max={fechaMaxima}
              onChange={(e) => handleFechaChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            />
            {/* Helper dinámico idéntico a SIGEP */}
            <div className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-2 flex-wrap">
              <span>🗓️ Semana ISO: <strong>Semana {isoWeekDisplay}</strong></span>
              {isoWeekDisplay < currentAcademicWeek ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-700/50">
                  🟡 Entrega Atrasada (Se registrará Con Retraso)
                </span>
              ) : isoWeekDisplay === currentAcademicWeek ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 dark:border-emerald-700/50">
                  🟢 Semana Actual (Entrega A Tiempo)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold text-[11px] border border-sky-300 dark:border-sky-700/50">
                  🔵 Semana Futura (Semana {isoWeekDisplay})
                </span>
              )}
            </div>
          </div>

          {/* 5. Duración de la Planeación (Número de Clases) * */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Duración de la Planeación (Número de Clases) <span className="text-rose-500">*</span>
            </label>
            <select
              value={duracionClases}
              onChange={(e) => setDuracionClases(parseInt(e.target.value, 10))}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            >
              <option value="1">1 Clase</option>
              <option value="2">2 Clases</option>
              <option value="3">3 Clases</option>
              <option value="4">4 Clases</option>
              <option value="5">5 Clases (Semana Completa)</option>
            </select>
            <small className="text-slate-500 dark:text-slate-400 text-[11px] block mt-1">
              Seleccione la cantidad de clases que cubrirá esta planeación (máximo 5 clases).
            </small>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              id="tour-btn-confirmar-envio"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send size={13} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Enviando a SIGEP-IEG...' : 'Confirmar y Enviar a Revisión'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
