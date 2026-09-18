'use client';

import React from 'react';
import { Modulo } from '@/lib/types';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface ModuleGridCardProps {
  modulo: Modulo;
  completedLessons: string[];
  isUnlocked: boolean;
  onClick: () => void;
}

export const ModuleGridCard: React.FC<ModuleGridCardProps> = ({
  modulo,
  completedLessons,
  isUnlocked,
  onClick,
}) => {
  const publishedLessons = modulo.recursos?.filter((r) => r.publicado) || [];
  const completedCount = publishedLessons.filter((r) => completedLessons.includes(r.id)).length;
  
  // Calculate percentage: if lessons exist calculate, otherwise default to 0
  const percent = publishedLessons.length > 0 
    ? Math.round((completedCount / publishedLessons.length) * 100) 
    : 0;

  // Determine if locked for the visitor:
  // If isUnlocked = true (already filled form), then unlocked.
  // Otherwise if modulo.bloqueado = true (or not specified, default to locked if not unlocked).
  const isLocked = !isUnlocked && (modulo.bloqueado ?? true);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-200/90 hover:border-amber-400/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Yellow Top Banner */}
        {modulo.etiqueta_superior && (
          <div 
            className="w-full text-black font-extrabold text-[11px] sm:text-xs tracking-wider uppercase py-1 px-3 text-center border-b border-amber-300/60"
            style={{ backgroundColor: modulo.color_etiqueta || '#FDE047' }}
          >
            {modulo.etiqueta_superior}
          </div>
        )}

        {/* 16:9 Thumbnail Image */}
        <div className="aspect-video w-full relative overflow-hidden bg-gray-100">
          {modulo.portada_url ? (
            <img
              src={modulo.portada_url}
              alt={modulo.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-gray-100 to-gray-200 text-gray-400 font-bold text-xs sm:text-sm">
              {modulo.titulo}
            </div>
          )}

          {/* Draft Badge */}
          {!modulo.publicado && (
            <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10">
              Borrador
            </div>
          )}

          {/* Lock Badge if locked */}
          {isLocked && (
            <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-amber-300 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-white/10 shadow-sm z-10">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Bloqueado</span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-3.5 sm:p-5">
          <h3 className="text-gray-950 font-bold text-sm sm:text-base leading-snug group-hover:text-amber-600 transition-colors line-clamp-1">
            {modulo.titulo}
          </h3>
          <p className="text-gray-500 text-xs sm:text-[13px] leading-relaxed line-clamp-2 mt-1 min-h-[32px] sm:min-h-[36px]">
            {modulo.descripcion || 'Entra y descubre los recursos, guías y atajos de este módulo.'}
          </p>
        </div>
      </div>

      {/* Skool Capsule Dynamic Progress Bar */}
      <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-5">
        <div className="w-full bg-gray-100 rounded-full h-4 sm:h-5 relative overflow-hidden flex items-center">
          {percent > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(percent, 10)}%` }}
            />
          )}
          <span
            className={`absolute left-2.5 sm:left-3 text-[10px] sm:text-[11px] font-extrabold ${
              percent > 0 ? 'text-white' : 'text-gray-500'
            }`}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
};
