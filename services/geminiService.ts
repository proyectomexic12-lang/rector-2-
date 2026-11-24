import { SequenceInput, DidacticSequence, EvaluationItem } from "../types";
import { supabase } from "./supabaseClient";
import { institutionService } from "./institutionService";

export const modelHealthStatus: Record<string, 'online' | 'offline' | 'checking'> = {
  "deepseek-chat": "online"
};

export interface KeyConfigInfo {
  key: string;
  index: number;
  id: string;
  label: string;
}

const DEFAULT_KEY_LABELS = [
  "DeepSeek Oficial",
  "DeepSeek Respaldo 2",
  "DeepSeek Respaldo 3",
  "DeepSeek Respaldo 4"
];

export function getAvailableKeysInfo(): KeyConfigInfo[] {
  const keysInfo: KeyConfigInfo[] = [];

  for (let i = 1; i <= 15; i++) {
    const envVarName = `VITE_API_KEY_${i}`;
    const rawVal = (import.meta.env as any)[envVarName] || 
      (typeof process !== 'undefined' && process.env ? (process.env as any)[envVarName] : undefined);
      
    if (typeof rawVal === 'string' && rawVal.trim().length > 5) {
      const id = `key${i}`;
      const label = DEFAULT_KEY_LABELS[i - 1] || `Canal ${i}`;
      keysInfo.push({
        key: rawVal.trim(),
        index: i - 1,
        id,
        label
      });
    }
  }

  if (keysInfo.length === 0) {
    const singleVal = (import.meta.env as any).VITE_API_KEY || 
      (typeof process !== 'undefined' && process.env ? process.env.VITE_API_KEY : undefined);
    if (typeof singleVal === 'string' && singleVal.trim().length > 5) {
      keysInfo.push({
        key: singleVal.trim(),
        index: 0,
        id: "key1",
        label: "Canal Principal"
      });
    }
  }

  return keysInfo;
}

const LOCAL_STORAGE_METRICS_KEY = "guaimaral_api_metrics_store";

function loadMetricsFromStorage(): Record<string, any> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_METRICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveMetricsToStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_METRICS_KEY, JSON.stringify(apiMetrics));
  } catch (e) {}
}

export const apiMetrics: Record<string, { 
  requests: number; 
  success: number; 
  errors: number; 
  tokens: number;
  lastUsed: string; 
  label: string;
  errorLogs: { time: string; message: string }[];
}> = {};

// Inicializar métricas para todas las llaves detectadas con persistencia local
const savedMetrics = loadMetricsFromStorage();
getAvailableKeysInfo().forEach(k => {
  const existing = savedMetrics[k.id];
  apiMetrics[k.id] = {
    requests: existing?.requests || 0,
    success: existing?.success || 0,
    errors: existing?.errors || 0,
    tokens: existing?.tokens || 0,
    lastUsed: existing?.lastUsed || "",
    label: k.label,
    errorLogs: Array.isArray(existing?.errorLogs) ? existing.errorLogs : []
  };
});

export const resetApiMetrics = async () => {
  try {
    localStorage.removeItem('guaimaral_api_metrics_v2');
    Object.keys(apiMetrics).forEach(key => delete apiMetrics[key]);
    getAvailableKeysInfo().forEach(k => {
      apiMetrics[k.id] = {
        requests: 0,
        success: 0,
        errors: 0,
        tokens: 0,
        lastUsed: "",
        label: k.label,
        errorLogs: []
      };
    });
    saveMetricsToStorage();
    if (supabase) {
      await supabase.from('api_key_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
  } catch (e) {
    console.warn("Reset metrics error:", e);
  }
};

const sanitizeInput = (text: string | undefined): string => {
  if (!text) return "";
  return text.trim().replace(/['"<>]/g, "");
};

// Función de auto-reparación inteligente de JSON para modelos que dejan comas colgantes, caracteres de control o corchetes abiertos
export const tryRepairAndParseJson = (raw: string): any => {
  // Helper: Sanear caracteres de control (\n, \r, \t sin escapar) dentro de cadenas de JSON
  const sanitizeControlCharacters = (jsonStr: string): string => {
    let inString = false;
    let result = '';
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      const prevChar = i > 0 ? jsonStr[i - 1] : '';

      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else if (char.charCodeAt(0) < 32) {
          result += '';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }
    return result;
  };

  try {
    return JSON.parse(raw);
  } catch (e1) {
    try {
      const sanitized = sanitizeControlCharacters(raw);
      return JSON.parse(sanitized);
    } catch (e1_1) {
      // 1. Quitar comas colgantes antes de llaves o corchetes de cierre: ,} o ,]
      let fixed = raw.replace(/,\s*([\]}])/g, '$1');
      
      // 2. Normalizar comillas especiales si las hubiera
      fixed = fixed.replace(/[\u201C\u201D]/g, '"');

      // 3. Aplicar saneamiento de caracteres de control
      fixed = sanitizeControlCharacters(fixed);

      try {
        return JSON.parse(fixed);
      } catch (e2) {
        // 4. Reparación avanzada de JSON truncado por límite de tokens (incluyendo cadenas sin cerrar)
        let inStr = false;
        const stack: string[] = [];
        for (let i = 0; i < fixed.length; i++) {
          const ch = fixed[i];
          const prev = i > 0 ? fixed[i - 1] : '';
          if (ch === '"' && prev !== '\\') {
            inStr = !inStr;
            continue;
          }
          if (!inStr) {
            if (ch === '{') stack.push('}');
            else if (ch === '[') stack.push(']');
            else if ((ch === '}' || ch === ']') && stack.length > 0 && stack[stack.length - 1] === ch) {
              stack.pop();
            }
          }
        }

        if (inStr) {
          fixed += '"';
        }

        // Limpiar dos puntos o comas huérfanas al final antes de cerrar estructuras
        fixed = fixed.trim();
        if (fixed.endsWith(':')) {
          fixed += '""';
        } else {
          fixed = fixed.replace(/,\s*$/, '');
        }

        while (stack.length > 0) {
          fixed += stack.pop();
        }

        try {
          return JSON.parse(fixed);
        } catch (e3) {
          throw e1; // Lanzar el error original si no se pudo auto-reparar
        }
      }
    }
  }
};

const logApiKeyUsage = async (keyLabel: string, status: 'success' | 'error', errorMsg?: any, modelName?: string, tokensUsed: number = 0) => {
  if (!supabase) return;
  try {
    const rawMsg = errorMsg ? (typeof errorMsg === 'string' ? errorMsg : String(errorMsg?.message || errorMsg)) : '';
    const cleanMsg = rawMsg ? rawMsg.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').slice(0, 250) : null;
    const actionDesc = tokensUsed > 0 
      ? `Respuesta de: ${modelName || 'Desconocido'} (${tokensUsed} tokens)`
      : `Respuesta de: ${modelName || 'Desconocido'}`;

    const payloadWithAction: any = {
      key_name: keyLabel,
      status,
      action: actionDesc
    };
    if (cleanMsg) payloadWithAction.error_message = cleanMsg;

    const { error } = await supabase.from('api_key_logs').insert([payloadWithAction]);
    
    // Si la tabla api_key_logs en Supabase no tiene la columna 'action', reintentamos automáticamente sin ella
    if (error && (error.message?.includes('action') || error.code === 'PGRST204')) {
      const fallbackPayload: any = {
        key_name: keyLabel,
        status
      };
      if (cleanMsg) fallbackPayload.error_message = cleanMsg;
      await supabase.from('api_key_logs').insert([fallbackPayload]);
    }
  } catch (e) {
    // Silencioso para cero interrupciones al usuario
  }
};



// Helper to categorize and parse Colombian school grades accurately
export type GradeCategory = 'preescolar' | 'primaria_baja' | 'primaria_alta' | 'secundaria' | 'media' | 'multigrado';

export interface GradeMetadata {
  category: GradeCategory;
  gradeLabel: string;
  searchSuffix: string;
  cleanGradeName: string;
}

export function getGradeCategory(grado: string): GradeMetadata {
  const raw = (grado || '').toLowerCase().trim();
  // Normalizar tildes y caracteres especiales
  const g = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Multigrado
  if (g.includes('multi')) {
    const isBachillerato = g.includes('6') || g.includes('11') || g.includes('secundaria') || g.includes('media') || g.includes('postprimaria');
    return {
      category: 'multigrado',
      gradeLabel: isBachillerato ? 'Aula Multigrado Bachillerato (6° a 11°)' : 'Aula Multigrado Primaria (1° a 5°)',
      searchSuffix: isBachillerato ? 'secundaria bachillerato explicacion didactica clase adolescentes' : 'primaria para niños clase didactica explicacion infantil',
      cleanGradeName: isBachillerato ? 'Multigrado Bachillerato' : 'Multigrado Primaria'
    };
  }

  // 2. Preescolar / Transición / Jardín
  if (g.includes('transici') || g.includes('preescolar') || g.includes('jardin') || g.includes('parvulo') || g === '0' || g === '0°') {
    return {
      category: 'preescolar',
      gradeLabel: 'Transición / Preescolar',
      searchSuffix: 'para niños preescolar infantil cancion cuento educativo',
      cleanGradeName: 'Preescolar'
    };
  }

  // 3. Media Académica / Vocacional (10° y 11° - evaluar primero para evitar falso positivo con '1')
  if (g.includes('undecim') || g.includes('once') || g === '11' || g === '11°' || g === '11ro' || g === '11vo' || g.includes('grado 11') || g.startsWith('11 ') || g.startsWith('11.')) {
    return {
      category: 'media',
      gradeLabel: 'Grado 11° Media',
      searchSuffix: 'grado 11 once bachillerato preparacion icfes saber 11 explicacion clase',
      cleanGradeName: 'Undécimo (11°)'
    };
  }

  if (g.includes('decim') || g === '10' || g === '10°' || g === '10mo' || g.includes('grado 10') || g.startsWith('10 ') || g.startsWith('10.')) {
    return {
      category: 'media',
      gradeLabel: 'Grado 10° Media',
      searchSuffix: 'grado 10 decimo bachillerato explicacion clase preparacion saber',
      cleanGradeName: 'Décimo (10°)'
    };
  }

  // 4. Primaria Baja (1° a 3°)
  if (g.includes('primer') || g === '1' || g === '1°' || g === '1ro' || g.includes('grado 1') || g.startsWith('1 ') || g.startsWith('1.')) {
    return {
      category: 'primaria_baja',
      gradeLabel: 'Grado 1° Primaria',
      searchSuffix: 'para niños de 1 primaria primer grado educativo infantil explicacion facil',
      cleanGradeName: 'Primero de Primaria'
    };
  }
  if (g.includes('segund') || g === '2' || g === '2°' || g === '2do' || g.includes('grado 2') || g.startsWith('2 ') || g.startsWith('2.')) {
    return {
      category: 'primaria_baja',
      gradeLabel: 'Grado 2° Primaria',
      searchSuffix: 'para niños de 2 primaria segundo grado explicacion infantil didactica',
      cleanGradeName: 'Segundo de Primaria'
    };
  }
  if (g.includes('tercer') || g === '3' || g === '3°' || g === '3ro' || g.includes('grado 3') || g.startsWith('3 ') || g.startsWith('3.')) {
    return {
      category: 'primaria_baja',
      gradeLabel: 'Grado 3° Primaria',
      searchSuffix: 'para niños de 3 primaria tercer grado explicacion didactica',
      cleanGradeName: 'Tercero de Primaria'
    };
  }

  // 5. Primaria Alta (4° y 5°)
  if (g.includes('cuart') || g === '4' || g === '4°' || g === '4to' || g.includes('grado 4') || g.startsWith('4 ') || g.startsWith('4.')) {
    return {
      category: 'primaria_alta',
      gradeLabel: 'Grado 4° Primaria',
      searchSuffix: 'para niños cuarto de primaria 4 grado explicacion didactica clase',
      cleanGradeName: 'Cuarto de Primaria'
    };
  }
  if (g.includes('quint') || g === '5' || g === '5°' || g === '5to' || g.includes('grado 5') || g.startsWith('5 ') || g.startsWith('5.')) {
    return {
      category: 'primaria_alta',
      gradeLabel: 'Grado 5° Primaria',
      searchSuffix: 'para niños quinto de primaria 5 grado clase explicativa',
      cleanGradeName: 'Quinto de Primaria'
    };
  }

  // 6. Secundaria Básica (6° a 9°)
  if (g.includes('sext') || g === '6' || g === '6°' || g === '6to' || g.includes('grado 6') || g.startsWith('6 ') || g.startsWith('6.')) {
    return {
      category: 'secundaria',
      gradeLabel: 'Grado 6° Secundaria',
      searchSuffix: 'grado 6 sexto secundaria explicacion clase',
      cleanGradeName: 'Sexto de Secundaria'
    };
  }
  if (g.includes('septim') || g === '7' || g === '7°' || g === '7mo' || g.includes('grado 7') || g.startsWith('7 ') || g.startsWith('7.')) {
    return {
      category: 'secundaria',
      gradeLabel: 'Grado 7° Secundaria',
      searchSuffix: 'grado 7 septimo secundaria explicacion clase',
      cleanGradeName: 'Séptimo de Secundaria'
    };
  }
  if (g.includes('octav') || g === '8' || g === '8°' || g === '8vo' || g.includes('grado 8') || g.startsWith('8 ') || g.startsWith('8.')) {
    return {
      category: 'secundaria',
      gradeLabel: 'Grado 8° Secundaria',
      searchSuffix: 'grado 8 octavo secundaria explicacion clase',
      cleanGradeName: 'Octavo de Secundaria'
    };
  }
  if (g.includes('noven') || g === '9' || g === '9°' || g === '9no' || g.includes('grado 9') || g.startsWith('9 ') || g.startsWith('9.')) {
    return {
      category: 'secundaria',
      gradeLabel: 'Grado 9° Secundaria',
      searchSuffix: 'grado 9 noveno secundaria explicacion clase',
      cleanGradeName: 'Noveno de Secundaria'
    };
  }

  // Fallback para primaria genérica
  if (g.includes('primaria')) {
    return {
      category: 'primaria_baja',
      gradeLabel: 'Primaria',
      searchSuffix: 'para niños de primaria explicacion infantil didactica',
      cleanGradeName: 'Primaria'
    };
  }

  return {
    category: 'secundaria',
    gradeLabel: `Grado ${grado}`,
    searchSuffix: `grado ${grado} explicacion clase`,
    cleanGradeName: `Grado ${grado}`
  };
}

// Helper to build grade-aware YouTube search query for age-appropriate video resources
export function buildGradeAwareVideoQuery(rawTitle: string, tema: string, grado: string): string {
  // Limpiar título de prefijos como 'video:', comillas y signos
  let cleanTitle = (rawTitle || '')
    .replace(/^(video|video explicativo|video tutorial|tutorial|recurso audiovisual|recurso|material)\s*[:-]?\s*/i, '')
    .replace(/['"«»“”]/g, '')
    .trim();

  const cleanTema = (tema || '').replace(/['"«»“”]/g, '').trim();
  const gradeMeta = getGradeCategory(grado);

  // Determinar núcleo de búsqueda
  let coreTerm = cleanTitle;
  if (!coreTerm) {
    coreTerm = cleanTema || 'conceptos clave';
  } else if (cleanTema && !coreTerm.toLowerCase().includes(cleanTema.toLowerCase())) {
    coreTerm = `${coreTerm} ${cleanTema}`;
  }

  // Remover palabras numéricas o menciones contradictorias de grado dentro del coreTerm para evitar cruces
  coreTerm = coreTerm
    .replace(/\b(grado\s*\d+°?|\d+°?\s*grado|\b(primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|decimo|décimo|undecimo|undécimo|once)\b)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return `${coreTerm} ${gradeMeta.searchSuffix}`.replace(/\s+/g, ' ').trim();
}

export interface ResourceAction {
  isVideo: boolean;
  url: string | null;
  label: string;
}

export function resolveResourceAction(nombreRaw: string, descripcionRaw: string, tema: string, grado: string): ResourceAction {
  const nombre = (nombreRaw || '').toLowerCase();
  const desc = (descripcionRaw || '').toLowerCase();

  // 1. Detección exclusiva de Video -> YouTube Direct
  if (nombre.includes("video") || desc.includes("video") || nombre.includes("youtube") || desc.includes("youtube")) {
    const rawTitle = nombreRaw.replace(/^video\s*[:-]?\s*/i, "").replace(/['"]/g, "").trim();
    const query = buildGradeAwareVideoQuery(rawTitle, tema, grado);
    return {
      isVideo: true,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      label: "▶ Ver en YouTube ↗"
    };
  }

  // Cualquier otro recurso es texto didáctico limpio de aula sin botones ni badges
  return {
    isVideo: false,
    url: null,
    label: ""
  };
}

// Helper functions for dynamic pedagogical contexts
function getGradeContext(grado: string): string {
  const { category, gradeLabel } = getGradeCategory(grado);
  switch (category) {
    case 'preescolar':
      return `ENFOQUE DE PREESCOLAR / TRANSICIÓN: Estimulación sensorial, juego estructurado, canciones infantiles, rondas, cuentos ilustrados, grafomotricidad y motricidad gruesa/fina. Lenguaje de ternura, lúdico y visual. CERO abstracciones teóricas.`;
    case 'primaria_baja':
      return `ENFOQUE DE PRIMARIA BÁSICA (1° a 3°): Uso intensivo de material concreto (bloques, fichas, regletas, dibujos), juegos de roles, canciones, retos de conteo/lectura inicial y actividades motrices cortas. Lenguaje afectivo, motivador y sumamente didáctico infantil.`;
    case 'primaria_alta':
      return `ENFOQUE DE PRIMARIA ALTA (4° y 5°): Transición al razonamiento lógico estructurado. Retos grupales, descubrimientos guiados, proyectos manuales, preguntas de indagación y resolución de problemas cotidianos contextualizados para niños.`;
    case 'secundaria':
      return `ENFOQUE DE SECUNDARIA BÁSICA (6° a 9°): Pensamiento crítico, debates, conexión con la realidad social y cotidiana, trabajo en equipo, argumentación fundamentada y desarrollo de la autonomía cognoscitiva.`;
    case 'media':
      return `ENFOQUE DE MEDIA ACADÉMICA / TÉCNICA (10° y 11°): Alto rigor conceptual pre-universitario, competencias Saber 11 / ICFES, análisis crítico de textos complejos, ensayos argumentativos, formulación de hipótesis y proyectos de vida.`;
    case 'multigrado':
      return `ENFOQUE MULTIGRADO PRIMARIA (Escuela Nueva / Altomira): Estrategia de aula unificada con actividades multinivel diferenciadas por ciclo (Transición a 5°), guías de autoaprendizaje y aprendizaje colaborativo entre pares de diferentes edades.`;
  }
}

function getAreaContext(area: string): string {
  const areaLower = area.toLowerCase();
  if (areaLower.includes('matemática')) {
    return "ENFOQUE MATEMÁTICO: Evitar la mecanización. Centrarse en la resolución de problemas (Polya), pensamiento lógico, y el uso del error como oportunidad de aprendizaje.";
  }
  if (areaLower.includes('lenguaje') || areaLower.includes('español')) {
    return "ENFOQUE LENGUAJE: Prácticas sociales del lenguaje. Énfasis en comprensión crítica, producción textual argumentativa y lectura inferencial.";
  }
  if (areaLower.includes('ciencia') || areaLower.includes('natural')) {
    return "ENFOQUE CIENTÍFICO: Método científico empírico. Laboratorios 'low-cost', formulación de hipótesis, y conciencia ambiental.";
  }
  if (areaLower.includes('sociales') || areaLower.includes('historia')) {
    return "ENFOQUE SOCIALES: Pensamiento histórico y crítico. Análisis de multiperspectividad, geografía viva y formación ciudadana (constitución).";
  }
  return "ENFOQUE DISCIPLINAR: Énfasis en las competencias específicas de esta área según los lineamientos del MEN.";
}


const SEQ_CACHE_KEY = "guaimaral_ai_seq_cache_v1";
const ICFES_CACHE_KEY = "guaimaral_ai_icfes_cache_v1";

function getFromLocalCache<T>(storageKey: string, itemKey: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map?.[itemKey] || null;
  } catch (e) {
    return null;
  }
}

function saveToLocalCache<T>(storageKey: string, itemKey: string, value: T, maxItems = 25) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(storageKey);
    const map = raw ? JSON.parse(raw) : {};
    map[itemKey] = value;
    const keys = Object.keys(map);
    if (keys.length > maxItems) {
      delete map[keys[0]];
    }
    window.localStorage.setItem(storageKey, JSON.stringify(map));
  } catch (e) {}
}

export const generateDidacticSequence = async (input: SequenceInput, refinementInstruction?: string): Promise<DidacticSequence> => {
  const activeInstitution = institutionService.getActiveInstitution();
  const instName = activeInstitution.name || "la institución educativa";
  const m1 = activeInstitution.formatSchema?.momento1Name || "Inicio";
  const m2 = activeInstitution.formatSchema?.momento2Name || "Desarrollo";
  const m3 = activeInstitution.formatSchema?.momento3Name || "Cierre";

  const safeTema = sanitizeInput(input.tema);
  const sesionesCount = Math.min(Math.max(Number(input.sesiones) || 2, 1), 4);
  const seqCacheKey = [input.grado, input.area, safeTema, sesionesCount, sanitizeInput(input.dba), input.ejeCrese]
    .map(s => String(s || '').toLowerCase().trim())
    .join('|');

  if (!refinementInstruction) {
    const cachedSeq = getFromLocalCache<DidacticSequence>(SEQ_CACHE_KEY, seqCacheKey);
    if (cachedSeq && Array.isArray(cachedSeq.actividades) && cachedSeq.actividades.length > 0) {
      console.log(`⚡ [Caché Inteligente 0 Tokens] Secuencia recuperada instantáneamente sin gasto de API.`);
      return cachedSeq;
    }
  }

  const availableKeys = getAvailableKeysInfo();

  if (availableKeys.length === 0) {
    throw new Error("No se encontraron llaves de API configuradas. Revisa tus variables VITE_API_KEY_1..7 en tu archivo .env.");
  }

  // Monopolio DeepSeek - Única configuración
  const modelsToTry = ["deepseek-chat"];

  const areaNormativa = {
    conDBA: ['MATEMATICAS', 'LENGUAJE', 'CIENCIAS NATURALES', 'CIENCIAS SOCIALES', 'INGLES', 'FISICA', 'ESTADISTICA', 'GEOMETRIA', 'BIOLOGIA', 'QUIMICA'],
    conOrientaciones: ['EDUCACION ARTISTICA', 'EDUCACION FISICA', 'ETICA', 'VALORES', 'RELIGION', 'TECNOLOGIA', 'FILOSOFIA', 'CONVIVENCIA', 'AGROPECUARIA', 'CATEDRA DE LA PAZ']
  };

  const currentArea = input.area.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isMultigrado = input.grado.toLowerCase().includes("multigrado");
  const isIntegral = input.area.toLowerCase().includes("integral");

  const hasDBA = areaNormativa.conDBA.some(a => currentArea.includes(a)) || isIntegral;

  let pedagogicalInstruction = hasDBA
    ? `- **DBA Oficial:** Identifica el número exacto del DBA del MEN Colombia (ej: "DBA #3") y su enunciado para este tema y grado. Input docente: ${sanitizeInput(input.dba) || 'Auto'}.`
    : `- **Referencia Pedagógica:** Área sin DBA. En 'dba_utilizado' coloca: "Tomado de las Orientaciones Pedagógicas del MEN para ${input.area}: [eje específico]".`;

  if (isMultigrado) {
    const gLower = input.grado.toLowerCase();
    const isBachillerato = gLower.includes('6') || gLower.includes('11') || gLower.includes('secundaria') || gLower.includes('media');

    if (isBachillerato) {
      pedagogicalInstruction += `\n    - **MULTIGRADO BACHILLERATO (6° a 11°):** Incluye actividades diferenciadas por nivel (6°-7°, 8°-9°, 10°-11°) bajo enfoque ABP y trabajo colaborativo.`;
    } else {
      pedagogicalInstruction += `\n    - **MULTIGRADO PRIMARIA (1° a 5° - Escuela Nueva):** Incluye acciones diferenciadas por nivel (1° a 5°) con trabajo autónomo y colaborativo.`;
    }
  }

  // Guía de estructura JSON compacta para máximo ahorro de tokens
  const jsonStructureGuidance = `
    DEVUELVE ÚNICAMENTE UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
    {
      "titulo_secuencia": "string",
      "descripcion_secuencia": "string",
      "objetivo_aprendizaje": "string",
      "contenidos": ["string (3 items)"],
      "competencias_men": "string",
      "estandar": "string",
      "dba_utilizado": "string",
      "metodologia": "string",
      "corporiedad_adi": "string",
      "actividades": [
        { "sesion": 1, "fase_inicio": "string", "fase_desarrollo": "string", "fase_cierre": "string", "preguntas_socraticas": ["string (2 preguntas)"], "materiales": ["string (3 items)"], "tiempo": "60 min", "imprimibles": "string", "adi_especifico": "string" }
      ],
      "rubrica": [
        { "criterio": "string", "bajo": "string", "basico": "string", "alto": "string", "superior": "string" }
      ],
      "evaluacion": [
        { "pregunta": "string", "tipo": "Múltiple Opción", "opciones": ["A) ...", "B) ...", "C) ...", "D) ..."], "respuesta_correcta": "A", "justificacion": "string" }
      ],
      "recursos": [
        { "nombre": "Video Explicativo: ...", "descripcion": "string" }
      ],
      "productos_asociados": "string",
      "adecuaciones_piar": "string",
      "taller_imprimible": {
        "introduccion": "string",
        "instrucciones": "string",
        "bitacora_test_inicial": "string",
        "ejercicios": ["string (5 actividades prácticas)"],
        "reto_creativo": "string"
      },
      "glosario": [{ "termino": "string", "definicion": "string" }],
      "aula_invertida": "string"
    }
  `;

  const systemPrompt = `
    Eres la Autoridad Curricular de ${instName} (MEN Colombia - HOTS/Bloom).
    ${activeInstitution.formatSchema?.promptInstructions ? `Directrices: ${activeInstitution.formatSchema.promptInstructions}\n` : ''}
    REGLAS DE CALIDAD Y ECONOMÍA DE TOKENS:
    1. Redacta cada fase (${m1}, ${m2}, ${m3}) en 1 párrafo claro, práctico y sustancioso (3 oraciones concretas de guía docente y acción del estudiante, sin texto de relleno).
    2. Incluye pausa activa ADI (3-5 min), enfoque socioemocional CRESE y 3 ajustes puntuales DUA/PIAR en 'adecuaciones_piar'.
    3. En 'rubrica': genera EXACTAMENTE 2 criterios (1 cognitivo/procedimental y 1 socioemocional CRESE), 1 oración concisa por nivel.
    4. En 'evaluacion': genera EXACTAMENTE 3 preguntas tipo Saber-ICFES con 4 opciones y justificación de 1 oración.
    5. En 'recursos': incluye 1 solo video explicativo adaptado al grado. En 'glosario': exactamente 3 términos clave.
    6. En 'taller_imprimible': 'introduccion' de 1 párrafo corto, 2 preguntas en 'bitacora_test_inicial', 5 'ejercicios' prácticos concisos y 1 'reto_creativo'.
    ${jsonStructureGuidance}
  `;

  const userPrompt = `
    - Grado: ${input.grado} (${getGradeContext(input.grado)})
    - Área: ${input.area} (${getAreaContext(input.area)})
    - Tema: ${safeTema} | Sesiones en 'actividades': ${sesionesCount}
    ${pedagogicalInstruction}
    - Eje CRESE: ${input.ejeCrese || 'Convivencia pacífica, empatía y ciudadanía.'}
    ${refinementInstruction ? `- Ajuste solicitado: ${sanitizeInput(refinementInstruction)}` : ''}
    Responde SOLO con el JSON válido.
  `;

  let lastError: any;

  // Bucle multi-modelo y multi-llave con conmutación por error (Failover)
  for (const modelName of modelsToTry) {
    // Ordenar las llaves disponibles según menor cantidad de errores y menos peticiones (balanceo inteligente)
    const sortedKeys = [...availableKeys].sort((a, b) => {
      const mA = apiMetrics[a.id] || { requests: 0, errors: 0 };
      const mB = apiMetrics[b.id] || { requests: 0, errors: 0 };
      if (mA.errors !== mB.errors) return mA.errors - mB.errors;
      return mA.requests - mB.requests;
    });

    for (const keyInfo of sortedKeys) {
      const key = keyInfo.key;
      const label = keyInfo.label;
      const keyId = keyInfo.id;

      // Optimización: 1 intento por llave (evita triplicar cobros de tokens en DeepSeek)
      const maxRetries = 1;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[🔍 Orquestador DeepSeek] Conectando a api.deepseek.com con llave: ${label} (${keyId}) - Intento ${attempt}/${maxRetries}...`);
          let text = "";
          let tokensUsed = 0;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s timeout para permitir generación completa sin abortos falsos

          try {
            const res = await fetch(`https://api.deepseek.com/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 2400
              })
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(`Error API DeepSeek ${res.status}: ${errData?.error?.message || res.statusText}`);
            }

            const data = await res.json();
            text = data.choices?.[0]?.message?.content || "";
            const apiTotal = data?.usage?.total_tokens || ((data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0));
            tokensUsed = apiTotal > 0 ? apiTotal : Math.ceil(((systemPrompt.length + userPrompt.length) + (text?.length || 0)) / 3.8);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              throw new Error(`Timeout: La API de DeepSeek tardó más de 65s en responder.`);
            }
            throw fetchError;
          }

        // 1. Eliminar cualquier bloque de pensamiento <think>...</think> generado por modelos como Qwen / DeepSeek
        let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // 2. Extraer bloques ```json ... ``` si existen
        const jsonBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          cleanText = jsonBlockMatch[1].trim();
        }

        // 3. Aislar estrictamente desde el primer '{' hasta el último '}'
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
        
        let parsed: any;
        try {
          parsed = tryRepairAndParseJson(cleanText);
        } catch (parseError) {
          console.error("JSON Inválido devuelto por la IA:", cleanText.substring(0, 500) + '...');
          throw new Error("La IA no devolvió un JSON estructurado válido. " + parseError);
        }

        // =========================================================================
        // 🛡️ MOTOR DE AUDITORÍA AUTÓNOMA Y CONTROL DE CALIDAD PEDAGÓGICA (5 NIVELES)
        // =========================================================================
        if (parsed) {
          // 1. Auditoría Curricular (DBA vs Orientación Pedagógica MEN)
          if (!parsed.dba_utilizado || typeof parsed.dba_utilizado !== 'string' || parsed.dba_utilizado.trim().length < 5) {
            if (hasDBA) {
              parsed.dba_utilizado = (input.dba && input.dba.trim().length > 5)
                ? input.dba
                : `DBA #1 (MEN Colombia - ${input.area} Grado ${input.grado}): Identifica, comprende y analiza los referentes oficiales del MEN en relación con ${safeTema}.`;
            } else {
              parsed.dba_utilizado = `Orientación Pedagógica del MEN para ${input.area} (Grado ${input.grado}): Promueve el análisis crítico, la indagación y la reflexión en torno a ${safeTema}, de acuerdo con los Lineamientos Curriculares Nacionales del MEN.`;
            }
          } else if (!hasDBA && (parsed.dba_utilizado.toLowerCase().includes("dba oficial") || parsed.dba_utilizado.toLowerCase().startsWith("dba"))) {
            parsed.dba_utilizado = `Orientación Pedagógica del MEN para ${input.area} (Grado ${input.grado}): ${parsed.dba_utilizado.replace(/^DBA\s*(Oficial\s*del\s*MEN\s*\([^)]*\))?\s*[:-]?\s*/i, "")}`;
          }

          // 2. Auditoría de Inclusión (DUA / PIAR)
          if (!parsed.adecuaciones_piar || typeof parsed.adecuaciones_piar !== 'string' || parsed.adecuaciones_piar.trim().length < 15) {
            parsed.adecuaciones_piar = "1. Apoyos Visuales y Gráficos: Esquemas conceptuales y guías paso a paso.\n2. Flexibilización de Tiempos: Tiempo adicional adaptado para lectura y procesamiento de tareas.\n3. Trabajo por Pares y Tutoría: Acompañamiento guiado en mesa de trabajo según el Plan Individual de Ajustes Razonables (PIAR).";
          }

          // 3. Auditoría del Taller del Estudiante ("Vista Estudiante")
          if (!parsed.taller_imprimible || typeof parsed.taller_imprimible !== 'object') {
            parsed.taller_imprimible = {
              introduccion: `Bienvenido a esta Guía Práctica de Aprendizaje Autónomo sobre ${safeTema}. A lo largo de este taller explorarás situaciones reales, resolverás retos conceptuales y pondrás a prueba tus habilidades de análisis y producción.`,
              instrucciones: "Lee con atención cada lectura o situación presentada, resuelve las preguntas con argumentos claros y realiza el reto creativo al finalizar.",
              bitacora_test_inicial: `1. ¿Qué conocimientos previos tienes sobre ${safeTema} y dónde lo has observado en tu vida cotidiana?\n2. ¿Por qué consideras importante comprender este tema?`,
              ejercicios: [
                `Actividad 1 (Análisis de Caso): Lee el escenario sobre ${safeTema} y responde: a) ¿Cuál es la problemática central? b) Propón 2 soluciones fundamentadas.`,
                `Actividad 2 (Desarrollo Conceptual): Explica con tus palabras los componentes esenciales de ${safeTema} y elabora un esquema explicativo.`,
                `Actividad 3 (Aplicación Práctica): Desarrolla los ejercicios procedimentales aplicando los estándares trabajados en clase sobre ${safeTema}.`,
                `Actividad 4 (Resolución de Problemas): Analiza el siguiente caso de estudio relacionado con ${safeTema} y explica el procedimiento de solución.`,
                `Actividad 5 (Síntesis y Juicio Crítico): Redacta una conclusión de 5 líneas evaluando el impacto de ${safeTema} en el entorno escolar y cotidiano.`
              ],
              reto_creativo: `Diseña un mapa de ideas innovador o afiche explicativo que resuma los aprendizajes clave logrados sobre ${safeTema}.`
            };
          } else {
            if (!parsed.taller_imprimible.introduccion || parsed.taller_imprimible.introduccion.length < 15) {
              parsed.taller_imprimible.introduccion = `Bienvenido a esta Guía Práctica de Aprendizaje Autónomo sobre ${safeTema}. A lo largo de este taller explorarás situaciones reales, resolverás retos conceptuales y pondrás a prueba tus habilidades.`;
            }
            if (!parsed.taller_imprimible.instrucciones) {
              parsed.taller_imprimible.instrucciones = "Lee con atención cada lectura o situación, resuelve las preguntas con argumentos claros y completa cada actividad.";
            }
            if (!Array.isArray(parsed.taller_imprimible.ejercicios) || parsed.taller_imprimible.ejercicios.length < 3) {
              const baseEj = Array.isArray(parsed.taller_imprimible.ejercicios) ? parsed.taller_imprimible.ejercicios : [];
              parsed.taller_imprimible.ejercicios = [
                ...baseEj,
                `Actividad 1 (Análisis de Caso): Analiza la situación sobre ${safeTema} y responde: a) ¿Cuál es la problemática central? b) Propón 2 soluciones.`,
                `Actividad 2 (Desarrollo Conceptual): Explica con tus palabras los conceptos clave de ${safeTema} con un ejemplo real.`,
                `Actividad 3 (Aplicación Práctica): Desarrolla los ejercicios procedimentales sobre ${safeTema}.`,
                `Actividad 4 (Resolución de Problemas): Analiza y resuelve el caso hipotético del tema.`,
                `Actividad 5 (Síntesis Crítica): Redacta un resumen de 5 líneas con tus conclusiones sobre ${safeTema}.`
              ].slice(0, 5);
            }
          }

          // 4. Auditoría Estructural de Arreglos y Fases de Sesión Ricas
          parsed.contenidos = Array.isArray(parsed.contenidos) ? parsed.contenidos : [parsed.contenidos || "Contenido Principal"];
          parsed.actividades = Array.isArray(parsed.actividades) 
            ? parsed.actividades.map((act: any, aIdx: number) => {
                const inicio = (act.fase_inicio && act.fase_inicio.trim().length > 25) 
                  ? act.fase_inicio 
                  : `El docente inicia la sesión activando saberes previos sobre ${safeTema} mediante una situación problema detonante del entorno cotidiano. Los estudiantes expresan sus hipótesis iniciales y comparten sus experiencias previas en parejas.`;

                const desarrollo = (act.fase_desarrollo && act.fase_desarrollo.trim().length > 35) 
                  ? act.fase_desarrollo 
                  : `Fase de estructuración y práctica guiada: El docente expone dialogadamente los principios esenciales de ${safeTema} apoyado en organizadores gráficos y ejemplos concretos. Posteriormente, los estudiantes resuelven ejercicios procedimentales y casos situados en equipos de trabajo colaborativo.`;

                const cierre = (act.fase_cierre && act.fase_cierre.trim().length > 25) 
                  ? act.fase_cierre 
                  : `Plenaria y metacognición: Socialización colectiva de resultados, sintetización de las ideas clave sobre ${safeTema} por parte del docente y evaluación formativa reflexiva integrando el eje CRESE.`;

                return {
                  ...act,
                  sesion: act.sesion || (aIdx + 1),
                  fase_inicio: inicio,
                  fase_desarrollo: desarrollo,
                  fase_cierre: cierre,
                  materiales: Array.isArray(act.materiales) ? act.materiales : (act.materiales ? [String(act.materiales)] : ["Tablero, cuadernos de apuntes, guía de trabajo e indicadores visuales"]),
                  preguntas_socraticas: Array.isArray(act.preguntas_socraticas) && act.preguntas_socraticas.length > 0 
                    ? act.preguntas_socraticas 
                    : [
                        `¿De qué manera el concepto de ${safeTema} se manifiesta en situaciones reales de tu entorno?`,
                        `¿Qué estrategia procedimental te permitió verificar la validez de tu respuesta?`
                      ]
                };
              })
            : [];
          parsed.rubrica = Array.isArray(parsed.rubrica) ? parsed.rubrica : [];
          // 4. Normalización estricta de Recursos: Exactamente 1 SOLO VIDEO PRINCIPAL + materiales de aula
          let cleanRecursos: any[] = [];

          if (Array.isArray(parsed.recursos) && parsed.recursos.length > 0) {
            const videos = parsed.recursos.filter((r: any) => {
              const n = (r?.nombre || "").toString().toLowerCase();
              const d = (r?.descripcion || "").toString().toLowerCase();
              return n.includes("video") || d.includes("video") || n.includes("youtube");
            });

            const nonVideos = parsed.recursos.filter((r: any) => {
              const n = (r?.nombre || "").toString().toLowerCase();
              const d = (r?.descripcion || "").toString().toLowerCase();
              return !n.includes("video") && !d.includes("video") && !n.includes("youtube");
            });

            // 1 Solo Video Principal (Único Recurso)
            if (videos.length > 0) {
              cleanRecursos.push(videos[0]);
            } else {
              cleanRecursos.push({
                nombre: `Video Explicativo: '${safeTema} - Conceptos Clave (${input.grado})'`,
                descripcion: `Tutorial audiovisual adaptado para niños y estudiantes de ${input.grado}.`
              });
            }
          } else {
            cleanRecursos = [
              {
                nombre: `Video Explicativo: '${safeTema} - Conceptos Clave (${input.grado})'`,
                descripcion: `Tutorial audiovisual adaptado para ${input.grado}.`
              }
            ];
          }

          parsed.recursos = cleanRecursos.map((r: any) => ({
            nombre: (r?.nombre || "Video Explicativo").toString(),
            descripcion: (r?.descripcion || "Material audiovisual de apoyo pedagógico.").toString().replace(/\s*\(Ver en YouTube:\s*https?:\/\/[^\)]+\)/gi, "").trim()
          }));
          parsed.glosario = Array.isArray(parsed.glosario) ? parsed.glosario : [];

          // 5. Auditoría Institucional de Textos
          parsed.tema_principal = parsed.tema_principal || safeTema;
          parsed.eje_crese_utilizado = parsed.eje_crese_utilizado || input.ejeCrese || "Educación para la paz, empatía y ciudadanía democrática.";
          parsed.alertas_generadas = Array.isArray(parsed.alertas_generadas) ? parsed.alertas_generadas : [];
          parsed.titulo_secuencia = parsed.titulo_secuencia || `Secuencia Didáctica: ${safeTema}`;
          parsed.descripcion_secuencia = parsed.descripcion_secuencia || `Secuencia didáctica orientada al desarrollo de aprendizajes significativos en ${safeTema}.`;
          parsed.objetivo_aprendizaje = parsed.objetivo_aprendizaje || `Comprender y aplicar los conceptos fundamentales de ${safeTema} mediante actividades prácticas e investigativas.`;
          parsed.metodologia = parsed.metodologia || "Aprendizaje Basado en Problemas (ABP) y Diseño Universal para el Aprendizaje (DUA)";
          parsed.productos_asociados = parsed.productos_asociados || `Bitácora de evidencias y taller completado sobre ${safeTema}`;
          parsed.instrumentos_evaluacion = parsed.instrumentos_evaluacion || "Rúbrica de desempeño Decreto 1290, observación directa y lista de cotejo";
          parsed.bibliografia = parsed.bibliografia || "Lineamientos Curriculares y Derechos Básicos de Aprendizaje (DBA) - Ministerio de Educación Nacional (MEN)";
          parsed.observaciones = parsed.observaciones || "Planeación alineada con los requerimientos pedagógicos institucionales.";
          parsed.corporiedad_adi = parsed.corporiedad_adi || "Pausa activa cerebral de 3 a 5 minutos (gimnasia cerebral y respiración guiada).";
        }

        // Auto-corrección y saneamiento de la Rúbrica (Garantiza los 4 niveles colombianos Decreto 1290)
        if (parsed && Array.isArray(parsed.rubrica) && parsed.rubrica.length > 0) {
          parsed.rubrica = parsed.rubrica.map((item: any) => {
            const crit = item.criterio || "Criterio de Evaluación";
            const bajoClean = (item.bajo && item.bajo.trim().length > 0) 
              ? item.bajo 
              : `Demuestra dificultades iniciales en ${crit.toLowerCase()} y requiere acompañamiento pedagógico continuo.`;
            return {
              criterio: crit,
              bajo: bajoClean,
              basico: item.basico || "Alcanza de manera básica las competencias y los aprendizajes esperados.",
              alto: item.alto || item.satisfactorio || "Demuestra un nivel alto de apropiación, análisis y aplicación del criterio.",
              superior: item.superior || item.avanzado || "Supera las expectativas con un dominio superior, liderazgo y pensamiento crítico.",
              retroalimentacion: item.retroalimentacion || "Continuar promoviendo el pensamiento crítico y la autonomía."
            };
          });
        }

        console.log(`%c[✨ ÉXITO EXTREMO] Respondió modelo ${modelName} usando Llave: ${label} (${tokensUsed} tokens)`, "color: #10b981; font-weight: bold;");

        // Guardar en caché local para evitar cobros repetidos si se vuelve a consultar el mismo tema
        saveToLocalCache(SEQ_CACHE_KEY, seqCacheKey, parsed);

        // Actualizar métricas
        if (!apiMetrics[keyId]) {
          apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, tokens: 0, lastUsed: "", label, errorLogs: [] };
        }
        apiMetrics[keyId].requests++;
        apiMetrics[keyId].success++;
        apiMetrics[keyId].tokens = (apiMetrics[keyId].tokens || 0) + tokensUsed;
        apiMetrics[keyId].lastUsed = new Date().toLocaleTimeString();
        saveMetricsToStorage();

        modelHealthStatus[modelName] = "online";
        logApiKeyUsage(label, 'success', undefined, modelName, tokensUsed);
        lastWorkingModel = modelName;

        return parsed as DidacticSequence;

        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`%c[🔄 Intento Fallido] Falló ${modelName} con llave ${label} (Intento ${attempt}/${maxRetries}). Error: ${errMsg}`, "color: #f59e0b;");
          
          // Detección Inteligente: Si es saldo insuficiente (402), no autorizado (401), límite de cuota (429), modelo no existe (404/400) o JSON no estructurable,
          // no tiene sentido esperar en la misma llave. Saltamos inmediatamente a la siguiente opción.
          const isFatalApiError = errMsg.includes('402') || errMsg.includes('401') || errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('400') || errMsg.includes('JSON') || errMsg.includes('SyntaxError');
          
          if (attempt === maxRetries || isFatalApiError) {
            modelHealthStatus[modelName] = "offline";
            
            if (!apiMetrics[keyId]) {
              apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, tokens: 0, lastUsed: "", label, errorLogs: [] };
            }
            apiMetrics[keyId].requests++;
            apiMetrics[keyId].errors++;
            apiMetrics[keyId].errorLogs.unshift({
              time: new Date().toLocaleTimeString(),
              message: errMsg
            });
            saveMetricsToStorage();

            logApiKeyUsage(label, 'error', errMsg, modelName);
            console.warn(`[⚠️ Conmutación Inteligente] Llave ${label} falló o está bloqueada. Saltando a la siguiente llave...`);
            break; // Rompe el ciclo de reintentos actual y pasa a la siguiente llave
          } else {
            // Pausa de 2.5 segundos solo para errores transitorios (ej. JSON malformado temporal, red inestable)
            await new Promise(r => setTimeout(r, 2500));
          }
        }
      }
    }
  }

  console.warn("🛡️ [Motor Pedagógico Inteligente Local Activo] Generando planeación dinámica adaptada a grado, área y sesiones...");
  return buildFailSafeSequence(input, refinementInstruction);
};

// =========================================================================
// 🧠 MOTOR PEDAGÓGICO INTELIGENTE MULTIGRADO Y MULTIÁREA (0 TOKENS / 100% DISPONIBLE)
// =========================================================================
function buildFailSafeSequence(input: SequenceInput, refinementInstruction?: string): DidacticSequence {
  const activeInstitution = institutionService.getActiveInstitution();
  const instName = activeInstitution.name || "la Institución Educativa Guaimaral";
  const tema = (input.tema || "Contenido Curricular").trim();
  const grado = (input.grado || "General").trim();
  const area = (input.area || "Área Principal").trim();
  const crese = (input.ejeCrese || "Educación Socioemocional, Convivencia Pacífica y Ciudadanía").trim();
  const sesionesCount = Math.min(Math.max(Number(input.sesiones) || 2, 1), 6);
  const cleanRefine = refinementInstruction ? sanitizeInput(refinementInstruction) : "";

  const gradeMeta = getGradeCategory(grado);
  const currentArea = area.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Semilla de variación para que cada tema o refinamiento genere estructuras y matices distintos
  const seedStr = `${tema}|${grado}|${area}|${cleanRefine}|${Date.now() % 7}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const pick = <T>(arr: T[], offset: number = 0): T => arr[Math.abs(hash + offset) % arr.length];

  // Clasificación disciplinar inteligente
  const isMath = /MATEM|GEOMETR|ESTADIST|ARITMET|CALCULO/.test(currentArea) || /suma|resta|adicion|sustraccion|multiplic|divisi|fraccion|numero|centena|decena|ecuaci|geometr/i.test(tema);
  const isLang = /LENGUA|HUMANIDAD|ESPANOL|LECTURA|COMUNICATIVA/.test(currentArea) || /silaba|fonema|letra|cuento|lectura|texto|oracion|verbo|sustantivo|narraci|poesia/i.test(tema);
  const isSci = /NATURAL|BIOLOG|QUIMIC|FISIC|AMBIENT/.test(currentArea) || /celula|planta|animal|ecosistema|agua|energia|materia|cuerpo|sistema|lluvia|arcoiris/i.test(tema);
  const isSoc = /SOCIAL|HISTORI|GEOGRAF|DEMOCRAC|PAZ|CIUDADAN/.test(currentArea) || /colombia|municipio|familia|comunidad|derecho|mapa|relieve|cultura|gobierno/i.test(tema);
  const isEng = /INGLES|EXTRANJERA|ENGLISH/.test(currentArea);
  const isPreescolar = gradeMeta.category === 'preescolar' || /DIMENSION|PREESCOLAR|TRANSICION/.test(currentArea);
  const isArt = /ARTIST|MUSICA|DANZA|ESTETICA/.test(currentArea);
  const isPE = /EDUCACION FISICA|DEPORTE|CORPORAL|MOTRIZ/.test(currentArea);
  const isEthics = /ETICA|VALORES|RELIGION|CONVIVENCIA|SOCIOAFECTIVA/.test(currentArea) || /emocio|alegria|ira|miedo|verguenza|respeto|empatia|solidaridad/i.test(tema);
  const isTech = /TECNOLOG|INFORMAT|COMPUT|SISTEMAS/.test(currentArea);

  const areaNormativa = {
    conDBA: ['MATEMATICAS', 'LENGUAJE', 'CIENCIAS NATURALES', 'CIENCIAS SOCIALES', 'INGLES', 'FISICA', 'ESTADISTICA', 'GEOMETRIA', 'BIOLOGIA', 'QUIMICA'],
  };
  const hasDBA = areaNormativa.conDBA.some(a => currentArea.includes(a));

  // Perfil disciplinar y metodológico específico
  let metodologiaArea = "Aprendizaje Basado en Problemas (ABP), Indagación Guiada y Diseño Universal para el Aprendizaje (DUA)";
  let estandarArea = `Comprende, argumenta y aplica saberes esenciales de ${area} en torno a ${tema}, demostrando pensamiento crítico y compromiso ciudadano en su contexto.`;
  let competenciaArea = `Interpretación, argumentación y proposición frente a situaciones problema del área de ${area} adaptadas a ${gradeMeta.cleanGradeName}.`;
  let dbaDefault = `DBA Oficial MEN (${area} - ${gradeMeta.cleanGradeName}): Comprende y utiliza conceptos, relaciones y procedimientos asociados a ${tema} para resolver situaciones reales de su entorno.`;
  let materialesBase = ["Tablero, marcadores y organizadores visuales", "Guía de trabajo impresa y cuaderno del área", "Material concreto del entorno escolar", "Recursos audiovisuales y fichas de trabajo"];
  let ejerciciosTaller: string[] = [];
  let retoCreativo = "";
  let glosarioArea: { termino: string; definicion: string }[] = [];

  if (isPreescolar) {
    metodologiaArea = "Actividades Rectoras de la Primera Infancia MEN (El Juego, el Arte, la Literatura y la Exploración del Medio) con enfoque sensorial y DUA";
    estandarArea = `Reconoce, explora y expresa de manera lúdica, corporal y gráfica sus vivencias y aprendizajes sobre ${tema} en interacción armónica con sus compañeros.`;
    competenciaArea = `Desarrollo socioafectivo, comunicativo, corporal y cognitivo mediante experiencias sensoriales y juego pedagógico intencionado sobre ${tema}.`;
    dbaDefault = `DBA Transición MEN (Propósitos de Desarrollo y Aprendizaje): Las niñas y los niños construyen su identidad, se comunican creativamente y exploran el mundo a través de experiencias vivenciales sobre ${tema}.`;
    materialesBase = ["Caja mágica de sorpresas, títeres y láminas ilustradas", "Plastilina, crayolas, témperas y papel bond", "Cuento infantil ilustrado y canciones pedagógicas", "Bloques lógicos, fichas de colores y material sensorial"];
    ejerciciosTaller = [
      `1. ¡Exploro y Observo! Con ayuda de tu profe o familia, observa la lámina ilustrada sobre ${tema}, señala los elementos que reconoces y nómbralos en voz alta.`,
      `2. ¡Manitos Creativas! Colorea con crayolas o decora con bolitas de papel seda y plastilina la figura principal relacionada con ${tema}.`,
      `3. ¡Trazo y Asocio! Une con una línea de tu color favorito cada dibujo de ${tema} con su pareja o situación correspondiente.`,
      `4. ¡Encierro y Clasifico! Observa el conjunto de imágenes y encierra en un círculo rojo aquellas que representan ejemplos de ${tema}.`,
      `5. ¡Mi Expresión Infantil! Dibuja en el recuadro cómo te sentiste aprendiendo sobre ${tema} hoy y cuéntale tu dibujo a tus compañeros.`
    ];
    retoCreativo = `Modela con plastilina de colores o pinta con dactilopintura una creación libre sobre ${tema} para exponerla en el Rincón de Arte del salón.`;
    glosarioArea = [
      { termino: tema, definicion: `Concepto que exploramos jugando, cantando, observando y creando en nuestro grado ${grado}.` },
      { termino: "Exploración Sensorial", definicion: "Aprender tocando, mirando, escuchando y experimentando con materiales reales." },
      { termino: "Juego Cooperativo", definicion: "Compartir, respetar turnos y aprender felices junto a nuestros compañeros." }
    ];
  } else if (isMath) {
    metodologiaArea = "Método de Resolución de Problemas de George Pólya (Comprender, Planificar, Ejecutar y Verificar), Manipulación Concreta-Pictórica-Simbólica (CPA) y DUA";
    estandarArea = `Pensamiento Numérico, Espacial y Variacional (MEN): Resuelve y formula problemas en contextos reales utilizando propiedades, relaciones y procedimientos de ${tema}.`;
    competenciaArea = `Razonamiento cuantitativo, modelación matemática, comunicación y resolución de situaciones problema sobre ${tema} en ${gradeMeta.cleanGradeName}.`;
    dbaDefault = `DBA Matemáticas MEN (${gradeMeta.cleanGradeName}): Interpreta, propone y resuelve problemas aditivos, multiplicativos o variacionales que involucran ${tema} utilizando diversas estrategias de cálculo y representación.`;
    materialesBase = ["Material manipulativo (tapitas, regletas, ábaco, billetes didácticos o bloques base 10)", "Tablero cuadriculado y tarjetas de retos numéricos", "Guía de ejercicios graduados por nivel", "Cuaderno de matemáticas y lápices de colores"];
    ejerciciosTaller = [
      `1. Representación Gráfica y Concreta: Representa mediante dibujos, bloques, conjuntos o esquemas 3 ejemplos claros que muestren cómo funciona ${tema}.`,
      `2. Práctica Procedimental Paso a Paso: Resuelve los 4 ejercicios graduados de ${tema} mostrando claramente cada paso del procedimiento y verificando el resultado.`,
      `3. Problema Contextualizado en Guaimaral: En la tienda escolar o cosecha comunitaria de nuestra vereda se presenta una situación cotidiana que requiere aplicar ${tema}. Lee los datos, plantea la operación y redacta la respuesta completa.`,
      `4. El Detective del Error Matemático: Observa el procedimiento resuelto en la guía donde se cometió una equivocación al aplicar ${tema}. Descubre dónde está el error, corrígelo y explica por qué ocurrió.`,
      `5. Creación de Reto Propio: Inventa un problema de la vida diaria para tu compañero de puesto donde deba usar ${tema} para encontrar la solución.`
    ];
    retoCreativo = `Construye un juego de mesa matemático (lotería, dominó o tarjetas de desafío) sobre ${tema} para jugar y practicar en equipos durante la clase.`;
    glosarioArea = [
      { termino: tema, definicion: `Concepto y procedimiento matemático fundamental trabajado en ${gradeMeta.cleanGradeName} para resolver problemas cotidianos.` },
      { termino: "Algoritmo / Procedimiento", definicion: "Secuencia ordenada de pasos lógicos que seguimos para realizar un cálculo o resolver un problema." },
      { termino: "Verificación Matemática", definicion: "Comprobar mediante una operación inversa o representación gráfica que nuestro resultado tiene sentido." }
    ];
  } else if (isLang) {
    metodologiaArea = "Prácticas Sociales del Lenguaje, Lectura Crítica en Tres Niveles (Literal, Inferencial y Crítico-Intertextual), Escritura como Proceso y DUA";
    estandarArea = `Comprensión e Interpretación Textual y Producción Escrita (MEN): Comprende diversos tipos de textos y produce mensajes orales y escritos aplicando con propiedad ${tema}.`;
    competenciaArea = `Competencia comunicativa-lectora y comunicativa-escritora (semántica, sintáctica y pragmática) aplicada al dominio de ${tema}.`;
    dbaDefault = `DBA Lenguaje MEN (${gradeMeta.cleanGradeName}): Produce e interpreta textos orales y escritos atendiendo a la estructura, intención comunicativa y uso adecuado de ${tema}.`;
    materialesBase = ["Texto de lectura contextualizado y tarjetas de vocabulario", "Fichas léxicas / silábicas y organizadores de lectura", "Cuaderno de Lenguaje y diccionario escolar", "Guía de taller de lectura y escritura creativa"];
    ejerciciosTaller = [
      `1. Exploración Lectora (Nivel Literal): Lee en voz alta y silenciosa el texto corto de la guía y subraya con color todos los ejemplos o palabras clave donde aparece ${tema}.`,
      `2. Comprensión e Interpretación (Nivel Inferencial): Responde con tus propias palabras: ¿Cuál es el mensaje central del texto y cómo ayuda ${tema} a que se entienda con claridad?`,
      `3. Laboratorio del Lenguaje: Completa las actividades de reconocimiento, clasificación y construcción de palabras u oraciones aplicando las reglas de ${tema}.`,
      `4. Producción Textual Guiada: Redacta un párrafo, diálogo o micro-cuento ambientado en nuestra comunidad de Guaimaral utilizando al menos 5 ejemplos de ${tema}.`,
      `5. Valoración Crítica y Socialización: Revisa tu escrito con un compañero (autocorrección ortográfica y de sentido) y explica por qué es importante usar bien ${tema} al comunicarnos.`
    ];
    retoCreativo = `Crea un mini-libro ilustrado, historieta o cartelera literaria donde ${tema} sea el protagonista de una historia inspiradora sobre la convivencia escolar.`;
    glosarioArea = [
      { termino: tema, definicion: `Elemento lingüístico y comunicativo clave para comprender y producir textos en ${gradeMeta.cleanGradeName}.` },
      { termino: "Sentido Global del Texto", definicion: "Idea o mensaje principal que el autor transmite a través de las palabras y oraciones." },
      { termino: "Coherencia Comunicativa", definicion: "Propiedad que permite que nuestras ideas orales o escritas sean claras y fáciles de entender." }
    ];
  } else if (isSci) {
    metodologiaArea = "Aprendizaje por Indagación Científica Escolar (Observación, Pregunta, Hipótesis, Experimentación y Conclusión), Educación Ambiental (PRAE) y DUA";
    estandarArea = `Entorno Vivo, Entorno Físico y Ciencia, Tecnología y Sociedad (MEN): Me identifico como un ser vivo que comparte características con otros y explico fenómenos relacionados con ${tema}.`;
    competenciaArea = `Uso comprensivo del conocimiento científico, explicación de fenómenos e indagación experimental aplicada a ${tema} en ${gradeMeta.cleanGradeName}.`;
    dbaDefault = `DBA Ciencias Naturales MEN (${gradeMeta.cleanGradeName}): Comprende y explica los procesos, interacciones y fenómenos asociados a ${tema} a partir de la observación y el registro de evidencias del entorno.`;
    materialesBase = ["Materiales sencillos de observación / mini-laboratorio escolar", "Láminas científicas y bitácora de indagación", "Entorno natural de la institución y lupas/esquemas", "Guía práctica de ciencias y colores"];
    ejerciciosTaller = [
      `1. Pregunta de Indagación e Hipótesis: Observa el fenómeno cotidiano descrito sobre ${tema} y escribe tu hipótesis: ¿Por qué crees que ocurre y qué pasaría si cambiara una condición?`,
      `2. Esquema Científico Rotulado: Elabora un dibujo o diagrama detallado sobre ${tema}, señalando con flechas sus partes, etapas o componentes principales.`,
      `3. Registro de Observación / Experimento: Completa la tabla comparativa registrando las características observadas, causas y efectos relacionados con ${tema}.`,
      `4. Conexión con Nuestro Entorno (PRAE Guaimaral): Explica cómo se manifiesta ${tema} en la naturaleza, cultivos, salud o ecosistema de nuestra comunidad y cómo debemos cuidarlo.`,
      `5. Conclusión Científica: Contrasta tu hipótesis inicial con lo aprendido en clase y redacta 3 conclusiones claras respaldadas en evidencias.`
    ];
    retoCreativo = `Diseña una maqueta ecológica con materiales reciclables o un afiche científico explicativo sobre ${tema} y su importancia para la vida y el ambiente.`;
    glosarioArea = [
      { termino: tema, definicion: `Fenómeno, proceso o concepto de las Ciencias Naturales estudiado mediante la observación y la indagación.` },
      { termino: "Hipótesis Científica", definicion: "Explicación inicial o suposición razonada que ponemos a prueba mediante la observación y la experiencia." },
      { termino: "Conciencia Ambiental (PRAE)", definicion: "Compromiso activo con el cuidado de la vida, la salud y los recursos naturales de nuestro territorio." }
    ];
  } else if (isSoc || isEthics) {
    metodologiaArea = "Aprendizaje Basado en Estudio de Casos, Pensamiento Histórico-Crítico, Círculos de Diálogo Restaurativo (Eje CRESE) y DUA";
    estandarArea = `Relaciones con la Historia, la Cultura, el Espacio y Ética Ciudadana (MEN): Reconozco la interacción entre el ser humano, la comunidad y los valores ciudadanos en torno a ${tema}.`;
    competenciaArea = `Pensamiento social, interpretación y análisis de perspectivas, pensamiento reflexivo y sistémico aplicado a ${tema}.`;
    dbaDefault = `DBA / Lineamiento MEN (${area} - ${gradeMeta.cleanGradeName}): Analiza situaciones sociales, históricas, éticas y emocionales relacionadas con ${tema}, proponiendo alternativas de convivencia pacífica y participación democrática.`;
    materialesBase = ["Relatos de casos cotidianos, mapas o líneas de tiempo", "Tarjetas de emociones/dilemas ciudadanos y papelógrafos", "Guía de análisis social y cuaderno de bitácora", "Marcadores y acuerdos de convivencia del aula"];
    ejerciciosTaller = [
      `1. Lectura de Caso Contextualizado: Lee la historia sobre una situación ocurrida en una escuela o comunidad relacionada con ${tema}. Identifica los protagonistas, sus emociones y el reto principal.`,
      `2. Mapa de Ideas o Cuadro Comparativo: Organiza en el esquema las características principales, causas y consecuencias de ${tema} en nuestra vida personal y comunitaria.`,
      `3. Ponte en el Lugar del Otro (Empatía CRESE): Si tú estuvieras en la situación analizada sobre ${tema}, ¿cómo actuarías para promover el respeto, la regulación emocional y el bienestar común?`,
      `4. Conexión con Nuestra Comunidad: Describe un ejemplo real de tu familia, salón de clases o corregimiento de Guaimaral donde se viva la importancia de ${tema}.`,
      `5. Compromiso Ciudadano y Personal: Formula 3 acuerdos prácticos que podemos aplicar en el salón de clases a partir de lo aprendido sobre ${tema}.`
    ];
    retoCreativo = `Elabora un mural colectivo, decálogo ilustrado o dramatización corta que enseñe a otros estudiantes cómo practicar ${tema} para una convivencia en paz.`;
    glosarioArea = [
      { termino: tema, definicion: `Eje formativo social, ético o ciudadano fundamental para el desarrollo integral y la convivencia en ${gradeMeta.cleanGradeName}.` },
      { termino: "Empatía y Autorregulación", definicion: "Capacidad de comprender lo que sienten los demás y expresar nuestras emociones de manera constructiva." },
      { termino: "Convivencia Ciudadana", definicion: "Construcción diaria de relaciones basadas en el respeto, el diálogo y la corresponsabilidad comunitaria." }
    ];
  } else if (isEng) {
    metodologiaArea = "Communicative Language Teaching (CLT), Task-Based Learning (Listening, Speaking, Reading & Writing) alineado al MCER y DUA";
    estandarArea = `Estándares Básicos de Competencias en Lenguas Extranjeras - Inglés (MEN): Comprende y utiliza expresiones cotidianas, vocabulario y estructuras comunicativas sobre ${tema}.`;
    competenciaArea = `Competencia lingüística, pragmática y sociolingüística en inglés (Nivel MCER adaptado a ${gradeMeta.cleanGradeName}) en torno a ${tema}.`;
    dbaDefault = `DBA Inglés MEN (${gradeMeta.cleanGradeName}): Comprende y participa en intercambios comunicativos breves y textos sencillos en inglés relacionados con ${tema}.`;
    materialesBase = ["Flashcards ilustradas de vocabulario y pronunciación", "Diálogos modelo en cartelera / audio guiado por el docente", "Worksheet interactiva bilingüe (Inglés-Español)", "Cuaderno de inglés y diccionario bilingüe"];
    ejerciciosTaller = [
      `1. Vocabulary Bank & Visual Matching: Relaciona cada palabra o expresión en inglés sobre ${tema} con su imagen y significado en español, practicando su pronunciación.`,
      `2. Sentence Completion (Grammar in Context): Completa las 5 oraciones en inglés utilizando correctamente el vocabulario y la estructura estudiada sobre ${tema}.`,
      `3. Short Reading Comprehension: Lee el diálogo o párrafo corto en inglés acerca de ${tema} y responde las 3 preguntas de comprensión.`,
      `4. Role-Play & Speaking Practice: En parejas, completa y practica en voz alta una conversación corta utilizando al menos 4 expresiones de ${tema}.`,
      `5. My Personal Production: Escribe 4 oraciones propias en inglés acompañadas de un dibujo que describan ejemplos de ${tema} en tu vida diaria.`
    ];
    retoCreativo = `Diseña un Póster Bilingüe Ilustrado (Mini-Dictionary Poster) con las palabras y frases más importantes en inglés sobre ${tema}.`;
    glosarioArea = [
      { termino: tema, definicion: `Core communicative topic and vocabulary set practiced in English for ${gradeMeta.cleanGradeName}.` },
      { termino: "Communicative Competence", definicion: "Habilidad para usar el inglés en situaciones reales de escucha, habla, lectura y escritura." },
      { termino: "Key Vocabulary", definicion: "Palabras y expresiones esenciales del tema que permiten construir oraciones con sentido." }
    ];
  } else {
    // Artística, Ed. Física, Tecnología, Integral u otras áreas
    metodologiaArea = `Aprendizaje Activo por Proyectos, Taller Práctico Experiencial en ${area} y Diseño Universal para el Aprendizaje (DUA)`;
    estandarArea = `Lineamientos Curriculares del MEN para ${area}: Desarrolla habilidades expresivas, técnicas, creativas y reflexivas mediante la apropiación práctica de ${tema}.`;
    competenciaArea = `Sensibilidad, apropiación conceptual, práctica creativa y trabajo colaborativo aplicados a ${tema} en ${gradeMeta.cleanGradeName}.`;
    dbaDefault = `Orientaciones Pedagógicas del MEN para ${area} (${gradeMeta.cleanGradeName}): Promueve el desarrollo integral, la creatividad, el pensamiento práctico y la valoración de ${tema} en contextos escolares y comunitarios.`;
    ejerciciosTaller = [
      `1. Exploración y Diagnóstico Práctico: Identifica los elementos principales, herramientas o técnicas de ${tema} y descríbelos con ejemplos de tu entorno.`,
      `2. Esquema Paso a Paso: Organiza en una secuencia gráfica o cuadro explicativo las etapas necesarias para desarrollar una práctica correcta de ${tema}.`,
      `3. Ejercicio de Aplicación Guiada: Realiza la práctica central de ${tema} siguiendo los criterios de calidad, cuidado postural/técnico y creatividad explicados en clase.`,
      `4. Análisis de Caso y Mejora: Observa una situación cotidiana donde se aplica ${tema} y propón 2 mejoras creativas para obtener un mejor resultado en equipo.`,
      `5. Bitácora de Autoevaluación Reflexiva: Describe en 5 líneas qué habilidad fortaleciste hoy con ${tema} y cómo aporta a tu formación integral.`
    ];
    retoCreativo = `Realiza una muestra práctica, prototipo creativo o presentación demostrativa sobre ${tema} integrando valores de convivencia del eje CRESE.`;
    glosarioArea = [
      { termino: tema, definicion: `Eje práctico y conceptual de ${area} orientado al desarrollo de habilidades integrales en ${gradeMeta.cleanGradeName}.` },
      { termino: "Práctica Guiada", definicion: "Fase de aprendizaje donde aplicamos paso a paso la técnica o concepto con acompañamiento del docente." },
      { termino: "Aprendizaje Significativo", definicion: "Conectar lo que aprendemos en el colegio con nuestras habilidades y experiencias de la vida real." }
    ];
  }

  const dbaFormatted = hasDBA
    ? (input.dba && input.dba.trim().length > 5 ? input.dba : dbaDefault)
    : (input.dba && input.dba.trim().length > 5 ? input.dba : `Tomado de las Orientaciones Pedagógicas y Lineamientos Curriculares del MEN para ${area} (${gradeMeta.cleanGradeName}): ${dbaDefault}`);

  // Nota de adaptación multigrado si aplica
  const multigradoNote = gradeMeta.category === 'multigrado'
    ? (grado.toLowerCase().includes('6') || grado.toLowerCase().includes('11') || grado.toLowerCase().includes('bachillerato')
        ? " [Diferenciación Multigrado Bachillerato: Nivel Básico (6°-7°) identificación y modelado guiado; Nivel Intermedio (8°-9°) análisis relacional y resolución de casos; Nivel Avanzado (10°-11°) argumentación crítica tipo Saber 11 y tutoría a pares]."
        : " [Diferenciación Multigrado Escuela Nueva: Nivel Inicial (1°-2°) manipulación concreta, dibujo y acompañamiento directo; Nivel Medio (3°) ejercicios guiados con fichas; Nivel Avanzado (4°-5°) resolución autónoma de problemas y liderazgo como monitores de mesa].")
    : "";

  const refineNote = cleanRefine
    ? ` Se incorpora de manera transversal el énfasis solicitado por el docente: "${cleanRefine}".`
    : "";

  // Generación dinámica de las N sesiones solicitadas con progresión pedagógica real
  const sessionBlueprints = [
    {
      etapa: "Exploración Vivencial y Activación de Saberes Previos",
      inicio: isPreescolar
        ? `El docente recibe a los niños y niñas con una canción motivadora y presenta la "Caja Mágica Sorpresa" con objetos e imágenes alusivas a ${tema}. Mediante preguntas sencillas y juego de adivinanzas se despierta la curiosidad infantil y se exploran sus vivencias cotidianas.${refineNote}`
        : `El docente inicia la sesión presentando una situación detonante del contexto real de Guaimaral relacionada con ${tema}. A través de una lluvia de ideas socrática y un reto diagnóstico corto en el tablero, los estudiantes activan sus saberes previos, formulan hipótesis iniciales y comprenden la utilidad práctica del tema.${refineNote}`,
      desarrollo: isPreescolar
        ? `En círculo de exploración, el docente narra un cuento interactivo o realiza una demostración lúdica con material concreto sobre ${tema}. Los niños manipulan fichas, colores o bloques, identifican las características principales jugando en rincones de aprendizaje y expresan corporal y verbalmente sus descubrimientos.${multigradoNote}`
        : `El docente realiza la explicación dialogada y el modelado conceptual de los fundamentos de ${tema}, apoyándose en ejemplos visuales, material concreto y un organizador gráfico en el tablero. Los estudiantes registran las ideas clave en sus cuadernos y desarrollan los primeros ejercicios de reconocimiento guiado en parejas.${multigradoNote}`,
      cierre: `Se socializan en plenaria las primeras conclusiones sobre ${tema}. El docente aclara inquietudes iniciales, felicita la participación empática (Eje CRESE: ${crese}) y aplica un boleto de salida oral: "¿Qué descubrimos hoy y dónde lo vemos en nuestra casa o comunidad?".`,
      adi: "Pausa activa ADI (4 min): Gimnasia cerebral de coordinación cruzada (mano derecha a rodilla izquierda) y 3 respiraciones profundas para centrar la atención.",
      imprimible: `Ficha de exploración diagnóstica y organizador visual inicial sobre ${tema}`
    },
    {
      etapa: "Estructuración Conceptual, Modelado y Práctica Guiada",
      inicio: `Se inicia con una dinámica rápida de recordación ("El Dado Preguntón" o reto relámpago en parejas) para retomar los conceptos esenciales de ${tema} vistos en la sesión anterior, conectándolos con un nuevo desafío de mayor profundidad.`,
      desarrollo: `Fase de práctica guiada y desarrollo procedimental: el docente modela paso a paso la resolución de situaciones o ejercicios sobre ${tema}. Posteriormente, los estudiantes abordan las primeras actividades del Taller Imprimible en mesas cooperativas, mientras el docente realiza acompañamiento personalizado aplicando ajustes DUA/PIAR a quienes requieren apoyo adicional.${multigradoNote}${refineNote}`,
      cierre: `Revisión colectiva en el tablero de los ejercicios trabajados. Los estudiantes explican con sus propias palabras el procedimiento utilizado (aprender del error como oportunidad) y realizan coevaluación respetuosa entre compañeros de mesa.`,
      adi: "Pausa activa ADI (4 min): Estiramiento articular céfalo-caudal, pausa visual de enfoque lejano/cercano y dinámica rítmica de palmas.",
      imprimible: `Sección 1 y 2 del Taller del Estudiante sobre ${tema}`
    },
    {
      etapa: "Aprendizaje Colaborativo y Resolución de Problemas Contextualizados",
      inicio: `El docente plantea un estudio de caso o desafío práctico de la vida cotidiana que requiere aplicar ${tema} en equipo. Se asignan roles cooperativos dentro de cada grupo (líder moderador, relator, encargado de materiales y verificador).`,
      desarrollo: `Trabajo colaborativo intensivo: cada equipo resuelve los retos de aplicación y análisis de casos del Taller sobre ${tema}, construyendo una propuesta o representación clara en su cuaderno o papelógrafo. Se fomenta el diálogo respetuoso, la escucha activa y la inclusión de todos los integrantes (${crese}).${multigradoNote}${refineNote}`,
      cierre: `Galería de aprendizajes: un representante de cada equipo comparte cómo resolvieron el caso de ${tema}. El docente retroalimenta los aciertos y sintetiza las reglas o aprendizajes fundamentales.`,
      adi: "Pausa activa ADI (3 min): Dinámica de sincronización grupal 'Espejo en Parejas' y respiración consciente para fortalecer la empatía.",
      imprimible: `Guía de estudio de casos y actividades colaborativas de ${tema}`
    },
    {
      etapa: "Transferencia al Contexto Real, Evaluación Formativa y Metacognición",
      inicio: `Activación mediante 2 preguntas de análisis tipo Prueba Saber proyectadas o escritas en el tablero sobre ${tema}. Los estudiantes argumentan cuál opción consideran correcta y por qué se descartan las demás.`,
      desarrollo: `Fase de transferencia y cierre del Taller: los estudiantes culminan el Reto Creativo y responden la evaluación formativa sobre ${tema}. El docente verifica el logro del objetivo de aprendizaje utilizando la Rúbrica Decreto 1290 (niveles Bajo, Básico, Alto y Superior) y brinda retroalimentación oportuna.${multigradoNote}${refineNote}`,
      cierre: `Círculo de metacognición y cierre formativo: los estudiantes reflexionan sobre la escalera de la metacognición (¿Qué aprendí sobre ${tema}? ¿Cómo lo aprendí? ¿Qué me costó más y cómo lo superé? ¿Para qué me sirve en la vida diaria?) celebrando los logros alcanzados.`,
      adi: "Pausa activa ADI (3 min): Ejercicio de relajación muscular progresiva y gesto colectivo de reconocimiento al esfuerzo del grupo.",
      imprimible: `Taller completado, Reto Creativo y Cuestionario Tipo Saber sobre ${tema}`
    },
    {
      etapa: "Profundización, Refuerzo Diferenciado (DUA/PIAR) y Reto Creativo",
      inicio: `A partir de los resultados de la sesión anterior, el docente organiza estaciones de aprendizaje por niveles de dominio sobre ${tema} para brindar refuerzo y profundización.`,
      desarrollo: `Estación 1 (Refuerzo con material concreto y apoyo visual para afianzar bases de ${tema}) y Estación 2 (Reto de ampliación y creación aplicada). Los estudiantes avanzados actúan como tutores pares apoyando con empatía a sus compañeros.${multigradoNote}${refineNote}`,
      cierre: `Socialización de avances en las estaciones de trabajo y registro de mejoras en la bitácora individual del estudiante.`,
      adi: "Pausa activa ADI (4 min): Juego corto de reacción motriz 'Tierra, Mar y Aire' para recargar energía positiva.",
      imprimible: `Fichas de refuerzo multinivel DUA/PIAR sobre ${tema}`
    },
    {
      etapa: "Socialización Final de Productos, Simulacro Saber y Balance CRESE",
      inicio: `Preparación del aula para la muestra pedagógica de productos y repaso rápido de los conceptos clave del glosario de ${tema}.`,
      desarrollo: `Exposición de los productos finales y retos creativos elaborados sobre ${tema}. Posteriormente, se resuelve y retroalimenta en conjunto el bloque final de preguntas tipo Saber-ICFES verificando la apropiación integral del DBA/Estándar.${multigradoNote}${refineNote}`,
      cierre: `Balance final académico y socioemocional (${crese}): autoevaluación, coevaluación y heteroevaluación conforme al Decreto 1290.`,
      adi: "Pausa activa ADI (3 min): Círculo de aplauso cooperativo y respiración de cierre.",
      imprimible: `Rúbrica de evaluación final Decreto 1290 y muestra de productos de ${tema}`
    }
  ];

  const actividades = Array.from({ length: sesionesCount }, (_, idx) => {
    // Si piden 2 sesiones, usar la 1 (Exploración/Estructuración) y la 4 (Práctica/Transferencia/Evaluación) para que el ciclo sea completo
    const blueprintIdx = sesionesCount === 1
      ? 0
      : (sesionesCount === 2 && idx === 1 ? 3 : Math.min(idx, sessionBlueprints.length - 1));
    const bp = sessionBlueprints[blueprintIdx];

    return {
      sesion: idx + 1,
      fase_inicio: `[${bp.etapa}] ${bp.inicio}`,
      fase_desarrollo: bp.desarrollo,
      fase_cierre: bp.cierre,
      preguntas_socraticas: [
        `¿Cómo podemos explicar con nuestras propias palabras qué es ${tema} y cómo se relaciona con lo que vemos a diario en nuestra comunidad?`,
        `¿Qué pasos o estrategias nos ayudaron hoy a comprender y resolver las actividades de ${tema} en ${area}?`
      ],
      materiales: materialesBase,
      tiempo: "60 minutos",
      imprimibles: bp.imprimible,
      adi_especifico: bp.adi
    };
  });

  // Selección variada de títulos pedagógicos para evitar que todas las planeaciones se llamen igual
  const titulosVariados = [
    `Ruta de Aprendizaje Significativo: ${tema}`,
    `Secuencia Didáctica Activa: Explorando ${tema} en ${gradeMeta.cleanGradeName}`,
    `Experiencia Pedagógica Contextualizada: ${tema}`,
    `Laboratorio de Saberes y Competencias: ${tema}`,
    `Unidad de Aprendizaje Integral: ${tema} (${area})`
  ];

  // 3 Preguntas tipo Saber-ICFES completas (Literal, Inferencial, Crítica/Aplicación)
  const evaluacion3Preguntas: EvaluationItem[] = [
    {
      pregunta: `[Competencia Interpretativa / Nivel Literal] Durante la clase de ${area} en ${gradeMeta.cleanGradeName}, los estudiantes analizan las características fundamentales de ${tema}. ¿Cuál de los siguientes enunciados identifica correctamente su propósito y sentido principal?`,
      tipo: "Selección Múltiple tipo Saber-ICFES",
      opciones: [
        `A) Comprender los elementos esenciales de ${tema} y relacionarlos con ejemplos reales del entorno escolar y cotidiano.`,
        `B) Memorizar palabras aisladas sobre ${tema} sin analizar su significado ni su utilidad práctica.`,
        `C) Ignorar las reglas y características de ${tema} para responder al azar sin observación previa.`,
        `D) Confundir ${tema} con actividades ajenas al área de ${area} sin verificar las evidencias.`
      ],
      respuesta_correcta: "A",
      justificacion: `La opción A es correcta porque articula la comprensión conceptual de ${tema} con su reconocimiento en situaciones reales según los referentes del MEN para ${area}.`
    },
    {
      pregunta: `[Competencia Argumentativa / Nivel Inferencial] Un grupo de estudiantes de ${gradeMeta.cleanGradeName} debe resolver una actividad práctica del taller sobre ${tema}. ¿Cuál es el procedimiento más adecuado para llegar a una solución válida y verificable?`,
      tipo: "Selección Múltiple tipo Saber-ICFES",
      opciones: [
        `A) Saltarse la lectura de las instrucciones y copiar una respuesta sin comprobar si corresponde al caso.`,
        `B) Identificar los datos o elementos clave del caso, aplicar paso a paso lo aprendido sobre ${tema} y comprobar la coherencia del resultado.`,
        `C) Descartar el trabajo con material de apoyo y dejar el ejercicio incompleto ante la primera duda.`,
        `D) Cambiar el tema de la actividad por otro diferente para no tener que analizar la situación planteada.`
      ],
      respuesta_correcta: "B",
      justificacion: `La opción B demuestra el desarrollo del pensamiento lógico y procedimental al analizar la información, aplicar ${tema} sistemáticamente y verificar la respuesta.`
    },
    {
      pregunta: `[Competencia Propositiva / Nivel Crítico y Ciudadano] Al trabajar en equipo un reto sobre ${tema} en ${instName}, dos compañeros tienen ideas distintas sobre cómo resolverlo. Desde el aprendizaje de ${area} y el eje socioemocional (${crese}), ¿qué acción permite lograr el mejor resultado?`,
      tipo: "Selección Múltiple tipo Saber-ICFES",
      opciones: [
        `A) Imponer una sola idea sin escuchar razones ni revisar los conceptos estudiados en clase.`,
        `B) Abandonar la actividad grupal para evitar dialogar con los compañeros de la mesa.`,
        `C) Escuchar con respeto ambos argumentos, contrastarlos con lo aprendido sobre ${tema} y construir juntos la solución correcta.`,
        `D) Entregar dos respuestas contradictorias sin verificar cuál cumple con lo trabajado en ${area}.`
      ],
      respuesta_correcta: "C",
      justificacion: `La opción C integra la competencia propositiva del área con las habilidades socioemocionales CRESE (escucha activa, argumentación respetuosa y trabajo colaborativo).`
    }
  ];

  // Construcción del enlace inteligente de YouTube adaptado al grado
  const ytQuery = buildGradeAwareVideoQuery(tema, tema, grado);
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;

  return {
    tema_principal: tema,
    titulo_secuencia: pick(titulosVariados),
    descripcion_secuencia: `Secuencia didáctica activa diseñada para ${gradeMeta.gradeLabel} en el área de ${area} sobre "${tema}". Articula referentes de calidad del MEN Colombia, estrategias de aprendizaje práctico, ajustes razonables DUA/PIAR y formación socioemocional transversal (${crese}) en ${instName}.${refineNote}`,
    objetivo_aprendizaje: `Comprender, analizar y aplicar de manera práctica los conceptos y procedimientos fundamentales de ${tema} en el área de ${area}, desarrollando actividades contextualizadas y colaborativas acordes con el nivel cognitivo de ${gradeMeta.cleanGradeName}.`,
    contenidos: [
      `Exploración conceptual y reconocimiento de elementos clave de ${tema}`,
      `Desarrollo procedimental, representación y aplicación práctica de ${tema} en ${area}`,
      `Resolución de situaciones contextualizadas, taller cooperativo y transferencia a la vida cotidiana (${crese})`
    ],
    competencias_men: competenciaArea,
    estandar: estandarArea,
    metodologia: metodologiaArea,
    corporiedad_adi: "Pausas activas cerebrales y motrices de 3 a 5 minutos en cada sesión (gimnasia cerebral, respiración diafragmática y estiramiento guiado) para potenciar la atención y el bienestar emocional.",
    dba_utilizado: dbaFormatted,
    actividades,
    rubrica: [
      {
        criterio: `Comprensión y Aplicación Práctica de ${tema} (${area})`,
        bajo: `Presenta dificultades para reconocer los elementos básicos de ${tema}; requiere apoyo continuo y material concreto adicional para completar las actividades.`,
        basico: `Identifica los conceptos principales de ${tema} y resuelve ejercicios básicos de la guía con orientación puntual del docente.`,
        alto: `Comprende, explica y aplica con propiedad los procedimientos y conceptos de ${tema} en la resolución de las actividades y casos del taller.`,
        superior: `Domina con excelencia y creatividad ${tema}, argumenta sus respuestas con rigor, relaciona el aprendizaje con su entorno y apoya solidariamente a sus compañeros.`,
        retroalimentacion: `Continuar fortaleciendo la práctica constante y la aplicación autónoma de ${tema} en situaciones cotidianas.`
      },
      {
        criterio: `Trabajo Colaborativo, Autorregulación y Convivencia (${crese})`,
        bajo: `Le cuesta seguir acuerdos de escucha y participación en las actividades grupales; requiere acompañamiento para gestionar sus emociones.`,
        basico: `Participa en las actividades del aula, respeta el turno de palabra y cumple con las tareas básicas asignadas en su equipo.`,
        alto: `Colabora activamente con sus compañeros, practica el respeto mutuo y aporta ideas constructivas durante el desarrollo de la clase.`,
        superior: `Lidera positivamente el trabajo en equipo, promueve la empatía, el diálogo pacífico y el cuidado mutuo en todas las actividades de aprendizaje.`,
        retroalimentacion: "Excelente disposición socioemocional; seguir siendo ejemplo de empatía y convivencia en el aula."
      }
    ],
    evaluacion: evaluacion3Preguntas,
    recursos: [
      {
        nombre: `Video Explicativo: '${tema} - ${gradeMeta.cleanGradeName} (${area})'`,
        descripcion: `Recurso audiovisual educativo seleccionado y adaptado a la edad escolar de ${gradeMeta.gradeLabel} para reforzar visualmente ${tema}. (Ver en YouTube: ${ytUrl})`
      }
    ],
    productos_asociados: `Taller del Estudiante desarrollado, evidencias prácticas en el cuaderno de ${area} y Reto Creativo sobre ${tema}.`,
    instrumentos_evaluacion: "Rúbrica formativa por niveles de desempeño (Decreto 1290), Taller práctico del estudiante, observación directa y preguntas tipo Saber-ICFES.",
    bibliografia: `Lineamientos Curriculares, Estándares Básicos de Competencias (EBC) y Derechos Básicos de Aprendizaje (DBA) de ${area} - Ministerio de Educación Nacional de Colombia (MEN).`,
    observaciones: `Planeación estructurada para ${sesionesCount} sesión(es) de clase en ${instName}, con lenguaje pedagógico adaptado a ${gradeMeta.gradeLabel}.`,
    adecuaciones_piar: `1. Múltiples Formas de Representación (DUA): Uso de apoyos visuales, láminas ilustradas, organizadores gráficos y ejemplos concretos del entorno para explicar ${tema}.\n2. Múltiples Formas de Acción y Expresión (PIAR): Dosificación de ejercicios paso a paso, flexibilización de tiempos de entrega y posibilidad de expresar lo aprendido de forma oral, gráfica o escrita según el estilo de aprendizaje.\n3. Múltiples Formas de Motivación e Inclusión: Ubicación estratégica cerca del docente, tutoría solidaria entre pares y refuerzo positivo constante.`,
    taller_imprimible: {
      introduccion: `¡Bienvenido(a) al Taller de Aprendizaje de ${area} (${gradeMeta.cleanGradeName})! En esta guía práctica explorarás de forma activa y entretenida todo lo relacionado con "${tema}" a través de retos, ejemplos reales de nuestra comunidad y actividades creativas.`,
      instrucciones: isPreescolar
        ? "Con el acompañamiento cariñoso de tu docente o familia, observa cada imagen, escucha las indicaciones paso a paso y realiza con alegría las actividades de colorear, trazar, asociar y crear."
        : "Lee con mucha atención cada punto de la guía, desarrolla los ejercicios ordenadamente en tu cuaderno o hoja de trabajo justificando tus respuestas y comparte tus dudas con el docente.",
      bitacora_test_inicial: `1. Explorando mis saberes: ¿Qué sabes o has escuchado acerca de "${tema}" y en qué momentos de tu vida diaria en casa o en el colegio lo has visto?\n2. Mi meta de aprendizaje: ¿Qué te gustaría descubrir o aprender a hacer hoy con este tema en la clase de ${area}?`,
      ejercicios: ejerciciosTaller,
      reto_creativo: retoCreativo
    },
    alertas_generadas: [],
    eje_crese_utilizado: crese,
    glosario: glosarioArea,
    aula_invertida: isPreescolar
      ? `En casa, conversa con tu familia sobre "${tema}", observen juntos un objeto o situación cotidiana donde aparezca y compártelo mañana en la ronda inicial del salón.`
      : `Antes de la siguiente sesión, observa en tu hogar o comunidad de Guaimaral un ejemplo cotidiano donde se aplique "${tema}", anótalo o dibújalo en tu cuaderno para compartirlo al inicio de la clase.`
  };
}

// =========================================================================
// 🎯 GENERADOR INTELIGENTE DE 10 PREGUNTAS SABER-ICFES DE RESPALDO (0 TOKENS)
// =========================================================================
function buildFailSafeIcfesExam(sequenceData: DidacticSequence, input?: SequenceInput): EvaluationItem[] {
  const tema = (sequenceData.tema_principal || input?.tema || "el tema estudiado").trim();
  const area = (input?.area || "el área académica").trim();
  const grado = (input?.grado || "el grado escolar").trim();
  const gradeMeta = getGradeCategory(grado);
  const dbaRef = sequenceData.dba_utilizado || sequenceData.estandar || `Referentes curriculares MEN de ${area}`;

  return [
    {
      pregunta: `1. [Nivel Literal - Identificación] En el estudio de ${area} para ${gradeMeta.cleanGradeName}, se aborda el tema "${tema}". De acuerdo con lo trabajado en clase, ¿cuál es la definición o característica fundamental que permite reconocer este concepto?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Es un concepto y proceso fundamental de ${area} que permite comprender, representar y resolver situaciones relacionadas con ${tema} en contextos reales.`,
        `B. Es una regla aislada que no guarda ninguna relación con las actividades cotidianas ni con el área de ${area}.`,
        `C. Es un procedimiento que consiste únicamente en adivinar respuestas sin observar datos ni evidencias.`,
        `D. Es un tema exclusivo de otras disciplinas que no requiere comprensión ni práctica en ${gradeMeta.cleanGradeName}.`
      ],
      respuesta_correcta: "A",
      justificacion: `La opción A identifica con precisión la naturaleza conceptual y práctica de ${tema} dentro de los estándares de ${area}.`
    },
    {
      pregunta: `2. [Nivel Literal - Reconocimiento de Elementos] Al observar un ejemplo práctico de "${tema}" presentado en la guía de aprendizaje de ${area}, ¿qué debe hacer primero el estudiante para abordar correctamente la actividad?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Ignorar los datos presentados en el enunciado y escribir cualquier resultado al azar.`,
        `B. Identificar con atención los elementos, datos o características clave de ${tema} presentes en la situación planteada.`,
        `C. Borrar la información inicial del ejercicio para no tener que analizarla.`,
        `D. Pasar directamente al final de la guía sin leer las instrucciones ni observar el ejemplo.`
      ],
      respuesta_correcta: "B",
      justificacion: `El primer paso en toda competencia interpretativa del MEN es identificar y reconocer los elementos clave de la situación sobre ${tema}.`
    },
    {
      pregunta: `3. [Nivel Literal - Referente Curricular] Teniendo en cuenta el referente pedagógico abordado (${dbaRef.slice(0, 110)}...), ¿cuál de las siguientes acciones evidencia que el estudiante comprende las bases de "${tema}"?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Confunde los términos básicos de ${tema} y evita participar en los ejercicios guiados.`,
        `B. Repite palabras de memoria pero no logra señalar ningún ejemplo concreto de ${tema}.`,
        `C. Reconoce y señala con claridad ejemplos concretos de ${tema} tanto en las actividades del aula como en su entorno cotidiano.`,
        `D. Sustituye los conceptos de ${area} por opiniones sin relación con el tema visto.`
      ],
      respuesta_correcta: "C",
      justificacion: `La comprensión literal y conceptual se demuestra cuando el estudiante reconoce ejemplos claros de ${tema} en su contexto.`
    },
    {
      pregunta: `4. [Nivel Inferencial - Aplicación Procedimental] Un estudiante de ${gradeMeta.cleanGradeName} está desarrollando el Taller de "${tema}" y encuentra un ejercicio donde debe aplicar el procedimiento explicado por el docente. ¿Cuál es la secuencia lógica para resolverlo con éxito?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Analizar la situación, organizar los datos o ideas, aplicar paso a paso las reglas de ${tema} y verificar el resultado obtenido.`,
        `B. Escribir la conclusión final sin realizar ningún paso intermedio ni revisar los datos.`,
        `C. Aplicar un procedimiento contrario al estudiado en clase sin comprobar si tiene sentido.`,
        `D. Copiar el resultado de otro ejercicio diferente aunque los datos no coincidan.`
      ],
      respuesta_correcta: "A",
      justificacion: `La opción A refleja el pensamiento estructurado e inferencial: análisis, organización, ejecución paso a paso y verificación.`
    },
    {
      pregunta: `5. [Nivel Inferencial - Relación Causa-Efecto] Si durante la resolución de una actividad sobre "${tema}" en ${area} se omite uno de los pasos o elementos principales, ¿qué consecuencia se puede deducir que ocurrirá en el resultado final?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. El resultado será aún más exacto porque se ahorra tiempo de análisis.`,
        `B. No habrá ninguna diferencia porque los pasos de ${tema} no influyen en la respuesta.`,
        `C. La respuesta o conclusión quedará incompleta o presentará errores de coherencia frente a lo que exige ${tema}.`,
        `D. El ejercicio se resolverá automáticamente sin necesidad de intervención del estudiante.`
      ],
      respuesta_correcta: "C",
      justificacion: `En el nivel inferencial, el estudiante comprende que cada paso o componente de ${tema} es necesario para garantizar la validez del resultado.`
    },
    {
      pregunta: `6. [Nivel Inferencial - Comparación y Clasificación] En una actividad en parejas sobre "${tema}", se presentan dos casos distintos del entorno escolar de Guaimaral. ¿Para qué sirve elaborar un cuadro comparativo o esquema entre ambos casos?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Para decorar el cuaderno sin relación con los aprendizajes de ${area}.`,
        `B. Para identificar semejanzas, diferencias y patrones sobre cómo se aplica ${tema} en distintas situaciones reales.`,
        `C. Para hacer más difícil la lectura y evitar llegar a una conclusión clara.`,
        `D. Para reemplazar la comprensión de ${tema} por dibujos sin explicación.`
      ],
      respuesta_correcta: "B",
      justificacion: `El uso de organizadores y cuadros comparativos permite inferir relaciones, semejanzas y patrones al aplicar ${tema}.`
    },
    {
      pregunta: `7. [Nivel Inferencial - Interpretación de Contexto] En una situación cotidiana de nuestra comunidad en Guaimaral, una familia o grupo de estudiantes necesita aplicar conocimientos de "${tema}". ¿De qué manera el aprendizaje logrado en ${area} facilita esa tarea?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Brinda herramientas prácticas y criterios claros de ${tema} para tomar decisiones acertadas y resolver la situación con fundamento.`,
        `B. No aporta ninguna utilidad porque lo que se aprende en ${area} solo sirve dentro del salón de clases.`,
        `C. Obliga a improvisar sin tener en cuenta la información disponible en el entorno.`,
        `D. Impide que las personas colaboren entre sí para buscar soluciones.`
      ],
      respuesta_correcta: "A",
      justificacion: `La transferencia del aprendizaje consiste en inferir cómo los saberes de ${tema} resuelven problemas reales de la comunidad.`
    },
    {
      pregunta: `8. [Nivel Crítico - Detección y Corrección del Error] Durante la socialización en el tablero, un compañero presenta un ejercicio sobre "${tema}" que contiene un error en su desarrollo. Desde una postura crítica y formativa, ¿cuál es la mejor manera de proceder?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Burlarse del error del compañero y negarse a revisar el procedimiento en grupo.`,
        `B. Dejar el error sin corregir para no tener que analizar de nuevo el ejercicio de ${tema}.`,
        `C. Identificar con respeto en qué paso ocurrió la equivocación, explicar con argumentos de ${tema} cómo corregirlo y aprender todos del proceso.`,
        `D. Cambiar los datos del problema original para que la respuesta equivocada parezca verdadera.`
      ],
      respuesta_correcta: "C",
      justificacion: `El pensamiento crítico y pedagógico utiliza el error como oportunidad de aprendizaje mediante la argumentación respetuosa y la verificación.`
    },
    {
      pregunta: `9. [Nivel Crítico-Propositivo - Solución de Problemas] Si tuvieras que diseñar una propuesta o reto creativo para enseñar "${tema}" a otros estudiantes de la institución, ¿qué criterio garantiza que tu propuesta sea de alta calidad académica?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. Que explique con claridad los conceptos clave de ${tema}, incluya un ejemplo práctico verificado y sea comprensible para los compañeros.`,
        `B. Que tenga muchos adornos pero ninguna explicación ni ejemplo correcto sobre ${tema}.`,
        `C. Que copie textualmente frases extensas sin entender qué significan ni cómo se aplican.`,
        `D. Que omita el tema principal de ${area} para hablar de asuntos no relacionados.`
      ],
      respuesta_correcta: "A",
      justificacion: `La competencia propositiva exige rigor conceptual, ejemplificación práctica y claridad comunicativa al presentar soluciones sobre ${tema}.`
    },
    {
      pregunta: `10. [Nivel Crítico y Socioemocional CRESE - Metacognición] Al finalizar la secuencia didáctica sobre "${tema}" en ${area}, el docente invita al grupo a evaluar su aprendizaje y convivencia (${sequenceData.eje_crese_utilizado || 'Eje CRESE'}). ¿Cuál reflexión demuestra un nivel de desempeño Superior (Decreto 1290)?`,
      tipo: "Múltiple Opción",
      opciones: [
        `A. "Solo me importó terminar rápido mi hoja sin verificar si entendí ${tema} ni escuchar a mi equipo."`,
        `B. "Comprendí cómo aplicar ${tema} en situaciones reales, verifiqué mis respuestas con argumentos y colaboré con empatía y respeto en mi grupo."`,
        `C. "Hice las actividades únicamente por cumplir, pero no sé para qué sirve ${tema} ni cómo explicarlo."`,
        `D. "Preferí no preguntar mis dudas ni participar en las actividades prácticas de la clase."`
      ],
      respuesta_correcta: "B",
      justificacion: `El nivel Superior según el Decreto 1290 integra el dominio autónomo y crítico de ${tema} con la vivencia ejemplar de los valores socioemocionales CRESE.`
    }
  ];
}

export let lastWorkingModel = "omni-model";

// =========================================================================
// GENERADOR DE EXÁMENES ICFES (NUEVA FASE 1)
// =========================================================================

export const generateExtendedIcfesExam = async (sequenceData: DidacticSequence, input?: SequenceInput): Promise<EvaluationItem[]> => {
  const gradoStr = input?.grado || "";
  const areaStr = input?.area || "";
  const icfesCacheKey = [gradoStr, areaStr, sequenceData.tema_principal || input?.tema || '']
    .map(s => String(s || '').toLowerCase().trim())
    .join('|');

  const cachedIcfes = getFromLocalCache<EvaluationItem[]>(ICFES_CACHE_KEY, icfesCacheKey);
  if (cachedIcfes && Array.isArray(cachedIcfes) && cachedIcfes.length >= 10) {
    console.log(`⚡ [Caché ICFES 0 Tokens] Examen ICFES recuperado instantáneamente.`);
    return cachedIcfes;
  }

  const availableKeys = getAvailableKeysInfo();

  if (availableKeys.length === 0) {
    throw new Error("No se encontraron llaves de API configuradas. Revisa tus variables VITE_API_KEY_1..7 en tu archivo .env.");
  }

  // Monopolio DeepSeek para el examen
  const modelsToTry = ["deepseek-chat"];

  const icfesSystemPrompt = `
  Experto evaluador ICFES (Colombia). Genera EXACTAMENTE 10 preguntas de selección múltiple (A, B, C, D) basadas en la planeación, adaptadas al grado escolar (3 literales, 4 inferenciales, 3 críticas). Justificación concisa de 1 oración por pregunta.
  DEVUELVE ÚNICAMENTE UN ARRAY JSON VÁLIDO:
  [{"pregunta":"...","tipo":"Múltiple Opción","opciones":["A. ...","B. ...","C. ...","D. ..."],"respuesta_correcta":"A","justificacion":"..."}]
  `;

  const icfesUserPrompt = `
  Grado: ${gradoStr} | Área: ${areaStr} | Tema: ${sequenceData.tema_principal}
  Objetivo: ${sequenceData.objetivo_aprendizaje}
  DBA/Estándar: ${sequenceData.dba_utilizado || sequenceData.estandar || 'General'}
  Devuelve SOLO el array JSON de 10 preguntas.
  `;

  let lastError: any;

  // Bucle multi-modelo y multi-llave con conmutación por error (Failover)
  for (const modelName of modelsToTry) {
    const sortedKeys = [...availableKeys].sort((a, b) => {
      const mA = apiMetrics[a.id] || { requests: 0, errors: 0 };
      const mB = apiMetrics[b.id] || { requests: 0, errors: 0 };
      if (mA.errors !== mB.errors) return mA.errors - mB.errors;
      return mA.requests - mB.requests;
    });

    for (const keyInfo of sortedKeys) {
      const key = keyInfo.key;
      const label = keyInfo.label;
      const keyId = keyInfo.id;

      // Optimización: 1 intento por llave (evita duplicar cobros de tokens en DeepSeek)
      const maxRetries = 1;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[🔍 ICFES Generator] Probando modelo ${modelName} con llave: ${label} (${keyId})`);
          let text = "";
          let tokensUsed = 0;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          try {
            const res = await fetch(`https://api.deepseek.com/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: "system", content: icfesSystemPrompt },
                  { role: "user", content: icfesUserPrompt }
                ],
                temperature: 0.0,
                max_tokens: 1800
              })
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(`Error API DeepSeek ${res.status}: ${errData?.error?.message || res.statusText}`);
            }

            const data = await res.json();
            text = data.choices?.[0]?.message?.content || "";
            const apiTotal = data?.usage?.total_tokens || ((data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0));
            tokensUsed = apiTotal > 0 ? apiTotal : Math.ceil(((icfesSystemPrompt.length + icfesUserPrompt.length) + (text?.length || 0)) / 3.8);
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            throw fetchErr;
          }

          if (!text) throw new Error("Respuesta vacía recibida del servidor de IA.");

          // Limpieza del JSON
          let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          const jsonBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            cleanText = jsonBlockMatch[1].trim();
          }

          const firstBracket = cleanText.indexOf('[');
          const lastBracket = cleanText.lastIndexOf(']');
          
          if (firstBracket !== -1 && lastBracket !== -1) {
            cleanText = cleanText.substring(firstBracket, lastBracket + 1);
          }
          
          let parsed: any;
          try {
            parsed = tryRepairAndParseJson(cleanText);
          } catch (parseError) {
            throw new Error("La IA no devolvió un JSON estructurado válido. " + parseError);
          }

          if (!Array.isArray(parsed) || parsed.length < 5) {
             throw new Error("El examen devuelto no contiene un array válido o tiene muy pocas preguntas.");
          }

          console.log(`%c[✨ EXAMEN ICFES GENERADO] Respondió modelo ${modelName} usando Llave: ${label} (${tokensUsed} tokens)`, "color: #10b981; font-weight: bold;");

          saveToLocalCache(ICFES_CACHE_KEY, icfesCacheKey, parsed);

          if (!apiMetrics[keyId]) {
            apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, tokens: 0, lastUsed: "", label, errorLogs: [] };
          }
          apiMetrics[keyId].requests++;
          apiMetrics[keyId].success++;
          apiMetrics[keyId].tokens = (apiMetrics[keyId].tokens || 0) + tokensUsed;
          apiMetrics[keyId].lastUsed = new Date().toLocaleTimeString();
          saveMetricsToStorage();
          logApiKeyUsage(label, 'success', undefined, modelName, tokensUsed);

          return parsed as EvaluationItem[];

        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          
          const isFatalApiError = errMsg.includes('402') || errMsg.includes('401') || errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('400');
          
          if (attempt === maxRetries || isFatalApiError) {
            if (!apiMetrics[keyId]) {
              apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, tokens: 0, lastUsed: "", label, errorLogs: [] };
            }
            apiMetrics[keyId].requests++;
            apiMetrics[keyId].errors++;
            apiMetrics[keyId].errorLogs.unshift({
              time: new Date().toLocaleTimeString(),
              message: `ICFES Gen Error: ${errMsg}`
            });
            saveMetricsToStorage();

            break; 
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    }
  }

  console.warn("🛡️ [Motor ICFES Inteligente Local Activo] Generando banco completo de 10 preguntas Saber-ICFES...");
  return buildFailSafeIcfesExam(sequenceData, input);
};