import React, { useState, useEffect, useRef } from 'react';
import { User, authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { ChatMessage, ChatConversation } from '../types';
import { MessageSquare, Search, Send, CheckCheck, Check, User as UserIcon, RefreshCw, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';

interface AdminChatPanelProps {
    currentUser: User;
    allUsers: User[];
}

export const AdminChatPanel: React.FC<AdminChatPanelProps> = ({ currentUser, allUsers }) => {
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchAllConversations = async () => {
        setIsLoading(true);
        const convs = await chatService.getAllConversationsForAdmin(allUsers);
        setConversations(convs);

        if (!selectedTeacherEmail && convs.length > 0) {
            setSelectedTeacherEmail(convs[0].teacher_email);
        }
        setIsLoading(false);
    };

    const loadThread = async (teacherEmail: string) => {
        const msgs = await chatService.getConversation(teacherEmail);
        setMessages(msgs);
        await chatService.markAsRead(teacherEmail, 'admin');

        // Actualizar el unread_count en la conversación seleccionada
        setConversations(prev => prev.map(c =>
            c.teacher_email.toLowerCase() === teacherEmail.toLowerCase()
                ? { ...c, unread_count: 0 }
                : c
        ));
    };

    useEffect(() => {
        fetchAllConversations();

        // Real-time listener para el Admin
        const channel = chatService.subscribeToMessages('admin', (newMsg) => {
            const tEmail = newMsg.role === 'docente' ? newMsg.sender_email.toLowerCase() : newMsg.receiver_email.toLowerCase();

            // Refrescar conversaciones
            fetchAllConversations();

            // Si está viéndose el hilo actual
            if (selectedTeacherEmail && selectedTeacherEmail.toLowerCase() === tEmail) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                chatService.markAsRead(tEmail, 'admin');
            }
        });

        return () => {
            if (channel) channel.unsubscribe();
        };
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

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
        if (selectedTeacherEmail) {
            loadThread(selectedTeacherEmail);
            scrollToBottom();
        }
    }, [selectedTeacherEmail]);

    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !selectedTeacherEmail || isSending) return;

        const text = input.trim();
        setInput('');
        setIsSending(true);

        try {
            const sentMsg = await chatService.sendMessage(currentUser, selectedTeacherEmail, text);
            setMessages(prev => [...prev, sentMsg]);
            scrollToBottom();
            fetchAllConversations();
        } catch (err) {
            console.error("Error al enviar mensaje desde Admin:", err);
        } finally {
            setIsSending(false);
        }
    };

    const selectedTeacherObj = allUsers.find(u => u.email.toLowerCase() === (selectedTeacherEmail || '').toLowerCase());
    const selectedSubStatus = selectedTeacherObj ? authService.getSubscriptionStatus(selectedTeacherObj) : null;

    const filteredConversations = conversations.filter(c =>
        c.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.teacher_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
            {/* Sidebar Izquierdo: Lista de Docentes */}
            <div className="w-full md:w-80 lg:w-96 bg-slate-50/70 border-r border-slate-200/80 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-800 text-base flex items-center gap-2">
                            <MessageSquare size={18} className="text-indigo-600" />
                            Consultas de Docentes
                        </h2>
                        <button
                            onClick={fetchAllConversations}
                            title="Refrescar lista"
                            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-all"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar docente..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                    </div>
                </div>

                {/* Lista de Conversaciones */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No se encontraron consultas registradas.
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isSelected = selectedTeacherEmail?.toLowerCase() === conv.teacher_email.toLowerCase();
                            const timeStr = conv.last_timestamp
                                ? new Date(conv.last_timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                                : '';

                            return (
                                <button
                                    key={conv.teacher_email}
                                    onClick={() => setSelectedTeacherEmail(conv.teacher_email)}
                                    className={`w-full p-4 text-left flex items-start gap-3 transition-all relative ${isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-white/80'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 mt-0.5">
                                        {conv.teacher_name.charAt(0)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-bold text-slate-800 text-xs truncate">
                                                {conv.teacher_name}
                                            </span>
                                            {timeStr && <span className="text-[9px] font-semibold text-slate-400 shrink-0">{timeStr}</span>}
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate font-medium">
                                            {conv.last_message}
                                        </p>
                                    </div>

                                    {conv.unread_count > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Thread Area */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedTeacherEmail ? (
                    <>
                        {/* Selected Header */}
                        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                                    {selectedTeacherObj ? selectedTeacherObj.name.charAt(0) : '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">
                                        {selectedTeacherObj ? selectedTeacherObj.name : selectedTeacherEmail}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {selectedTeacherEmail}
                                    </p>
                                </div>
                            </div>

                            {/* Badge de suscripción del docente */}
                            {selectedSubStatus && (
                                <div className="text-right">
                                    {selectedSubStatus.status === 'vencido' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 animate-pulse">
                                            🚨 EN MORA (${selectedSubStatus.totalDebt.toLocaleString('es-CO')} COP)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                            🟢 Suscripción Vigente
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Thread Message Stream */}
                        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                            {messages.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 text-xs">
                                    No hay mensajes previos con este docente. Escribe el primer mensaje a continuación.
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isAdminMsg = msg.role === 'admin';
                                    const timeStr = new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div
                                            key={msg.id || index}
                                            className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'} space-y-1`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${isAdminMsg
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                                                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none font-medium'
                                                    }`}
                                            >
                                                {!isAdminMsg && (
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                                        👨‍🏫 {msg.sender_name}
                                                    </div>
                                                )}
                                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                                <div
                                                    className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${isAdminMsg ? 'text-indigo-200' : 'text-slate-400'
                                                        }`}
                                                >
                                                    <span>{timeStr}</span>
                                                    {isAdminMsg && (
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

                        {/* Reply Bar */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200/80 flex items-center gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={`Responder a ${selectedTeacherObj?.name || 'docente'}...`}
                                className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isSending}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 shrink-0"
                            >
                                <Send size={16} />
                                Enviar
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <MessageSquare size={48} className="text-slate-300 mb-3" />
                        <p className="font-bold text-slate-600 text-sm">Selecciona una conversación</p>
                        <p className="text-xs text-slate-400 mt-1">Elige un docente de la lista para ver su hilo de consultas y responder.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
