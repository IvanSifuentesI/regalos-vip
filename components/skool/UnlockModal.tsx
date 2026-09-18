import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Lock, Sparkles, CheckCircle2, ShieldCheck, Youtube, Video, Wand2 } from 'lucide-react';
import { COUNTRIES, Country, detectUserCountry } from '@/lib/countries';
import confetti from 'canvas-confetti';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (leadData: { nombre: string; email: string; telefono: string }) => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [interes, setInteres] = useState('Monetizar canales de YouTube y Redes Sociales');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect country dynamically when modal mounts
  useEffect(() => {
    detectUserCountry().then((detected) => {
      if (detected) setSelectedCountry(detected);
    }).catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    if (!telefono.trim() || telefono.replace(/\D/g, '').length < 6) {
      setError('Por favor ingresa tu número de WhatsApp para enviarte las plantillas');
      return;
    }

    setIsLoading(true);

    try {
      const cleanLocalNumber = telefono.replace(/\D/g, '');
      const fullPhone = `${selectedCountry.dial_code} ${cleanLocalNumber}`;
      
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono: fullPhone,
          pais_codigo: selectedCountry.dial_code,
          origen: 'web_landing_modal_desbloqueo',
          metadata: {
            interes,
            pais: selectedCountry.name,
            pais_codigo_iso: selectedCountry.code,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar tus datos');
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6'],
        });
      } catch (err) {}

      onSuccess({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: fullPhone,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimalist Mobile-First Header */}
        <div className="pt-6 px-6 sm:px-8 pb-3 text-center">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black tracking-wider uppercase mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Monetización con IA</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight leading-tight">
            Acceso Inmediato a la Bóveda
          </h3>

          <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-xs mx-auto leading-relaxed">
            Aprende a <strong>generar videos en masa con IA</strong> y <strong>monetizar YouTube y redes</strong> sin mostrar tu rostro.
          </p>
        </div>

        {/* Form body - Optimized for Mobile Thumb Reach */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 pt-2 space-y-3.5">
          
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Tu Nombre
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre o alias"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:bg-white bg-gray-50 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* WhatsApp con Detección Automática */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                WhatsApp
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {selectedCountry.flag} {selectedCountry.name}
              </span>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRIES.find((c) => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-24 py-2.5 px-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-black text-gray-800 outline-none focus:border-amber-500 cursor-pointer"
                title="Cambiar país"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dial_code}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Número de celular"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:bg-white bg-gray-50 text-sm outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:bg-white bg-gray-50 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-black text-black bg-[#FACC15] hover:bg-[#EAB308] active:scale-[0.98] shadow-md shadow-amber-500/20 transition-all disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Desbloquear Todo Gratis</span>
                  <span className="text-lg">→</span>
                </>
              )}
            </button>
          </div>

          {/* Trust guarantee */}
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acceso instantáneo. Cero spam.</span>
          </div>

        </form>
      </div>
    </div>
  );
};
