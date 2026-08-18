import { supabase } from './supabaseClient';

/**
 * AuthService (Híbrido: Local + Supabase)
 * 1. Intenta conectar con Nube (Supabase) para estadísticas y contraseñas centralizadas.
 * 2. Si falla o no hay conexión, usa LocalStorage (Modo Offline/Privado).
 */

const STORAGE_KEYS = {
    AUTH: 'guaimaral_auth_v2',
    USER: 'guaimaral_user_v2',
    ROLE: 'guaimaral_role_v2',
    SECURITY_LOGS: 'guaimaral_security_v1',
    LOCKOUT: 'guaimaral_lockout_v1'
};

const SALT = 'guaimaral-2026-secure-v2-executive-shield';

// Simple XOR obfuscation with UTF-8 support
const obfuscate = (text: string): string => {
    const utf8Text = unescape(encodeURIComponent(text));
    const result = utf8Text.split('').map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))
    ).join('');
    return btoa(result);
};

const deobfuscate = (encoded: string): string => {
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

export interface User {
    name: string;
    email: string;
    role: 'admin' | 'docente';
    areas?: string[];
    grados?: string[];
    custom_credits?: number | null;
    is_unlimited?: boolean;
    unlimited_start_date?: string | null;
    monthly_price?: number;
    subscription_months?: number;
    session_id?: string; // Para control de sesión única tipo WhatsApp
    stats?: {
        today: number;
        week: number;
        month: number;
        year: number;
        total: number;
        saved: number;
    };
}

// Usuarios locales de respaldo (Solo si falla la nube)
export const AUTHORIZED_USERS: User[] = [
    // Administrador
    { name: 'Admin', email: 'admin@guaimaral.edu.co', role: 'admin', is_unlimited: true },
    { name: 'Docente Demo (Ilimitado)', email: 'demo@guaimaral.edu.co', role: 'docente', is_unlimited: true },

    // Guaimaral Bachillerato (Orden Alfabético)
    { name: 'Alex San Juan', email: 'alex.sanjuan@guaimaral.edu.co', role: 'docente' },
    { name: 'Deisy Arroyo', email: 'deisy.arroyo@guaimaral.edu.co', role: 'docente' },
    { name: 'Jairo Blanco', email: 'jairo.blanco@guaimaral.edu.co', role: 'docente', is_unlimited: true, unlimited_start_date: '2026-08-13', monthly_price: 15000, subscription_months: 1 },
    { name: 'Liliana Valle', email: 'liliana.valle@guaimaral.edu.co', role: 'docente', is_unlimited: true, unlimited_start_date: '2026-08-12', monthly_price: 15000, subscription_months: 1 },
    { name: 'Paula Padilla', email: 'paula.padilla@guaimaral.edu.co', role: 'docente' },
    { name: 'Rocio Ramírez', email: 'rocio.ramirez@guaimaral.edu.co', role: 'docente' },

    // Guaimaral Primaria (Orden Alfabético)
    { name: 'Aleida Lara', email: 'aleida.lara@guaimaral.edu.co', role: 'docente' },
    { name: 'Alfredo Torres', email: 'alfredo.torres@guaimaral.edu.co', role: 'docente' },
    { name: 'Asterio Torres', email: 'asterio.torres@guaimaral.edu.co', role: 'docente', areas: ["Ciencias Naturales y Educación Ambiental", "Educación Artística (Agropecuaria)", "Ética y Valores"], grados: ["1", "2", "3", "4", "5"] },
    { name: 'Carlos Sandoval', email: 'carlos.sandoval@guaimaral.edu.co', role: 'docente' },
    { name: 'Deisy Mercado', email: 'deisy.mercado@guaimaral.edu.co', role: 'docente', areas: ["Dimensión Cognitiva", "Dimensión Comunicativa", "Dimensión Corporal", "Dimensión Socioafectiva", "Dimensión Espiritual"], grados: ["Transición"] },
    { name: 'Eduardo', email: 'eduardo@guaimaral.edu.co', role: 'docente', areas: ["Tecnología e Informática", "Educación Física"] },
    { name: 'Evaristo Vertel', email: 'evaristo.vertel@guaimaral.edu.co', role: 'docente', areas: ["Ciencias Naturales y Educación Ambiental", "Biología", "Química"] },
    { name: 'Ibeth Charris', email: 'ibeth.charris@guaimaral.edu.co', role: 'docente', areas: ["Dimensión Cognitiva", "Dimensión Comunicativa", "Dimensión Corporal", "Dimensión Socioafectiva", "Dimensión Espiritual"], grados: ["Transición"] },
    { name: 'Jairo Benavides', email: 'jairo.benavides@guaimaral.edu.co', role: 'docente', areas: ["Física", "Estadística", "Matemáticas", "Educación Artística"] },
    { name: 'Jorge de la Hoz', email: 'jorge.delahoz@guaimaral.edu.co', role: 'docente', areas: ["Religión", "Inglés"] },
    { name: 'Jorge Ferrer', email: 'jorge.ferrer@guaimaral.edu.co', role: 'docente', areas: ["Matemáticas", "Geometría", "Religión", "Estadística", "Física"] },
    { name: 'Leovigilda Navarro', email: 'leovigilda.navarro@guaimaral.edu.co', role: 'docente', areas: ["Integral (Matemáticas, Lenguaje, Sociales, Naturales)"], grados: ["Multigrado"] },
    { name: 'Linda Varela', email: 'linda.varela@guaimaral.edu.co', role: 'docente', areas: ["Lengua Castellana"] },
    { name: 'Martín Celin', email: 'martin.celin@guaimaral.edu.co', role: 'docente' },
    { name: 'Nancy Vargas', email: 'nancy.vargas@guaimaral.edu.co', role: 'docente' },
    { name: 'Pedro Arroyo', email: 'pedro.arroyo@guaimaral.edu.co', role: 'docente' },
    { name: 'Roberto Daza', email: 'roberto.daza@guaimaral.edu.co', role: 'docente', areas: ["Ciencias Sociales", "Ética y Valores", "Filosofía", "Cátedra de la Paz"] },
    { name: 'Xilena Santiago', email: 'xilena.santiago@guaimaral.edu.co', role: 'docente' }
];

export const authService = {
    isUserUnlimited: (user: User | null | undefined): boolean => {
        if (!user || !user.email || typeof user.email !== 'string') return false;
        const lowEmail = user.email.toLowerCase().trim();
        if (user.role === 'admin' || lowEmail.includes('demo')) return true;
        if (user.is_unlimited === true) return true;

        const authUser = AUTHORIZED_USERS.find(u => u.email && u.email.toLowerCase() === lowEmail);
        if (authUser && (authUser as any).is_unlimited === true) return true;

        const localUnlimited = localStorage.getItem(`guaimaral_unlimited_${lowEmail}`);
        if (localUnlimited) {
            try { if (JSON.parse(localUnlimited) === true) return true; } catch (e) {}
        }

        return false;
    },

    // --- PASSWORD MANAGEMENT ---
    changePassword: async (email: string, newPass: string) => {
        // 1. Local
        const key = `guaimaral_pwd_${email.toLowerCase()}`;
        localStorage.setItem(key, obfuscate(newPass));

        // 2. Cloud (Supabase)
        if (supabase) {
            try {
                // Upsert user password in cloud
                const { error } = await supabase
                    .from('app_users')
                    .update({ password: obfuscate(newPass) })
                    .eq('email', email);

                if (error) console.warn("Cloud Pwd Update Error:", error);
            } catch (e) { console.error(e); }
        }
    },

    verifyPassword: async (email: string, inputPass: string, role?: string): Promise<boolean> => {
        // A. Check Local Overrides First
        const customPassEnc = localStorage.getItem(`guaimaral_pwd_${email.toLowerCase()}`);
        if (customPassEnc) {
            return deobfuscate(customPassEnc) === inputPass;
        }

        // B. Check Cloud (Supabase)
        if (supabase) {
            const { data } = await supabase
                .from('app_users')
                .select('password')
                .eq('email', email)
                .single();

            if (data && data.password) {
                // Try deobfuscate from cloud storage
                try {
                    const cloudPass = deobfuscate(data.password);
                    if (cloudPass === inputPass) return true;
                    // If obfuscation fails (maybe plaintext in db?), check direct
                    if (data.password === inputPass) return true;
                } catch (e) {
                    if (data.password === inputPass) return true;
                }
            }
        }

        // C. Default Hardcoded Passwords
        if (role === 'admin') return inputPass === 'admin2026';
        if (email === 'docente@guaimaral.edu.co') return inputPass === '123456';
        return inputPass === 'guaimaral2026';
    },

    // --- SECURITY & BLINDADO SYSTEM ---
    logSecurityEvent: async (email: string, event: string, severity: 'low' | 'high' = 'low') => {
        const logEntry = {
            email: email.toLowerCase(),
            event,
            severity,
            timestamp: new Date().toISOString(),
            ip: 'client-side-vetted',
            userAgent: navigator.userAgent
        };

        // 1. Local Log
        const localLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SECURITY_LOGS) || '[]');
        localLogs.unshift(logEntry);
        localStorage.setItem(STORAGE_KEYS.SECURITY_LOGS, JSON.stringify(localLogs.slice(0, 50)));

        // 2. Cloud Log (Supabase)
        if (supabase) {
            try {
                await supabase.from('security_logs').insert([{
                    user_email: email,
                    event_description: event,
                    severity: severity
                }]);
            } catch (e) { console.error("Cloud Security Log Failed", e); }
        }
    },

    checkBruteForce: (email: string): { locked: boolean, remaining: number } => {
        const key = `${STORAGE_KEYS.LOCKOUT}_${email.toLowerCase()}`;
        const data = JSON.parse(localStorage.getItem(key) || '{"attempts": 0, "last": 0}');
        const now = Date.now();

        // Lock for 5 minutes if 5 attempts
        if (data.attempts >= 5 && (now - data.last) < 300000) {
            return { locked: true, remaining: Math.ceil((300000 - (now - data.last)) / 60000) };
        }

        // Reset if more than 5 mins passed
        if ((now - data.last) > 300000) {
            localStorage.setItem(key, JSON.stringify({ attempts: 0, last: now }));
            return { locked: false, remaining: 5 };
        }

        return { locked: false, remaining: 5 - data.attempts };
    },

    recordFailedAttempt: (email: string) => {
        const key = `${STORAGE_KEYS.LOCKOUT}_${email.toLowerCase()}`;
        const data = JSON.parse(localStorage.getItem(key) || '{"attempts": 0, "last": 0}');
        data.attempts += 1;
        data.last = Date.now();
        localStorage.setItem(key, JSON.stringify(data));
    },

    getSecurityLogs: async () => {
        if (supabase) {
            try {
                const { data } = await supabase.from('security_logs').select('*').order('timestamp', { ascending: false }).limit(20);
                if (data) return data;
            } catch (e) { }
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SECURITY_LOGS) || '[]');
    },

    updateUserSettings: async (email: string, settings: { areas?: string[], grados?: string[], custom_credits?: number | null, is_unlimited?: boolean, unlimited_start_date?: string | null, monthly_price?: number, subscription_months?: number }) => {
        const lowEmail = email.toLowerCase().trim();
        console.log(`🛠️ Iniciando guardado para: ${lowEmail}`, settings);

        // 1. Local (Legado/Respaldo)
        if (settings.areas) localStorage.setItem(`guaimaral_areas_${lowEmail}`, JSON.stringify(settings.areas));
        if (settings.grados) localStorage.setItem(`guaimaral_grados_${lowEmail}`, JSON.stringify(settings.grados));
        if (settings.is_unlimited !== undefined) localStorage.setItem(`guaimaral_unlimited_${lowEmail}`, JSON.stringify(settings.is_unlimited));

        // 2. Cloud (Supabase)
        if (supabase) {
            try {
                // Paso A: Verificar si el usuario ya existe en Supabase
                const { data: existingUser, error: fetchError } = await supabase
                    .from('app_users')
                    .select('email, password')
                    .eq('email', lowEmail)
                    .maybeSingle();

                if (fetchError) throw fetchError;

                if (existingUser) {
                    // Si existe, actualizamos áreas, grados y plan de créditos (Protegemos el password)
                    const { error: updateError } = await supabase
                        .from('app_users')
                        .update({
                            areas: settings.areas,
                            grados: settings.grados,
                            is_unlimited: settings.is_unlimited,
                            custom_credits: settings.custom_credits,
                            unlimited_start_date: settings.unlimited_start_date,
                            monthly_price: settings.monthly_price,
                            subscription_months: settings.subscription_months
                        })
                        .eq('email', lowEmail);

                    if (updateError) throw updateError;
                    console.log("✅ Actualización en la nube exitosa (Áreas/Grados)");
                } else {
                    // Si NO existe, lo creamos de cero usando AUTHORIZED_USERS
                    const authUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === lowEmail);
                    if (authUser) {
                        const { error: insertError } = await supabase
                            .from('app_users')
                            .insert({
                                email: lowEmail,
                                name: authUser.name,
                                role: authUser.role,
                                password: obfuscate('docente2026'), // Password temporal
                                areas: settings.areas || [],
                                grados: settings.grados || [],
                                is_unlimited: settings.is_unlimited ?? authUser.is_unlimited ?? false,
                                custom_credits: settings.custom_credits ?? authUser.custom_credits ?? null,
                                unlimited_start_date: settings.unlimited_start_date ?? authUser.unlimited_start_date ?? null,
                                monthly_price: settings.monthly_price ?? authUser.monthly_price ?? 15000,
                                subscription_months: settings.subscription_months ?? authUser.subscription_months ?? 1
                            });

                        if (insertError) throw insertError;
                        console.log("✅ Usuario registrado automáticamente y áreas asignadas");
                    } else {
                        console.warn("⚠️ Usuario no reconocido en la lista autorizada.");
                    }
                }
            } catch (e) {
                console.error("❌ Fallo en Sincronización Cloud:", e);
                throw e;
            }
        }
    },

    refreshCurrentUser: async (): Promise<User | null> => {
        const current = authService.getCurrentUser();
        if (!current || !supabase) return current;

        // Anti-spam: Solo refrescar cada 30 segundos como máximo
        const lastRefresh = (authService as any)._lastRefresh || 0;
        if (Date.now() - lastRefresh < 30000) return current;
        (authService as any)._lastRefresh = Date.now();

        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('name, email, role, areas, grados')
                .eq('email', current.email.toLowerCase())
                .maybeSingle();

            if (data && !error) {
                const updatedUser: User = {
                    name: data.name,
                    email: data.email,
                    role: data.role as 'admin' | 'docente',
                    areas: data.areas || [],
                    grados: data.grados || []
                };
                localStorage.setItem(STORAGE_KEYS.USER, obfuscate(JSON.stringify(updatedUser)));
                return updatedUser;
            }
        } catch (e) { /* Silencioso si hay error de red */ }
        return current;
    },

    login: async (email: string, password: string): Promise<User | null> => {
        const lowEmail = email.toLowerCase().trim();

        // Brute force check
        const lockoutStatus = authService.checkBruteForce(lowEmail);
        if (lockoutStatus.locked) {
            throw new Error(`Cuenta bloqueada temporalmente por seguridad. Intenta en ${lockoutStatus.remaining} min.`);
        }

        // 1. First, check if user exists in Supabase to get the real name
        let cloudUser: User | null = null;
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('app_users')
                    .select('name, email, role, areas, grados')
                    .eq('email', email.toLowerCase())
                    .single();

                if (data && !error) {
                    cloudUser = {
                        name: data.name,
                        email: data.email,
                        role: data.role as 'admin' | 'docente',
                        areas: data.areas || [],
                        grados: data.grados || []
                    };
                }
            } catch (e) {
                console.error("Cloud login fetch error:", e);
            }
        }

        // 2. Fallback to hardcoded list if cloud fetch fails
        let user = cloudUser || AUTHORIZED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (user) {
            const isValid = await authService.verifyPassword(email, password, user.role);
            if (isValid) {
                // Generar ID de sesión única (WhatsApp Style)
                const sessionId = crypto.randomUUID();

                // Actualizar en el usuario
                const finalUser = { ...(cloudUser || user), session_id: sessionId };

                // 1. Guardar Localmente
                localStorage.setItem(STORAGE_KEYS.AUTH, obfuscate('true'));
                localStorage.setItem(STORAGE_KEYS.USER, obfuscate(JSON.stringify(finalUser)));

                // 2. Sincronizar en Nube (Supabase)
                if (supabase) {
                    try {
                        await supabase
                            .from('app_users')
                            .update({ session_id: sessionId })
                            .eq('email', lowEmail);
                    } catch (e) {
                        console.error("Fallo al registrar sesión única en nube", e);
                    }
                }

                // Reset failed attempts on success
                localStorage.removeItem(`${STORAGE_KEYS.LOCKOUT}_${lowEmail}`);

                await authService.logSecurityEvent(lowEmail, "Inicio de sesión exitoso (Sesión única activa)", "low");
                console.log('✅ Sesión única guardada para:', finalUser.email, 'ID:', sessionId);
                return finalUser;
            } else {
                authService.recordFailedAttempt(lowEmail);
                await authService.logSecurityEvent(lowEmail, "Fallo de contraseña - Posible ataque de fuerza bruta", "high");
            }
        } else {
            await authService.logSecurityEvent(lowEmail, "Intento de acceso con correo inexistente", "low");
        }
        return null;
    },

    // --- GENERATED SEQUENCES PERSISTENCE & LOGGING ---
    saveAndLogSequence: async (user: User, sequence: any, details: { grade: string, area: string, theme: string }) => {
        const email = user.email.toLowerCase().trim();
        const isDiag = details.theme.toLowerCase().includes('diagnóst');
        const actionPrefix = isDiag ? 'Diagnóstico' : 'Planeación';
        const actionText = `${actionPrefix}: ${details.theme} (${details.area} - ${details.grade})`;

        // 1. Respaldo Local (Inmediato)
        try {
            const statsKey = `guaimaral_stats_${email}`;
            const seqKey = `guaimaral_saved_sequences_${email}`;

            const stats = JSON.parse(localStorage.getItem(statsKey) || '[]');
            stats.push({ timestamp: Date.now(), action: actionText });
            localStorage.setItem(statsKey, JSON.stringify(stats));

            const seqs = JSON.parse(localStorage.getItem(seqKey) || '[]');
            seqs.push({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                grade: details.grade,
                area: details.area,
                theme: details.theme,
                content: sequence
            });
            localStorage.setItem(seqKey, JSON.stringify(seqs));
        } catch (e) {
            console.warn("⚠️ Local storage backup failed");
        }

        // 2. Nube (Prioridad para el Rector)
        if (supabase) {
            try {
                // A. Registro en Log de Uso (Para Hoy/Mes/Año)
                const { error: logErr } = await supabase.from('usage_logs').insert([{
                    user_email: email,
                    action: actionText
                }]);
                if (logErr) console.error("❌ Error Log Nube:", logErr.message);

                // B. Guardado en Repositorio (Para Docs Guardados)
                const { error: seqErr } = await supabase.from('generated_sequences').insert([{
                    user_email: email,
                    grado: details.grade,
                    area: details.area,
                    tema: details.theme,
                    content: sequence
                }]);
                if (seqErr) console.error("❌ Error Repositorio Nube:", seqErr.message);

                if (!logErr && !seqErr) console.log("🚀 [Sync] Éxito Total en la Nube");
            } catch (e) {
                console.error("❌ Fallo crítico de sincronización:", e);
            }
        }
    },

    getAllSequences: async () => {
        let cloudSeqs: any[] = [];
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('generated_sequences')
                    .select('*')
                    .order('timestamp', { ascending: false });

                if (!error && data) {
                    cloudSeqs = data;
                }
            } catch (e) {
                console.error("Error fetching cloud sequences:", e);
            }
        }

        // Combinar con secuencias locales para modo offline y resiliencia total
        const allLocalSeqs: any[] = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('guaimaral_saved_sequences_')) {
                    const emailFromKey = k.replace('guaimaral_saved_sequences_', '');
                    const parsed = JSON.parse(localStorage.getItem(k) || '[]');
                    parsed.forEach((seq: any) => {
                        allLocalSeqs.push({
                            id: seq.id || String(seq.timestamp),
                            user_email: emailFromKey,
                            grado: seq.grade || '',
                            area: seq.area || '',
                            tema: seq.theme || '',
                            content: seq.content,
                            timestamp: new Date(seq.timestamp || Date.now()).toISOString()
                        });
                    });
                }
            }
        } catch (e) {}

        const combined = [...cloudSeqs];
        allLocalSeqs.forEach(localSeq => {
            const exists = combined.some(c => 
                c.user_email?.toLowerCase() === localSeq.user_email?.toLowerCase() && 
                c.tema === localSeq.tema &&
                c.grado === localSeq.grado
            );
            if (!exists) {
                combined.push(localSeq);
            }
        });

        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },

    getUsageStats: async (email: string) => {
        const lowEmail = email.toLowerCase().trim();

        if (supabase) {
            try {
                const now = new Date();

                // Calcular el Lunes de la semana actual a las 00:00:00
                const dayOfWeek = now.getDay(); // 0 es Domingo, 1 es Lunes
                const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
                const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
                monday.setHours(0, 0, 0, 0);

                // Inicios de periodos robustos
                const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
                const weekStart = monday.toISOString();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

                // 1. Acumulado Histórico (Logs de actividad)
                const { count: logTotal } = await supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail);

                // 2. Hoy (Docs o Logs de hoy)
                const { count: todayLogs } = await supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', dayStart);
                const { count: todayDocs } = await supabase.from('generated_sequences').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', dayStart);

                // 3. Semana actual (Desde el Lunes)
                const { count: weekLogs } = await supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', weekStart);
                const { count: weekDocs } = await supabase.from('generated_sequences').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', weekStart);

                // 4. Mes (Logs o Docs de este mes)
                const { count: monthLogs } = await supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', monthStart);
                const { count: monthDocs } = await supabase.from('generated_sequences').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail).gte('timestamp', monthStart);

                // 5. Año (Histórico total en realidad para migración)
                const { count: totalDocs } = await supabase.from('generated_sequences').select('id', { count: 'exact', head: true }).eq('user_email', lowEmail);

                // 6. Acumulado Real (Suma de lo que hay en repositorio + posibles logs huérfanos)
                const finalTotal = (logTotal || 0) > (totalDocs || 0) ? (logTotal || 0) : (totalDocs || 0);

                return {
                    today: Math.max(todayLogs || 0, todayDocs || 0),
                    week: Math.max(weekLogs || 0, weekDocs || 0),
                    month: Math.max(monthLogs || 0, monthDocs || 0),
                    year: totalDocs || 0, // Migramos todo lo guardado al contador de año para que se vea
                    total: finalTotal,
                    saved: totalDocs || 0
                };
            } catch (e) { console.error("Cloud stats logic error", e); }
        }

        const local = authService.getLocalUsageStats(email);
        return {
            ...local,
            year: local.year || local.month,
            saved: local.saved || 0
        };
    },

    getLocalUsageStats: (email: string) => {
        const key = `guaimaral_stats_${email.toLowerCase()}`;
        const logs: any[] = JSON.parse(localStorage.getItem(key) || '[]');
        const now = new Date();

        const timestamps = logs.map(l => typeof l === 'number' ? l : l.timestamp);

        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const weekStart = monday.getTime();
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

        const localSavedKey = `guaimaral_saved_sequences_${email.toLowerCase()}`;
        const savedCount = JSON.parse(localStorage.getItem(localSavedKey) || '[]').length;

        return {
            today: timestamps.filter(t => t >= dayStart).length,
            week: timestamps.filter(t => t >= weekStart).length,
            month: timestamps.filter(t => t >= monthStart).length,
            year: timestamps.filter(t => t >= yearStart).length,
            total: timestamps.length,
            saved: savedCount
        };
    },

    getAllUsersWithStats: async () => {
        let userList = [...AUTHORIZED_USERS];

        if (supabase) {
            try {
                // 1. Obtener todos los usuarios de la nube de una vez
                const { data: cloudData } = await supabase
                    .from('app_users')
                    .select('name, email, role, areas, grados, custom_credits, is_unlimited, unlimited_start_date, monthly_price, subscription_months');

                if (cloudData && cloudData.length > 0) {
                    const cloudUsers: User[] = cloudData.map(u => ({
                        name: u.name,
                        email: u.email,
                        role: u.role as 'admin' | 'docente',
                        areas: u.areas || [],
                        grados: u.grados || [],
                        custom_credits: u.custom_credits,
                        is_unlimited: u.is_unlimited,
                        unlimited_start_date: u.unlimited_start_date,
                        monthly_price: u.monthly_price,
                        subscription_months: u.subscription_months
                    }));

                    const emailMap = new Map();
                    [...userList, ...cloudUsers].forEach(u => emailMap.set(u.email.toLowerCase(), u));
                    userList = Array.from(emailMap.values());
                }

                // 2. OPTIMIZACIÓN CRÍTICA: Obtener conteos globales en una sola pasada
                // En lugar de 200 peticiones (N+1), hacemos solo 1 para todos los conteos
                const { data: seqStats } = await supabase
                    .from('generated_sequences')
                    .select('user_email');

                const countsMap: Record<string, number> = {};
                seqStats?.forEach(s => {
                    if (s.user_email) {
                        const email = s.user_email.toLowerCase();
                        countsMap[email] = (countsMap[email] || 0) + 1;
                    }
                });

                // 3. Cruzar datos de forma ultra-rápida en memoria
                return userList.map(user => {
                    const low = (user && user.email) ? user.email.toLowerCase() : '';
                    return {
                        ...user,
                        stats: {
                            today: 0, week: 0, month: 0, year: 0,
                            total: low ? (countsMap[low] || 0) : 0,
                            saved: low ? (countsMap[low] || 0) : 0
                        }
                    };
                });

            } catch (e) {
                console.error("🚀 Error en carga masiva de estadísticas:", e);
            }
        }

        // Fallback local y modo offline: calcular estadísticas reales desde localStorage
        return userList.map(u => {
            const localStats = authService.getLocalUsageStats(u.email);
            return {
                ...u,
                stats: localStats
            };
        });
    },

    logout: () => {
        // Limpiar Presencia al salir
        if (authService._hb) clearInterval(authService._hb);
        if (authService._presenceChannel) {
            authService._presenceChannel.unsubscribe();
            authService._presenceChannel = null;
        }
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.ROLE);
        window.location.reload(); // Recarga limpia para resetear singletons
    },

    isAuthenticated: (): boolean => {
        const auth = localStorage.getItem(STORAGE_KEYS.AUTH);
        const user = localStorage.getItem(STORAGE_KEYS.USER);
        const isAuth = (auth && user) ? deobfuscate(auth) === 'true' : false;
        console.log('🔍 Verificando sesión:', isAuth ? '✅ Sesión activa' : '❌ No hay sesión');
        return isAuth;
    },

    getUserStorageKey: (baseKey: string): string => {
        const user = authService.getCurrentUser();
        return user ? `${baseKey}_${user.email.toLowerCase()}` : baseKey;
    },

    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem(STORAGE_KEYS.USER);
        if (!userJson) return null;
        try {
            return JSON.parse(deobfuscate(userJson));
        } catch (e) {
            return null;
        }
    },

    // --- MIGRACIÓN: LOCAL -> NUBE ---
    migrationLocalToCloud: async () => {
        if (!supabase) return { success: false, message: "Sin conexión a la nube" };
        const user = authService.getCurrentUser();
        if (!user) return { success: false, message: "No hay usuario activo" };

        const email = user.email.toLowerCase();
        let syncedCount = 0;

        try {
            // A. Sincronizar Secuencias Guardadas
            const seqKey = `guaimaral_saved_sequences_${email}`;
            const localSeqs = JSON.parse(localStorage.getItem(seqKey) || '[]');

            // Ver qué hay ya en la nube para no duplicar
            const { data: cloudSeqs } = await supabase.from('generated_sequences').select('tema').eq('user_email', email);
            const cloudTemas = new Set((cloudSeqs || []).map(s => s.tema));

            for (const s of localSeqs) {
                if (!cloudTemas.has(s.theme)) {
                    await supabase.from('generated_sequences').insert([{
                        user_email: email,
                        grado: s.grade,
                        area: s.area,
                        tema: s.theme,
                        content: s.content
                    }]);

                    // También crear un log de actividad retroactivo
                    await supabase.from('usage_logs').insert([{
                        user_email: email,
                        action: `Migración Local: ${s.theme}`
                    }]);

                    syncedCount++;
                }
            }

            console.log(`✅ [Migración] ${syncedCount} secuencias sincronizadas con éxito.`);
            return { success: true, count: syncedCount };
        } catch (e) {
            console.error("❌ Error en migración:", e);
            return { success: false, message: "Fallo técnico en migración" };
        }
    },

    getUserStorageKey: (baseKey: string): string => {
        const user = authService.getCurrentUser();
        if (!user) return baseKey;
        // Create a simple alphanumeric hash from email for the key
        const hash = user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(16);
        return `${baseKey}_${hash}`;
    },

    // --- REAL-TIME PRESENCE (PRESENCE MANAGER) ---
    _presenceChannel: null as any,
    _presenceState: {} as Record<string, any>,
    _presenceListeners: [] as ((state: any) => void)[],
    _hb: null as any,

    trackPresence: (user: User, onSync?: (state: any) => void) => {
        if (!supabase) return null;
        const lowEmail = user.email.toLowerCase();

        // 1. Manejo de Listeners
        let listenerWrapper: ((state: any) => void) | null = null;
        if (onSync) {
            listenerWrapper = (state: any) => onSync(state);
            authService._presenceListeners.push(listenerWrapper);
        }

        const notifyAll = () => {
            if (!authService._presenceChannel) return;
            const state = authService._presenceChannel.presenceState();
            authService._presenceState = state;
            authService._presenceListeners.forEach(l => l(state));
        };

        // 2. Inicialización del Canal (Nuclear Singleton)
        if (!authService._presenceChannel || (authService as any)._currentEmail !== lowEmail) {
            if (authService._hb) clearInterval(authService._hb);
            if (authService._presenceChannel) authService._presenceChannel.unsubscribe();

            (authService as any)._currentEmail = lowEmail;

            const channel = supabase.channel('online-users', {
                config: { presence: { key: lowEmail } }
            });

            authService._presenceChannel = channel;

            const updateTrack = async () => {
                try {
                    await channel.track({
                        name: user.name,
                        role: user.role,
                        email: lowEmail,
                        ts: Date.now()
                    });
                } catch (e) { }
            };

            channel
                .on('presence', { event: 'sync' }, notifyAll)
                .on('presence', { event: 'join' }, () => { notifyAll(); })
                .on('presence', { event: 'leave' }, () => { notifyAll(); })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await updateTrack();
                        if (authService._hb) clearInterval(authService._hb);
                        authService._hb = setInterval(updateTrack, 60000); // Cada 60s (menos spam)
                    }
                });
        } else {
            // Si ya existe el canal, notificar inmediatamente al nuevo listener
            if (onSync) onSync(authService._presenceChannel.presenceState());
        }

        // Devolver un objeto que simule el canal pero maneje el unsubscribe del listener solamente
        return {
            unsubscribe: () => {
                if (listenerWrapper) {
                    authService._presenceListeners = authService._presenceListeners.filter(l => l !== listenerWrapper);
                }
            },
            presenceState: () => authService._presenceChannel?.presenceState() || {}
        };
    }
};
