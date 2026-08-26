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

    type GradeCategory = 'preescolar' | 'primaria_baja' | 'primaria_alta' | 'secundaria' | 'media' | 'multigrado';

    function getGradeCategory(grado?: string) {
      const raw = (grado || '').toLowerCase().trim();
      const g = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (g.includes('multi')) {
        return {
          category: 'multigrado' as GradeCategory,
          gradeLabel: 'Aula Multigrado Primaria',
          searchSuffix: 'primaria para niños clase didactica explicacion infantil',
          cleanGradeName: 'Multigrado Primaria'
        };
      }

      if (g.includes('transici') || g.includes('preescolar') || g.includes('jardin') || g.includes('parvulo') || g === '0' || g === '0°') {
        return {
          category: 'preescolar' as GradeCategory,
          gradeLabel: 'Transición / Preescolar',
          searchSuffix: 'para niños preescolar infantil cancion cuento educativo',
          cleanGradeName: 'Preescolar'
        };
      }

      if (g.includes('undecim') || g.includes('once') || g === '11' || g === '11°' || g === '11ro' || g === '11vo' || g.includes('grado 11') || g.startsWith('11 ') || g.startsWith('11.')) {
        return {
          category: 'media' as GradeCategory,
          gradeLabel: 'Grado 11° Media',
          searchSuffix: 'grado 11 once bachillerato preparacion icfes saber 11 explicacion clase',
          cleanGradeName: 'Undécimo (11°)'
        };
      }

      if (g.includes('decim') || g === '10' || g === '10°' || g === '10mo' || g.includes('grado 10') || g.startsWith('10 ') || g.startsWith('10.')) {
        return {
          category: 'media' as GradeCategory,
          gradeLabel: 'Grado 10° Media',
          searchSuffix: 'grado 10 decimo bachillerato explicacion clase preparacion saber',
          cleanGradeName: 'Décimo (10°)'
        };
      }

      if (g.includes('primer') || g === '1' || g === '1°' || g === '1ro' || g.includes('grado 1') || g.startsWith('1 ') || g.startsWith('1.')) {
        return {
          category: 'primaria_baja' as GradeCategory,
          gradeLabel: 'Grado 1° Primaria',
          searchSuffix: 'para niños de 1 primaria primer grado educativo infantil explicacion facil',
          cleanGradeName: 'Primero de Primaria'
        };
      }
      if (g.includes('segund') || g === '2' || g === '2°' || g === '2do' || g.includes('grado 2') || g.startsWith('2 ') || g.startsWith('2.')) {
        return {
          category: 'primaria_baja' as GradeCategory,
          gradeLabel: 'Grado 2° Primaria',
          searchSuffix: 'para niños de 2 primaria segundo grado explicacion infantil didactica',
          cleanGradeName: 'Segundo de Primaria'
        };
      }
      if (g.includes('tercer') || g === '3' || g === '3°' || g === '3ro' || g.includes('grado 3') || g.startsWith('3 ') || g.startsWith('3.')) {
        return {
          category: 'primaria_baja' as GradeCategory,
          gradeLabel: 'Grado 3° Primaria',
          searchSuffix: 'para niños de 3 primaria tercer grado explicacion didactica',
          cleanGradeName: 'Tercero de Primaria'
        };
      }

      if (g.includes('cuart') || g === '4' || g === '4°' || g === '4to' || g.includes('grado 4') || g.startsWith('4 ') || g.startsWith('4.')) {
        return {
          category: 'primaria_alta' as GradeCategory,
          gradeLabel: 'Grado 4° Primaria',
          searchSuffix: 'para niños cuarto de primaria 4 grado explicacion didactica clase',
          cleanGradeName: 'Cuarto de Primaria'
        };
      }
      if (g.includes('quint') || g === '5' || g === '5°' || g === '5to' || g.includes('grado 5') || g.startsWith('5 ') || g.startsWith('5.')) {
        return {
          category: 'primaria_alta' as GradeCategory,
          gradeLabel: 'Grado 5° Primaria',
          searchSuffix: 'para niños quinto de primaria 5 grado clase explicativa',
          cleanGradeName: 'Quinto de Primaria'
        };
      }

      if (g.includes('sext') || g === '6' || g === '6°' || g === '6to' || g.includes('grado 6') || g.startsWith('6 ') || g.startsWith('6.')) {
        return {
          category: 'secundaria' as GradeCategory,
          gradeLabel: 'Grado 6° Secundaria',
          searchSuffix: 'grado 6 sexto secundaria explicacion clase',
          cleanGradeName: 'Sexto de Secundaria'
        };
      }
      if (g.includes('septim') || g === '7' || g === '7°' || g === '7mo' || g.includes('grado 7') || g.startsWith('7 ') || g.startsWith('7.')) {
        return {
          category: 'secundaria' as GradeCategory,
          gradeLabel: 'Grado 7° Secundaria',
          searchSuffix: 'grado 7 septimo secundaria explicacion clase',
          cleanGradeName: 'Séptimo de Secundaria'
        };
      }
      if (g.includes('octav') || g === '8' || g === '8°' || g === '8vo' || g.includes('grado 8') || g.startsWith('8 ') || g.startsWith('8.')) {
        return {
          category: 'secundaria' as GradeCategory,
          gradeLabel: 'Grado 8° Secundaria',
          searchSuffix: 'grado 8 octavo secundaria explicacion clase',
          cleanGradeName: 'Octavo de Secundaria'
        };
      }
      if (g.includes('noven') || g === '9' || g === '9°' || g === '9no' || g.includes('grado 9') || g.startsWith('9 ') || g.startsWith('9.')) {
        return {
          category: 'secundaria' as GradeCategory,
          gradeLabel: 'Grado 9° Secundaria',
          searchSuffix: 'grado 9 noveno secundaria explicacion clase',
          cleanGradeName: 'Noveno de Secundaria'
        };
      }

      if (g.includes('primaria')) {
        return {
          category: 'primaria_baja' as GradeCategory,
          gradeLabel: 'Primaria',
          searchSuffix: 'para niños de primaria explicacion infantil didactica',
          cleanGradeName: 'Primaria'
        };
      }

      return {
        category: 'secundaria' as GradeCategory,
        gradeLabel: `Grado ${grado || ''}`,
        searchSuffix: `grado ${grado || ''} explicacion clase`,
        cleanGradeName: `Grado ${grado || ''}`
      };
    }

    function buildGradeAwareVideoQuery(rawTitle: string, tema: string, grado?: string): string {
      let cleanTitle = (rawTitle || '')
        .replace(/^(video|video explicativo|video tutorial|tutorial|recurso audiovisual|recurso|material)\s*[:-]?\s*/i, '')
        .replace(/['"«»“”]/g, '')
        .trim();

      const cleanTema = (tema || '').replace(/['"«»“”]/g, '').trim();
      const gradeMeta = getGradeCategory(grado);

      let coreTerm = cleanTitle;
      if (!coreTerm) {
        coreTerm = cleanTema || 'conceptos clave';
      } else if (cleanTema && !coreTerm.toLowerCase().includes(cleanTema.toLowerCase())) {
        coreTerm = `${coreTerm} ${cleanTema}`;
      }

      coreTerm = coreTerm
        .replace(/\b(grado\s*\d+°?|\d+°?\s*grado|\b(primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|decimo|décimo|undecimo|undécimo|once)\b)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      return `${coreTerm} ${gradeMeta.searchSuffix}`.replace(/\s+/g, ' ').trim();
    }

    function getGradeContext(grado?: string): string {
      const { category } = getGradeCategory(grado);
      switch (category) {
        case 'preescolar':
          return "ENFOQUE DE PREESCOLAR / TRANSICIÓN: Estimulación sensorial, juego estructurado, canciones infantiles, rondas, cuentos ilustrados, grafomotricidad y motricidad. Lenguaje de ternura, lúdico y visual. CERO abstracciones.";
        case 'primaria_baja':
          return "ENFOQUE DE PRIMARIA BÁSICA (1° a 3°): Uso intensivo de material concreto (bloques, fichas, regletas, dibujos), juegos de roles, canciones, retos de conteo/lectura inicial y actividades motrices cortas. Lenguaje afectivo, motivador y sumamente didáctico infantil.";
        case 'primaria_alta':
          return "ENFOQUE DE PRIMARIA ALTA (4° y 5°): Transición al razonamiento lógico estructurado. Retos grupales, descubrimientos guiados, proyectos manuales, preguntas de indagación y resolución de problemas cotidianos contextualizados para niños.";
        case 'secundaria':
          return "ENFOQUE DE SECUNDARIA BÁSICA (6° a 9°): Pensamiento crítico, debates, problemas sociales reales, trabajo en equipo y argumentación sólida.";
        case 'media':
          return "ENFOQUE DE MEDIA ACADÉMICA / TÉCNICA (10° y 11°): Alto rigor conceptual pre-universitario, competencias Saber 11 / ICFES, análisis crítico de textos complejos, ensayos argumentativos, formulación de hipótesis y proyectos de vida.";
        case 'multigrado':
          return "ENFOQUE MULTIGRADO PRIMARIA (Escuela Nueva / Altomira): Estrategia de aula unificada con actividades multinivel diferenciadas por ciclo (Transición a 5°), guías de autoaprendizaje y aprendizaje colaborativo entre pares.";
        default:
          return "ENFOQUE GENERAL: Adaptación al nivel cognitivo según lineamientos pedagógicos.";
      }
    }

    function getAreaContext(area?: string): string {
      const a = (area || '').toLowerCase();
      if (a.includes('matemática')) return "ENFOQUE MATEMÁTICO: Resolución de problemas (Polya), pensamiento lógico y uso constructivo del error.";
      if (a.includes('lenguaje') || a.includes('español')) return "ENFOQUE LENGUAJE: Prácticas sociales del lenguaje, comprensión crítica, producción textual y lectura inferencial.";
      if (a.includes('ciencia') || a.includes('natural')) return "ENFOQUE CIENTÍFICO: Método científico empírico, laboratorios lúdicos, hipótesis y conciencia ambiental.";
      if (a.includes('sociales') || a.includes('historia')) return "ENFOQUE SOCIALES: Pensamiento histórico y crítico, multiperspectividad, geografía viva y formación ciudadana.";
      return "ENFOQUE DISCIPLINAR: Énfasis en las competencias específicas del área según lineamientos del MEN.";
    }

    const prompt = `
      ### PERSONA: MASTER RECTOR AI (V5.0 PLATINUM)
      Eres el Agente Supremo de la I.E. Guaimaral. Fusionas la excelencia pedagógica de un Consultor Senior del MEN con la precisión técnica de un Ingeniero de Orquestación de IA de nivel platino. Tu misión es la perfección absoluta en cada letra y estructura.

      ### MARCO DE OPERACIÓN SUPREMO
      - **Protocolo de las 50 Reglas de Oro:** Aplicar cada directriz de excelencia pedagógica (Alineación MEN, DUA, Bloom, CRESE).
      - **Alineación DBA MEN Colombia:** Si el área usa DBA, DEBES citar el número exacto del DBA del MEN (ej: "DBA #2") y su enunciado literal para ${input.grado || 'este grado'}. Si no usa DBA (ej: Filosofía, Artística), citar la "Orientación Pedagógica del MEN para ${input.area}".
      - **Taller del Estudiante Completo (Vista Estudiante):** Generar una guía de trabajo 'taller_imprimible' EXTENSA, RICA y COMPLETA con MÍNIMO 5 ejercicios prácticos contextualizados, indagación inicial y reto creativo de alto valor pedagógico.
      - **Robustez Técnica Platino:** Generar JSON puro, sin errores estructurales, con tipos validados al 100%.

      ### PARÁMETROS DE LA SECUENCIA
      - **Grado:** ${input.grado || 'General'} (${getGradeContext(input.grado)})
      - **Area:** ${input.area || 'General'} (${getAreaContext(input.area)})
      - **Tema:** ${safeTema} | **Sesiones:** ${input.sesiones || 4}
      ${pedagogicalInstruction}
      - **Banco de Evaluación:** Generar obligatoriamente **10 preguntas** de selección múltiple tipo ICFES con 4 opciones.
      - **Recursos Multimedia y Audiovisuales Adaptados al Grado Exacto:** Si una actividad implica un video, debes incluir un enlace de búsqueda de YouTube adaptado obligatoriamente a la edad y nivel cognitivo del grado (${input.grado || 'este grado'}). Para primaria (Transición a 5°), el término de búsqueda DEBE incluir palabras clave infantiles/pedagógicas como 'para niños', 'educativo primaria', 'grado ${input.grado}', para EVITAR ABSOLUTAMENTE que YouTube devuelva videos de secundaria o bachillerato (ej: videos de 9° grado para temas de división básica).
      - **Integración Transversal:** ${input.ejeCrese || 'Fusión socioemocional y ciudadana de alto impacto.'}
      ${refinementInstruction ? `- **COMANDO DE REFINAMIENTO MAESTRO:** ${sanitizeInput(refinementInstruction)}` : ''}

      ### AUDITORÍA DE CALIDAD PRE-SALIDA
      - ¿El DBA o la Orientación Pedagógica es el oficial del MEN exacto para ${input.grado}?
      - ¿Hay exactamente **10 preguntas** de evaluación tipo ICFES?
      - ¿El Taller del Estudiante ('taller_imprimible') contiene mínimo 5 actividades/ejercicios extensos y contextualizados?

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
              if (hasDBA) {
                sequenceData.dba_utilizado = (input.dba && input.dba.trim().length > 5)
                  ? input.dba
                  : `DBA #1 (MEN Colombia - ${input.area} Grado ${input.grado}): Identifica, comprende y analiza los referentes oficiales del MEN en relación con ${safeTema}.`;
              } else {
                sequenceData.dba_utilizado = `Orientación Pedagógica del MEN para ${input.area} (Grado ${input.grado}): Promueve el análisis crítico, la indagación y la reflexión filosófica en torno a ${safeTema}, de acuerdo con los Lineamientos Curriculares Nacionales del MEN.`;
              }
            } else if (!hasDBA && (sequenceData.dba_utilizado.toLowerCase().includes("dba oficial") || sequenceData.dba_utilizado.toLowerCase().startsWith("dba"))) {
              sequenceData.dba_utilizado = `Orientación Pedagógica del MEN para ${input.area} (Grado ${input.grado}): ${sequenceData.dba_utilizado.replace(/^DBA\s*(Oficial\s*del\s*MEN\s*\([^)]*\))?\s*[:-]?\s*/i, "")}`;
            }
            sequenceData.titulo_secuencia = sequenceData.titulo_secuencia || `Secuencia Didáctica: ${safeTema}`;
            sequenceData.descripcion_secuencia = sequenceData.descripcion_secuencia || `Secuencia didáctica orientada al desarrollo de aprendizajes significativos en ${safeTema}.`;
            sequenceData.objetivo_aprendizaje = sequenceData.objetivo_aprendizaje || `Comprender y aplicar los conceptos fundamentales de ${safeTema} mediante actividades prácticas e investigativas.`;
            sequenceData.metodologia = sequenceData.metodologia || "Aprendizaje Basado en Problemas (ABP) y Diseño Universal para el Aprendizaje (DUA)";
            sequenceData.productos_asociados = sequenceData.productos_asociados || `Bitácora de evidencias y taller completado sobre ${safeTema}`;
            sequenceData.instrumentos_evaluacion = sequenceData.instrumentos_evaluacion || "Rúbrica de desempeño Decreto 1290, observación directa y lista de cotejo";
            sequenceData.bibliografia = sequenceData.bibliografia || "Lineamientos Curriculares y Derechos Básicos de Aprendizaje (DBA) - Ministerio de Educación Nacional (MEN)";
            sequenceData.observaciones = sequenceData.observaciones || "Planeación alineada con los requerimientos pedagógicos institucionales.";
            let cleanRecursos: any[] = [];

            if (Array.isArray(sequenceData.recursos) && sequenceData.recursos.length > 0) {
              const videos = sequenceData.recursos.filter((r: any) => {
                const n = (r?.nombre || "").toString().toLowerCase();
                const d = (r?.descripcion || "").toString().toLowerCase();
                return n.includes("video") || d.includes("video") || n.includes("youtube");
              });

              if (videos.length > 0) {
                cleanRecursos.push(videos[0]);
              } else {
                cleanRecursos.push({
                  nombre: `Video Explicativo: '${safeTema} - Conceptos Clave (${input.grado || ''})'`,
                  descripcion: `Tutorial audiovisual adaptado para niños y estudiantes de ${input.grado || ''}.`
                });
              }
            } else {
              cleanRecursos = [
                {
                  nombre: `Video Explicativo: '${safeTema} - Conceptos Clave (${input.grado || ''})'`,
                  descripcion: `Tutorial audiovisual adaptado para ${input.grado || ''}.`
                }
              ];
            }

            sequenceData.recursos = cleanRecursos.map((r: any) => ({
              nombre: (r?.nombre || "Video Explicativo").toString(),
              descripcion: (r?.descripcion || "Material audiovisual de apoyo pedagógico.").toString().replace(/\s*\(Ver en YouTube:\s*https?:\/\/[^\)]+\)/gi, "").trim()
            }));

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
