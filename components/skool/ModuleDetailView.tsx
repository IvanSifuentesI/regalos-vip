'use client';

import React, { useState } from 'react';
import { Modulo, Recurso, ClassroomConfig } from '@/lib/types';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Edit3, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  PlayCircle,
  MessageCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ModuleDetailViewProps {
  modulo: Modulo;
  config: ClassroomConfig;
  completedLessons: string[];
  onToggleComplete: (lessonId: string) => void;
  onBack: () => void;
  isAdmin?: boolean;
  onEditLesson?: (lesson: Recurso) => void;
}

export const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({
  modulo,
  config,
  completedLessons,
  onToggleComplete,
  onBack,
  isAdmin = false,
  onEditLesson,
}) => {
  const publishedLessons = modulo.recursos?.filter((r) => r.publicado) || modulo.recursos || [];
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    publishedLessons[0]?.id || ''
  );

  const activeLesson = publishedLessons.find((r) => r.id === selectedLessonId) || publishedLessons[0];
  const completedCount = publishedLessons.filter((r) => completedLessons.includes(r.id)).length;
  const percent = publishedLessons.length > 0 
    ? Math.round((completedCount / publishedLessons.length) * 100) 
    : 0;

  const currentIndex = publishedLessons.findIndex((l) => l.id === activeLesson?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < publishedLessons.length - 1;

  // Convert video URL to embed
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

  const embedUrl = activeLesson ? getEmbedUrl(activeLesson.video_url) : null;
  const isLessonCompleted = activeLesson ? completedLessons.includes(activeLesson.id) : false;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-950 bg-white hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a todos los módulos</span>
        </button>
      </div>

      {/* 2-Column Module View (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Module header & lesson pill list */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Module Title + Menu */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
              {modulo.titulo}
            </h2>
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Capsule progress bar (Screenshot 2) */}
          <div className="w-full bg-[#e5e7eb] rounded-full h-5 relative overflow-hidden flex items-center">
            {percent > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(percent, 10)}%` }}
              />
            )}
            <span
              className={`absolute left-3 text-[11px] font-extrabold ${
                percent > 0 ? 'text-white' : 'text-gray-600'
              }`}
            >
              {percent}%
            </span>
          </div>

          {/* Lessons list */}
          <div className="space-y-1 pt-1">
            {publishedLessons.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No hay lecciones en este módulo.</p>
            ) : (
              publishedLessons.map((lesson) => {
                const isSelected = lesson.id === activeLesson?.id;
                const isDone = completedLessons.includes(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#FDE047] text-black shadow-xs' // Yellow pill from Screenshot 2
                        : 'text-gray-800 hover:bg-gray-200/60 font-medium'
                    }`}
                  >
                    <span className="truncate">
                      {!lesson.publicado && '(Borrador) '}
                      {lesson.titulo}
                    </span>
                    {isDone && (
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ml-2 ${isSelected ? 'text-black' : 'text-emerald-600'}`} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Extra: Support CTA in sidebar */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">¿Dudas con esta clase?</span>
            </div>
            <a
              href={config.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl'}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-700 hover:underline"
            >
              Preguntar en WhatsApp
            </a>
          </div>

        </div>

        {/* Right Column: White Card with Lesson Details (Matching Screenshot 2) */}
        <div className="lg:col-span-8">
          {activeLesson ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Header with Title & Edit Pencil (Screenshot 2) */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Lección #{activeLesson.orden}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                    {activeLesson.titulo}
                  </h1>
                </div>

                <div className="flex items-center space-x-2">
                  {isAdmin && onEditLesson && (
                    <button
                      onClick={() => onEditLesson(activeLesson)}
                      className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      title="Editar esta lección"
                    >
                      <Edit3 className="w-5 h-5 text-gray-700" />
                    </button>
                  )}

                  <button
                    onClick={() => onToggleComplete(activeLesson.id)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isLessonCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isLessonCompleted ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span>{isLessonCompleted ? 'Visto' : 'Marcar como visto'}</span>
                  </button>
                </div>
              </div>

              {/* Video embed if exists */}
              {embedUrl && (
                <div className="aspect-video-responsive bg-black rounded-xl overflow-hidden shadow-sm">
                  <iframe
                    src={embedUrl}
                    title={activeLesson.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Prominent link (e.g. WhatsApp Group URL as in Screenshot 2) */}
              {activeLesson.enlace_url && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Enlace Oficial</p>
                    <a
                      href={activeLesson.enlace_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-600 hover:underline break-all block mt-0.5"
                    >
                      {activeLesson.enlace_url}
                    </a>
                  </div>
                  <a
                    href={activeLesson.enlace_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap self-start sm:self-auto"
                  >
                    <span>Abrir Enlace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Downloadable file if exists */}
              {activeLesson.archivo_url && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                      {/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.archivo_url) ? 'Imagen Adjunta' : 'Material de Descarga'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.archivo_url)
                        ? 'Imagen de referencia para adjuntar en ChatGPT junto con el prompt.'
                        : 'Plantilla, base de datos o documento complementario.'}
                    </p>
                  </div>
                  <a
                    href={activeLesson.archivo_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-xs whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.archivo_url) ? 'Descargar Imagen' : 'Descargar Archivo'}</span>
                  </a>
                </div>
              )}

              {/* Description & notes */}
              {activeLesson.descripcion && (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pt-2">
                  {activeLesson.descripcion}
                </div>
              )}

              {/* Render image preview directly in lesson */}
              {((activeLesson.archivo_url && (activeLesson.archivo_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.archivo_url))) ||
                (activeLesson.enlace_url && (activeLesson.enlace_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.enlace_url)))) && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-xs">
                  <img
                    src={
                      activeLesson.archivo_url && (activeLesson.archivo_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(activeLesson.archivo_url))
                        ? activeLesson.archivo_url
                        : activeLesson.enlace_url
                    }
                    alt={activeLesson.titulo}
                    className="w-full max-h-[550px] object-contain mx-auto"
                  />
                </div>
              )}

              {/* Prev / Next navigation */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (hasPrev) setSelectedLessonId(publishedLessons[currentIndex - 1].id);
                  }}
                  disabled={!hasPrev}
                  className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors ${
                    hasPrev
                      ? 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                      : 'text-gray-300 border border-transparent cursor-not-allowed'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Lección Anterior</span>
                </button>

                <button
                  onClick={() => {
                    if (hasNext) setSelectedLessonId(publishedLessons[currentIndex + 1].id);
                  }}
                  disabled={!hasNext}
                  className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors ${
                    hasNext
                      ? 'bg-[#FACC15] hover:bg-[#EAB308] text-black shadow-xs'
                      : 'text-gray-300 border border-transparent cursor-not-allowed'
                  }`}
                >
                  <span>Siguiente Lección</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
              Selecciona una lección para visualizar su contenido.
            </div>
          )}

          {/* Strategic High-Ticket Banner below lesson card */}
          {config.cta_oferta_url && (
            <div className="mt-6 bg-gradient-to-r from-gray-900 to-amber-950 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  ¿Quieres escalar estas automatizaciones con acompañamiento directo?
                </p>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  Accede a nuestra mentoría privada 1 a 1 y duplica tus resultados.
                </p>
              </div>
              <a
                href={config.cta_oferta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-md whitespace-nowrap transition-all hover:scale-105"
              >
                {config.cta_oferta_texto || '🔥 Mentoría Avanzada'}
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
