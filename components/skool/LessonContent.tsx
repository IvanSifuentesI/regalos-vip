'use client';

import React from 'react';
import { Recurso, ClassroomConfig } from '@/lib/types';
import { 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  PlayCircle, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface LessonContentProps {
  recurso: Recurso | null;
  config: ClassroomConfig;
  isUnlocked: boolean;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onPrevLesson: () => void;
  onNextLesson: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onOpenUnlockModal: () => void;
}

export const LessonContent: React.FC<LessonContentProps> = ({
  recurso,
  config,
  isUnlocked,
  isCompleted,
  onToggleComplete,
  onPrevLesson,
  onNextLesson,
  hasPrev,
  hasNext,
  onOpenUnlockModal,
}) => {
  if (!recurso) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
        <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-800">Selecciona una lección para comenzar</h3>
        <p className="text-sm text-gray-500 mt-1">Explora los módulos y recursos gratuitos de la bóveda.</p>
      </div>
    );
  }

  // Convert YouTube/Vimeo/Loom links to embeddable URLs
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : url;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : url;
      }
      if (url.includes('loom.com/share/')) {
        const loomId = url.split('loom.com/share/')[1]?.split('?')[0];
        return `https://www.loom.com/embed/${loomId}`;
      }
      if (url.includes('vimeo.com/')) {
        const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    } catch (e) {
      return url;
    }
    return url;
  };

  const isLocked = !isUnlocked && recurso.orden > 1;
  const embedUrl = getEmbedUrl(recurso.video_url);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Video or Media area */}
      {recurso.tipo === 'video' && (
        <div className="bg-black relative">
          {isLocked ? (
            <div className="aspect-video-responsive flex items-center justify-center bg-gray-900 text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-sm" style={{ backgroundImage: `url(${config.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'})` }} />
              <div className="relative z-10 text-center max-w-md">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4 text-amber-400">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Esta lección está reservada para miembros registrados
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 mb-5">
                  Desbloquea gratis este video y toda la bóveda de plantillas y recursos en menos de 30 segundos.
                </p>
                <button
                  onClick={onOpenUnlockModal}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear Gratis Ahora</span>
                </button>
              </div>
            </div>
          ) : embedUrl ? (
            <div className="aspect-video-responsive">
              <iframe
                src={embedUrl}
                title={recurso.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video-responsive flex items-center justify-center bg-gray-900 text-gray-400 text-sm">
              Video no disponible
            </div>
          )}
        </div>
      )}

      {/* Content body */}
      <div className="p-6 sm:p-8 flex-1">
        
        {/* Header & Mark complete */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase">
              Recurso Gratuito
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {recurso.titulo}
            </h2>
          </div>

          <button
            onClick={onToggleComplete}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all self-start sm:self-auto ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>{isCompleted ? 'Completado' : 'Marcar como visto'}</span>
          </button>
        </div>

        {/* Text description */}
        {recurso.descripcion && (
          <div className="mt-6 prose prose-amber max-w-none text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {recurso.descripcion}
          </div>
        )}

        {/* Render image attachment directly if available */}
        {((recurso.archivo_url && (recurso.archivo_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(recurso.archivo_url))) ||
          (recurso.enlace_url && (recurso.enlace_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(recurso.enlace_url)))) && (
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-xs">
            <img
              src={recurso.archivo_url?.startsWith('data:image/') ? recurso.archivo_url : recurso.enlace_url}
              alt={recurso.titulo}
              className="w-full max-h-[500px] object-contain mx-auto"
            />
          </div>
        )}

        {/* Downloadable / Link Resources Box */}
        {(recurso.archivo_url || recurso.enlace_url) && (
          <div className="mt-8 p-5 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Recursos y Archivos Adjuntos</span>
            </h4>
            
            <div className="flex flex-wrap gap-3">
              {recurso.archivo_url && (
                <a
                  href={isLocked ? '#' : recurso.archivo_url}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      onOpenUnlockModal();
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-white text-gray-900 border border-amber-200 shadow-sm hover:bg-amber-100/50 hover:border-amber-300 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-600" />
                  <span>Descargar Archivo / Plantilla</span>
                </a>
              )}

              {recurso.enlace_url && (
                <a
                  href={isLocked ? '#' : recurso.enlace_url}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      onOpenUnlockModal();
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-white text-gray-900 border border-amber-200 shadow-sm hover:bg-amber-100/50 hover:border-amber-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Abrir Enlace Externo</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onPrevLesson}
            disabled={!hasPrev}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              hasPrev
                ? 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                : 'text-gray-300 cursor-not-allowed border border-transparent'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={onNextLesson}
            disabled={!hasNext}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              hasNext
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                : 'text-gray-300 cursor-not-allowed border border-transparent'
            }`}
          >
            <span>Siguiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* High Ticket Offer Banner */}
      {config.cta_oferta_url && (
        <div className="bg-gradient-to-r from-gray-900 to-amber-950 p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-800">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-amber-400">
              ¿Quieres llevar tu negocio al siguiente nivel?
            </p>
            <p className="text-sm text-gray-200 font-medium">
              Conoce nuestro programa avanzado con acompañamiento directo y personal.
            </p>
          </div>
          <a
            href={config.cta_oferta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-md transition-all whitespace-nowrap hover:scale-105"
          >
            {config.cta_oferta_texto || '🔥 Hablar por WhatsApp'}
          </a>
        </div>
      )}

    </div>
  );
};
