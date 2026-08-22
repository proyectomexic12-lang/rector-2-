// @ts-nocheck
declare const Deno: any;


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
      "deepseek-chat"
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

    let lastError: any;
    let sequenceData = null;
    let usedModel = "";

    // Rotation: Try each available key and model
    for (const key of apiKeys) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model ${modelName} with key substring ...${key.slice(-6)}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000);

          const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: "user", content: prompt }],
              temperature: 0.0,
              max_tokens: 4096
            })
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
             const errData = await res.json().catch(() => ({}));
             throw new Error(`Error API DeepSeek ${res.status}: ${errData?.error?.message || res.statusText}`);
          }

          const data = await res.json();
          let text = data.choices?.[0]?.message?.content || "";

          // JSON Parsing logic
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
          }

          sequenceData = JSON.parse(text);
          if (sequenceData) {
            if (!sequenceData.taller_imprimible || typeof sequenceData.taller_imprimible !== 'object') {
              sequenceData.taller_imprimible = {
                introduccion: `Bienvenido a esta Guía Práctica de Aprendizaje Autónomo sobre ${safeTema}. A lo largo de este taller explorarás situaciones reales, resolverás retos conceptuales y pondrás a prueba tus habilidades.`,
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
            } else if (!Array.isArray(sequenceData.taller_imprimible.ejercicios) || sequenceData.taller_imprimible.ejercicios.length < 3) {
              const baseEj = Array.isArray(sequenceData.taller_imprimible.ejercicios) ? sequenceData.taller_imprimible.ejercicios : [];
              sequenceData.taller_imprimible.ejercicios = [
                ...baseEj,
                `Actividad 1 (Análisis de Caso): Analiza la situación sobre ${safeTema} y responde: a) ¿Cuál es la problemática central? b) Propón 2 soluciones.`,
                `Actividad 2 (Desarrollo Conceptual): Explica con tus palabras los conceptos clave de ${safeTema} con un ejemplo real.`,
                `Actividad 3 (Aplicación Práctica): Desarrolla los ejercicios procedimentales sobre ${safeTema}.`,
                `Actividad 4 (Resolución de Problemas): Analiza y resuelve el caso hipotético del tema.`,
                `Actividad 5 (Síntesis Crítica): Redacta un resumen de 5 líneas con tus conclusiones sobre ${safeTema}.`
              ].slice(0, 5);
            }

            if (!sequenceData.adecuaciones_piar || typeof sequenceData.adecuaciones_piar !== 'string' || sequenceData.adecuaciones_piar.trim().length < 15) {
              sequenceData.adecuaciones_piar = "1. Apoyos Visuales y Gráficos: Esquemas conceptuales y guías paso a paso.\n2. Flexibilización de Tiempos: Tiempo adicional adaptado para lectura y procesamiento de tareas.\n3. Trabajo por Pares y Tutoría: Acompañamiento guiado en mesa de trabajo según el Plan Individual de Ajustes Razonables (PIAR).";
            }
            if (!sequenceData.dba_utilizado || typeof sequenceData.dba_utilizado !== 'string' || sequenceData.dba_utilizado.trim().length < 5) {
              sequenceData.dba_utilizado = input.dba && input.dba.trim().length > 5 
                ? input.dba 
                : `DBA Oficial del MEN (Colombia) - Grado ${input.grado} (${input.area}): Identifica, comprende y aplica los referentes oficiales del MEN en relación con ${safeTema}.`;
            }
            sequenceData.titulo_secuencia = sequenceData.titulo_secuencia || `Secuencia Didáctica: ${safeTema}`;
            sequenceData.descripcion_secuencia = sequenceData.descripcion_secuencia || `Secuencia didáctica orientada al desarrollo de aprendizajes significativos en ${safeTema}.`;
            sequenceData.objetivo_aprendizaje = sequenceData.objetivo_aprendizaje || `Comprender y aplicar los conceptos fundamentales de ${safeTema} mediante actividades prácticas e investigativas.`;
            sequenceData.metodologia = sequenceData.metodologia || "Aprendizaje Basado en Problemas (ABP) y Diseño Universal para el Aprendizaje (DUA)";
            sequenceData.productos_asociados = sequenceData.productos_asociados || `Bitácora de evidencias y taller completado sobre ${safeTema}`;
            sequenceData.instrumentos_evaluacion = sequenceData.instrumentos_evaluacion || "Rúbrica de desempeño Decreto 1290, observación directa y lista de cotejo";
            sequenceData.bibliografia = sequenceData.bibliografia || "Lineamientos Curriculares y Derechos Básicos de Aprendizaje (DBA) - Ministerio de Educación Nacional (MEN)";
            sequenceData.observaciones = sequenceData.observaciones || "Planeación alineada con los requerimientos pedagógicos institucionales.";
            sequenceData.corporiedad_adi = sequenceData.corporiedad_adi || "Pausa activa cerebral de 3 a 5 minutos (gimnasia cerebral y respiración guiada).";
          }
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
