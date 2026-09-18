'use client';

import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface VIPMentoriaCardProps {
  ctaUrl: string;
  ctaText?: string;
}

export const VIPMentoriaCard: React.FC<VIPMentoriaCardProps> = ({
  ctaUrl,
  ctaText = '🔥 Aplicar a la Mentoría VIP 1 a 1',
}) => {
  return (
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50/40 to-white rounded-2xl border-2 border-amber-300/80 p-5 sm:p-6 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-amber-400 transition-all">
      {/* Top Tag */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500 text-black shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PROGRAMA AVANZADO</span>
        </span>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
          Cupos Limitados
        </span>
      </div>

      <div>
        <h3 className="text-gray-950 font-black text-lg leading-snug group-hover:text-amber-700 transition-colors">
          ¿Quieres que implementemos todo esto contigo paso a paso?
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
          Accede a nuestra mentoría privada de alto nivel con acompañamiento directo por WhatsApp para escalar tus ventas y automatizaciones.
        </p>

        {/* Benefits bullets */}
        <ul className="mt-4 space-y-2 text-xs text-gray-700 font-medium">
          <li className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Auditoría personalizada de tu negocio</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Flujos y plantillas exclusivas no públicas</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Soporte prioritario 1 a 1</span>
          </li>
        </ul>
      </div>

      {/* Button CTA */}
      <div className="mt-6 pt-4 border-t border-amber-200/60">
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
