import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanDatabase() {
    console.log('====================================================');
    console.log('🧹 INICIANDO LIMPIEZA TOTAL Y REINICIO DE CONTADORES');
    console.log('====================================================\n');

    // 1. Verificar conteo previo
    const { count: countSeqsBefore } = await supabase
        .from('generated_sequences')
        .select('*', { count: 'exact', head: true });
    
    const { count: countLogsBefore } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Registros previos en la nube:`);
    console.log(`   • generated_sequences: ${countSeqsBefore || 0}`);
    console.log(`   • usage_logs:          ${countLogsBefore || 0}`);

    // 2. Limpieza de generated_sequences
    console.log('\n🗑️ Borrando planeaciones de generated_sequences...');
    // Realizamos borrado por lotes si es necesario para asegurar limpieza absoluta
    let remainingSeqs = countSeqsBefore || 0;
    while (remainingSeqs > 0) {
        const { error: delErr } = await supabase
            .from('generated_sequences')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (delErr) {
            console.error('❌ Error al borrar en generated_sequences:', delErr.message);
            break;
        }

        const { count: checkCount } = await supabase
            .from('generated_sequences')
            .select('*', { count: 'exact', head: true });
        
        remainingSeqs = checkCount || 0;
        console.log(`   • Quedan pendientes en generated_sequences: ${remainingSeqs}`);
        if (remainingSeqs === 0) break;
    }

    // 3. Limpieza de usage_logs
    console.log('\n🗑️ Borrando registros históricos de uso en usage_logs...');
    let remainingLogs = countLogsBefore || 0;
    while (remainingLogs > 0) {
        const { error: delLogErr } = await supabase
            .from('usage_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (delLogErr) {
            console.error('❌ Error al borrar en usage_logs:', delLogErr.message);
            break;
        }

        const { count: checkLogCount } = await supabase
            .from('usage_logs')
            .select('*', { count: 'exact', head: true });
        
        remainingLogs = checkLogCount || 0;
        console.log(`   • Quedan pendientes en usage_logs: ${remainingLogs}`);
        if (remainingLogs === 0) break;
    }

    // 4. Verificación final
    const { count: finalSeqs } = await supabase
        .from('generated_sequences')
        .select('*', { count: 'exact', head: true });

    const { count: finalLogs } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true });

    console.log('\n====================================================');
    console.log('✅ REPORTE FINAL DE LIMPIEZA:');
    console.log(`   • generated_sequences restantes: ${finalSeqs || 0}`);
    console.log(`   • usage_logs restantes:          ${finalLogs || 0}`);
    if ((finalSeqs || 0) === 0 && (finalLogs || 0) === 0) {
        console.log('🎉 BASE DE DATOS LIMPIA AL 100%. Todos los contadores arrancan en 0.');
    } else {
        console.log('⚠️ Hubo registros que no pudieron eliminarse por políticas de base de datos.');
    }
    console.log('====================================================\n');
}

cleanDatabase();
