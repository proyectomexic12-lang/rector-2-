import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SequenceInput, DidacticSequence } from "../types";
import { supabase } from "./supabaseClient";

export const modelHealthStatus: Record<string, 'online' | 'offline' | 'checking'> = {
  "gemini-2.5-flash": "checking",
  "gemini-2.5-flash-8b": "checking",
  "gemini-2.0-flash": "checking",
  "gemini-1.5-flash": "checking",
  "gemini-1.5-pro": "checking",
};

export const apiMetrics = {
  key1: { requests: 0, success: 0, errors: 0, lastUsed: "", label: "Laura" },
  key2: { requests: 0, success: 0, errors: 0, lastUsed: "", label: "México" },
  key3: { requests: 0, success: 0, errors: 0, lastUsed: "", label: "Yarelis" }
};

const sanitizeInput = (text: string | undefined): string => {
  if (!text) return "";
  return text.trim().replace(/['"<>]/g, "");
};

const logApiKeyUsage = async (idx: number, status: 'success' | 'error', errorMsg?: string, modelName?: string) => {
  if (!supabase) return;
  const labels = ["Laura", "México", "Yarelis"];
  try {
    await supabase.from('api_key_logs').insert([
      {
        key_name: labels[idx],
        status,
        error_message: errorMsg || null,
        action: `Respuesta de: ${modelName}`
      }
    ]);
  } catch (e) {
    console.warn("Log error:", e);
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
          descripcion: { type: SchemaType.STRING },
          materiales: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          tiempo: { type: SchemaType.STRING },
          imprimibles: { type: SchemaType.STRING },
          adi_especifico: { type: SchemaType.STRING }
        },
        required: ["sesion", "descripcion", "materiales", "tiempo", "imprimibles", "adi_especifico"]
      }
    },
    rubrica: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          criterio: { type: SchemaType.STRING },
          basico: { type: SchemaType.STRING },
          satisfactorio: { type: SchemaType.STRING },
          avanzado: { type: SchemaType.STRING },
          retroalimentacion: { type: SchemaType.STRING }
        },
        required: ["criterio", "basico", "satisfactorio", "avanzado", "retroalimentacion"]
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
          respuesta_correcta: { type: SchemaType.STRING }
        },
        required: ["pregunta", "tipo", "opciones", "respuesta_correcta"]
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
        ejercicios: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        reto_creativo: { type: SchemaType.STRING }
      },
      required: ["introduccion", "instrucciones", "ejercicios", "reto_creativo"]
    },
    alertas_generadas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    dba_utilizado: { type: SchemaType.STRING },
    eje_crese_utilizado: { type: SchemaType.STRING }
  },
  required: [
    "tema_principal", "titulo_secuencia", "descripcion_secuencia", "objetivo_aprendizaje",
    "contenidos", "competencias_men", "estandar", "metodologia", "corporiedad_adi",
    "actividades", "rubrica", "evaluacion", "recursos", "productos_asociados",
    "instrumentos_evaluacion", "bibliografia", "observaciones", "adecuaciones_piar",
    "eje_crese_utilizado", "taller_imprimible", "alertas_generadas", "dba_utilizado"
  ]
};

export const generateDidacticSequence = async (input: SequenceInput, refinementInstruction?: string): Promise<DidacticSequence> => {
  const getEnv = (key: string) => import.meta.env[key] || (process as any).env[key];
  const allKeys = [getEnv('VITE_API_KEY_1'), getEnv('VITE_API_KEY_2'), getEnv('VITE_API_KEY_3')];

  const usage = [apiMetrics.key1.requests, apiMetrics.key2.requests, apiMetrics.key3.requests];
  const sortedIndices = [0, 1, 2].sort((a, b) => usage[a] - usage[b]);

  // Lista Maestra de Modelos (Prioridad Gemini 2.5 Flash)
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];

  const safeTema = sanitizeInput(input.tema);
  const areaNormativa = {
    conDBA: ['MATEMATICAS', 'LENGUAJE', 'CIENCIAS NATURALES', 'CIENCIAS SOCIALES', 'INGLES'],
    conOrientaciones: ['EDUCACION ARTISTICA', 'EDUCACION FISICA', 'ETICA', 'VALORES', 'RELIGION', 'TECNOLOGIA', 'FILOSOFIA', 'CONVIVENCIA']
  };

  const currentArea = input.area.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasDBA = areaNormativa.conDBA.some(a => currentArea.includes(a));

  const pedagogicalInstruction = hasDBA
    ? `- **DBA Oficial:** Debes identificar el número exacto del DBA (ej: "DBA #3") y transcribir su contenido literal que se está abordando.
       - **Input del Usuario:** ${sanitizeInput(input.dba) || 'Sin DBA previo'}. Si este input es un número, busca el contenido oficial. Si es texto, valida su correspondencia con el número.`
    : `- **Referencia Pedagógica:** Esta área NO utiliza DBA. Debes citar explícitamente las **"Orientaciones Pedagógicas y Curriculares del MEN para ${input.area}"**. 
       - **Instrucción Especial:** En la casilla de DBA, debes colocar: "Tomado de las Orientaciones Pedagógicas del MEN: [Citar el eje o lineamiento específico usado]". NO inventes un número de DBA.`;

  const prompt = `
    ### PERSONA: MASTER RECTOR AI (V5.0 PLATINUM)
    Eres el Agente Supremo de la I.E. Guaimaral. Fusionas la excelencia pedagógica de un Consultor Senior del MEN con la precisión técnica de un Ingeniero de Orquestación de IA de nivel platino. Tu misión es la perfección absoluta en cada letra y estructura.

    ### MARCO DE OPERACIÓN SUPREMO
    - **Protocolo de las 50 Reglas de Oro:** Aplicar cada directriz de excelencia pedagógica (Alineación MEN, DUA, Bloom, CRESE).
    - **Robustez Técnica Platino:** Generar JSON puro, sin errores estructurales, con tipos validados al 100%.
    - **Cero Alucinación Curricular:** Veracidad total en referentes nacionales. Si es DBA, incluir número y texto. Si son Orientaciones, citarlas textualmente.
    - **Metodologías de Vanguardia:** Aprendizaje Basado en Problemas, Flipped Classroom y Momentos ADI Creativos.

    ### PARÁMETROS DE LA SECUENCIA
    - **Grado:** ${input.grado} | **Area:** ${input.area}
    - **Tema:** ${safeTema} | **Sesiones:** ${input.sesiones}
    ${pedagogicalInstruction}
    - **Banco de Evaluación:** Generar obligatoriamente **10 preguntas** de selección múltiple tipo ICFES con 4 opciones.
    - **Recursos Multimedia:** Si una actividad implica un video, debes incluir un enlace de búsqueda de YouTube con el formato: \`https://www.youtube.com/results?search_query=[TEMA+DEL+VIDEO+ESPECIFICO]\`.
    - **Integración Transversal:** ${input.ejeCrese || 'Fusión socioemocional y ciudadana de alto impacto.'}
    ${refinementInstruction ? `- **COMANDO DE REFINAMIENTO MAESTRO:** ${sanitizeInput(refinementInstruction)}` : ''}

    ### AUDITORÍA DE CALIDAD PRE-SALIDA
    - ¿Hay exactamente **10 preguntas** de evaluación con situaciones problema reales?
    - ¿La guía imprimible es autónoma y pedagógicamente motivadora?
    - ¿Se han seguido los estándares o las orientaciones curriculares vigentes en Colombia según el área?

    Responde únicamente con el JSON validado.
  `;

  let lastError: any;

  for (const i of sortedIndices) {
    const key = allKeys[i];
    if (!key || key.length < 20) continue;
    const label = ["Laura", "México", "Yarelis"][i];

    for (const modelName of modelsToTry) {
      try {
        console.log(`[🔍 Orquestador] Probando ${modelName} con Llave: ${label}...`);
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.1 // Reducimos temperatura para máxima precisión y menos alucinación
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        console.log(`% c[✨ ÉXITO]Respondió: ${modelName} | Llave: ${label} `, "color: #10b981; font-weight: bold;");

        const mKey = `key${i + 1} ` as keyof typeof apiMetrics;
        apiMetrics[mKey].requests++;
        apiMetrics[mKey].success++;
        apiMetrics[mKey].lastUsed = new Date().toLocaleTimeString();

        modelHealthStatus[modelName] = "online";
        logApiKeyUsage(i, 'success', undefined, modelName);
        return parsed as DidacticSequence;

      } catch (err: any) {
        lastError = err;
        console.warn(`[❌ Intento Fallido] ${modelName} (${label}): ${err.message} `);
        modelHealthStatus[modelName] = "offline";
        const mKey = `key${i + 1} ` as keyof typeof apiMetrics;
        apiMetrics[mKey].requests++;
        apiMetrics[mKey].errors++;
        logApiKeyUsage(i, 'error', err.message, modelName);

        if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('limit')) continue;
      }
    }
  }

  throw new Error(`[Fallo en Orquestación]: Ninguna combinación de llave y modelo tiene cuota disponible.Error final: ${lastError?.message} `);
};

export let lastWorkingModel = "gemini-2.0-flash";