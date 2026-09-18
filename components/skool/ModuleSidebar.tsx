'use client';

import React from 'react';
import { Modulo, Recurso } from '@/lib/types';
import { PlayCircle, Download, ExternalLink, FileText, CheckCircle2, Lock, ChevronRight, Sparkles } from 'lucide-react';

interface ModuleSidebarProps {
  modulos: Modulo[];
  selectedRecursoId: string | null;
  completedLessons: string[];
  isUnlocked: boolean;
  onSelectRecurso: (recurso: Recurso) => void;
  onOpenUnlockModal: () => void;
}

export const ModuleSidebar: React.FC<ModuleSidebarProps> = ({
  modulos,
  selectedRecursoId,
  completedLessons,
  isUnlocked,
  onSelectRecurso,
  onOpenUnlockModal,
}) => {
  const getIconForTipo = (tipo: string, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
    }
    switch (tipo) {
      case 'video':
        return <PlayCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'descargable':
        return <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      case 'enlace':
        return <ExternalLink className="w-4 h-4 text-indigo-600 flex-shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      {modulos.map((modulo, idx) => {
        const publishedRecursos = modulo.recursos?.filter((r) => r.publicado) || [];
        const moduleCompletedCount = publishedRecursos.filter((r) => completedLessons.includes(r.id)).length;
        const isModuleActive = publishedRecursos.some((r) => r.id === selectedRecursoId);

        return (
          <div
            key={modulo.id}
            className={`bg-white rounded-xl border transition-all overflow-hidden ${
              isModuleActive ? 'border-amber-400 shadow-md ring-1 ring-amber-400/30' : 'border-gray-200 shadow-sm'
            }`}
          >
            {/* Module header */}
            <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                {modulo.portada_url ? (
                  <img
                    src={modulo.portada_url}
                    alt={modulo.titulo}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">
                    {modulo.titulo}
                  </h3>
                  {modulo.descripcion && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {modulo.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress counter */}
              <span className="text-[11px] font-semibold text-gray-500 px-2 py-0.5 bg-gray-200/70 rounded-md whitespace-nowrap">
                {moduleCompletedCount}/{publishedRecursos.length}
              </span>
            </div>

            {/* Lessons list */}
            <div className="divide-y divide-gray-100">
              {publishedRecursos.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 italic text-center">
                  Próximamente más lecciones
                </div>
              ) : (
                publishedRecursos.map((recurso) => {
                  const isSelected = recurso.id === selectedRecursoId;
                  const isCompleted = completedLessons.includes(recurso.id);

                  return (
                    <button
                      key={recurso.id}
                      onClick={() => {
                        if (!isUnlocked && recurso.orden > 1) {
                          onOpenUnlockModal();
                        } else {
                          onSelectRecurso(recurso);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 text-amber-950 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {getIconForTipo(recurso.tipo, isCompleted)}
                        <span className="text-xs sm:text-sm truncate">
                          {recurso.titulo}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {!isUnlocked && recurso.orden > 1 ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Bloqueado</span>
                          </span>
                        ) : recurso.duracion ? (
                          <span className="text-[11px] text-gray-400 font-normal">
                            {recurso.duracion}
                          </span>
                        ) : null}
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-gray-300'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
