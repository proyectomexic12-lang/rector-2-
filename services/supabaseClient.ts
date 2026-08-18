
import { createClient } from '@supabase/supabase-js';

// Intentamos leer las variables de entorno, si no existen, el cliente será null
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validamos que la llave tenga el formato correcto de Supabase (empieza por eyJ)
if (supabaseKey && !supabaseKey.startsWith('eyJ')) {
    console.warn("🚨 ALERTA: La VITE_SUPABASE_ANON_KEY parece ser incorrecta (debe empezar por 'eyJ'). Verifica tu .env");
}

export const supabase = (supabaseUrl && supabaseKey && supabaseKey.startsWith('eyJ'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;
