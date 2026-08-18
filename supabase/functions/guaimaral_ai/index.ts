declare const Deno: any;

import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai@^0.24.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS options preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { input, refinementInstruction } = body;

    if (!input) {
      return new Response(JSON.stringify({ error: "No input provided in request body" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get API Keys from Supabase Secrets (Support GEMINI_API_KEY_X, VITE_API_KEY_X, and GEMINI_API_KEY)
    const rawKeys = [
      Deno.env.get('GEMINI_API_KEY_1'),
      Deno.env.get('GEMINI_API_KEY_2'),
      Deno.env.get('GEMINI_API_KEY_3'),
      Deno.env.get('VITE_API_KEY_1'),
      Deno.env.get('VITE_API_KEY_2'),
      Deno.env.get('VITE_API_KEY_3'),
      Deno.env.get('GEMINI_API_KEY'),
      Deno.env.get('VITE_GEMINI_API_KEY')
    ].filter(Boolean) as string[];

    // Remove duplicates
    const apiKeys = Array.from(new Set(rawKeys));

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No API keys configured on the server. Please add GEMINI_API_KEY_1 or VITE_API_KEY_1 to Supabase Secrets." 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const modelsToTry = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro"
    ];

    const sanitizeInput = (text?: string): string => {
      if (!text) return "";
      return text.trim().replace(/['"<>]/g, "");
    };

    const safeTema = sanitizeInput(input.tema);
    const currentArea = input.area ? input.area.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const isMultigrado = input.grado ? input.grado.toLowerCase().includes("multigrado") : false;
    const isIntegral = input.area ? input.area.toLowerCase().includes("integral") : false;

    const areaNormativa = {
      conDBA: ['MATEMATICAS', 'LENGUAJE', 'CIENCIAS NATURALES', 'CIENCIAS SOCIALES', 'INGLES', 'FISICA', 'ESTADISTICA', 'GEOMETRIA', 'BIOLOGIA', 'QUIMICA'],
      conOrientaciones: ['EDUCACION ARTISTICA', 'EDUCACION FISICA', 'ETICA', 'VALORES', 'RELIGION', 'TECNOLOGIA', 'FILOSOFIA', 'CONVIVENCIA', 'AGROPECUARIA', 'CATEDRA DE LA PAZ']
    };

    const hasDBA = areaNormativa.conDBA.some(a => currentArea.includes(a)) || isIntegral;

    let pedagogicalInstruction = hasDBA
      ? `- **DBA Oficial:** Debes identificar el número exacto del DBA (ej: "DBA #3") y transcribir su contenido literal que se está abordando.
         - **Input del Usuario:** ${sanitizeInput(input.dba) || 'Sin DBA previo'}. Si este input es un número, busca el contenido oficial. Si es texto, valida su correspondencia con el número.`
      : `- **Referencia Pedagógica:** Esta área NO utiliza DBA. Debes citar explícitamente las **"Orientaciones Pedagógicas y Curriculares del MEN para ${input.area || 'esta área'}"**. 
         - **Instrucción Especial:** En la casilla de DBA, debes colocar: "Tomado de las Orientaciones Pedagógicas del MEN: [Citar el eje o lineamiento específico usado]". NO inventes un número de DBA.`;

    if (isMultigrado) {
      pedagogicalInstruction += `\n- **INSTRUCCIÓN ESPECIAL MULTIGRADO (Sede Altomira - Profe Leovigilda):** Esta secuencia es para un aula MULTIGRADO. Debes especificar acciones y niveles de complejidad diferenciados para cada grado: **Transición, 1°, 2°, 3°, 4° y 5°**. 
      - **Enfoque Integrador:** Debes fusionar de manera coherente las 4 áreas básicas (Lenguaje, Matemáticas, Sociales y Naturales) en una sola secuencia didáctica funcional.`;
    }

    const prompt = `
      ### PERSONA: MASTER RECTOR AI (V5.0 PLATINUM)
      Eres el Agente Supremo de la I.E. Guaimaral. Fusionas la excelencia pedagógica de un Consultor Senior del MEN con la precisión técnica de un Ingeniero de Orquestación de IA de nivel platino. Tu misión es la perfección absoluta en cada letra y estructura.

      ### MARCO DE OPERACIÓN SUPREMO
      - **Protocolo de las 50 Reglas de Oro:** Aplicar cada directriz de excelencia pedagógica (Alineación MEN, DUA, Bloom, CRESE).
      - **Robustez Técnica Platino:** Generar JSON puro, sin errores estructurales, con tipos validados al 100%.
      - **Cero Alucinación Curricular:** Veracidad total en referentes nacionales. Si es DBA, incluir número y texto. Si son Orientaciones, citarlas textualmente.
      - **Metodologías de Vanguardia:** Aprendizaje Basado en Problemas, Flipped Classroom y Momentos ADI Creativos.

      ### PARÁMETROS DE LA SECUENCIA
      - **Grado:** ${input.grado || 'General'} | **Area:** ${input.area || 'General'}
      - **Tema:** ${safeTema} | **Sesiones:** ${input.sesiones || 4}
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
            bitacora_test_inicial: { type: SchemaType.STRING },
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

    let lastError: any;
    let sequenceData = null;
    let usedModel = "";

    // Rotation: Try each available key and model
    for (const key of apiKeys) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model ${modelName} with key substring ...${key.slice(-6)}`);
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
          const text = result.response.text();
          sequenceData = JSON.parse(text);
          usedModel = modelName;
          
          break; // Break model loop on success
        } catch (err: any) {
          console.error(`Attempt failed [${modelName}]:`, err?.message || err);
          lastError = err;
        }
      }
      if (sequenceData) break; // Break key loop on success
    }

    if (!sequenceData) {
      throw new Error(`Fallo en Orquestación: Ninguna combinación de llave y modelo funcionó. Error final: ${lastError?.message || 'Error desconocido'}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sequence: sequenceData,
      meta: { model: usedModel }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("Guaimaral AI Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
