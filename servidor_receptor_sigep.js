/**
 * 🏫 SERVIDOR RECEPTOR INSTITUCIONAL SIGEP-IEG v6.0 PLATINUM
 * ==============================================================================
 * Sistema Oficial de Radicación, Versionamiento, Organización y Coordinación
 * Institución Educativa Guaimaral (Cúcuta, Norte de Santander)
 * ==============================================================================
 * 
 * CARACTERÍSTICAS DE BLINDAJE IMPLEMENTADAS:
 * 1. Organización Automática Jerárquica en Disco:
 *    storage_sigep/planeaciones/{AÑO}/Semana_{SEMANA}/{AREA}/{GRADO}/
 * 2. Control de Idempotencia y Versionamiento Automático:
 *    Detecta entregas previas para (Docente + Área + Grado + Semana + Año).
 *    Si ya existe, la archiva como versión previa y promueve a v2, v3... sin duplicar.
 * 3. Doble Respaldo: Local inmutable + Sincronización en la Nube con Supabase.
 * 4. Normalización Estricta de Áreas y Grados institucionales MEN.
 * 5. Generación de Radicado Oficial Institucional con Sello de Tiempo Legal en Colombia.
 * 6. Ciclo Completo de Evaluación del Coordinador:
 *    Endpoint /api/planeaciones/evaluar para Aprobar / Con Observaciones / Rechazar.
 * 7. Panel Web de Coordinación de Alta Definición con Filtros en Vivo, KPIs,
 *    Visor Didáctico Completo e Impresión Oficial con Membrete Institucional.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ==============================================================================
// 1. CARGA AUTOMÁTICA DE VARIABLES DE ENTORNO (.env) SIN DEPENDENCIAS EXTERNAS
// ==============================================================================
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo leer el archivo .env:', e.message);
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// ==============================================================================
// 2. CONFIGURACIÓN DE ALMACENAMIENTO ESTRUCTURADO Y PERSISTENCIA
// ==============================================================================
const STORAGE_ROOT = path.join(__dirname, 'storage_sigep');
const HISTORIAL_DIR = path.join(STORAGE_ROOT, 'historial_versiones');
const DB_FILE = path.join(__dirname, 'planeaciones_recibidas.json');

// Asegurar existencia de directorios base
if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
if (!fs.existsSync(HISTORIAL_DIR)) fs.mkdirSync(HISTORIAL_DIR, { recursive: true });

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('⚠️ Error al leer DB_FILE local:', e.message);
    return [];
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('❌ Error escribiendo en DB_FILE:', e.message);
  }
}

// Sanitizar nombres para rutas de carpetas seguras
function sanitizeForFolder(str) {
  if (!str) return 'General';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Cálculo exacto de semana estándar ISO-8601
function getIsoWeek(d) {
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

function getMondayOfWeek(week, year) {
  const yr = year || new Date().getFullYear();
  const simple = new Date(yr, 0, 1 + (week - 1) * 7);
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

function getSundayOfWeek(week, year) {
  const yr = year || new Date().getFullYear();
  const monStr = getMondayOfWeek(week, yr);
  const parts = monStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Obtener fecha y hora legal de Colombia
function getColombiaDateInfo() {
  const now = new Date();
  const options = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  const formatter = new Intl.DateTimeFormat('es-CO', options);
  const formattedString = formatter.format(now);
  
  // Fecha ajustada al huso horario de Colombia
  let colDate = now;
  try {
    const colStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    colDate = new Date(colStr);
  } catch (e) {
    colDate = now;
  }

  const currentIsoWeek = getIsoWeek(colDate);

  return {
    now: colDate,
    isoString: now.toISOString(),
    year: colDate.getFullYear(),
    currentIsoWeek,
    horaLegalColombia: formattedString
  };
}

// Normalización oficial institucional de áreas y grados
const CATALOGO_AREAS = [
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

const CATALOGO_GRADOS = [
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
  { value: '10°', label: '10° Media Técnica' },
  { value: '11°', label: '11° Media Técnica' }
];

function normalizarArea(areaInput) {
  if (!areaInput) return 'General';
  const clean = areaInput.toLowerCase().trim();
  const match = CATALOGO_AREAS.find(a => clean.includes(a.toLowerCase().slice(0, 6)));
  return match || areaInput;
}

function normalizarGrado(gradoInput) {
  if (!gradoInput) return 'General';
  const clean = gradoInput.toLowerCase().trim();
  const match = CATALOGO_GRADOS.find(g => clean.includes(g.value.toLowerCase()) || clean.includes(g.label.toLowerCase()));
  return match ? match.value : gradoInput;
}

// ==============================================================================
// 3. SINCRONIZACIÓN ASÍNCRONA CON SUPABASE (NUBE)
// ==============================================================================
async function syncToSupabase(registro) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { synced: false, motivo: 'Supabase no configurado en .env' };
  }

  try {
    const payload = {
      user_email: registro.docente_email,
      grado: registro.grado,
      area: registro.area,
      tema: registro.secuencia?.tema_principal || registro.secuencia?.titulo_secuencia || 'Planeación Curricular',
      content: {
        id_radicado: registro.id,
        radicado_oficial: registro.radicado_oficial,
        version: registro.version,
        numero_semana: registro.numero_semana,
        estado: registro.estado,
        observaciones_coordinador: registro.observaciones_coordinador,
        hora_exacta_colombia: registro.hora_exacta_colombia,
        secuencia: registro.secuencia
      },
      timestamp: registro.fecha_recepcion
    };

    // 1. Verificar si ya existe una secuencia previa con el mismo radicado o del mismo docente y tema
    let existingId = null;
    try {
      // Buscar primero por id_radicado si ya se había sincronizado antes
      const checkRadicadoUrl = `${SUPABASE_URL}/rest/v1/generated_sequences?user_email=eq.${encodeURIComponent(registro.docente_email)}&content->>id_radicado=eq.${encodeURIComponent(registro.id)}&select=id&limit=1`;
      const resRadicado = await fetch(checkRadicadoUrl, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (resRadicado.ok) {
        const dataRadicado = await resRadicado.json();
        if (dataRadicado && dataRadicado.length > 0) {
          existingId = dataRadicado[0].id;
        }
      }

      // Si no se encontró por radicado, buscar por docente y tema generado recientemente
      if (!existingId && payload.tema) {
        const checkTemaUrl = `${SUPABASE_URL}/rest/v1/generated_sequences?user_email=eq.${encodeURIComponent(registro.docente_email)}&tema=eq.${encodeURIComponent(payload.tema)}&select=id&order=timestamp.desc&limit=1`;
        const resTema = await fetch(checkTemaUrl, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (resTema.ok) {
          const dataTema = await resTema.json();
          if (dataTema && dataTema.length > 0) {
            existingId = dataTema[0].id;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo verificar duplicado previo en Supabase:', e.message);
    }

    let res;
    if (existingId) {
      // Actualizar secuencia existente (Mantiene cuota exacta 1 a 1 sin duplicar en BD)
      res = await fetch(`${SUPABASE_URL}/rest/v1/generated_sequences?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          grado: registro.grado,
          area: registro.area,
          content: payload.content
        })
      });
      if (res.ok) {
        console.log(`☁️ [SUPABASE-SYNC] Actualizada secuencia existente ID [${existingId}] con radicado [${registro.radicado_oficial}] (1 a 1 sin duplicar cuota).`);
        return { synced: true };
      }
    } else {
      // Nueva secuencia primigenia
      res = await fetch(`${SUPABASE_URL}/rest/v1/generated_sequences`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      console.log(`☁️ [SUPABASE-SYNC] Sincronizada exitosamente planeación ${registro.radicado_oficial} en la nube.`);
      return { synced: true };
    } else {
      const errText = await res.text();
      console.warn(`⚠️ [SUPABASE-SYNC] Respuesta Supabase (${res.status}): ${errText}`);
      return { synced: false, error: errText };
    }
  } catch (err) {
    console.warn(`⚠️ [SUPABASE-SYNC] Fallo de conexión con Supabase (el registro local permanece 100% a salvo):`, err.message);
    return { synced: false, error: err.message };
  }
}

// ==============================================================================
// 4. GUARDADO ESTRUCTURADO Y CONTROL DE VERSIONAMIENTO (IDEMPOTENCIA)
// ==============================================================================
function guardarPlaneacionEstructurada(nuevoRegistro) {
  const db = readDB();
  const colInfo = getColombiaDateInfo();
  const anio = nuevoRegistro.anio || colInfo.year;

  // Clave única compuesta para identificar la misma asignatura/grado/semana/docente
  const compositeKey = `${nuevoRegistro.docente_email.toLowerCase().trim()}|${normalizarArea(nuevoRegistro.area).toLowerCase()}|${normalizarGrado(nuevoRegistro.grado).toLowerCase()}|${nuevoRegistro.numero_semana}|${anio}`;

  // Buscar si ya existe una entrega previa
  const indexExistente = db.findIndex(item => {
    const itemKey = `${item.docente_email?.toLowerCase().trim()}|${normalizarArea(item.area).toLowerCase()}|${normalizarGrado(item.grado).toLowerCase()}|${item.numero_semana}|${item.anio || anio}`;
    return itemKey === compositeKey;
  });

  let registroFinal = { ...nuevoRegistro };

  if (indexExistente !== -1) {
    // YA EXISTÍA UNA ENTREGA: Se maneja como NUEVA VERSIÓN (v2, v3, etc.)
    const previa = db[indexExistente];
    const nuevaVersion = (previa.version || 1) + 1;

    // Archivar versión previa en storage físico
    const archivoPrevio = path.join(
      HISTORIAL_DIR,
      `${previa.id}_v${previa.version || 1}.json`
    );
    try {
      fs.writeFileSync(archivoPrevio, JSON.stringify(previa, null, 2), 'utf-8');
    } catch (e) {
      console.warn('⚠️ No se pudo archivar copia en historial:', e.message);
    }

    // Historial acumulado
    const historial = previa.historial_versiones || [];
    historial.push({
      version: previa.version || 1,
      fecha_recepcion: previa.fecha_recepcion,
      hora_colombia: previa.hora_exacta_colombia,
      estado_en_ese_momento: previa.estado,
      observaciones_anteriores: previa.observaciones_coordinador || ''
    });

    registroFinal = {
      ...previa,
      ...nuevoRegistro,
      id: previa.id, // Mantiene el mismo ID institucional de expediente
      radicado_oficial: previa.radicado_oficial || nuevoRegistro.radicado_oficial,
      version: nuevaVersion,
      estado: previa.estado === 'Aprobada' ? 'Reenviada (Actualizada)' : 'Pendiente (Nueva Versión)',
      observaciones_coordinador: previa.observaciones_coordinador || '',
      historial_versiones: historial,
      fecha_recepcion: colInfo.isoString,
      hora_exacta_colombia: colInfo.horaLegalColombia,
      timestamp_ms: colInfo.now.getTime()
    };

    db[indexExistente] = registroFinal;
    console.log(`🔄 [VERSIONAMIENTO] Docente ${registroFinal.docente_nombre} actualizó entrega a Versión ${nuevaVersion} (Radicado: ${registroFinal.radicado_oficial})`);
  } else {
    // NUEVA ENTREGA PRIMIGENIA (Versión 1)
    registroFinal.version = 1;
    registroFinal.historial_versiones = [];
    db.unshift(registroFinal);
    console.log(`✨ [NUEVA RADICACIÓN] Planeación radicada por primera vez: ${registroFinal.radicado_oficial}`);
  }

  // Guardar en la DB general
  writeDB(db);

  // Guardar en la carpeta física organizada:
  // storage_sigep/planeaciones/{AÑO}/Semana_{SEMANA}/{AREA}/{GRADO}/
  const folderPath = path.join(
    STORAGE_ROOT,
    'planeaciones',
    String(anio),
    `Semana_${registroFinal.numero_semana}`,
    sanitizeForFolder(registroFinal.area),
    sanitizeForFolder(registroFinal.grado)
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const individualFileName = `${sanitizeForFolder(registroFinal.docente_email)}_v${registroFinal.version}.json`;
  const individualFilePath = path.join(folderPath, individualFileName);
  try {
    fs.writeFileSync(individualFilePath, JSON.stringify(registroFinal, null, 2), 'utf-8');
    registroFinal.ruta_almacenamiento_local = individualFilePath;
  } catch (e) {
    console.warn('⚠️ No se pudo guardar archivo individual:', e.message);
  }

  return registroFinal;
}

// ==============================================================================
// 5. SERVIDOR HTTP PRINCIPAL & ENRUTADOR REST
// ==============================================================================
const server = http.createServer(async (req, res) => {
  // Configuración de Cabeceras CORS Universales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ----------------------------------------------------------------------------
  // ENDPOINT 1: GET /api/planeaciones/config-entrega
  // ----------------------------------------------------------------------------
  if (req.method === 'GET' && url.pathname === '/api/planeaciones/config-entrega') {
    const docenteEmail = url.searchParams.get('docente_email') || '';
    const colInfo = getColombiaDateInfo();

    // Regla institucional: viernes (5), sábado (6) o domingo (0) habilita programar la siguiente semana (+1)
    const dayOfWeek = colInfo.now.getDay();
    const maxAllowedWeek = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0)
      ? colInfo.currentIsoWeek + 1
      : colInfo.currentIsoWeek;

    const fechaMaxima = getSundayOfWeek(maxAllowedWeek, colInfo.year);

    // Generar lista de semanas oficiales dinámicas
    const semanas = [];
    for (let w = maxAllowedWeek; w >= 1; w--) {
      const isSiguiente = w > colInfo.currentIsoWeek;
      const isActual = w === colInfo.currentIsoWeek;
      const monday = getMondayOfWeek(w, colInfo.year);
      let label = `Semana ${w}`;
      if (isSiguiente) {
        label = `Semana ${w} (Semana Siguiente - Planificación Anticipada)`;
      } else if (isActual) {
        label = `Semana ${w} (Semana Actual - En Curso)`;
      } else {
        label = `Semana ${w} (Anterior / Pendiente)`;
      }
      semanas.push({
        numero: w,
        label,
        es_actual: isActual,
        es_institucional: true,
        fecha_lunes: monday
      });
    }

    const responseData = {
      institucion: 'Institución Educativa Guaimaral',
      anio_escolar: colInfo.year,
      semana_actual: colInfo.currentIsoWeek,
      semana_maxima_permitida: maxAllowedWeek,
      fecha_maxima: fechaMaxima,
      hora_oficial_colombia: colInfo.horaLegalColombia,
      semanas: semanas,
      areas: CATALOGO_AREAS,
      grados: CATALOGO_GRADOS,
      docente_asignaciones: {
        email: docenteEmail,
        areas: []
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(responseData));
    return;
  }

  // ----------------------------------------------------------------------------
  // ENDPOINT 2: POST /api/planeaciones/recibir (Radicación con Blindaje Total)
  // ----------------------------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/planeaciones/recibir') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);

        if (!payload.secuencia) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, mensaje: 'Falta la secuencia didáctica en el cuerpo del envío.' }));
          return;
        }

        const colInfo = getColombiaDateInfo();
        const numSemana = payload.metadata?.numero_semana || payload.secuencia?.semana || colInfo.currentIsoWeek;
        const areaFinal = normalizarArea(payload.metadata?.area || payload.secuencia?.competencias_men || payload.input_original?.area);
        const gradoFinal = normalizarGrado(payload.metadata?.grado || payload.secuencia?.grado || payload.input_original?.grado);

        // Generar Radicado Único Institucional
        const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
        const radicadoOficial = `RAD-${colInfo.year}-S${String(numSemana).padStart(2, '0')}-${randomHex}`;
        const newId = 'PLN-' + Date.now().toString(36).toUpperCase();

        const registro = {
          id: newId,
          radicado_oficial: radicadoOficial,
          anio: colInfo.year,
          docente_email: payload.docente?.email || 'docente@guaimaral.edu.co',
          docente_nombre: payload.docente?.nombre || 'Docente Guaimaral',
          area: areaFinal,
          grado: gradoFinal,
          numero_semana: parseInt(numSemana, 10),
          fecha_aplicacion: payload.metadata?.fecha_aplicacion || colInfo.isoString.split('T')[0],
          duracion_clases: payload.metadata?.duracion_clases || payload.secuencia?.actividades?.length || 1,
          estado: 'Pendiente', // 'Pendiente' | 'Aprobada' | 'Con Observaciones' | 'Rechazada'
          observaciones_coordinador: '',
          secuencia: payload.secuencia,
          input_original: payload.input_original || null,
          fecha_recepcion: colInfo.isoString,
          hora_exacta_colombia: colInfo.horaLegalColombia,
          timestamp_ms: colInfo.now.getTime()
        };

        // Guardado con idempotencia, versionamiento y carpetas físicas
        const guardado = guardarPlaneacionEstructurada(registro);

        // Sincronizar en la nube en segundo plano (no bloquea al usuario)
        syncToSupabase(guardado);

        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          mensaje: `Planeación radicada con éxito [${guardado.radicado_oficial}] - Versión ${guardado.version}. Recibida en SIGEP a las ${guardado.hora_exacta_colombia} (Hora legal Colombia).`,
          id: guardado.id,
          radicado: guardado.radicado_oficial,
          version: guardado.version,
          fecha_registro: guardado.fecha_recepcion,
          hora_colombia: guardado.hora_exacta_colombia,
          estado: guardado.estado
        }));
      } catch (err) {
        console.error('❌ Error procesando recepción de planeación:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          mensaje: 'El formato de datos enviado no es válido: ' + err.message
        }));
      }
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // ENDPOINT 3: POST /api/planeaciones/evaluar (Dictamen de Coordinación)
  // ----------------------------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/planeaciones/evaluar') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { id, estado, observaciones, evaluador_nombre } = JSON.parse(body);

        if (!id || !estado) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, mensaje: 'ID de planeación y nuevo estado son requeridos.' }));
          return;
        }

        const db = readDB();
        const index = db.findIndex(p => p.id === id);

        if (index === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, mensaje: 'Planeación no encontrada en el sistema.' }));
          return;
        }

        const colInfo = getColombiaDateInfo();
        db[index].estado = estado;
        db[index].observaciones_coordinador = observaciones || '';
        db[index].evaluado_por = evaluador_nombre || 'Coordinación Académica';
        db[index].fecha_evaluacion = colInfo.isoString;
        db[index].hora_evaluacion_colombia = colInfo.horaLegalColombia;

        writeDB(db);

        // Actualizar en el archivo físico individual si existe
        if (db[index].ruta_almacenamiento_local && fs.existsSync(db[index].ruta_almacenamiento_local)) {
          try {
            fs.writeFileSync(db[index].ruta_almacenamiento_local, JSON.stringify(db[index], null, 2), 'utf-8');
          } catch (e) {}
        }

        // Sincronizar actualización con Supabase
        syncToSupabase(db[index]);

        console.log(`✍️ [DICTAMEN] Planeación ${db[index].radicado_oficial} evaluada como [${estado}] por ${evaluador_nombre || 'Coordinador'}`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          mensaje: `Dictamen registrado con éxito: ${estado}`,
          planeacion: db[index]
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, mensaje: err.message }));
      }
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // ENDPOINT 4: GET /api/planeaciones (Listar con filtros opcionales)
  // ----------------------------------------------------------------------------
  if (req.method === 'GET' && url.pathname === '/api/planeaciones') {
    let db = readDB();

    const semana = url.searchParams.get('semana');
    const area = url.searchParams.get('area');
    const grado = url.searchParams.get('grado');
    const estado = url.searchParams.get('estado');
    const email = url.searchParams.get('docente_email');

    if (semana) db = db.filter(p => String(p.numero_semana) === String(semana));
    if (area) db = db.filter(p => p.area === area);
    if (grado) db = db.filter(p => p.grado === grado);
    if (estado) db = db.filter(p => p.estado === estado);
    if (email) db = db.filter(p => p.docente_email?.toLowerCase() === email.toLowerCase());

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(db));
    return;
  }

  // ----------------------------------------------------------------------------
  // ENDPOINT 5: PANEL WEB DE COORDINACIÓN (Dashboard Interactivo Platinum)
  // ----------------------------------------------------------------------------
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard')) {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIGEP-IEG · Panel Oficial de Coordinación & Revisión</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    @media print {
      body * { visibility: hidden; }
      #printableArea, #printableArea * { visibility: visible; }
      #printableArea { position: absolute; left: 0; top: 0; width: 100%; color: #000; background: #fff; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

  <!-- Header Institucional -->
  <header class="border-b border-slate-800 bg-slate-900/90 sticky top-0 backdrop-blur z-50 no-print">
    <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-indigo-500/20">
          🏛️
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base font-extrabold text-white tracking-tight">SIGEP-IEG</h1>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">v6.0 Platinum</span>
          </div>
          <p class="text-xs text-slate-400">Institución Educativa Guaimaral · Coordinación Pedagógica</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Indicador de Supabase -->
        <span class="px-3 py-1 bg-slate-800 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${SUPABASE_URL ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
          <span class="text-slate-300">${SUPABASE_URL ? 'Nube Supabase Conectada' : 'Modo Local Blindado'}</span>
        </span>

        <!-- Reloj en vivo de Colombia -->
        <div class="hidden md:flex flex-col text-right">
          <span id="colombiaClock" class="text-xs font-mono font-bold text-slate-200">--:--:--</span>
          <span class="text-[10px] text-slate-400 font-medium">Hora Legal Colombia</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Métricas Rápidas (KPIs) -->
  <section class="max-w-7xl mx-auto px-6 pt-6 w-full no-print">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Radicadas</p>
          <h3 id="kpiTotal" class="text-2xl font-black text-white mt-0.5">0</h3>
        </div>
        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl">📁</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-amber-400 uppercase tracking-wider">Por Revisar</p>
          <h3 id="kpiPendientes" class="text-2xl font-black text-amber-400 mt-0.5">0</h3>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl">⏳</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Aprobadas</p>
          <h3 id="kpiAprobadas" class="text-2xl font-black text-emerald-400 mt-0.5">0</h3>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">✅</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-rose-400 uppercase tracking-wider">Con Ajustes</p>
          <h3 id="kpiObservaciones" class="text-2xl font-black text-rose-400 mt-0.5">0</h3>
        </div>
        <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl">📝</div>
      </div>
    </div>
  </section>

  <!-- Barra de Filtros & Búsqueda -->
  <section class="max-w-7xl mx-auto px-6 pt-5 w-full no-print">
    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center gap-3 justify-between">
      <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        <input id="searchInput" type="text" placeholder="🔍 Buscar por docente o tema..." oninput="applyFilters()" 
          class="bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 flex-1 min-w-[180px]">
        
        <select id="filterSemana" onchange="applyFilters()" class="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
          <option value="">Todas las Semanas</option>
          ${Array.from({length: 42}, (_, i) => `<option value="${i+1}">Semana ${i+1}</option>`).join('')}
        </select>

        <select id="filterEstado" onchange="applyFilters()" class="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
          <option value="">Todos los Estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Con Observaciones">Con Observaciones</option>
          <option value="Rechazada">Rechazada</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="loadPlaneaciones()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
          <span>🔄</span> Recargar
        </button>
      </div>
    </div>
  </section>

  <!-- Área Principal de Trabajo -->
  <main class="max-w-7xl mx-auto px-6 py-6 w-full flex-1 no-print">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[72vh]">
      
      <!-- Lista Lateral -->
      <div class="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Entregas Radicadas</h3>
          <span id="filteredCount" class="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">0</span>
        </div>
        
        <div id="listContainer" class="space-y-2.5 overflow-y-auto flex-1 pr-1.5">
          <div class="text-center py-12 text-slate-500 text-xs">Cargando planeaciones...</div>
        </div>
      </div>

      <!-- Visor & Panel de Evaluación -->
      <div class="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full overflow-y-auto flex flex-col" id="viewerArea">
        <div class="flex flex-col items-center justify-center my-auto text-slate-500 py-16">
          <span class="text-5xl mb-3">📄</span>
          <h4 class="text-sm font-bold text-slate-300">Selecciona una planeación para auditar</h4>
          <p class="text-xs text-slate-500 mt-1">Podrás revisar la secuencia didáctica, evaluar DUA/ICFES y emitir tu dictamen oficial.</p>
        </div>
      </div>

    </div>
  </main>

  <!-- Contenedor Invisible exclusivo para Impresión Oficial -->
  <div id="printableArea" class="hidden"></div>

  <script>
    let allPlaneaciones = [];
    let selectedId = null;

    // Reloj legal Colombia
    setInterval(() => {
      const now = new Date();
      document.getElementById('colombiaClock').innerText = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });
    }, 1000);

    async function loadPlaneaciones() {
      try {
        const res = await fetch('/api/planeaciones');
        allPlaneaciones = await res.json();
        updateKpis();
        applyFilters();
      } catch (err) {
        console.error('Error cargando planeaciones:', err);
      }
    }

    function updateKpis() {
      document.getElementById('kpiTotal').innerText = allPlaneaciones.length;
      document.getElementById('kpiPendientes').innerText = allPlaneaciones.filter(p => (p.estado || '').includes('Pendiente') || (p.estado || '').includes('Reenviada')).length;
      document.getElementById('kpiAprobadas').innerText = allPlaneaciones.filter(p => p.estado === 'Aprobada').length;
      document.getElementById('kpiObservaciones').innerText = allPlaneaciones.filter(p => p.estado === 'Con Observaciones' || p.estado === 'Rechazada').length;
    }

    function applyFilters() {
      const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const sem = document.getElementById('filterSemana').value;
      const est = document.getElementById('filterEstado').value;

      const filtered = allPlaneaciones.filter(p => {
        const matchesQuery = !query || 
          (p.docente_nombre || '').toLowerCase().includes(query) ||
          (p.docente_email || '').toLowerCase().includes(query) ||
          (p.area || '').toLowerCase().includes(query) ||
          (p.secuencia?.tema_principal || p.secuencia?.titulo_secuencia || '').toLowerCase().includes(query);
        
        const matchesSem = !sem || String(p.numero_semana) === String(sem);
        const matchesEst = !est || (p.estado || '').includes(est);

        return matchesQuery && matchesSem && matchesEst;
      });

      document.getElementById('filteredCount').innerText = \`\${filtered.length} de \${allPlaneaciones.length}\`;
      renderList(filtered);
    }

    function renderList(list) {
      const container = document.getElementById('listContainer');
      if (list.length === 0) {
        container.innerHTML = \`<div class="text-center py-12 text-slate-500 text-xs font-medium">No se encontraron planeaciones con los filtros actuales.</div>\`;
        return;
      }

      container.innerHTML = list.map(p => {
        const isSelected = p.id === selectedId;
        const badgeColor = p.estado === 'Aprobada' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                           p.estado === 'Con Observaciones' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                           'bg-amber-500/20 text-amber-400 border-amber-500/30';

        return \`
          <div onclick="selectPlaneacion('\${p.id}')" 
            class="p-3.5 rounded-xl cursor-pointer transition border \${isSelected ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50'}">
            
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">\${p.area}</span>
              <div class="flex items-center gap-1.5">
                \${p.version > 1 ? \`<span class="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">v\${p.version}</span>\` : ''}
                <span class="text-[10px] text-slate-400 font-bold">\${p.grado} · Sem \${p.numero_semana}</span>
              </div>
            </div>

            <h4 class="text-xs font-bold text-slate-100 truncate">\${p.docente_nombre}</h4>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">\${p.secuencia?.tema_principal || p.secuencia?.titulo_secuencia || 'Secuencia Didáctica'}</p>

            <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-700/40 text-[10px]">
              <span class="text-slate-400 font-mono">⏰ \${p.hora_exacta_colombia ? p.hora_exacta_colombia.split(',')[1] || p.hora_exacta_colombia : ''}</span>
              <span class="font-bold px-2 py-0.5 rounded-full border \${badgeColor}">\${p.estado}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectPlaneacion(id) {
      selectedId = id;
      applyFilters(); // actualiza estilos de selección
      const item = allPlaneaciones.find(p => p.id === id);
      if (!item) return;

      const sec = item.secuencia || {};
      const viewer = document.getElementById('viewerArea');

      viewer.innerHTML = \`
        <div class="space-y-6">
          
          <!-- Encabezado de Radicación Oficial -->
          <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30">\${item.area} · \${item.grado}</span>
                  <span class="px-2.5 py-1 bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg">\${item.radicado_oficial || item.id}</span>
                  <span class="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-lg">Versión \${item.version || 1}</span>
                </div>
                <h2 class="text-xl font-black text-white">\${sec.titulo_secuencia || sec.tema_principal || 'Planeación Pedagógica'}</h2>
                <p class="text-xs text-slate-300 mt-1">Docente Responsable: <strong class="text-white">\${item.docente_nombre}</strong> (\${item.docente_email})</p>
                <p class="text-[11px] text-emerald-400 font-medium mt-1">
                  🕒 <strong>Radicado Legal:</strong> \${item.hora_exacta_colombia || item.fecha_recepcion} (Hora Colombia)
                </p>
              </div>

              <div class="flex flex-col items-end gap-2">
                <button onclick="printOfficialDoc()" class="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition">
                  <span>🖨️</span> Imprimir con Membrete
                </button>
                <span class="text-xs text-slate-400 font-bold">Semana Académica: \${item.numero_semana}</span>
              </div>
            </div>
          </div>

          <!-- Módulo de Dictamen del Coordinador -->
          <div class="bg-gradient-to-r from-indigo-950/40 to-slate-800/60 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <span>⚖️</span> Dictamen Oficial de Coordinación Académica
              </h4>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full \${item.estado === 'Aprobada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                Estado Actual: \${item.estado}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button onclick="setEvaluationState('Aprobada')" id="btnAprobar" class="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2">
                ✅ Aprobar Planeación
              </button>
              <button onclick="setEvaluationState('Con Observaciones')" id="btnObservar" class="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-2">
                📝 Solicitar Ajustes
              </button>
              <button onclick="setEvaluationState('Rechazada')" id="btnRechazar" class="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-2">
                ❌ Rechazar
              </button>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-300 mb-1">Observaciones / Recomendaciones Pedagógicas al Docente:</label>
              <textarea id="evalObservaciones" rows="3" placeholder="Escribe aquí las observaciones pedagógicas, sugerencias DUA o correcciones para el docente..."
                class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500">\${item.observaciones_coordinador || ''}</textarea>
            </div>

            <div class="flex justify-end">
              <button onclick="saveEvaluation('\${item.id}')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition">
                💾 Guardar Dictamen y Notificar
              </button>
            </div>
          </div>

          <!-- Objetivo & DBA -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
              <h4 class="text-xs font-black uppercase text-indigo-400 mb-1">🎯 Objetivo de Aprendizaje</h4>
              <p class="text-xs text-slate-300 font-medium">\${sec.objetivo_aprendizaje || 'No especificado'}</p>
            </div>
            <div class="p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
              <h4 class="text-xs font-black uppercase text-amber-400 mb-1">📘 DBA / Estándar MEN</h4>
              <p class="text-xs text-slate-300 font-medium">\${sec.estandar || sec.dba_utilizado || 'Estándar curricular MEN'}</p>
            </div>
          </div>

          <!-- Secuencia Didáctica por Sesiones -->
          <div>
            <h3 class="text-sm font-extrabold text-slate-200 mb-3">⏱️ Secuencia Didáctica (\${sec.actividades?.length || 0} Sesiones)</h3>
            <div class="space-y-3">
              \${(sec.actividades || []).map((act, i) => \`
                <div class="p-4 bg-slate-800/30 border border-slate-800 rounded-xl space-y-2">
                  <div class="flex items-center justify-between border-b border-slate-700/50 pb-2">
                    <span class="text-xs font-extrabold text-indigo-400">Sesión \${act.sesion || (i+1)}</span>
                    <span class="text-[11px] text-slate-400">⏳ \${act.tiempo || '45 min'}</span>
                  </div>
                  \${act.fase_inicio ? \`<p class="text-xs text-slate-300"><strong class="text-emerald-400">Inicio:</strong> \${act.fase_inicio}</p>\` : ''}
                  \${act.fase_desarrollo ? \`<p class="text-xs text-slate-300"><strong class="text-sky-400">Desarrollo:</strong> \${act.fase_desarrollo}</p>\` : ''}
                  \${act.fase_cierre ? \`<p class="text-xs text-slate-300"><strong class="text-purple-400">Cierre:</strong> \${act.fase_cierre}</p>\` : ''}
                  \${act.descripcion ? \`<p class="text-xs text-slate-300">\${act.descripcion}</p>\` : ''}
                </div>
              \`).join('')}
            </div>
          </div>

          <!-- Adaptaciones DUA / Inclusión -->
          \${sec.adecuaciones_piar ? \`
            <div class="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
              <h4 class="text-xs font-black uppercase text-emerald-400 mb-1">♿ Enfoque DUA & Adecuaciones PIAR</h4>
              <p class="text-xs text-emerald-200 font-medium whitespace-pre-line">\${sec.adecuaciones_piar}</p>
            </div>
          \` : ''}

          <!-- Evaluación Tipo Saber-ICFES -->
          \${sec.evaluacion?.length ? \`
            <div>
              <h3 class="text-sm font-extrabold text-slate-200 mb-3">📝 Evaluación Tipo Saber-ICFES</h3>
              <div class="space-y-2.5">
                \${sec.evaluacion.map((ev, idx) => \`
                  <div class="p-3.5 bg-slate-800/30 border border-slate-800 rounded-xl text-xs space-y-1.5">
                    <p class="font-bold text-slate-200">\${idx+1}. \${ev.pregunta}</p>
                    \${ev.opciones ? \`<p class="text-slate-400 pl-3">Opciones: \${Array.isArray(ev.opciones) ? ev.opciones.join(' | ') : ev.opciones}</p>\` : ''}
                    \${ev.justificacion ? \`<p class="text-emerald-400 text-[11px] pl-3"><strong>Justificación Pedagógica:</strong> \${ev.justificacion}</p>\` : ''}
                  </div>
                \`).join('')}
              </div>
            </div>
          \` : ''}

        </div>
      \`;
    }

    let tempEvaluationState = null;
    function setEvaluationState(state) {
      tempEvaluationState = state;
      alert('Has seleccionado el estado: ' + state + '. Ahora escribe tus observaciones y presiona "Guardar Dictamen".');
    }

    async function saveEvaluation(id) {
      const item = allPlaneaciones.find(p => p.id === id);
      const estado = tempEvaluationState || item.estado || 'Aprobada';
      const observaciones = document.getElementById('evalObservaciones').value;

      try {
        const res = await fetch('/api/planeaciones/evaluar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            estado: estado,
            observaciones: observaciones,
            evaluador_nombre: 'Coordinador Académico'
          })
        });

        const data = await res.json();
        if (data.success) {
          alert('✅ Dictamen guardado con éxito: ' + estado);
          await loadPlaneaciones();
          selectPlaneacion(id);
        } else {
          alert('❌ Error: ' + data.mensaje);
        }
      } catch (err) {
        alert('❌ Error al conectar con el servidor: ' + err.message);
      }
    }

    function printOfficialDoc() {
      const item = allPlaneaciones.find(p => p.id === selectedId);
      if (!item) return;

      const sec = item.secuencia || {};
      const printArea = document.getElementById('printableArea');

      printArea.innerHTML = \`
        <div style="font-family: Arial, sans-serif; padding: 30px; color: #111;">
          <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 18px; margin: 0; font-weight: bold; text-transform: uppercase;">Institución Educativa Guaimaral</h1>
              <p style="font-size: 12px; margin: 4px 0 0 0; color: #555;">Coordinación Académica · Formato Oficial de Secuencia Didáctica</p>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <p style="margin: 0;"><strong>Radicado:</strong> \${item.radicado_oficial || item.id}</p>
              <p style="margin: 2px 0 0 0;"><strong>Versión:</strong> \${item.version || 1}</p>
              <p style="margin: 2px 0 0 0;"><strong>Fecha Radicado:</strong> \${item.hora_exacta_colombia}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
            <tr>
              <td style="border: 1px solid #ccc; padding: 6px;"><strong>Docente:</strong> \${item.docente_nombre}</td>
              <td style="border: 1px solid #ccc; padding: 6px;"><strong>Área:</strong> \${item.area}</td>
              <td style="border: 1px solid #ccc; padding: 6px;"><strong>Grado:</strong> \${item.grado}</td>
              <td style="border: 1px solid #ccc; padding: 6px;"><strong>Semana:</strong> \${item.numero_semana}</td>
            </tr>
            <tr>
              <td colspan="3" style="border: 1px solid #ccc; padding: 6px;"><strong>Tema Principal:</strong> \${sec.titulo_secuencia || sec.tema_principal || 'No especificado'}</td>
              <td style="border: 1px solid #ccc; padding: 6px;"><strong>Estado:</strong> \${item.estado}</td>
            </tr>
          </table>

          <div style="margin-bottom: 16px; font-size: 12px;">
            <h3 style="font-size: 13px; margin: 0 0 4px 0; border-bottom: 1px solid #ddd; padding-bottom: 2px;">1. OBJETIVO DE APRENDIZAJE & DBA</h3>
            <p style="margin: 4px 0;"><strong>Objetivo:</strong> \${sec.objetivo_aprendizaje || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>DBA / Estándar:</strong> \${sec.estandar || sec.dba_utilizado || 'N/A'}</p>
          </div>

          <div style="margin-bottom: 16px; font-size: 12px;">
            <h3 style="font-size: 13px; margin: 0 0 8px 0; border-bottom: 1px solid #ddd; padding-bottom: 2px;">2. SECUENCIA DE ACTIVIDADES</h3>
            \${(sec.actividades || []).map((a, i) => \`
              <div style="margin-bottom: 10px; border-left: 3px solid #6366f1; padding-left: 8px;">
                <p style="margin: 0; font-weight: bold;">Sesión \${a.sesion || (i+1)} (\${a.tiempo || '45 min'}):</p>
                \${a.fase_inicio ? \`<p style="margin: 2px 0;"><strong>Inicio:</strong> \${a.fase_inicio}</p>\` : ''}
                \${a.fase_desarrollo ? \`<p style="margin: 2px 0;"><strong>Desarrollo:</strong> \${a.fase_desarrollo}</p>\` : ''}
                \${a.fase_cierre ? \`<p style="margin: 2px 0;"><strong>Cierre:</strong> \${a.fase_cierre}</p>\` : ''}
              </div>
            \`).join('')}
          </div>

          \${sec.adecuaciones_piar ? \`
            <div style="margin-bottom: 16px; font-size: 12px;">
              <h3 style="font-size: 13px; margin: 0 0 4px 0; border-bottom: 1px solid #ddd; padding-bottom: 2px;">3. ADECUACIONES DUA / PIAR</h3>
              <p style="margin: 4px 0;">\${sec.adecuaciones_piar}</p>
            </div>
          \` : ''}

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
            <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 4px;">
              Firma del Docente
            </div>
            <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 4px;">
              Firma y Sello de Coordinación Académica
            </div>
          </div>
        </div>
      \`;

      window.print();
    }

    loadPlaneaciones();
  </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
});

server.listen(PORT, () => {
  console.log(`
========================================================================
🏫 SERVIDOR RECEPTOR INSTITUCIONAL SIGEP-IEG v6.0 PLATINUM ONLINE
========================================================================
Puerto de escucha:        ${PORT}
URL Radicación API:       http://localhost:${PORT}/api/planeaciones/recibir
URL Configuración:        http://localhost:${PORT}/api/planeaciones/config-entrega
URL Dictámenes / Eval:    http://localhost:${PORT}/api/planeaciones/evaluar
Panel Web Coordinación:   http://localhost:${PORT}/dashboard
Almacenamiento Local:     ${STORAGE_ROOT}
Sincronización Nube:      ${SUPABASE_URL ? 'ACTIVA (Supabase)' : 'Modo Local Blindado'}
========================================================================
  `);
});
