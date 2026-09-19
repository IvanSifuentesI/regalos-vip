'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Zap, 
  ExternalLink, 
  Eye, 
  Settings, 
  HelpCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { ClassroomConfig, Lead } from '@/lib/types';

interface EmailStudioProps {
  config: ClassroomConfig;
  leads: Lead[];
  onUpdateConfig: (newConfig: Partial<ClassroomConfig>) => void;
}

interface DiagnosisResult {
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  plan?: string;
  credits?: number;
  senders?: Array<{ id: number; name: string; email: string; active: boolean }>;
  testSenderEmail?: string;
  isSenderVerified?: boolean;
  recommendation?: string | null;
  error?: string;
}

export const EmailStudio: React.FC<EmailStudioProps> = ({ config, leads, onUpdateConfig }) => {
  const [subTab, setSubTab] = useState<'chat' | 'conexion' | 'historial'>('chat');
  
  // API credentials state
  const [apiKey, setApiKey] = useState(config.brevo_api_key || '');
  const [senderEmail, setSenderEmail] = useState(config.email_remitente || '');
  const [senderName, setSenderName] = useState(config.nombre_classroom || 'REGALOS EXCLUSIVOS');
  
  // Diagnosis state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  
  // Live test send state
  const [testEmailTo, setTestEmailTo] = useState(leads[0]?.email || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Composer state (Chat Style)
  const [emailSubject, setEmailSubject] = useState('⚡ Recordatorio importante: Acceso a tus herramientas exclusivas');
  const [emailBody, setEmailBody] = useState(
    'Hola {{nombre}},\n\nTe recordamos que tienes recursos, guiones y plantillas exclusivas disponibles en tu Bóveda.\n\nPuedes ingresar en cualquier momento para poner en práctica las herramientas gratuitas.\n\nSi deseas que implementemos estas automatizaciones contigo paso a paso en una sesión privada 1 a 1, escríbenos directamente a nuestro WhatsApp oficial.'
  );
  const [ctaButtonText, setCtaButtonText] = useState(config.cta_oferta_texto || '🔥 Hablar por WhatsApp');
  const [ctaButtonUrl, setCtaButtonUrl] = useState(config.cta_oferta_url || config.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl');
  
  // Broadcast sending state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number; logs: string[] } | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email history logs
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Load local storage cache on mount
  useEffect(() => {
    const cachedKey = localStorage.getItem('brevo_api_key');
    const cachedSender = localStorage.getItem('brevo_sender_email');
    if (cachedKey && !apiKey) setApiKey(cachedKey);
    if (cachedSender && !senderEmail) setSenderEmail(cachedSender);
  }, []);

  // Sync to parent & local storage
  const handleSaveCredentials = () => {
    localStorage.setItem('brevo_api_key', apiKey.trim());
    localStorage.setItem('brevo_sender_email', senderEmail.trim());
    onUpdateConfig({
      brevo_api_key: apiKey.trim(),
      email_remitente: senderEmail.trim(),
    });
    alert('Credenciales de Brevo guardadas correctamente en tu navegador.');
  };

  // Run live Brevo diagnosis
  const handleRunDiagnosis = async () => {
    if (!apiKey.trim()) {
      alert('Por favor introduce tu API Key de Brevo primero.');
      return;
    }

    setIsDiagnosing(true);
    setDiagnosis(null);

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'diagnose_brevo',
          brevo_api_key: apiKey.trim(),
          email_remitente: senderEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.diagnosis) {
        setDiagnosis(data.diagnosis);
        if (data.diagnosis.connected && data.diagnosis.accountEmail && !senderEmail) {
          setSenderEmail(data.diagnosis.accountEmail);
          localStorage.setItem('brevo_sender_email', data.diagnosis.accountEmail);
          onUpdateConfig({ email_remitente: data.diagnosis.accountEmail });
        }
      }
    } catch (err: any) {
      setDiagnosis({
        connected: false,
        error: `Error al conectar con la API: ${err.message}`,
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Run live test send
  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      alert('Introduce un correo para recibir la prueba.');
      return;
    }
    if (!apiKey.trim()) {
      alert('Configura primero tu API Key de Brevo.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_send',
          to: testEmailTo.trim(),
          brevo_api_key: apiKey.trim(),
          email_remitente: senderEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.mode !== 'brevo_error') {
        setTestResult({
          success: true,
          message: `✅ ¡Correo enviado exitosamente a ${testEmailTo}! Revisa tu bandeja de entrada o carpeta de spam (ID: ${data.id || 'ok'}).`,
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Brevo reportó un error: ${data.error || 'No se pudo entregar el correo.'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `❌ Error de red: ${err.message}`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Broadcast to all captured leads
  const handleBroadcastCampaign = async () => {
    if (leads.length === 0) {
      alert('Aún no tienes prospectos capturados en la base de datos.');
      return;
    }
    if (!apiKey.trim()) {
      alert('Configura y verifica tu API Key de Brevo antes de enviar.');
      return;
    }

    if (!confirm(`¿Confirmas enviar esta campaña a los ${leads.length} prospectos registrados?`)) {
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: leads.length, logs: [] });
    setBroadcastResult(null);

    // Format custom HTML with responsive container
    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #111827;">
        <div style="background-color: #FDE047; padding: 10px 16px; border-radius: 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; text-align: center; color: #000000; margin-bottom: 20px;">
          ${senderName}
        </div>
        
        <div style="font-size: 15px; line-height: 1.7; color: #374151; white-space: pre-line;">
          ${emailBody}
        </div>

        ${ctaButtonUrl ? `
          <div style="margin-top: 30px; text-align: center;">
            <a href="${ctaButtonUrl}" style="display: inline-block; background-color: #FACC15; color: #000000; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              ${ctaButtonText}
            </a>
          </div>
        ` : ''}

        <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center;">
          Recibiste este mensaje porque solicitaste acceso a los recursos gratuitos de ${senderName}.
        </div>
      </div>
    `;

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast_custom',
          customSubject: emailSubject,
          customHtml: formattedHtml,
          brevo_api_key: apiKey.trim(),
          email_remitente: senderEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastResult({
          success: true,
          message: data.message || `Campaña completada. Enviados con éxito: ${data.sentCount} de ${data.total}`,
        });
      } else {
        setBroadcastResult({
          success: false,
          message: `Ocurrió un problema: ${data.error || 'Revisa la conexión de Brevo'}`,
        });
      }
    } catch (err: any) {
      setBroadcastResult({
        success: false,
        message: `Error al procesar el envío: ${err.message}`,
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Quick preset templates
  const applyPreset = (preset: 'recordatorio' | 'nueva_clase' | 'comunidad') => {
    if (preset === 'recordatorio') {
      setEmailSubject('⚡ Recordatorio importante: Acceso a tus herramientas exclusivas');
      setEmailBody(
        'Hola {{nombre}},\n\nTe recordamos que tienes recursos, guiones y plantillas exclusivas disponibles en tu Bóveda.\n\nPuedes ingresar en cualquier momento para poner en práctica las herramientas gratuitas.\n\nSi deseas que implementemos estas automatizaciones contigo paso a paso en una sesión privada 1 a 1, escríbenos directamente a nuestro WhatsApp oficial.'
      );
      setCtaButtonText(config.cta_oferta_texto || '🔥 Hablar por WhatsApp');
    } else if (preset === 'nueva_clase') {
      setEmailSubject('🎁 ¡Nuevo recurso disponible en la Bóveda!');
      setEmailBody(
        'Hola {{nombre}},\n\nAcabamos de subir una nueva actualización a la Bóveda con nuevos prompts de alta conversión y material listo para implementar.\n\nAccede ahora para revisar el nuevo contenido antes de que expire el acceso libre.'
      );
      setCtaButtonText('🚀 Ver Nuevo Contenido');
    } else if (preset === 'comunidad') {
      setEmailSubject('💬 Únete a nuestra comunidad VIP de WhatsApp');
      setEmailBody(
        'Hola {{nombre}},\n\n¿Aún no estás en nuestro grupo oficial de WhatsApp?\n\nAhí compartimos atajos diarios de inteligencia artificial, respondemos preguntas en vivo y notificamos antes que nadie sobre nuevas plantillas gratuitas.'
      );
      setCtaButtonText('👉🏻 Entrar a la Comunidad VIP');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Brevo Status */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                Email Studio & Integrador Brevo
              </h2>
              {diagnosis?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado (300/día)
                </span>
              ) : apiKey ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  Clave guardada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                  Sin configurar
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Envía recordatorios masivos a tus prospectos y prueba tu conexión con Brevo en tiempo real.
            </p>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setSubTab('chat')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'chat'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            💬 Chat de Envíos Masivos
          </button>
          <button
            onClick={() => setSubTab('conexion')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'conexion'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ⚡ Configuración Brevo & Test
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CHAT & COMPOSITOR DINÁMICO DE ENVÍOS */}
      {/* ========================================================================= */}
      {subTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Email Composer (Chat Form) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Redactar Recordatorio / Campaña
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Usa la etiqueta <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono font-bold">&#123;&#123;nombre&#125;&#125;</code> para que el sistema ponga el nombre real de cada prospecto.
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Plantillas Rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('recordatorio')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  ⚡ Recordatorio Bóveda
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('nueva_clase')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  🎁 Nuevo Recurso
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('comunidad')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  💬 Comunidad VIP
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Asunto del Correo
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ej. ⚡ Recordatorio importante: Acceso a tu material"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Mensaje Principal
              </label>
              <textarea
                rows={6}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                placeholder="Escribe aquí el contenido del mensaje..."
              />
            </div>

            {/* CTA Button Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Texto del Botón CTA
                </label>
                <input
                  type="text"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                  placeholder="🔥 Hablar por WhatsApp"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Enlace del Botón
                </label>
                <input
                  type="text"
                  value={ctaButtonUrl}
                  onChange={(e) => setCtaButtonUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Broadcast Action Box */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Destinatarios listos en Supabase: <strong className="text-gray-900">{leads.length} prospectos</strong>
                </span>
              </div>

              <button
                type="button"
                disabled={isBroadcasting || leads.length === 0}
                onClick={handleBroadcastCampaign}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-black text-sm text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-[1.02] cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Enviando correos...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 Enviar a todos mis Leads ({leads.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Broadcast Results Notification */}
            {broadcastResult && (
              <div className={`p-4 rounded-xl text-xs font-medium border ${
                broadcastResult.success 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}>
                {broadcastResult.message}
              </div>
            )}

          </div>

          {/* Right Column: Live Email Preview (Mobile / Desktop) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>Vista Previa del Prospecto</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Remitente: {senderEmail || 'Auto-detectado de Brevo'}
              </span>
            </div>

            {/* Email Mockup Container */}
            <div className="bg-gray-100 p-4 sm:p-5 rounded-2xl border border-gray-200">
              <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
                
                {/* Header Badge */}
                <div className="bg-[#FDE047] text-black font-extrabold text-xs tracking-wider uppercase py-1.5 px-3 rounded-lg text-center">
                  {senderName}
                </div>

                {/* Subject Preview */}
                <div className="pb-3 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">Asunto</span>
                  <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                    {emailSubject.replace(/\{\{nombre\}\}/gi, leads[0]?.nombre || 'Ivan')}
                  </h4>
                </div>

                {/* Body Preview */}
                <div className="text-xs sm:text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                  {emailBody.replace(/\{\{nombre\}\}/gi, leads[0]?.nombre || 'Ivan')}
                </div>

                {/* CTA Button Preview */}
                {ctaButtonUrl && (
                  <div className="pt-2 text-center">
                    <div className="inline-block bg-[#FACC15] text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-xs">
                      {ctaButtonText}
                    </div>
                  </div>
                )}

                {/* Footer Preview */}
                <div className="pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
                  Recibiste este mensaje porque te registraste en {senderName}. Cero spam.
                </div>

              </div>
            </div>

            {/* Quick Test Box inside Composer */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>¿Quieres probar cómo te llega a ti?</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="tu-correo@gmail.com"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestEmail}
                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {isSendingTest ? 'Enviando...' : 'Probar'}
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 rounded-lg text-xs ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {testResult.message}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DIAGNÓSTICO BREVO & INTEGRACIÓN GUIADA */}
      {/* ========================================================================= */}
      {subTab === 'conexion' && (
        <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-gray-900">
              ⚡ Asistente de Integración Brevo (Sendinblue)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Brevo te ofrece <strong>300 correos al día gratis (9,000 correos al mes)</strong> sin pagar nada. Sigue estos 2 sencillos pasos para que funcione perfectamente.
            </p>
          </div>

          {/* Step 1: API Key */}
          <div className="p-5 bg-blue-50/40 rounded-xl border border-blue-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                Paso 1: Tu Clave API de Brevo
              </span>
              <a
                href="https://app.brevo.com/settings/keys/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Abrir Brevo API Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="xkeysib-..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-blue-300 text-sm text-gray-900 font-mono outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                En tu panel de Brevo, ve a <strong>SMTP y API &gt; Claves de API &gt; Generar nueva clave</strong> y pégala aquí. Debe comenzar con <code className="bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-800 font-mono">xkeysib-</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isDiagnosing}
                onClick={handleRunDiagnosis}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando con el servidor de Brevo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🔍 Verificar Conexión en Vivo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveCredentials}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer"
              >
                Guardar en Navegador
              </button>
            </div>
          </div>

          {/* Diagnostic Live Results Card */}
          {diagnosis && (
            <div className={`p-5 rounded-xl border ${
              diagnosis.connected 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-red-50/70 border-red-200'
            } space-y-3`}>
              <div className="flex items-center gap-2">
                {diagnosis.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <h4 className={`text-sm font-bold ${diagnosis.connected ? 'text-emerald-950' : 'text-red-950'}`}>
                  {diagnosis.connected 
                    ? '✅ ¡Conexión con Brevo Exitosa y Verificada!' 
                    : '❌ Error de Autenticación con Brevo'}
                </h4>
              </div>

              {diagnosis.connected ? (
                <div className="text-xs text-emerald-900 space-y-1.5 pl-7">
                  <p><strong>Titular de la Cuenta:</strong> {diagnosis.accountName} ({diagnosis.accountEmail})</p>
                  <p><strong>Plan de Brevo:</strong> {diagnosis.plan} (Límite: {diagnosis.credits} correos al día)</p>
                  
                  {diagnosis.senders && diagnosis.senders.length > 0 && (
                    <div className="pt-2">
                      <p className="font-bold mb-1">Remitentes autorizados encontrados:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnosis.senders.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSenderEmail(s.email);
                              onUpdateConfig({ email_remitente: s.email });
                              localStorage.setItem('brevo_sender_email', s.email);
                              alert(`Se seleccionó '${s.email}' como tu remitente oficial.`);
                            }}
                            className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-[11px] font-bold text-emerald-950 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{s.email}</span>
                            <span className="text-[10px] text-emerald-600 font-normal">(Usar este)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnosis.recommendation && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-medium">
                      ⚠️ {diagnosis.recommendation}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-red-800 space-y-3 pl-7">
                  <p className="font-semibold text-red-950">{diagnosis.error}</p>
                  
                  {diagnosis.error?.toLowerCase().includes('ip') || diagnosis.error?.toLowerCase().includes('authorised_ips') ? (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-950">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>🚨 Causa detectada: Restricción de IP activada en Brevo</span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-amber-900">
                        Tu aplicación está alojada en <strong>Vercel (servidores en la nube)</strong>, cuyas direcciones IP son dinámicas y cambian en cada ejecución. Brevo bloquea cualquier petición si tienes la opción de &quot;IPs autorizadas&quot; activada.
                      </p>
                      <div className="pt-2">
                        <a
                          href="https://app.brevo.com/security/authorised_ips"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-xs text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors"
                        >
                          <span>👉 Desactivar Restricción de IP en Brevo</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-[11px] text-amber-800 italic">
                        Instrucciones: En esa página de Brevo, simplemente <strong>desactiva el interruptor</strong> o elimina las IPs listadas para permitir envíos desde tu página web.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-red-700">
                      💡 <strong>Solución:</strong> Asegúrate de copiar la clave completa desde Brevo (debe empezar con <code className="font-mono">xkeysib-</code>) y no confundirla con la contraseña de tu cuenta.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Sender Email */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider block">
              Paso 2: Correo Remitente (From)
            </span>

            <div className="space-y-1.5">
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="tu-correo@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                🚨 <strong>Regla obligatoria de Brevo:</strong> Debe ser exactamente el correo con el que te registraste en Brevo (o un dominio que hayas verificado en su panel). Si dejas un correo no verificado, Brevo rechazará los envíos.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs text-black bg-[#FACC15] hover:bg-[#EAB308] shadow-xs cursor-pointer"
              >
                <span>Guardar Ajustes de Brevo</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
