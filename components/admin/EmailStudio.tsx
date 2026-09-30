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
  UserCheck,
  Copy,
  Cloud
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
  const [subTab, setSubTab] = useState<'flujo' | 'chat' | 'conexion'>('flujo');
  
  // API credentials state
  const [apiKey, setApiKey] = useState(config.brevo_api_key || '');
  const [senderEmail, setSenderEmail] = useState(config.email_remitente || 'ivansifuentes340@gmail.com');
  const [senderName, setSenderName] = useState('Iván Sifuentes');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  
  // Diagnosis state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  
  // Live test send state
  const [testEmailTo, setTestEmailTo] = useState(leads[0]?.email || 'juan98yup@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Composer state (FÓRMULA 100K Conversational Style)
  const [emailSubject, setEmailSubject] = useState('bienvenido a los recursos de IA de Iván Sifuentes');
  const [emailBody, setEmailBody] = useState(
    'Hola {{nombre}}, te saluda Iván Sifuentes.\n\nTe doy la bienvenida a mi Bóveda de Recursos de IA.\n\nYa tienes disponible tu acceso completo a las herramientas gratuitas, la Fábrica de Imágenes y los Superprompts para crear tus personajes consistentes sin complicaciones.\n\nDisfruta este contenido y ponlo en práctica desde hoy para ahorrar horas de trabajo y crear contenido de alto impacto.\n\nAhora, si tu objetivo es ir un paso más allá y buscas dominar herramientas avanzadas de IA, automatizaciones profesionales y los flujos exactos que utilizo para generar ingresos y escalar contenido, preparé un espacio exclusivo para ti:\n\nNuestra comunidad privada en Skool.\n\nAllí no solo descargas plantillas: tienes acompañamiento directo, actualizaciones constantes y el sistema paso a paso para monetizar tus habilidades con inteligencia artificial.'
  );
  const [ctaButtonText, setCtaButtonText] = useState('Entrar a la Comunidad Premium en Skool');
  const [ctaButtonUrl, setCtaButtonUrl] = useState(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
  
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(id);
    setTimeout(() => setCopiedVar(null), 2500);
  };

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

  // Check if API key is available either from state or Vercel
  const isKeyAvailable = Boolean(apiKey.trim() || config.has_vercel_brevo_key || config.brevo_api_key);

  // Run live Brevo diagnosis
  const handleRunDiagnosis = async () => {
    if (!isKeyAvailable) {
      alert('Por favor introduce tu API Key de Brevo o configúrala en Vercel.');
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
          brevo_api_key: apiKey.trim() || undefined,
          email_remitente: senderEmail.trim() || undefined,
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
    if (!isKeyAvailable) {
      alert('Configura primero tu API Key de Brevo en Vercel o en el panel.');
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
          customSubject: emailSubject,
          bodyContent: emailBody,
          ctaText: ctaButtonText,
          ctaUrl: ctaButtonUrl,
          brevo_api_key: apiKey.trim() || undefined,
          email_remitente: senderEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.mode !== 'brevo_error') {
        setTestResult({
          success: true,
          message: `✅ ¡Correo de prueba enviado a ${testEmailTo}! Revisa tu bandeja de entrada (ID: ${data.id || 'ok'}).`,
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
    if (!isKeyAvailable) {
      alert('Configura y verifica tu API Key de Brevo antes de enviar.');
      return;
    }

    if (!confirm(`¿Confirmas enviar este correo a los ${leads.length} prospectos registrados?`)) {
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: leads.length, logs: [] });
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast_custom',
          customSubject: emailSubject,
          bodyContent: emailBody,
          ctaText: ctaButtonText,
          ctaUrl: ctaButtonUrl,
          brevo_api_key: apiKey.trim() || undefined,
          email_remitente: senderEmail.trim() || undefined,
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

  // Quick preset templates (Iván Sifuentes Academy & Funnel)
  const applyPreset = (preset: 'bienvenida' | 'recordatorio' | 'software' | 'n8n' | 'oferta_venta' | 'nuevo_modulo', switchToComposer = false) => {
    if (preset === 'bienvenida') {
      setEmailSubject('No te falta disciplina. Te falta un sistema.');
      setEmailBody(
        'Hola {{nombre}}, te saluda Iván Sifuentes.\n\nTe doy la bienvenida a mi Bóveda de Recursos de IA. Ya tienes tu acceso desbloqueado para probar las primeras herramientas gratuitas.\n\nAhora, si llevas tiempo publicando en redes y sientes que no pasa nada, o llevas semanas sin publicar porque no sabes por dónde arrancar, déjame decirte algo directo:\n\n*No te falta disciplina. Te falta un sistema que trabaje por ti.*\n\nEn mi comunidad privada de **Skool** no te enseñamos teoría genérica. Te entregamos nuestros propios softwares, métodos y automatizaciones reales:\n\n✅ **Software para Windows:** Automatiza Meta.ai, Grok, Whisk e ImageFX en lote.\n✅ **Automatización de Veo3:** Crea videos masivos sin copiar ni pegar prompts.\n✅ **Flujos con N8N:** Genera guion, audio, imágenes y miniaturas 24/7 mientras duermes.\n✅ **Mi Laboratorio de Apps:** Herramientas exclusivas para ahorrarte horas de trabajo.\n✅ **Métodos de Monetización:** Guías probadas para monetizar TikTok en 7 días y nichos virales.\n\nSomos la **Comunidad #1 de creación de contenido y automatización de LATAM** (🏆 *Skool Games Winner con +487 casos de éxito*).\n\nAhora mismo puedes acceder a toda la academia por **solo $14/mes** (antes $10, y muy pronto sube a $19 definitivo).'
      );
      setCtaButtonText('UNIRME A LA COMUNIDAD POR $14');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    } else if (preset === 'recordatorio') {
      setEmailSubject('¿Pudiste probar el Superprompt de personajes?');
      setEmailBody(
        'Hola {{nombre}},\n\nAyer te di acceso a la Bóveda con la Fábrica de Imágenes y el Superprompt de personajes.\n\nQuería recordarte que el mayor error de muchos creadores es acumular herramientas y prompts sin probarlos en un proyecto real.\n\n*Solo te toma 2 minutos:*\n1. Abre ChatGPT o Gemini.\n2. Pega tu foto de referencia.\n3. Copia el Superprompt de la Lección 2 de la Bóveda.\n\nEn segundos vas a tener todas las tomas (frente, perfil, 3/4) con el mismo rostro listo para tus videos.\n\nY recuerda: si quieres dar el salto y aprender cómo automatizar la animación y edición de estos personajes para monetizarlos en automático, te espero en nuestra comunidad de Skool por solo $14/mes:'
      );
      setCtaButtonText('VER LA COMUNIDAD EN SKOOL');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    } else if (preset === 'software') {
      setEmailSubject('¿Ya probaste el software de automatización para Windows?');
      setEmailBody(
        'Hola {{nombre}},\n\nEl mayor error de los creadores es pasar 6 horas al día copiando prompts a mano de una pestaña a otra.\n\nPor eso en mi academia creamos **Software de Automatización para Windows**: un sistema que se conecta a Meta.ai, Grok, Whisk e ImageFX para generar imágenes y videos masivamente con un solo clic.\n\nAdemás tenemos la **Automatización de Veo3** para crear escenas desde guion sin tocar nada manual.\n\nSi estás listo para dejar de trabajar a mano y empezar a operar como un creador profesional con automatizaciones reales:\n\nTe veo dentro de nuestra comunidad en Skool. Recuerda que el acceso aún está a $14/mes antes de que suba a $19.'
      );
      setCtaButtonText('ACCEDER AL SOFTWARE EN SKOOL');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    } else if (preset === 'n8n') {
      setEmailSubject('Cómo generar guion, audio y miniaturas mientras duermes');
      setEmailBody(
        'Hola {{nombre}},\n\nLa verdadera libertad de un creador llega cuando el contenido se produce 24/7 en automático.\n\nEn la academia te enseño a dominar **N8N desde Cero a Intermedio** con scripts avanzados que crean:\n\n• Guion optimizado con SEO\n• Generación de audios por escenas\n• Miniaturas de alto impacto\n• Publicación en lotes\n\nIncluso tienes la opción de correr n8n directamente en mi servidor de alta potencia (64GB RAM, 12 CPU) para que no dependas de tu computadora.\n\nTodo esto está incluido en la membresía de Skool por solo $14/mes antes de que suba a $19:'
      );
      setCtaButtonText('VER FLUJOS DE N8N EN SKOOL');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    } else if (preset === 'oferta_venta') {
      setEmailSubject('🚨 Último aviso: Tu acceso con precio de $14 está por cerrar');
      setEmailBody(
        'Hola {{nombre}},\n\nHace una semana te uniste a mi Bóveda de Recursos de IA.\n\nQuiero avisarte con total transparencia:\n\nEl precio de acceso a nuestra academia de **Skool** era de $10. Ahora está en **$14/mes** y muy pronto subirá a **$19/mes** de forma definitiva debido a todo el nuevo software y flujos de automatización que estamos agregando semana a semana.\n\nSi te unes hoy:\n✅ Congelas tu precio en solo $14/mes para siempre.\n✅ Accedes de inmediato a todo el software para Windows, Veo3 y flujos N8N.\n✅ Entras al Laboratorio de Apps donde comparto mis soluciones a medida.\n✅ Obtienes soporte directo y sesiones en vivo conmigo.\n\nNo dejes pasar esta oportunidad antes de que el precio aumente:'
      );
      setCtaButtonText('CONGELAR MI PRECIO A $14/MES');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    } else if (preset === 'nuevo_modulo') {
      setEmailSubject('Nuevo recurso disponible en la Bóveda: [Nombre del Módulo]');
      setEmailBody(
        'Hola {{nombre}},\n\nTe aviso rápido porque acabo de liberar una nueva actualización en la Bóveda:\n\n**[NOMBRE DEL NUEVO RECURSO O APP]**\n*Nueva herramienta y automatizaciones listas para implementar de inmediato.*\n\nYa puedes entrar a tu panel para probarlo y ver cómo aplicarlo en tus contenidos.\n\nRecuerda que si quieres dominar las automatizaciones a fondo y tener nuestros softwares para Windows y acceso a sesiones en vivo, te espero en la comunidad privada de Skool:'
      );
      setCtaButtonText('ACCEDER AL NUEVO RECURSO');
      setCtaButtonUrl(config.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about');
    }

    if (switchToComposer) {
      setSubTab('chat');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
              {config.has_vercel_brevo_key ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Vercel Cloud Activo
                </span>
              ) : diagnosis?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado (300/día)
                </span>
              ) : apiKey ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  Clave local
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
            onClick={() => setSubTab('flujo')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'flujo'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ⚡ Flujo Visual & Secuencia
          </button>
          <button
            onClick={() => setSubTab('chat')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'chat'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📝 Redactor & Plantillas
          </button>
          <button
            onClick={() => setSubTab('conexion')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'conexion'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ⚙️ Conexión Vercel / Brevo
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 0: FLUJO VISUAL & AUTOMATIZACIÓN DE CORREOS (AUTOPILOT PIPELINE)    */}
      {/* ========================================================================= */}
      {subTab === 'flujo' && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-widest mb-2">
                <span>⚡ SECUENCIA AUTÓNOMA 24/7 (VERCEL CRON + BREVO)</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Flujo Automatizado de Nutrición y Ventas
              </h3>
              <p className="text-xs text-gray-300 max-w-2xl mt-1 leading-relaxed">
                Cada prospecto que se registra en la Bóveda ingresa a este embudo cronológico. No tienes que enviar correos a mano: el backend detecta el tiempo transcurrido y despacha cada fase automáticamente con el diseño de lujo.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Base de Datos</span>
                <span className="text-sm font-black text-white">{leads.length} Prospectos Listos</span>
              </div>
              <button
                onClick={() => applyPreset('bienvenida', true)}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Abrir Redactor</span>
                &rarr;
              </button>
            </div>
          </div>

          {/* Visual Timeline Cards */}
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-7 md:before:left-9 before:w-0.5 before:bg-gray-200 before:z-0">
            
            {/* Step 1: Minuto 0 */}
            <div className="relative z-10 bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                  1
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      ⏱️ Minuto 0 (Inmediato)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      👋 Bienvenida & Entrega
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Activo en /api/leads
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    No te falta disciplina. Te falta un sistema.
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Entrega de inmediato las herramientas gratuitas prometidas en la web + Abre la brecha hacia el sistema de automatización y la membresía de Skool por solo $14/mes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('bienvenida', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

            {/* Step 2: Día 1 */}
            <div className="relative z-10 bg-white p-5 rounded-2xl border border-blue-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                  2
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                      ⏱️ +24 Horas (Día 1)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      ⏰ Recordatorio & Implementación
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Activo en Vercel Cron
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    ¿Pudiste probar el Superprompt de personajes?
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Guía de 2 minutos para pegar el prompt en ChatGPT y no dejar que el prospecto se enfríe. Conecta la generación con la animación automatizada en Skool.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('recordatorio', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

            {/* Step 3: Día 2 */}
            <div className="relative z-10 bg-white p-5 rounded-2xl border border-amber-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
                  3
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                      ⏱️ +48 Horas (Día 2)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      ⚙️ Herramienta: Software Windows & Veo3
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Activo en Vercel Cron
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    ¿Ya probaste el software de automatización para Windows?
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Demostración práctica de cómo crear imágenes y videos en Meta.ai, Grok y Veo3 sin copiar prompts a mano. El gancho hacia el software de la Academia.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('software', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

            {/* Step 4: Día 4 */}
            <div className="relative z-10 bg-white p-5 rounded-2xl border border-purple-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/20">
                  4
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                      ⏱️ +96 Horas (Día 4)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      🚀 Flujos N8N 24/7 en Servidor
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Activo en Vercel Cron
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    Cómo generar guion, audio y miniaturas mientras duermes
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Explica el poder de correr N8N en servidor de alta potencia (64GB RAM) para crear contenido 24/7 sin tocar el ordenador.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('n8n', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

            {/* Step 5: Día 7 */}
            <div className="relative z-10 bg-white p-5 rounded-2xl border border-rose-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/20">
                  5
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                      ⏱️ +7 Días (Cierre)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      🔥 Oferta de Venta & Urgencia ($14)
                    </span>
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Activo en Vercel Cron
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    🚨 Último aviso: Tu acceso con precio de $14 está por cerrar
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Llamado final a la acción con urgencia real: el precio sube de $14 a $19 definitivo. Congela el precio para siempre.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('oferta_venta', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

            {/* Step 6: Dinámico al Publicar Módulo */}
            <div className="relative z-10 bg-slate-50 p-5 rounded-2xl border border-gray-300 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                  📢
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-800">
                      ⚡ Al Publicar en /admin
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-gray-700 border border-gray-200">
                      📢 Alerta de Nuevo Módulo o App
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      Activo en /api/content
                    </span>
                  </div>
                  <h4 className="text-base font-black text-gray-900">
                    Nuevo recurso disponible en la Bóveda: [Nombre del Módulo]
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Notifica en automático a toda tu base registrada cada vez que subes una nueva herramienta de tu laboratorio o un nuevo método.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => applyPreset('nuevo_modulo', true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver / Editar Plantilla</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

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

            {/* Quick Presets (Iván Sifuentes Academy Sequence) */}
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Plantillas de la Secuencia de Automatización:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('bienvenida')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  👋 1. Bienvenida (Min 0)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('recordatorio')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  ⏰ 2. Recordatorio (Día 1)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('software')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  ⚙️ 3. Software Windows (Día 2)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('n8n')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  🚀 4. Flujos N8N (Día 4)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('oferta_venta')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  🔥 5. Oferta Venta (Día 7)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('nuevo_modulo')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-colors"
                >
                  📢 6. Nuevo Recurso
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Asunto del Correo (Escríbelo en minúsculas y natural para evitar Spam)
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ej. tu acceso a los recursos de IA"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Mensaje Principal
              </label>
              <textarea
                rows={7}
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
                  Texto del Enlace / Botón
                </label>
                <input
                  type="text"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                  placeholder="Entrar a la Bóveda de Recursos"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Enlace de Destino
                </label>
                <input
                  type="text"
                  value={ctaButtonUrl}
                  onChange={(e) => setCtaButtonUrl(e.target.value)}
                  placeholder="https://..."
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
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Vista Previa (Formato Humano 1 a 1)</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Remitente: {senderEmail || 'Auto-detectado de Brevo'}
              </span>
            </div>

            {/* Email Mockup Container - Luxe Divisual macOS Window Format */}
            <div className="bg-[#09090c] p-3 sm:p-5 rounded-2xl border border-gray-800 shadow-2xl">
              <div className="bg-[#141418] rounded-xl border border-[#2a2a35] overflow-hidden shadow-2xl space-y-0 text-left">
                
                {/* macOS Window Titlebar with 3 dots */}
                <div className="bg-[#1a1a22] px-4 py-3 border-b border-[#252530] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-xs"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-xs"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-xs"></span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                    Bóveda IA &times; Skool
                  </span>
                </div>

                {/* macOS Window Content Area */}
                <div className="p-5 sm:p-6 space-y-4">
                  
                  {/* Badge */}
                  <div className="text-center pt-1">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest text-[#fbbf24] bg-amber-400/10 border border-amber-400/30 uppercase">
                      • BÓVEDA IA — ACCESO EXCLUSIVO •
                    </span>
                  </div>

                  {/* Headline in Serif Style */}
                  <div className="text-center">
                    <h4 className="font-serif text-base sm:text-lg font-bold text-white leading-snug">
                      {emailSubject.replace(/\{\{nombre\}\}/gi, leads[0]?.nombre || 'Iván')}
                    </h4>
                    <div className="w-10 h-0.5 bg-[#c59b27] mx-auto mt-2 rounded-full"></div>
                  </div>

                  {/* Body Preview (Luxe Narrative Style) */}
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                    {emailBody.replace(/\{\{nombre\}\}/gi, leads[0]?.nombre || 'Iván')}
                  </div>

                  {/* Luxe Gold CTA Button */}
                  {ctaButtonUrl && (
                    <div className="text-center pt-3 pb-1">
                      <div className="inline-block bg-gradient-to-r from-[#d4af37] to-[#c59b27] text-gray-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 uppercase tracking-wide cursor-pointer hover:brightness-110 transition-all">
                        {ctaButtonText} &rarr;
                      </div>
                      <p className="text-[11px] text-gray-400 italic mt-2">
                        Accede ahora. <span className="text-[#fbbf24] font-semibold">Estás a tiempo de no quedarte atrás.</span>
                      </p>
                    </div>
                  )}

                  {/* WhatsApp Secondary Note */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-center">
                    <p className="text-[11px] text-gray-400">
                      🎁 Si no quieres perderte ninguna herramienta gratis nueva, <span className="text-emerald-400 font-bold underline cursor-pointer">únete al WhatsApp oficial</span> (allí seguiré pasando recursos exclusivos y avisos importantes).
                    </p>
                  </div>

                  {/* Signature Preview */}
                  <div className="pt-4 border-t border-[#252530]">
                    <p className="text-[11px] text-gray-400 italic">Te veo dentro.</p>
                    <p className="text-sm font-bold text-white mt-1">{senderName}</p>
                    <p className="text-[11px] font-bold text-[#fbbf24]">Comunidad de Automatización & Monetización IA</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">🏆 Skool Games Winner en Dinero &middot; +487 Casos de Éxito LATAM</p>
                  </div>

                </div>

              </div>

              {/* Watermark Outer Footer */}
              <div className="text-center mt-3 text-[10px] text-gray-400 space-y-1">
                <p className="font-semibold text-gray-400">Claude Code &times; Iván Sifuentes</p>
                <p>&copy; 2026 Iván Sifuentes &middot; Bóveda de IA</p>
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
              ⚡ Asistente de Integración Brevo & Vercel
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Brevo te ofrece <strong>300 correos al día gratis (9,000 correos al mes)</strong> sin pagar nada. Guarda tu clave en Vercel para no tener que ingresarla manualmente a cada rato.
            </p>
          </div>

          {/* VERCEL CLOUD CARD */}
          <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Cloud className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-wide text-white">
                    Guardar Clave en Vercel (Recomendado)
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Al poner tu clave en Vercel, queda guardada en la nube y tus correos se enviarán siempre sin pedirte nada más.
                  </p>
                </div>
              </div>
              {config.has_vercel_brevo_key && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Activo en Vercel
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Variable 1: Clave API</span>
                  <code className="text-xs font-mono font-bold text-yellow-300">BREVO_API_KEY</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('BREVO_API_KEY', 'var1')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedVar === 'var1' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Variable 2: Remitente</span>
                  <code className="text-xs font-mono font-bold text-yellow-300">BREVO_SENDER_EMAIL</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('BREVO_SENDER_EMAIL', 'var2')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedVar === 'var2' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 text-xs text-slate-300 border-t border-white/10">
              <p className="text-[11px] leading-relaxed">
                Ve a tu proyecto en <strong className="text-white">Vercel &gt; Settings &gt; Environment Variables</strong>, pega estas dos variables y listo.
              </p>
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs transition-all whitespace-nowrap shadow-sm cursor-pointer"
              >
                <span>Ir al Panel de Vercel</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
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
                placeholder={config.has_vercel_brevo_key ? "(Configurado en Vercel - deja vacío o pon una nueva)" : "xkeysib-..."}
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

          {/* GUÍA 1: FOTO DE PERFIL EN GMAIL (AVATAR) */}
          <div className="p-5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                👤
              </div>
              <div>
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                  ¿Dónde se pone la Foto de Perfil que aparece al lado del correo?
                </h4>
                <p className="text-[11px] text-purple-800">
                  Brevo no tiene un botón de foto porque el protocolo de correo no la incluye en el mensaje.
                </p>
              </div>
            </div>

            <p className="text-[12px] text-gray-700 leading-relaxed">
              Gmail y los celulares muestran la foto del remitente consultando servicios de identidad global. Para que aparezca tu foto real en lugar de un círculo vacío:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-1">
                <span className="font-bold text-purple-900 block">Opción 1: Gravatar (Recomendado y Gratis)</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Entra a <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-bold">gravatar.com</a>, crea tu cuenta con el correo de tu remitente y sube tu foto. En minutos Gmail la mostrará.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-1">
                <span className="font-bold text-purple-900 block">Opción 2: Perfil de Google</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Si tu correo remitente es una cuenta de Google Workspace o Gmail, ve a <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-bold">myaccount.google.com</a> y sube tu foto en tu perfil.
                </p>
              </div>
            </div>
          </div>

          {/* GUÍA 2: POR QUÉ SALE EL OCTÁGONO GRIS Y CÓMO EVITAR SPAM */}
          <div className="p-5 bg-amber-50/70 rounded-xl border border-amber-300 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                !
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  ¿Por qué salió el octágono gris con &quot;!&quot; y el correo cayó en Spam?
                </h4>
                <p className="text-[11px] text-amber-800">
                  Google aplica reglas muy estrictas de seguridad (DMARC, SPF y DKIM).
                </p>
              </div>
            </div>

            <div className="text-[12px] text-amber-950 space-y-2 leading-relaxed">
              <p>
                <strong>1. Causa Técnica Principal (El Remitente):</strong> Si en Brevo colocas un correo <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-900 font-mono text-[11px]">@gmail.com</code>, Google detecta que el correo no salió de los servidores de Google, sino de Brevo. Por política de seguridad, Gmail le coloca el octágono de advertencia <code>!</code> y lo envía a Spam como posible suplantación.
              </p>
              <p>
                <strong>2. La Solución para Cero Spam:</strong> La forma profesional de enviar correos masivos es utilizando un <strong>correo con dominio propio</strong> (ej: <code>ivan@tudominio.com</code>) y activar los registros <strong>SPF y DKIM</strong> que Brevo te da en su sección <em>Remitentes e IP &gt; Dominios</em>.
              </p>
              <p>
                <strong>3. Estilo Humano FÓRMULA 100K (Ya Aplicado):</strong> Eliminamos el banner pesado de imagen y los badges corporativos. Ahora el mensaje se envía como una conversación limpia de 1 a 1, con texto plano alternativo (Multi-part MIME), lo que reduce drásticamente el puntaje de spam.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
