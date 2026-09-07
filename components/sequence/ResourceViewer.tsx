import React, { useState } from 'react';
import { PlayCircle, X, ExternalLink } from 'lucide-react';

interface ResourceViewerProps {
  url: string;
  title: string;
}

export const ResourceViewer: React.FC<ResourceViewerProps> = ({ url, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to extract youtube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  const youtubeId = isYoutube ? getYoutubeId(url) : null;
  
  const embedUrl = youtubeId 
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1` 
    : url;

  // We only show the viewer button if it looks like a valid http URL
  if (!url.startsWith('http')) {
    return null;
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="ml-2 inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-200 transition-colors no-print"
        title="Abrir Visor Integrado"
      >
        <PlayCircle size={12} />
        Ver Recurso
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[80vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Header */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <PlayCircle className="text-blue-400" />
                  Visor de Recursos Ágiles
                </h3>
                <p className="text-xs text-slate-400 mt-1">{title}</p>
              </div>
              
              <div className="flex gap-4 items-center">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={16} />
                  Abrir en nueva pestaña
                </a>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-700 hover:bg-red-500 p-2 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 bg-slate-100 relative">
              {isYoutube ? (
                <iframe 
                  src={embedUrl}
                  title={title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <iframe 
                  src={embedUrl}
                  title={title}
                  className="absolute inset-0 w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                ></iframe>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};
