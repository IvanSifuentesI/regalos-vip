'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Key, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Probar autenticación por API contra tabla 'admins' de Supabase
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('admin_authenticated', 'true');
        router.push('/admin');
        return;
      }

      // 2. Probar contra Supabase Auth nativo
      if (isSupabaseConfigured && supabase) {
        const { data: authData, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (!sbError && authData?.session) {
          localStorage.setItem('admin_authenticated', 'true');
          router.push('/admin');
          return;
        }
      }

      throw new Error(data.error || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Classroom</span>
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white font-black text-xl mx-auto shadow-md">
          ⚡
        </div>
        <h2 className="mt-4 text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Acceso Administrador
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Gestiona los recursos de la bóveda y descarga los prospectos capturados
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-200 sm:px-10">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tudominio.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white text-sm text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white text-sm text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-md transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Administrador</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Helper credentials */}
          <div className="mt-6 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-amber-800 flex items-center gap-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Acceso Autorizado</span>
            </p>
            <p className="text-[11px] text-gray-600">
              Ingresa con tu usuario y contraseña registrados en tu tabla <code className="bg-white text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 font-mono">admins</code> de Supabase (o <code className="bg-white text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 font-mono">admin@tudominio.com</code> / <code className="bg-white text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 font-mono">admin123</code>).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
