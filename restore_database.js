import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function restoreAllSequences() {
    console.log('🔄 RESTAURANDO PLANEACIONES DESDE BACKUP DE SEGURIDAD...');
    
    if (!fs.existsSync('backup_planeaciones_seguridad.json')) {
        console.error('❌ Archivo backup_planeaciones_seguridad.json no encontrado.');
        return;
    }

    const raw = fs.readFileSync('backup_planeaciones_seguridad.json', 'utf8');
    const allSeqs = JSON.parse(raw);
    console.log(`📦 Total a restaurar: ${allSeqs.length} registros.`);

    // Insertar en lotes de 100 para alta velocidad y confiabilidad
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < allSeqs.length; i += BATCH_SIZE) {
        const batch = allSeqs.slice(i, i + BATCH_SIZE).map(item => ({
            id: item.id,
            user_email: item.user_email,
            grado: item.grado,
            area: item.area,
            tema: item.tema,
            content: item.content,
            timestamp: item.timestamp
        }));

        const { error } = await supabase.from('generated_sequences').upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Error en lote ${i}:`, error.message);
        } else {
            inserted += batch.length;
            process.stdout.write(`\r   Restaurados: ${inserted} / ${allSeqs.length}`);
        }
    }

    console.log('\n✅ RESTAURACIÓN COMPLETADA: Todas las planeaciones están 100% de vuelta.');
}

restoreAllSequences();
