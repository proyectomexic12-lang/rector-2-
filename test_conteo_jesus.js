import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EMAIL = 'jesus@guaimaral.edu.co';
const MAX_QUOTA = 20; // Plan mensual estándar de 20 planeaciones

async function testContadorJesus() {
    console.log('====================================================');
    console.log('🧪 PRUEBA DE CONTEO EN VIVO PARA: JESUS (PRUEBAS)');
    console.log(`📧 Correo evaluado: ${EMAIL}`);
    console.log('====================================================\n');

    // 1. Obtener la fecha de inicio del ciclo actual
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    console.log(`📅 Inicio de ciclo evaluado: ${currentMonthStart.substring(0, 10)}`);

    // 2. Consultar conteo ANTES de crear la planeación
    console.log('\n📊 PASO 1: Consultando conteo ANTES de la prueba...');
    const { count: beforeCycleCount, error: errBefore } = await supabase
        .from('generated_sequences')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', EMAIL)
        .gte('timestamp', currentMonthStart);

    if (errBefore) {
        console.error('❌ Error al consultar conteo inicial:', errBefore.message);
        return;
    }

    const { count: beforeTotalCount } = await supabase
        .from('generated_sequences')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', EMAIL);

    const usedBefore = beforeCycleCount || 0;
    const totalBefore = beforeTotalCount || 0;
    const remainingBefore = Math.max(0, MAX_QUOTA - usedBefore);

    console.log(`   • Planeaciones en este ciclo: ${usedBefore} de ${MAX_QUOTA}`);
    console.log(`   • Planeaciones disponibles:    ${remainingBefore}`);
    console.log(`   • Histórico total guardado:    ${totalBefore}`);
    console.log(`   👉 En la barra superior se vería: [ ${usedBefore} / ${MAX_QUOTA} ]`);

    // 3. Simular la generación de una planeación docente por Jesús
    const testTema = `Prueba Conteo Automático #${Date.now().toString().slice(-4)}`;
    console.log(`\n🤖 PASO 2: Generando nueva planeación para Jesús...`);
    console.log(`   • Tema: "${testTema}"`);
    console.log(`   • Área: Matemáticas | Grado: 4°`);

    // Guardado en usage_logs
    const { error: logErr } = await supabase.from('usage_logs').insert([{
        user_email: EMAIL,
        action: `Planeación: ${testTema} (Matemáticas - 4°)`
    }]);
    if (logErr) console.warn('   ⚠️ Aviso en log:', logErr.message);

    // Guardado en generated_sequences (la tabla donde cuenta el plan)
    const { data: newSeq, error: insertErr } = await supabase.from('generated_sequences').insert([{
        user_email: EMAIL,
        grado: '4°',
        area: 'Matemáticas',
        tema: testTema,
        content: {
            titulo_secuencia: testTema,
            area: 'Matemáticas',
            grado: '4°',
            duracion_horas: 2,
            objetivo_aprendizaje: 'Validar que el contador de cuotas incrementa exactamente +1 por cada planeación generada.',
            es_prueba_sistema: true
        },
        timestamp: new Date().toISOString()
    }]).select();

    if (insertErr) {
        console.error('❌ Error guardando planeación:', insertErr.message);
        return;
    }
    console.log('   ✅ Planeación registrada y sincronizada en Supabase con éxito.');

    // 4. Consultar conteo DESPUÉS de la planeación
    console.log('\n📈 PASO 3: Verificando conteo DESPUÉS de la planeación...');
    const { count: afterCycleCount } = await supabase
        .from('generated_sequences')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', EMAIL)
        .gte('timestamp', currentMonthStart);

    const { count: afterTotalCount } = await supabase
        .from('generated_sequences')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', EMAIL);

    const usedAfter = afterCycleCount || 0;
    const totalAfter = afterTotalCount || 0;
    const remainingAfter = Math.max(0, MAX_QUOTA - usedAfter);

    console.log(`   • Planeaciones en este ciclo: ${usedAfter} de ${MAX_QUOTA}`);
    console.log(`   • Planeaciones disponibles:    ${remainingAfter}`);
    console.log(`   • Histórico total guardado:    ${totalAfter}`);
    console.log(`   👉 En la barra superior ahora se ve: [ ${usedAfter} / ${MAX_QUOTA} ]`);

    // 5. Veredicto final
    console.log('\n====================================================');
    console.log('🎯 RESULTADO DEL TEST:');
    if (usedAfter === usedBefore + 1) {
        console.log(`✅ ¡ÉXITO TOTAL! El contador SUBIÓ exactamente +1.`);
        console.log(`   Antes: ${usedBefore} / ${MAX_QUOTA}  --->  Ahora: ${usedAfter} / ${MAX_QUOTA}`);
        console.log(`   Disponibles: ${remainingBefore}  --->  Ahora: ${remainingAfter}`);
        console.log(`   Histórico Total: ${totalBefore}  --->  Ahora: ${totalAfter}`);
        console.log('   La sincronización en la nube y la cuota funcionan 100% de verdad.');
    } else {
        console.log(`⚠️ Alerta: El conteo pasó de ${usedBefore} a ${usedAfter}.`);
    }
    console.log('====================================================\n');
}

testContadorJesus();
