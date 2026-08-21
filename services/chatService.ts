import { supabase } from './supabaseClient';
import { User } from './authService';
import { ChatMessage, ChatConversation } from '../types';

const ADMIN_EMAIL = 'admin@guaimaral.edu.co';
const LOCAL_STORAGE_CHAT_KEY = 'guaimaral_chat_messages_v1';

export const chatService = {
    // 1. Send Message (Docente -> Admin or Admin -> Docente)
    sendMessage: async (sender: User, receiverEmail: string, text: string): Promise<ChatMessage> => {
        const cleanText = text.trim();
        if (!cleanText) throw new Error("El mensaje no puede estar vacío.");

        const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            sender_email: sender.email.toLowerCase().trim(),
            sender_name: sender.name,
            receiver_email: receiverEmail.toLowerCase().trim(),
            message: cleanText,
            role: sender.role,
            is_read: false,
            timestamp: new Date().toISOString()
        };

        // Respaldo Local (Inmediato)
        try {
            const allLocal: ChatMessage[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || '[]');
            allLocal.push(newMsg);
            localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(allLocal));
        } catch (e) {
            console.warn("Error guardando mensaje localmente", e);
        }

        // Sincronización en la Nube (Supabase)
        if (supabase) {
            try {
                const { error } = await supabase.from('chat_messages').insert([{
                    id: newMsg.id,
                    sender_email: newMsg.sender_email,
                    sender_name: newMsg.sender_name,
                    receiver_email: newMsg.receiver_email,
                    message: newMsg.message,
                    role: newMsg.role,
                    is_read: false,
                    timestamp: newMsg.timestamp
                }]);

                if (error) {
                    console.warn("⚠️ Supabase chat insert warn (usando fallback local):", error.message);
                }
            } catch (e) {
                console.error("Fallo al enviar mensaje a la nube:", e);
            }
        }

        return newMsg;
    },

    // 2. Get Messages for a specific Teacher conversation
    getConversation: async (teacherEmail: string): Promise<ChatMessage[]> => {
        const lowTeacher = teacherEmail.toLowerCase().trim();
        let cloudMsgs: ChatMessage[] = [];

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .or(`sender_email.eq.${lowTeacher},receiver_email.eq.${lowTeacher}`)
                    .order('timestamp', { ascending: true });

                if (!error && data) {
                    cloudMsgs = data;
                }
            } catch (e) {
                console.warn("Cloud chat fetch fallback", e);
            }
        }

        // Local Fallback
        const localMsgs: ChatMessage[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || '[]');
        const filteredLocal = localMsgs.filter(m =>
            m.sender_email.toLowerCase() === lowTeacher || m.receiver_email.toLowerCase() === lowTeacher
        );

        // Deduplicar por ID
        const map = new Map<string, ChatMessage>();
        [...cloudMsgs, ...filteredLocal].forEach(m => map.set(m.id, m));

        return Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    },

    // 3. Get all conversations grouped for Admin Panel
    getAllConversationsForAdmin: async (allUsers: User[]): Promise<ChatConversation[]> => {
        let allMsgs: ChatMessage[] = [];

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .order('timestamp', { ascending: true });

                if (!error && data) {
                    allMsgs = data;
                }
            } catch (e) { }
        }

        // Merge local
        const localMsgs: ChatMessage[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || '[]');
        const map = new Map<string, ChatMessage>();
        [...allMsgs, ...localMsgs].forEach(m => map.set(m.id, m));
        const merged = Array.from(map.values());

        // Group by teacher email
        const teacherMap = new Map<string, ChatMessage[]>();

        merged.forEach(m => {
            const tEmail = m.role === 'docente' ? m.sender_email.toLowerCase() : m.receiver_email.toLowerCase();
            if (tEmail && !tEmail.includes('admin')) {
                if (!teacherMap.has(tEmail)) teacherMap.set(tEmail, []);
                teacherMap.get(tEmail)!.push(m);
            }
        });

        // Asegurar que todos los docentes conocidos estén en la lista
        allUsers.filter(u => u.role !== 'admin').forEach(u => {
            const lowE = u.email.toLowerCase();
            if (!teacherMap.has(lowE)) {
                teacherMap.set(lowE, []);
            }
        });

        const result: ChatConversation[] = [];
        teacherMap.forEach((msgs, tEmail) => {
            const teacherObj = allUsers.find(u => u.email.toLowerCase() === tEmail);
            const teacherName = teacherObj ? teacherObj.name : (msgs[0]?.sender_name || tEmail.split('@')[0]);

            const sorted = msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const last = sorted[sorted.length - 1];

            const unreadCount = sorted.filter(m => m.role === 'docente' && !m.is_read).length;

            result.push({
                teacher_email: tEmail,
                teacher_name: teacherName,
                last_message: last ? last.message : 'Sin mensajes aún',
                last_timestamp: last ? last.timestamp : '',
                unread_count: unreadCount,
                messages: sorted
            });
        });

        // Ordenar por mensajes más recientes e inread primero
        return result.sort((a, b) => {
            if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
            if (!a.last_timestamp) return 1;
            if (!b.last_timestamp) return -1;
            return new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime();
        });
    },

    // 4. Mark messages as read
    markAsRead: async (teacherEmail: string, readerRole: 'admin' | 'docente') => {
        const lowTeacher = teacherEmail.toLowerCase().trim();

        // Local update
        const localMsgs: ChatMessage[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || '[]');
        const updatedLocal = localMsgs.map(m => {
            if (readerRole === 'admin' && m.sender_email.toLowerCase() === lowTeacher && m.role === 'docente') {
                return { ...m, is_read: true };
            }
            if (readerRole === 'docente' && m.receiver_email.toLowerCase() === lowTeacher && m.role === 'admin') {
                return { ...m, is_read: true };
            }
            return m;
        });
        localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(updatedLocal));

        // Cloud update
        if (supabase) {
            try {
                if (readerRole === 'admin') {
                    await supabase
                        .from('chat_messages')
                        .update({ is_read: true })
                        .eq('sender_email', lowTeacher)
                        .eq('role', 'docente');
                } else {
                    await supabase
                        .from('chat_messages')
                        .update({ is_read: true })
                        .eq('receiver_email', lowTeacher)
                        .eq('role', 'admin');
                }
            } catch (e) { }
        }
    },

    // 5. Subscribe to real-time chat messages
    subscribeToMessages: (userEmail: string, onNewMessage: (msg: ChatMessage) => void) => {
        if (!supabase) return null;

        const channel = supabase
            .channel(`chat_${userEmail.toLowerCase()}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                (payload) => {
                    const msg = payload.new as ChatMessage;
                    const lowUser = userEmail.toLowerCase();
                    if (msg.sender_email.toLowerCase() === lowUser || msg.receiver_email.toLowerCase() === lowUser || lowUser.includes('admin')) {
                        onNewMessage(msg);
                    }
                }
            )
            .subscribe();

        return channel;
    }
};
