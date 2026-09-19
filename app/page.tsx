'use client';

import React, { useState, useEffect } from 'react';
import { Modulo, ClassroomConfig } from '@/lib/types';
import { INITIAL_MODULOS, DEFAULT_CONFIG } from '@/lib/demoData';
import { ClassroomNavbar } from '@/components/skool/ClassroomNavbar';
import { ModuleGridCard } from '@/components/skool/ModuleGridCard';
import { ModuleDetailView } from '@/components/skool/ModuleDetailView';
import { VIPMentoriaCard } from '@/components/skool/VIPMentoriaCard';
import { UnlockModal } from '@/components/skool/UnlockModal';
import { MessageCircle, Sparkles } from 'lucide-react';

export default function ClassroomPage() {
  const [modulos, setModulos] = useState<Modulo[]>(INITIAL_MODULOS);
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CONFIG);
  const [selectedModule, setSelectedModule] = useState<Modulo | null>(null);
  const [pendingModuleToOpen, setPendingModuleToOpen] = useState<Modulo | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load unlock and completed status from localStorage
  useEffect(() => {
    try {
      const unlocked = localStorage.getItem('skool_lead_unlocked') === 'true';
      setIsUnlocked(unlocked);

      const savedCompleted = localStorage.getItem('skool_completed_lessons');
      if (savedCompleted) {
        setCompletedLessons(JSON.parse(savedCompleted));
      }
    } catch (e) {
      // Storage error fallback
    }
  }, []);

  // Fetch dynamic content and config from API
  useEffect(() => {
    async function loadData() {
      try {
        const [contentRes, configRes] = await Promise.all([
          fetch('/api/content'),
          fetch('/api/config')
        ]);

        if (contentRes.ok) {
          const contentData = await contentRes.json();
          if (contentData.success && contentData.modulos && contentData.modulos.length > 0) {
            setModulos(contentData.modulos);
          }
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.success && configData.config) {
            setConfig(configData.config);
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic content:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate overall stats
  const allLessons = modulos.flatMap((m) => m.recursos?.filter((r) => r.publicado) || []);

  const handleToggleComplete = (lessonId: string) => {
    let updated: string[];
    if (completedLessons.includes(lessonId)) {
      updated = completedLessons.filter((id) => id !== lessonId);
    } else {
      updated = [...completedLessons, lessonId];
    }
    setCompletedLessons(updated);
    try {
      localStorage.setItem('skool_completed_lessons', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleModuleClick = (mod: Modulo) => {
    // If not unlocked and this module is locked -> trigger lead capture
    const isLocked = !isUnlocked && (mod.bloqueado ?? true);
    if (isLocked) {
      setPendingModuleToOpen(mod);
      setIsUnlockModalOpen(true);
    } else {
      setSelectedModule(mod);
    }
  };

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    try {
      localStorage.setItem('skool_lead_unlocked', 'true');
    } catch (e) {}

    // If user clicked a locked module, open it now
    if (pendingModuleToOpen) {
      setSelectedModule(pendingModuleToOpen);
      setPendingModuleToOpen(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#111827] flex flex-col">
      
      {/* Main Navbar */}
      <ClassroomNavbar
        config={config}
        isUnlocked={isUnlocked}
        onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
        onGoHome={() => setSelectedModule(null)}
      />

      {/* Main Content Area: Direct Module Cards Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
        
        {/* ========================================================================= */}
        {/* VISTA 1: GRID DE MÓDULOS (MATCHING SCREENSHOT 1) */}
        {/* ========================================================================= */}
        {!selectedModule ? (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Section Heading & Quick Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Bóveda VIP</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                  Regalos Exclusivos
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Prompts, atajos y automatizaciones para viralizar y monetizar con IA.
                </p>
              </div>

              {/* Strategic WhatsApp Quick Link */}
              {config.whatsapp_comunidad_url && (
                <a
                  href={config.whatsapp_comunidad_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 transition-colors flex-shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Unirme a la Comunidad</span>
                </a>
              )}
            </div>

            {/* Cards Grid: 1-col on mobile, 2-col on tablet, 3-col on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
              {modulos
                .filter((modulo) => modulo.publicado !== false)
                .map((modulo) => (
                  <ModuleGridCard
                    key={modulo.id}
                    modulo={modulo}
                    completedLessons={completedLessons}
                    isUnlocked={isUnlocked}
                    onClick={() => handleModuleClick(modulo)}
                  />
                ))}

              {/* Strategic VIP Mentorship Card (High Ticket Conversion Trigger) */}
              <VIPMentoriaCard
                ctaUrl={config.cta_oferta_url}
                ctaText={config.cta_oferta_texto}
              />
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* VISTA 2: DETALLE DEL MÓDULO & LECCIÓN (MATCHING SCREENSHOT 2) */
          /* ========================================================================= */
          <ModuleDetailView
            modulo={selectedModule}
            config={config}
            completedLessons={completedLessons}
            onToggleComplete={handleToggleComplete}
            onBack={() => setSelectedModule(null)}
          />
        )}

      </main>

      {/* Floating Bottom Mobile Dock: Native app feel */}
      <div className="lg:hidden fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-2 shadow-xl flex items-center justify-between gap-2">
          {config.whatsapp_comunidad_url && (
            <a
              href={config.whatsapp_comunidad_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
              <span>Comunidad (+2.4K)</span>
            </a>
          )}

          {!isUnlocked ? (
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-black text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Desbloquear Todo</span>
            </button>
          ) : config.cta_oferta_url ? (
            <a
              href={config.cta_oferta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-black text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 shadow-xs active:scale-95 transition-all"
            >
              Mentoría VIP
            </a>
          ) : null}
        </div>
      </div>

      {/* Lead Capture Modal */}
      <UnlockModal
        isOpen={isUnlockModalOpen}
        onClose={() => {
          setIsUnlockModalOpen(false);
          setPendingModuleToOpen(null);
        }}
        onSuccess={handleUnlockSuccess}
      />

    </div>
  );
}
