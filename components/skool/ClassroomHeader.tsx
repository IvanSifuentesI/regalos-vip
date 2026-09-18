'use client';

import React from 'react';
import { Sparkles, Trophy, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { ClassroomConfig } from '@/lib/types';

interface ClassroomHeaderProps {
  config: ClassroomConfig;
  totalLessons: number;
  completedCount: number;
  isUnlocked: boolean;
  onOpenUnlockModal: () => void;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  config,
  totalLessons,
  completedCount,
  isUnlocked,
  onOpenUnlockModal,
}) => {
  const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="bg-white border-b border-[#e5e7eb] mb-6 shadow-sm overflow-hidden">
      {/* Banner / Cover */}
      {config.banner_url && (
        <div className="w-full h-36 sm:h-48 md:h-56 relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-amber-950">
          <img
            src={config.banner_url}
            alt={config.nombre_classroom}
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 max-w-7xl mx-auto flex items-end justify-between">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/90 text-white backdrop-blur-sm shadow-sm">
              <Trophy className="w-3.5 h-3.5" />
              <span>Bóveda Gratuita de Recursos</span>
            </span>
          </div>
        </div>
      )}

      {/* Title & Progress info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {config.nombre_classroom}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600 leading-relaxed">
              {config.subtitulo}
            </p>
          </div>

          {/* Progress or Unlock CTA box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:min-w-[260px] self-start md:self-auto">
            {isUnlocked ? (
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tu Progreso</span>
                  </span>
                  <span>{completedCount}/{totalLessons} ({percent}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Acceso Bloqueado</span>
                  </p>
                  <p className="text-[11px] text-gray-500">Regístrate para ver y descargar</p>
                </div>
                <button
                  onClick={onOpenUnlockModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors whitespace-nowrap"
                >
                  Desbloquear
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
