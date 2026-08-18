import { createClient } from '@supabase/supabase-js';

const url = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';
const supabase = createClient(url, key);

const SALT = 'guaimaral-2026-secure-v2-executive-shield';

const deobfuscate = (encoded) => {
    if (!encoded) return '';
    try {
        const text = atob(encoded);
        const deobfuscated = text.split('').map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))
        ).join('');
        try {
            return decodeURIComponent(escape(deobfuscated));
        } catch {
            return deobfuscated;
        }
    } catch (e) {
        return '';
    }
};

async function checkPasswords() {
    const emails = ['rocio.ramirez@guaimaral.edu.co', 'jorge.delahoz@guaimaral.edu.co', 'jorge.ferrer@guaimaral.edu.co'];
    const { data, error } = await supabase
        .from('app_users')
        .select('email, password')
        .in('email', emails);

    if (error) {
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No se encontraron esos usuarios en Supabase (aún no se han logueado y guardado).");
        return;
    }

    data.forEach(user => {
        const pass = deobfuscate(user.password);
        console.log(`Usuario: ${user.email} -> Clave Real: ${pass}`);
    });
}

checkPasswords();
