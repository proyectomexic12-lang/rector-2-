import { createClient } from '@supabase/supabase-js';

const url = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';
const supabase = createClient(url, key);

async function removeCredits() {
    // Obtenemos todos los usuarios
    const { data: users, error } = await supabase
        .from('app_users')
        .select('email, is_unlimited, custom_credits');

    if (error) {
        console.error("Error obteniendo usuarios:", error);
        return;
    }

    let modifiedCount = 0;

    for (const user of users) {
        // Si NO son ilimitados y tienen algo distinto de 0 en custom_credits
        if (!user.is_unlimited) {
            console.log(`Quitando créditos a: ${user.email}`);
            const { error: updateError } = await supabase
                .from('app_users')
                .update({ custom_credits: 0 })
                .eq('email', user.email);
            
            if (updateError) {
                console.error(`Error actualizando ${user.email}:`, updateError);
            } else {
                modifiedCount++;
            }
        }
    }

    console.log(`\n¡Proceso terminado! Se le quitaron los créditos (puestos a 0) a ${modifiedCount} usuarios que no son ilimitados.`);
}

removeCredits();
