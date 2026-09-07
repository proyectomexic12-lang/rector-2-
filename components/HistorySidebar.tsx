
import React from 'react';
import { History, FileText, ChevronRight, Trash2, Clock, Calendar } from 'lucide-react';
import { DidacticSequence } from '../types';

interface HistoryItem {
    id: string;
    timestamp: number;
    title: string;
    area: string;
    grade: string;
    sequence: DidacticSequence;
}

interface HistorySidebarProps {
    items: HistoryItem[];
    onSelectItem: (item: HistoryItem) => void;
    onDeleteItem: (id: string) => void;
    onClearAll: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    items, onSelectItem, onDeleteItem, onClearAll, isOpen, setIsOpen
}) => {
    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 shadow-2xl ${isOpen ? 'w-80' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-20 lg:border-r-0 lg:shadow-none'}`}>
                <div className={`flex flex-col h-full overflow-hidden ${!isOpen && 'lg:hidden'}`}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                <History size={20} />
                            </div>
                            <h2 className="font-black text-slate-800 tracking-tight">Mi Librería</h2>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 lg:hidden"
                        >
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {items.length === 0 ? (
                            <div className="text-center py-10">
                                <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 text-sm font-medium">No hay planeaciones<br />guardadas aún.</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelectItem(item)}
                                    className="group relative bg-slate-50 hover:bg-white border border-transparent hover:border-blue-100 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-1">
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600">{item.title}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span>{item.grade}</span>
                                            <span>•</span>
                                            <span className="text-blue-500">{item.area}</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400">
                                            <Calendar size={10} />
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteItem(item.id);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                        <div className="p-4 border-t border-slate-100">
                            <button
                                onClick={onClearAll}
                                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-[2px]"
                            >
                                Borrar Todo
                            </button>
                        </div>
                    )}
                </div>

                {/* Minimized view for desktop (Trigger) */}
                {!isOpen && (
                    <div className="hidden lg:flex flex-col items-center py-6 gap-6 h-full">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all hover:scale-110 group relative"
                        >
                            <History size={24} />
                            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-bold whitespace-nowrap">Historial</span>
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
};
