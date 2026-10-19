import fs from 'fs';

try {
  const raw = fs.readFileSync('backup_planeaciones_seguridad.json', 'utf8');
  const sequences = JSON.parse(raw);

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  const headers = ['ID', 'DOCENTE_EMAIL', 'FECHA_REGISTRO', 'AREA', 'GRADO', 'TEMA', 'OBJETIVO_APRENDIZAJE', 'ESTADO_RADICADO'];
  const rows = [headers.join(';')];

  sequences.forEach(seq => {
    let content = seq.content;
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch (e) {}
    }

    const objetivo = content?.objetivo_aprendizaje || content?.secuencia?.objetivo_aprendizaje || content?.meta_aprendizaje || '';
    const radicado = content?.radicado_oficial || content?.id_radicado || 'Generado en App';

    rows.push([
      escapeCsv(seq.id),
      escapeCsv(seq.user_email),
      escapeCsv(seq.timestamp),
      escapeCsv(seq.area),
      escapeCsv(seq.grado),
      escapeCsv(seq.tema),
      escapeCsv(objetivo),
      escapeCsv(radicado)
    ].join(';'));
  });

  // UTF-8 BOM (\uFEFF) para que Excel en Windows reconozca tildes y caracteres automáticamente
  const csvContent = '\uFEFF' + rows.join('\r\n');
  fs.writeFileSync('backup_planeaciones_completo.csv', csvContent, 'utf8');

  console.log(`✅ Archivo CSV generado con éxito: backup_planeaciones_completo.csv (${sequences.length} registros).`);
} catch (err) {
  console.error('❌ Error al exportar CSV:', err);
}
