'use client';

import React, { useState } from 'react';
import { MessageCircle, X, ChevronRight } from 'lucide-react';

interface AnnouncementBarProps {
  text?: string;
  whatsappUrl?: string;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  text = 'Comunidad VIP Gratis (+2,400 miembros)',
  whatsappUrl = 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !whatsappUrl) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-3 sm:px-4 shadow-xs relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 sm:gap-2 mx-auto sm:mx-0 hover:opacity-90 transition-opacity truncate"
        >
          <span className="flex h-2 w-2 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="font-bold tracking-tight truncate">
            {text}
          </span>
          <span className="inline-flex items-center text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full flex-shrink-0 transition-colors">
            Entrar <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </a>

        <button
          onClick={() => setIsVisible(false)}
          className="text-white/60 hover:text-white p-1 rounded-md transition-colors flex-shrink-0 cursor-pointer"
          title="Cerrar aviso"
        >
          <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
  );
};

