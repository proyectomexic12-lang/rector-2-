import { supabase } from './supabaseClient';

const PRESENCE_STORAGE_KEY = 'guaimaral_user_presence_v1';
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutos para estar en línea

export const presenceService = {
  // 1. Actualizar presencia (Heartbeat) del usuario actual
  updatePresence: async (email: string) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const now = Date.now();

    // Actualizar LocalStorage
    try {
      const presenceData: Record<string, number> = JSON.parse(localStorage.getItem(PRESENCE_STORAGE_KEY) || '{}');
      presenceData[cleanEmail] = now;
      localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presenceData));
    } catch (e) { }

    // Actualizar Supabase (Silencioso)
    if (supabase) {
      try {
        await supabase
          .from('app_users')
          .update({ last_active_at: new Date().toISOString() })
          .eq('email', cleanEmail);
      } catch (e) { }
    }
  },

  // 2. Iniciar latido de corazón automático cada 30 segundos
  startHeartbeat: (email: string) => {
    if (!email) return () => {};
    presenceService.updatePresence(email);

    const interval = setInterval(() => {
      presenceService.updatePresence(email);
    }, 30000);

    return () => clearInterval(interval);
  },

  // 3. Verificar si un usuario está en línea
  isUserOnline: (email: string): boolean => {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const presenceData: Record<string, number> = JSON.parse(localStorage.getItem(PRESENCE_STORAGE_KEY) || '{}');
      const lastActive = presenceData[cleanEmail];
      if (!lastActive) return false;
      return (Date.now() - lastActive) < ONLINE_THRESHOLD_MS;
    } catch (e) {
      return false;
    }
  },

  // 4. Obtener texto descriptivo del estado
  getUserStatus: (email: string): { isOnline: boolean; label: string } => {
    const isOnline = presenceService.isUserOnline(email);
    if (isOnline) {
      return { isOnline: true, label: 'En línea' };
    }

    try {
      const presenceData: Record<string, number> = JSON.parse(localStorage.getItem(PRESENCE_STORAGE_KEY) || '{}');
      const lastActive = presenceData[email.toLowerCase().trim()];
      if (lastActive) {
        const diffMinutes = Math.floor((Date.now() - lastActive) / (1000 * 60));
        if (diffMinutes < 60) {
          return { isOnline: false, label: `Hace ${diffMinutes || 1} min` };
        }
      }
    } catch (e) { }

    return { isOnline: false, label: 'Desconectado' };
  }
};
