import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SequenceInput, DidacticSequence } from "../types";
import { supabase } from "./supabaseClient";

export const modelHealthStatus: Record<string, 'online' | 'offline' | 'checking'> = {
  "llama-3.3-70b-versatile": "online",
  "llama-3.1-8b-instant": "online",
  "mixtral-8x7b-32768": "online",
  "gemini-2.0-flash": "online",
  "gemini-1.5-flash": "online",
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

export const apiMetrics: Record<string, { 
  requests: number; 
  success: number; 
  errors: number; 
  lastUsed: string; 
  label: string;
  errorLogs: { time: string; message: string }[];
}> = {};

// Inicializar métricas para todas las llaves detectadas
getAvailableKeysInfo().forEach(k => {
  apiMetrics[k.id] = { requests: 0, success: 0, errors: 0, lastUsed: "", label: k.label, errorLogs: [] };
});

const sanitizeInput = (text: string | undefined): string => {
  if (!text) return "";
  return text.trim().replace(/['"<>]/g, "");
};

let canSyncApiKeyLogs = true;

const logApiKeyUsage = async (keyLabel: string, status: 'success' | 'error', errorMsg?: any, modelName?: string) => {
  if (!supabase || !canSyncApiKeyLogs) return;
  try {
    const cleanMsg = errorMsg 
      ? (typeof errorMsg === 'string' ? errorMsg.slice(0, 300) : String(errorMsg?.message || errorMsg).slice(0, 300))
      : null;
    const { error } = await supabase.from('api_key_logs').insert([
      {
        key_name: keyLabel,
        status,
        error_message: cleanMsg,
        action: `Respuesta de: ${modelName || 'Desconocido'}`
      }
    ]);
    if (error) {
      // Si la tabla api_key_logs no existe en la base de datos, no reintentar para no saturar la consola
      canSyncApiKeyLogs = false;
    }
  } catch (e) {
    canSyncApiKeyLogs = false;
  }
};

const responseSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    tema_principal: { type: SchemaType.STRING },
    titulo_secuencia: { type: SchemaType.STRING },
    descripcion_secuencia: { type: SchemaType.STRING },
    objetivo_aprendizaje: { type: SchemaType.STRING },
    contenidos: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    competencias_men: { type: SchemaType.STRING },
    estandar: { type: SchemaType.STRING },
    metodologia: { type: SchemaType.STRING },
    corporiedad_adi: { type: SchemaType.STRING },
    actividades: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sesion: { type: SchemaType.NUMBER },
          fase_inicio: { type: SchemaType.STRING },
          fase_desarrollo: { type: SchemaType.STRING },
          fase_cierre: { type: SchemaType.STRING },
          preguntas_socraticas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          materiales: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          tiempo: { type: SchemaType.STRING },
          imprimibles: { type: SchemaType.STRING },
          adi_especifico: { type: SchemaType.STRING }
        },
        required: ["sesion", "fase_inicio", "fase_desarrollo", "fase_cierre", "preguntas_socraticas", "materiales", "tiempo", "imprimibles", "adi_especifico"]
      }
    },
    rubrica: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          criterio: { type: SchemaType.STRING },
          bajo: { type: SchemaType.STRING },
          basico: { type: SchemaType.STRING },
          alto: { type: SchemaType.STRING },
          superior: { type: SchemaType.STRING },
          retroalimentacion: { type: SchemaType.STRING }
        },
        required: ["criterio", "bajo", "basico", "alto", "superior", "retroalimentacion"]
      }
    },
    evaluacion: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pregunta: { type: SchemaType.STRING },
          tipo: { type: SchemaType.STRING },
          opciones: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          respuesta_correcta: { type: SchemaType.STRING },
          justificacion: { type: SchemaType.STRING }
        },
        required: ["pregunta", "tipo", "opciones", "respuesta_correcta", "justificacion"]
      }
    },
    recursos: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: { nombre: { type: SchemaType.STRING }, descripcion: { type: SchemaType.STRING } },
        required: ["nombre", "descripcion"]
      }
    },
    productos_asociados: { type: SchemaType.STRING },
    instrumentos_evaluacion: { type: SchemaType.STRING },
    bibliografia: { type: SchemaType.STRING },
    observaciones: { type: SchemaType.STRING },
    adecuaciones_piar: { type: SchemaType.STRING },
    taller_imprimible: {
      type: SchemaType.OBJECT,
      properties: {
        introduccion: { type: SchemaType.STRING },
        instrucciones: { type: SchemaType.STRING },
        bitacora_test_inicial: { type: SchemaType.STRING },
        ejercicios: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        reto_creativo: { type: SchemaType.STRING }
      },
      required: ["introduccion", "instrucciones", "ejercicios", "reto_creativo"]
    },
    alertas_generadas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    dba_utilizado: { type: SchemaType.STRING },
    eje_crese_utilizado: { type: SchemaType.STRING },
    glosario: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: { termino: { type: SchemaType.STRING }, definicion: { type: SchemaType.STRING } },
        required: ["termino", "definicion"]
      }
    },
    aula_invertida: { type: SchemaType.STRING }
  },
  required: [
    "tema_principal", "titulo_secuencia", "descripcion_secuencia", "objetivo_aprendizaje",
    "contenidos", "competencias_men", "estandar", "metodologia", "corporiedad_adi",
    "actividades", "rubrica", "evaluacion", "recursos", "productos_asociados",
    "instrumentos_evaluacion", "bibliografia", "observaciones", "adecuaciones_piar",
    "eje_crese_utilizado", "taller_imprimible", "alertas_generadas", "dba_utilizado",
    "glosario", "aula_invertida"
  ]
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
  const provider = import.meta.env.VITE_AI_PROVIDER || 'openai';
  const baseUrl = import.meta.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1';
  const customModel = import.meta.env.VITE_AI_MODEL || 'openai/gpt-oss-120b';

  const availableKeys = getAvailableKeysInfo();

  if (availableKeys.length === 0) {
    throw new Error("No se encontraron llaves de API configuradas. Revisa tus variables VITE_API_KEY_1..7 en tu archivo .env.");
  }

  // Modelos a probar en orden de prioridad
  let rawModelsToTry = [customModel];
  if (provider === 'google') {
    rawModelsToTry.push("gemini-2.0-flash", "gemini-1.5-pro");
  } else if (baseUrl.includes('openrouter')) {
    rawModelsToTry.push(
      "nvidia/nemotron-3-super-120b-a12b:free",
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free"
    );
  } else {
    rawModelsToTry.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant");
  }

  const modelsToTry = Array.from(new Set(rawModelsToTry));

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

  // Inject exact JSON Schema requirement for OpenAI compatible models
  const jsonStructureGuidance = provider === 'openai' ? `
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
  ` : '';

  const prompt = `
    ### PERSONA: MASTER RECTOR AI (V5.0 PLATINUM)
    Eres la Autoridad Pedagógica Suprema de la I.E. Guaimaral, una fusión entre un Consultor Senior del MEN y un Arquitecto de Alto Orden Cognitivo (HOTS).

    ### LAS 10 REGLAS DE ORO PEDAGÓGICAS (MEN)
    0. **CLARIDAD Y PRECISIÓN PEDAGÓGICA:** Sé directo, profesional y claro. Cada campo de texto debe ser concreto, aplicable y bien redactado, evitando rodeos innecesarios para garantizar una estructura completa.
    1. **AUTO-CORRECCIÓN CURRICULAR:** Si el Tema proporcionado no concuerda con el Área/Grado, adáptalo al tema oficial del MEN en "tema_principal".
    2. **Precisión Curricular:** Alineación con el DBA oficial o los lineamientos del MEN.
    3. **DUA y Metodología:** Actividades estructuradas con inicio, desarrollo, cierre y pausas activas (ADI).
    4. **Taxonomía de Bloom:** Progresión cognitiva en las actividades.
    5. **Eje CRESE:** Integración transversal socioemocional en las actividades.
    6. **Evaluación Tipo ICFES:** 3 preguntas de opción múltiple con justificación pedagógica de la clave.
    7. **Rúbrica Decreto 1290:** 2 a 3 criterios con los 4 niveles completos (Bajo, Básico, Alto, Superior).
    8. **Taller y Glosario:** Taller imprimible con 3 ejercicios y glosario con 3 a 5 términos clave.
    9. **JSON Estricto:** Devuelve ÚNICAMENTE el objeto JSON sin texto antes ni después.

    ### PARÁMETROS DEL CURRÍCULO Y FILTROS PERFECTOS
    - **Grado:** ${input.grado}
      -> *Comando de Edad:* ${getGradeContext(input.grado)}
    - **Área:** ${input.area}
      -> *Comando de Área:* ${getAreaContext(input.area)}
    - **Tema:** ${safeTema} | **Sesiones:** ${input.sesiones}
    ${pedagogicalInstruction}
    - **Integración Transversal (CRESE):** ${input.ejeCrese || 'Fusión socioemocional.'}
    ${refinementInstruction ? `- **COMANDO DE AJUSTE:** ${sanitizeInput(refinementInstruction)}` : ''}

    ### LISTA DE CHEQUEO DE CALIDAD (AUDITORÍA FINAL)
    Antes de responder, la IA verifica internamente:
    [ ] Alineación estricta con el MEN.
    [ ] Continuidad lógica entre sesión N y N+1.
    [ ] Distractores ICFES lógicos y clave justificada.
    [ ] Múltiples medios de representación (DUA).
    [ ] Pausas activas (Momentos ADI) incluidas.
    [ ] Eje CRESE explícito.
    [ ] Actividad de creación/diseño (HOTS).
    [ ] Materiales reales "low-cost".
    [ ] Rúbrica con los 4 niveles (Bajo, Básico, Alto, Superior) completos.
    [ ] Ortografía 100% perfecta con tildes y puntuación correcta.
    [ ] Estructura JSON pura.

    ${jsonStructureGuidance}
    Responde ÚNICAMENTE con el JSON.
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

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[🔍 Orquestador Groq/AI] Probando modelo ${modelName} con llave: ${label} (${keyId}) - Intento ${attempt}/${maxRetries}...`);
          let text = "";

        if (provider === 'openai') {
          // Conexión API OpenAI-Compatible (Groq / OpenRouter / DeepSeek)
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: modelName,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
              max_tokens: 4096
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Error API Groq/OpenAI ${res.status}: ${errData?.error?.message || res.statusText}`);
          }

          const data = await res.json();
          text = data.choices?.[0]?.message?.content || "";

        } else {
          // Conexión Google Gemini Nativa
          try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.1
              }
            });
            const result = await model.generateContent(prompt);
            text = result.response.text();
          } catch (sdkError: any) {
            console.warn(`[SDK Gemini] Falló SDK con ${modelName}. Intentando REST... Error:`, sdkError?.message);
          }

          if (!text) {
            const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
            
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'x-goog-api-key': key
            };
            if (key.startsWith('AQ') || key.startsWith('ya29.')) {
              headers['Authorization'] = `Bearer ${key}`;
            }

            const res = await fetch(restUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema,
                  temperature: 0.1
                }
              })
            });

            if (res.ok) {
              const data = await res.json();
              text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(`Error REST API Gemini ${res.status}: ${errorData?.error?.message || res.statusText}`);
            }
          }
        }

        if (!text) throw new Error("Respuesta vacía recibida del servidor de IA.");

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
          parsed = JSON.parse(cleanText);
        } catch (parseError) {
          console.error("JSON Inválido devuelto por la IA:", cleanText.substring(0, 500) + '...');
          throw new Error("La IA no devolvió un JSON estructurado válido. " + parseError);
        }

        // Auto-corrección y saneamiento de la Rúbrica (Garantiza los 4 niveles colombianos Decreto 1290)
        if (parsed && Array.isArray(parsed.rubrica)) {
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

        console.log(`%c[✨ ÉXITO EXTREMO] Respondió modelo ${modelName} (${provider}) usando Llave: ${label}`, "color: #10b981; font-weight: bold;");

        // Actualizar métricas
        if (!apiMetrics[keyId]) {
          apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, lastUsed: "", label };
        }
        apiMetrics[keyId].requests++;
        apiMetrics[keyId].success++;
        apiMetrics[keyId].lastUsed = new Date().toLocaleTimeString();

        modelHealthStatus[modelName] = "online";
        logApiKeyUsage(label, 'success', undefined, modelName);
        lastWorkingModel = modelName;

        return parsed as DidacticSequence;

        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`%c[🔄 Intento Fallido] Falló ${modelName} con llave ${label} (Intento ${attempt}/${maxRetries}). Error: ${errMsg}`, "color: #f59e0b;");
          
          // Detección Inteligente: Si es límite de cuota (429) o modelo no existe (404/400),
          // no tiene sentido esperar 2.5s y volver a intentar la MISMA llave. Saltamos inmediatamente.
          const isFatalApiError = errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('400');
          
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

  // FALLBACK DE EMERGENCIA: Intentar Google Gemini únicamente con llaves de Google (AIza...)
  const googleKeys = availableKeys.filter(k => !k.key.startsWith('gsk_'));
  if (googleKeys.length > 0) {
    console.warn(`[🚨 Fallback de Emergencia] Intentando canal directo Google Gemini 2.0 Flash con ${googleKeys.length} llaves...`);
    for (const keyInfo of googleKeys) {
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(keyInfo.key)}`;
        const res = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              text = text.substring(firstBrace, lastBrace + 1);
            }
            const parsed = JSON.parse(text);
            console.log(`%c[✨ ÉXITO EMERGENCIAL] Respondió Google Gemini 2.0 Flash usando Llave: ${keyInfo.label}`, "color: #10b981; font-weight: bold;");
            lastWorkingModel = "gemini-2.0-flash";
            return parsed as DidacticSequence;
          }
        }
      } catch (emergencyErr) {
        // Continuar con la siguiente llave
      }
    }
  }

  const detailedReason = lastError?.message?.includes('404')
    ? 'Las llaves de Groq (gsk_...) en tu archivo .env no son válidas o están revocadas por Groq. Genera llaves nuevas en https://console.groq.com/keys o cambia VITE_AI_PROVIDER=google en tu .env.'
    : (lastError?.message || 'Sin respuesta');

  throw new Error(`[IA ${provider} Multi-Key]: Todos los canales (${availableKeys.length} llaves) fallaron. Causa: ${detailedReason}`);
};

export let lastWorkingModel = "omni-model";

// =========================================================================
// GENERADOR DE EXÁMENES ICFES (NUEVA FASE 1)
// =========================================================================

export const generateExtendedIcfesExam = async (sequenceData: DidacticSequence): Promise<EvaluationItem[]> => {
  const provider = import.meta.env.VITE_AI_PROVIDER || 'openai';
  const baseUrl = import.meta.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1';
  const customModel = import.meta.env.VITE_AI_MODEL || 'openai/gpt-oss-120b';

  const availableKeys = getAvailableKeysInfo();

  if (availableKeys.length === 0) {
    throw new Error("No se encontraron llaves de API configuradas. Revisa tus variables VITE_API_KEY_1..7 en tu archivo .env.");
  }

  // Modelos a probar en orden de prioridad
  let rawModelsToTry = [customModel];
  if (provider === 'google') {
    rawModelsToTry.push("gemini-2.0-flash", "gemini-1.5-pro");
  } else if (baseUrl.includes('openrouter')) {
    rawModelsToTry.push(
      "nvidia/nemotron-3-super-120b-a12b:free",
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free"
    );
  } else {
    rawModelsToTry.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant");
  }

  const modelsToTry = Array.from(new Set(rawModelsToTry));

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

          if (provider === 'openai') {
            const res = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              body: JSON.stringify({
                model: modelName,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2, // Un poco más bajo para exámenes rigurosos
                max_tokens: 4000
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(`Error API Groq/OpenAI ${res.status}: ${errData?.error?.message || res.statusText}`);
            }

            const data = await res.json();
            text = data.choices?.[0]?.message?.content || "";
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
            parsed = JSON.parse(cleanText);
          } catch (parseError) {
            throw new Error("La IA no devolvió un JSON estructurado válido. " + parseError);
          }

          if (!Array.isArray(parsed) || parsed.length < 5) {
             throw new Error("El examen devuelto no contiene un array válido o tiene muy pocas preguntas.");
          }

          console.log(`%c[✨ EXAMEN ICFES GENERADO] Respondió modelo ${modelName} usando Llave: ${label}`, "color: #10b981; font-weight: bold;");

          if (!apiMetrics[keyId]) {
            apiMetrics[keyId] = { requests: 0, success: 0, errors: 0, lastUsed: "", label, errorLogs: [] };
          }
          apiMetrics[keyId].requests++;
          apiMetrics[keyId].success++;
          apiMetrics[keyId].lastUsed = new Date().toLocaleTimeString();

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