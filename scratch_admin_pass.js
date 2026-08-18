import { createClient } from '@supabase/supabase-js';

const url = 'https://dxdzwtjeoyrscurwihko.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZHp3dGplb3lyc2N1cndpaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTYwMjMsImV4cCI6MjA4NTc5MjAyM30.DD6CeTzOYuTmZyIl3mp-YDcss6jk6xPYFNVq2zQzWws';
const supabase = createClient(url, key);

const SALT = 'guaimaral-2026-secure-v2-executive-shield';

const obfuscate = (text) => {
    const utf8Text = unescape(encodeURIComponent(text));
    const result = utf8Text.split('').map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))
    ).join('');
    return btoa(result);
};

async function fixAdmin() {
    await supabase.from('app_users').update({ password: obfuscate('admin2026') }).eq('email', 'admin@guaimaral.edu.co');
    console.log("Admin restaurado a admin2026");
}
fixAdmin();
