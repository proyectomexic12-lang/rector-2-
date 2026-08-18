import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Leer .env manualmente sin dependencias extra
const envPath = path.resolve(process.cwd(), '.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
    }
  });
}

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan las variables de entorno (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
        return encoded;
    }
};

async function fetchUsers() {
  const { data, error } = await supabase.from('app_users').select('email, password, name');
  if (error) {
    console.error("Error fetching users:", error.message);
    return;
  }

  console.log("\n====== CONTRASEÑAS REALES SUPABASE ======\n");
  data.forEach(u => {
      const pass = u.password ? (deobfuscate(u.password) || u.password) : 'guaimaral2026 (Defecto)';
      const name = String(u.name || 'Sin Nombre').padEnd(25);
      const email = String(u.email || 'Sin Email').padEnd(35);
      console.log(`Profesor: ${name} | Email: ${email} | Clave: ${pass}`);
  });
  console.log("\n=========================================\n");
}

fetchUsers();

