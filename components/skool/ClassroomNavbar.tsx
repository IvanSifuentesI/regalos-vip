'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldCheck, Unlock, Sparkles, MessageCircle } from 'lucide-react';
import { ClassroomConfig } from '@/lib/types';

interface ClassroomNavbarProps {
  config: ClassroomConfig;
  isUnlocked: boolean;
  onOpenUnlockModal: () => void;
  onGoHome?: () => void;
}

export const ClassroomNavbar: React.FC<ClassroomNavbarProps> = ({
  config,
  isUnlocked,
  onOpenUnlockModal,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & Brand title */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
            <button
              onClick={onGoHome}
              className="flex items-center space-x-2 sm:space-x-2.5 group text-left cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="font-black text-sm sm:text-lg text-gray-950 uppercase tracking-tight truncate">
                {config.nombre_classroom || 'REGALOS EXCLUSIVOS'}
              </span>
            </button>

            {/* Skool Classroom Tab Only on Desktop */}
            <nav className="hidden md:flex items-center space-x-1 border-l border-gray-200 pl-4 h-7">
              <button
                onClick={onGoHome}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-gray-800 bg-gray-100/90 border border-gray-200 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Classroom</span>
              </button>
            </nav>
          </div>

          {/* Strategic CTAs on the Right */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            
            {/* WhatsApp VIP Community CTA */}
            {config.whatsapp_comunidad_url && (
              <a
                href={config.whatsapp_comunidad_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                title="Comunidad VIP de WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366] flex-shrink-0" />
                <span className="hidden sm:inline">{config.whatsapp_comunidad_texto || 'Comunidad VIP'}</span>
              </a>
            )}

            {/* Advanced Mentorship (Skool) CTA */}
            {config.cta_oferta_url && (
              <a
                href={config.cta_oferta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-xs transition-all hover:scale-105"
              >
                <span>{config.cta_oferta_texto || '🔥 Mentoría VIP'}</span>
              </a>
            )}

            {/* Unlock Status / Button */}
            {isUnlocked ? (
              <div className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">Acceso Total</span>
              </div>
            ) : (
              <button
                onClick={onOpenUnlockModal}
                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquear</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
