import { SequenceInput, DidacticSequence, EvaluationItem } from "../types";
import { supabase } from "./supabaseClient";

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
  "Laura", "México", "Yarelis",
  "Groq-Alpha", "Groq-Beta", "Groq-Gamma", "Groq-Delta",
  "Groq-Epsilon", "Groq-Zeta", "Groq-Eta"
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
        // 4. Reparación de JSON truncado por límite de tokens: cerrar estructuras abiertas
        let openBraces = (fixed.match(/{/g) || []).length;
        let closeBraces = (fixed.match(/}/g) || []).length;
        let openBrackets = (fixed.match(/\[/g) || []).length;
        let closeBrackets = (fixed.match(/\]/g) || []).length;

        // Quitar coma huérfana al final
        fixed = fixed.trim().replace(/,\s*$/, '');

        // Cerrar corchetes y llaves faltantes
        while (openBrackets > closeBrackets) {
          fixed += ']';
          closeBrackets++;
        }
        while (openBraces > closeBraces) {
          fixed += '}';
          closeBraces++;
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



// Helper functions for dynamic pedagogical contexts
function getGradeContext(grado: string): string {
  const gradoLower = grado.toLowerCase();
  if (gradoLower.includes('preescolar') || gradoLower.includes('transición') || gradoLower.includes('1') || gradoLower.includes('2') || gradoLower.includes('3')) {
    return "ENFOQUE DE PRIMARIA BÁSICA: Uso intensivo de material concreto, juegos de roles, canciones, y actividades motrices cortas. Lenguaje extremadamente afectivo y lúdico.";
  }
  if (gradoLower.includes('4') || gradoLower.includes('5')) {
    return "ENFOQUE DE PRIMARIA ALTA: Transición al pensamiento lógico. Retos grupales, misterios, y proyectos manuales.";
  }
  if (gradoLower.includes('6') || gradoLower.includes('7') || gradoLower.includes('8') || gradoLower.includes('9')) {
    return "ENFOQUE DE SECUNDARIA: Pensamiento crítico, debates, conexión con la rebeldía adolescente y problemas sociales reales. Fomentar la argumentación.";
  }
  if (gradoLower.includes('10') || gradoLower.includes('11')) {
    return "ENFOQUE DE MEDIA TÉCNICA/ACADÉMICA: Rigor pre-universitario absoluto. Simulacros ICFES, ensayos argumentativos, pensamiento sistémico y formulación de proyectos de vida.";
  }
  return "ENFOQUE ESTÁNDAR: Adaptar pedagógicamente a la edad y nivel cognitivo esperado.";
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


export const generateDidacticSequence = async (input: SequenceInput, refinementInstruction?: string): Promise<DidacticSequence> => {
  // Monopolio DeepSeek - Única configuración
  const modelsToTry = ["deepseek-chat"];

  const safeTema = sanitizeInput(input.tema);
  const areaNormativa = {
    conDBA: ['MATEMATICAS', 'LENGUAJE', 'CIENCIAS NATURALES', 'CIENCIAS SOCIALES', 'INGLES', 'FISICA', 'ESTADISTICA', 'GEOMETRIA', 'BIOLOGIA', 'QUIMICA'],
    conOrientaciones: ['EDUCACION ARTISTICA', 'EDUCACION FISICA', 'ETICA', 'VALORES', 'RELIGION', 'TECNOLOGIA', 'FILOSOFIA', 'CONVIVENCIA', 'AGROPECUARIA', 'CATEDRA DE LA PAZ']
  };

  const currentArea = input.area.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isMultigrado = input.grado.toLowerCase().includes("multigrado");
  const isIntegral = input.area.toLowerCase().includes("integral");

  const hasDBA = areaNormativa.conDBA.some(a => currentArea.includes(a)) || isIntegral;

  let pedagogicalInstruction = hasDBA
    ? `- **DBA Oficial:** Debes identificar el número exacto del DBA (ej: "DBA #3") y transcribir su contenido literal que se está abordando.
       - **Input del Usuario:** ${sanitizeInput(input.dba) || 'Sin DBA previo'}. Si este input es un número, busca el contenido oficial. Si es texto, valida su correspondencia con el número.`
    : `- **Referencia Pedagógica:** Esta área NO utiliza DBA. Debes citar explícitamente las **"Orientaciones Pedagógicas y Curriculares del MEN para ${input.area}"**. 
       - **Instrucción Especial:** En la casilla de DBA, debes colocar: "Tomado de las Orientaciones Pedagógicas del MEN: [Citar el eje o lineamiento específico usado]". NO inventes un número de DBA.`;

  if (isMultigrado) {
    pedagogicalInstruction += `
    - **INSTRUCCIÓN ESPECIAL MULTIGRADO (Sede Altomira - Profe Leovigilda):** Esta secuencia es para un aula MULTIGRADO. Debes especificar acciones y niveles de complejidad diferenciados para cada grado: **Transición, 1°, 2°, 3°, 4° y 5°**. 
    - **Enfoque Integrador:** Debes fusionar de manera coherente las 4 áreas básicas (Lenguaje, Matemáticas, Sociales y Naturales) en una sola secuencia didáctica funcional.`;
  }

  // Guía de estructura JSON estricta para DeepSeek
  const jsonStructureGuidance = `
    DEBES DEVOLVER ESTRICTAMENTE UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA EXACTA. NADA DE TEXTO ANTES NI DESPUÉS DEL JSON:
    {
      "tema_principal": "string",
      "titulo_secuencia": "string",
      "descripcion_secuencia": "string",
      "objetivo_aprendizaje": "string",
      "contenidos": ["string"],
      "competencias_men": "string",
      "estandar": "string",
      "metodologia": "string",
      "corporiedad_adi": "string",
      "actividades": [
        { "sesion": 1, "fase_inicio": "string", "fase_desarrollo": "string", "fase_cierre": "string", "preguntas_socraticas": ["string"], "materiales": ["string"], "tiempo": "string", "imprimibles": "string", "adi_especifico": "string" }
      ],
      "rubrica": [
        { "criterio": "string", "bajo": "string", "basico": "string", "alto": "string", "superior": "string", "retroalimentacion": "string" }
      ],
      "evaluacion": [
        { "pregunta": "string", "tipo": "string", "opciones": ["string"], "respuesta_correcta": "string", "justificacion": "string" }
      ],
      "recursos": [
        { "nombre": "string", "descripcion": "string" }
      ],
      "productos_asociados": "string",
      "instrumentos_evaluacion": "string",
      "bibliografia": "string",
      "observaciones": "string",
      "adecuaciones_piar": "string",
      "taller_imprimible": {
        "introduccion": "string",
        "instrucciones": "string",
        "bitacora_test_inicial": "string",
        "ejercicios": ["string"],
        "reto_creativo": "string"
      },
      "alertas_generadas": ["string"],
      "dba_utilizado": "string",
      "eje_crese_utilizado": "string",
      "glosario": [{ "termino": "string", "definicion": "string" }],
      "aula_invertida": "string"
    }
  `;

  const prompt = `
    ### PERSONA: MASTER RECTOR AI (V5.0 PLATINUM EDITION)
    Eres la Autoridad Pedagógica y Curricular Suprema de la I.E. Guaimaral. Fusionas el rigor de un Consultor Senior del MEN (Colombia) con la maestría de un Arquitecto de Alto Orden Cognitivo (HOTS - Bloom/Webb). Tu objetivo es entregar una planeación de CLASE MUNDIAL, exhaustiva, rica en detalles, profundamente pedagógica y lista para ser ejecutada con excelencia.

    ### LAS 10 REGLAS SUPREMAS DE EXCELENCIA PEDAGÓGICA (MEN)
    1. **PROFUNDIDAD Y RIQUEZA NARRATIVA:** PROHIBIDO generar respuestas telegráficas o de una sola línea. Cada fase de la sesión (Inicio, Desarrollo, Cierre) debe contener una descripción metodológica detallada paso a paso (mínimo 2-3 párrafos o instrucciones claras de cómo el docente guía y cómo el estudiante interactúa).
    2. **AUTO-CORRECCIÓN Y ALINEACIÓN CURRICULAR:** Asegura correspondencia 100% estricta entre el DBA oficial del MEN, el estándar y el tema en "tema_principal".
    3. **METODOLOGÍA ABP Y DUA INTEGRAL:** 
       - **Fase de Inicio (Exploración):** Activación de saberes previos, planteamiento del reto/problema detonante y motivación.
       - **Fase de Desarrollo (Estructuración y Práctica):** Modelado conceptual, trabajo colaborativo, manipulación de material concreto y aplicación.
       - **Fase de Cierre (Transferencia y Metacognición):** Evaluación formativa, síntesis, socialización y preguntas de autorreflexión.
    4. **MOMENTOS ADI (Corporiedad y Bienestar):** Pausa activa cerebral de 3 a 5 minutos detallada en cada sesión (ej. ejercicios de respiración, gimnasia cerebral, coordinación motriz).
    5. **INTEGRACIÓN TRANSVERSAL CRESE:** Cada actividad debe vivenciar valores de convivencia pacífica, empatía y resiliencia emocional.
    6. **PREGUNTAS SOCRÁTICAS POTENTES:** Incluye mínimo 2 a 3 preguntas por sesión que desarrollen pensamiento inferencial y crítico (HOTS).
    7. **EVALUACIÓN FORMATIVA TIPO ICFES:** 3 preguntas de opción múltiple situacionales con justificación pedagógica rigurosa del distractor y la clave correcta.
    8. **RÚBRICA ANALÍTICA DECRETO 1290:** Rúbrica con descriptores completos, exhaustivos y diferenciados para los 4 niveles colombianos: **Bajo, Básico, Alto y Superior**.
    9. **TALLER IMPRIMIBLE AUTÓNOMO Y RETO CREATIVO:** Guía de trabajo aplicativa con 3 ejercicios prácticos contextualizados y un "Reto Creativo" final motivador.
    10. **FORMATO JSON PURO:** Devuelve ÚNICAMENTE el objeto JSON estructurado sin ningún texto introductorio ni final.

    ### PARÁMETROS DEL CURRÍCULO
    - **Grado:** ${input.grado} (${getGradeContext(input.grado)})
    - **Área:** ${input.area} (${getAreaContext(input.area)})
    - **Tema:** ${safeTema} | **Cantidad de Sesiones a Desarrollar:** ${input.sesiones}
    ${pedagogicalInstruction}
    - **Eje Transversal Socioemocional (CRESE):** ${input.ejeCrese || 'Educación para la paz, empatía y ciudadanía democrática.'}
    ${refinementInstruction ? `- **COMANDO DE AJUSTE DOCENTE:** ${sanitizeInput(refinementInstruction)}` : ''}

    ${jsonStructureGuidance}
    Responde ÚNICAMENTE con el JSON.`;

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

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[🔍 Orquestador DeepSeek] Conectando a api.deepseek.com con llave: ${label} (${keyId}) - Intento ${attempt}/${maxRetries}...`);
          let text = "";
          let tokensUsed = 0;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout para anti-congelamiento

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
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 4096
              })
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(`Error API DeepSeek ${res.status}: ${errData?.error?.message || res.statusText}`);
            }

            const data = await res.json();
            text = data.choices?.[0]?.message?.content || "";
            tokensUsed = data?.usage?.total_tokens || 0;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              throw new Error(`Timeout: La API de DeepSeek tardó demasiado en responder.`);
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

        // Normalizador defensivo de arreglos para evitar que React lance TypeError .map de undefined
        if (parsed) {
          parsed.contenidos = Array.isArray(parsed.contenidos) ? parsed.contenidos : [parsed.contenidos || "Contenido Principal"];
          parsed.actividades = Array.isArray(parsed.actividades) 
            ? parsed.actividades.map((act: any, aIdx: number) => ({
                ...act,
                sesion: act.sesion || (aIdx + 1),
                materiales: Array.isArray(act.materiales) ? act.materiales : (act.materiales ? [String(act.materiales)] : ["Materiales pedagógicos del aula"]),
                preguntas_socraticas: Array.isArray(act.preguntas_socraticas) ? act.preguntas_socraticas : (act.preguntas_socraticas ? [String(act.preguntas_socraticas)] : [])
              }))
            : [];
          parsed.rubrica = Array.isArray(parsed.rubrica) ? parsed.rubrica : [];
          parsed.evaluacion = Array.isArray(parsed.evaluacion) ? parsed.evaluacion : [];
          parsed.recursos = Array.isArray(parsed.recursos) ? parsed.recursos : [];
          parsed.glosario = Array.isArray(parsed.glosario) ? parsed.glosario : [];

          if (!parsed.taller_imprimible) {
            parsed.taller_imprimible = {
              introduccion: "Taller pedagógico de aplicación",
              instrucciones: "Resuelve las actividades con dedicación.",
              bitacora_test_inicial: "Saberes previos del tema",
              ejercicios: ["Ejercicio de práctica 1"],
              reto_creativo: "Reto creativo de aplicación"
            };
          } else if (!Array.isArray(parsed.taller_imprimible.ejercicios)) {
            parsed.taller_imprimible.ejercicios = [parsed.taller_imprimible.ejercicios || "Ejercicio de práctica 1"];
          }
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

        console.log(`%c[✨ ÉXITO EXTREMO] Respondió modelo ${modelName} usando Llave: ${label}`, "color: #10b981; font-weight: bold;");

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
          
          // Detección Inteligente: Si es límite de cuota (429), modelo no existe (404/400) o JSON no estructurable,
          // no tiene sentido esperar en la misma llave. Saltamos inmediatamente a la siguiente opción.
          const isFatalApiError = errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('400') || errMsg.includes('JSON') || errMsg.includes('SyntaxError');
          
          if (attempt === maxRetries || isFatalApiError) {
            modelHealthStatus[modelName] = "offline";
            
            if (!apiMetrics[keyId]) {
              apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, lastUsed: "", label, errorLogs: [] };
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

    console.warn(`[⚠️ Conmutación de Modelo] Todas las llaves fallaron para ${modelName}. Probando modelo de respaldo...`);
  }



  console.warn("🛡️ [Escudo de Autoreparación Activo] Generando planeación de respaldo pedagógico institucional...");
  return buildFailSafeSequence(input);
};

// Generador de Respaldo Infallible (Escudo 100% Inmune a Fallas de Servidor o Red)
function buildFailSafeSequence(input: SequenceInput): DidacticSequence {
  const tema = input.tema || "Contenido Curricular";
  const grado = input.grado || "General";
  const area = input.area || "Área Principal";
  const dba = input.dba || "Alineación Curricular Oficial del MEN";
  const crese = input.ejeCrese || "Educación Socioemocional y Ciudadanía";

  return {
    tema_principal: tema,
    titulo_secuencia: `Unidad Didáctica Integrada: ${tema}`,
    descripcion_secuencia: `Secuencia didáctica estructurada para el grado ${grado} en el área de ${area}, focalizada en el aprendizaje significativo, el desarrollo de competencias del MEN y la vivencia transversal del eje CRESE (${crese}).`,
    objetivo_aprendizaje: `Desarrollar y fortalecer competencias clave en ${area} mediante la comprensión, exploración y aplicación práctica del tema "${tema}".`,
    contenidos: [
      `Fundamentos conceptuales de ${tema}`,
      `Estrategias de indagación y resolución de problemas`,
      `Aplicación contextualizada y trabajo colaborativo`
    ],
    competencias_men: `Reconoce, interpreta y aplica los conceptos esenciales de ${area} según los lineamientos curriculares y estándares de competencia del MEN para grado ${grado}.`,
    estandar: `Comprende y produce saberes fundamentales relacionados con ${tema}, integrando el pensamiento crítico y la ética ciudadana.`,
    metodologia: "Aprendizaje Basado en Problemas (ABP) y Diseño Universal para el Aprendizaje (DUA)",
    corporiedad_adi: "Pausas activas de gimnasia cerebral y ejercicios de respiración consciente antes de cada transición.",
    actividades: [
      {
        sesion: 1,
        fase_inicio: `Exploración de saberes previos sobre ${tema} mediante preguntas detonantes y lluvia de ideas en grupo.`,
        fase_desarrollo: `Exposición dialogada del concepto central de ${tema}, apoyada en material concreto, organizadores gráficos y ejemplos cotidianos.`,
        fase_cierre: `Síntesis colectiva y metacognición: los estudiantes resumen en tres oraciones lo aprendido en la sesión.`,
        preguntas_socraticas: [
          `¿Por qué es relevante el concepto de ${tema} en nuestra vida diaria?`,
          `¿Cómo podemos aplicar este aprendizaje para resolver un problema de nuestro entorno?`
        ],
        materiales: ["Tablero", "Cuaderno de apuntes", "Guía de trabajo imprimible", "Materiales manipulables de aula"],
        tiempo: "60 minutos",
        imprimibles: "Guía de taller y ficha de indagación de la sesión 1",
        adi_especifico: "Pausa activa: estiramiento corporal y dinámicas de atención focalizada."
      },
      {
        sesion: 2,
        fase_inicio: `Recuperación de la sesión anterior mediante un micro-desafío o acertijo lúdico en parejas.`,
        fase_desarrollo: `Trabajo colaborativo: aplicación práctica de los conocimientos sobre ${tema} en la resolución de problemas reales.`,
        fase_cierre: `Plenaria y autoevaluación: socialización de productos y reflexión sobre los aprendizajes del eje CRESE.`,
        preguntas_socraticas: [
          `¿Qué dificultades encontramos y cómo las superamos en equipo?`
        ],
        materiales: ["Papelógrafos", "Marcadores", "Ficha de trabajo colaborativo"],
        tiempo: "60 minutos",
        imprimibles: "Rúbrica de autoevaluación y reto creativo",
        adi_especifico: "Pausa activa: ejercicios de ritmo y coordinación cruzada."
      }
    ],
    rubrica: [
      {
        criterio: `Apropiación Conceptual de ${tema}`,
        bajo: `Muestra dificultades iniciales para identificar los conceptos básicos de ${tema} y requiere apoyo pedagógico frecuente.`,
        basico: `Comprende y describe los elementos principales de ${tema} cumpliendo los requisitos básicos de la asignatura.`,
        alto: `Analiza, explica y aplica los saberes de ${tema} con propiedad y precisión en situaciones variadas.`,
        superior: `Domina con excelencia el tema ${tema}, proponiendo soluciones innovadoras y orientando reflexiones a sus compañeros.`,
        retroalimentacion: "Promover el aprendizaje autónomo y el liderazgo en proyectos."
      },
      {
        criterio: "Participación y Trabajo Colaborativo (CRESE)",
        bajo: "Presenta timidez o desinterés al trabajar en equipo; requiere estímulo constante.",
        basico: "Participa de forma receptiva en las actividades de equipo cumpliendo su rol.",
        alto: "Aporta activamente ideas, escucha con respeto y colabora al logro del grupo.",
        superior: "Lidera con empatía, fomenta la resolución pacífica de conflictos y cuida el clima escolar.",
        retroalimentacion: "Fortalecer las habilidades de comunicación asertiva."
      }
    ],
    evaluacion: [
      {
        pregunta: `¿Cuál de las siguientes afirmaciones describe mejor el objetivo principal de estudiar ${tema}?`,
        tipo: "Selección Múltiple con Única Respuesta (Tipo ICFES)",
        opciones: [
          `A) Comprender los fundamentos de ${tema} para aplicarlos a situaciones concretas.`,
          `B) Memorizar datos sin relación con la práctica.`,
          `C) Ignorar la importancia de los saberes previos.`,
          `D) Realizar actividades sin reflexión previa.`
        ],
        respuesta_correcta: "A",
        justificacion: `La opción A refleja el propósito de aprendizaje continuo y aplicativo del estándar del MEN.`
      }
    ],
    recursos: [
      { nombre: "Guía Didáctica Docente", descripcion: "Secuencia orientadora paso a paso." },
      { nombre: "Ficha Imprimible para Estudiante", descripcion: "Actividades de práctica e indagación." }
    ],
    productos_asociados: `Bitácora de evidencias y taller completado sobre ${tema}`,
    instrumentos_evaluacion: "Rúbrica de desempeño Decreto 1290, observación directa y lista de cotejo",
    bibliografia: "Lineamientos Curriculares y Derechos Básicos de Aprendizaje (DBA) - Ministerio de Educación Nacional (MEN)",
    observaciones: "Planeación alineada con los requerimientos pedagógicos institucionales.",
    adecuaciones_piar: "Proporcionar apoyos visuales adicionales, explicaciones paso a paso y ajustar tiempos de entrega según el Plan Individual de Ajustes Razonables (PIAR).",
    taller_imprimible: {
      introduccion: `Bienvenido al taller de exploración pedagógica sobre ${tema}.`,
      instrucciones: "Lee con atención cada ejercicio, trabaja con dedicación y reflexiona sobre tus respuestas.",
      bitacora_test_inicial: `¿Qué sabes acerca de ${tema} y dónde lo has visto antes?`,
      ejercicios: [
        `Ejercicio 1: Escribe dos ejemplos prácticos sobre ${tema}.`,
        `Ejercicio 2: Explica con tus palabras cómo se relaciona este tema con la vida cotidiana.`
      ],
      reto_creativo: `Diseña un mapa conceptual o dibujo explicativo que represente la idea principal de ${tema}.`
    },
    alertas_generadas: [
      "Ajuste automático: Secuencia respaldada por el Escudo Infallible de Autoreparación Institucional."
    ],
    dba_utilizado: dba,
    eje_crese_utilizado: crese,
    glosario: [
      { termino: tema, definicion: `Concepto pedagógico clave en ${area} para el grado ${grado}.` },
      { termino: "Metacognición", definicion: "Capacidad de autorreflexión sobre el propio proceso de aprendizaje." }
    ],
    aula_invertida: "Revisar previamente el material de lectura sugerido o buscar un ejemplo cotidiano en casa antes de la próxima clase."
  };
}

export let lastWorkingModel = "omni-model";

// =========================================================================
// GENERADOR DE EXÁMENES ICFES (NUEVA FASE 1)
// =========================================================================

export const generateExtendedIcfesExam = async (sequenceData: DidacticSequence): Promise<EvaluationItem[]> => {
  const availableKeys = getAvailableKeysInfo();

  if (availableKeys.length === 0) {
    throw new Error("No se encontraron llaves de API configuradas. Revisa tus variables VITE_API_KEY_1..7 en tu archivo .env.");
  }

  // Monopolio DeepSeek para el examen
  const modelsToTry = ["deepseek-chat"];

  const prompt = `
  Actúa como un experto en evaluación educativa del ICFES (Colombia).
  Tu tarea es generar un examen riguroso de 10 preguntas de selección múltiple con única respuesta (opciones A, B, C, D) 
  basado EXCLUSIVAMENTE en la siguiente planeación de clase:

  Tema Principal: ${sequenceData.tema_principal}
  Objetivo: ${sequenceData.objetivo_aprendizaje}
  DBA / Estándar: ${sequenceData.dba_utilizado || sequenceData.estandar || 'No especificado'}
  Contenidos: ${sequenceData.contenidos.join(', ')}

  REGLAS ESTRICTAS:
  1. Genera EXACTAMENTE 10 preguntas. Ni una más, ni una menos.
  2. Las preguntas deben tener diferentes niveles de complejidad:
     - 3 preguntas de nivel literal (reconocimiento de información).
     - 4 preguntas de nivel inferencial (análisis, deducción).
     - 3 preguntas de nivel crítico (toma de postura, evaluación).
  3. Cada pregunta debe tener 4 opciones (A, B, C, D) donde solo una es correcta.
  4. La respuesta correcta debe estar explícitamente indicada.
  5. Debes proporcionar una justificación pedagógica clara de por qué la respuesta correcta es la elegida.

  DEVUELVE ÚNICAMENTE UN ARRAY DE OBJETOS JSON CON ESTA ESTRUCTURA EXACTA:
  [
    {
      "pregunta": "Texto de la pregunta...",
      "tipo": "Múltiple Opción",
      "opciones": ["A. Opción 1", "B. Opción 2", "C. Opción 3", "D. Opción 4"],
      "respuesta_correcta": "La opción correcta (ej. A)",
      "justificacion": "Por qué es correcta."
    }
  ]
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

      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[🔍 ICFES Generator] Probando modelo ${modelName} con llave: ${label} (${keyId})`);
          let text = "";
          let tokensUsed = 0;

          const res = await fetch(`https://api.deepseek.com/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: "user", content: prompt }],
              temperature: 0.0,
              max_tokens: 4000
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Error API DeepSeek ${res.status}: ${errData?.error?.message || res.statusText}`);
          }

          const data = await res.json();
          text = data.choices?.[0]?.message?.content || "";
          tokensUsed = data?.usage?.total_tokens || 0;

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

          console.log(`%c[✨ EXAMEN ICFES GENERADO] Respondió modelo ${modelName} usando Llave: ${label}`, "color: #10b981; font-weight: bold;");

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
          
          const isFatalApiError = errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('400');
          
          if (attempt === maxRetries || isFatalApiError) {
            if (!apiMetrics[keyId]) {
              apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, lastUsed: "", label, errorLogs: [] };
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

  throw new Error(`[ICFES Generator] Falló la generación del examen. Causa: ${lastError?.message || 'Sin respuesta'}`);
};