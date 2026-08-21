import React, { useState, useEffect, useRef } from 'react';
import { User } from '../services/authService';
import { chatService } from '../services/chatService';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, Bot, ShieldCheck, Sparkles, Check, CheckCheck, Clock } from 'lucide-react';

interface ChatWidgetProps {
    user: User;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || user.role === 'admin') return;
        const timer = setTimeout(() => {
            setShowWelcomePrompt(true);
        }, 6000);
        return () => clearTimeout(timer);
    }, [user?.email]);

    const loadMessages = async () => {
        const msgs = await chatService.getConversation(user.email);
        setMessages(msgs);

        // Contar mensajes no leídos del admin
        const unread = msgs.filter(m => m.role === 'admin' && !m.is_read).length;
        setUnreadCount(unread);
    };

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        loadMessages();

        // Suscripción Realtime
        const channel = chatService.subscribeToMessages(user.email, (newMsg) => {
            setMessages(prev => {
                const exists = prev.some(m => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
            });

            if (newMsg.role === 'admin') {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            if (channel) channel.unsubscribe();
        };
    }, [user?.email]);

    const scrollToBottom = (smooth = true) => {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
        }, 50);
    };

    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            chatService.markAsRead(user.email, 'docente');
            setUnreadCount(0);
        }
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, messages.length]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isSending) return;

        const text = input.trim();
        setInput('');
        setIsSending(true);

        try {
            const sentMsg = await chatService.sendMessage(user, 'admin@guaimaral.edu.co', text);
            setMessages(prev => [...prev, sentMsg]);
            scrollToBottom();
        } catch (err) {
            console.error("Error al enviar mensaje:", err);
        } finally {
            setIsSending(false);
        }
    };

    if (!user || user.role === 'admin') return null;

    return (
        <div className="fixed bottom-6 left-6 z-50">
            {/* Tooltip Flotante de Invitación al Chat (Aparece a los 6s) */}
            {showWelcomePrompt && !isOpen && (
                <div className="absolute bottom-20 left-0 w-80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/50 text-white rounded-3xl p-4 shadow-2xl animate-fade-in-up flex flex-col gap-3 relative z-50">
                    <button
                        onClick={() => setShowWelcomePrompt(false)}
                        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
                        title="Cerrar aviso"
                    >
                        <X size={14} />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center shrink-0 text-xl shadow-inner">
                            👋
                        </div>
                        <div className="text-xs">
                            <p className="font-black text-indigo-200 text-sm">¡Hola {user.name.split(' ')[0]}!</p>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-medium">
                                Puedes escribirle directamente a la <strong>Administración</strong> para saludarlo, resolver dudas o consultar inquietudes en tiempo real.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setIsOpen(true);
                            setShowWelcomePrompt(false);
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <MessageSquare size={16} />
                        Escribir a Administración
                    </button>
                </div>
            )}

            {/* Widget Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center border-2 border-white/40 group"
                    title="Consultas y Chat con Administración"
                >
                    <MessageSquare size={26} className="animate-pulse" />

                    {/* Insignia de no leídos */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                            {unreadCount}
                        </span>
                    )}

                    <span className="absolute left-16 bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap border border-slate-700 pointer-events-none">
                        Chat con Administración
                    </span>
                </button>
            )}

            {/* Chat Pop-up Modal */}
            {isOpen && (
                <div className="bg-white w-[380px] sm:w-[420px] h-[520px] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-fade-in-up transform transition-all">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between shadow-md relative overflow-hidden">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold shadow-inner">
                                <ShieldCheck size={22} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm tracking-wide flex items-center gap-1.5">
                                    <span>Soporte Administración</span>
                                </h3>
                                <p className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                    En línea para ayudarte
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all"
                            title="Cerrar chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Banner de Contexto del Docente */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-2 border-b border-indigo-100 text-[11px] text-indigo-950 flex items-center justify-between font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                            <Sparkles size={13} className="text-indigo-600 shrink-0 animate-pulse" />
                            <span className="truncate font-semibold text-slate-700">
                                👨‍🏫 {user.name} <span className="text-slate-400">({user.areas && user.areas.length > 0 ? user.areas[0] : 'Soporte Directo'})</span>
                            </span>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                        {messages.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                                <MessageSquare size={36} className="mx-auto text-slate-300" />
                                <p className="font-semibold text-slate-600">¿Tienes dudas o inquietudes?</p>
                                <p className="text-[11px] text-slate-400">Escribe tu consulta y el Administrador te responderá aquí directamente.</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.role === 'docente';
                                const timeStr = new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div
                                        key={msg.id || index}
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                                    >
                                        <div
                                            className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${isMe
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none font-medium'
                                                }`}
                                        >
                                            {!isMe && (
                                                <div className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">
                                                    👑 Administración
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                            <div
                                                className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-blue-100' : 'text-slate-400'
                                                    }`}
                                            >
                                                <span>{timeStr}</span>
                                                {isMe && (
                                                    msg.is_read ? <CheckCheck size={12} className="text-emerald-300" /> : <Check size={12} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer / Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe tu consulta al Administrador..."
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isSending}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-2xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
