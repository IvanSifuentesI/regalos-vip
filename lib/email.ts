import { Lead, ClassroomConfig } from './types';

// In-memory log of sent emails for local admin review
export interface SentEmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'bienvenida' | 'actualizacion' | 'calentamiento';
  status: 'enviado' | 'simulado' | 'fallido';
  timestamp: string;
}

export const emailHistoryLogs: SentEmailLog[] = [];

// Helper to extract clean email address from "Name <email@domain.com>" or "email@domain.com"
export function extractCleanEmail(input?: string): string {
  if (!input) return '';
  const match = input.match(/<([^>]+)>/);
  if (match && match[1]) return match[1].trim();
  return input.trim();
}

// Helper to extract sender name
export function extractSenderName(input?: string, fallback: string = 'Iván Sifuentes'): string {
  if (!input) return fallback;
  if (input.includes('<')) {
    const name = input.split('<')[0].trim();
    if (name) return name;
  }
  return fallback;
}

// Diagnose Brevo Account & Senders
export async function diagnoseBrevo(apiKey?: string, testSenderEmail?: string) {
  const key = apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    return {
      connected: false,
      error: 'No se ha configurado ninguna API Key de Brevo.',
      code: 'missing_key',
    };
  }

  try {
    const accountRes = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': key, 'Accept': 'application/json' },
    });
    const accountData = await accountRes.json().catch(() => ({}));

    if (!accountRes.ok) {
      return {
        connected: false,
        error: accountData.message || 'Clave API de Brevo inválida o sin permisos suficientes.',
        code: accountData.code || 'unauthorized',
      };
    }

    const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': key, 'Accept': 'application/json' },
    });
    const sendersData = await sendersRes.json().catch(() => ({ senders: [] }));
    const sendersList = Array.isArray(sendersData.senders) ? sendersData.senders : [];

    const accountEmail = accountData.email || '';
    const accountName = `${accountData.firstName || ''} ${accountData.lastName || ''}`.trim() || 'Usuario Brevo';
    const planInfo = Array.isArray(accountData.plan) && accountData.plan[0] ? accountData.plan[0].type : 'Free';
    const credits = Array.isArray(accountData.plan) && accountData.plan[0]?.credits !== undefined ? accountData.plan[0].credits : 300;

    const cleanSender = extractCleanEmail(testSenderEmail);
    const isSenderVerified = cleanSender
      ? sendersList.some((s: any) => s.email?.toLowerCase() === cleanSender.toLowerCase() && s.active !== false) || cleanSender.toLowerCase() === accountEmail.toLowerCase()
      : false;

    return {
      connected: true,
      accountEmail,
      accountName,
      plan: planInfo,
      credits,
      senders: sendersList.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        active: s.active !== false,
      })),
      testSenderEmail: cleanSender,
      isSenderVerified,
      recommendation: !isSenderVerified && cleanSender
        ? `El correo '${cleanSender}' no está verificado en tu cuenta de Brevo. Te recomendamos usar tu correo verificado '${accountEmail}'.`
        : null,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: `Error al contactar con el servidor de Brevo: ${err.message}`,
      code: 'network_error',
    };
  }
}

/**
 * Send an email via Brevo API (Free tier: 300 emails/day = 9,000/mo), Resend or n8n Webhook
 */
export async function sendEmail({
  to,
  subject,
  html,
  type = 'bienvenida',
  config,
}: {
  to: string;
  subject: string;
  html: string;
  type?: 'bienvenida' | 'actualizacion' | 'calentamiento';
  config?: ClassroomConfig;
}): Promise<{ success: boolean; id?: string; mode: string; error?: string }> {
  // 1. PRIORIDAD: Email Webhook (n8n con Gmail API: 500/día o 2,000/día con Google Workspace)
  const emailWebhookUrl = config?.email_webhook_url || process.env.EMAIL_WEBHOOK_URL;
  if (emailWebhookUrl) {
    try {
      const res = await fetch(emailWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: 'enviar_email',
          tipo: type,
          to,
          subject,
          html,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const logId = data.id || `n8n-${Date.now()}`;
        emailHistoryLogs.unshift({
          id: logId,
          to,
          subject,
          type,
          status: 'enviado',
          timestamp: new Date().toISOString(),
        });
        return { success: true, id: logId, mode: 'n8n_gmail_webhook' };
      }
    } catch (err: any) {
      console.warn('Error calling Email Webhook (n8n):', err.message);
    }
  }

  // 2. PRIORIDAD: Brevo API (Sendinblue: 300 emails/día = 9,000/mes GRATIS)
  const brevoKey = config?.brevo_api_key || process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const rawSender = config?.email_remitente || process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || '';
      let cleanSenderEmail = extractCleanEmail(rawSender);
      const senderName = extractSenderName(rawSender, config?.nombre_classroom || 'REGALOS EXCLUSIVOS');

      // Auto-fallback a la cuenta oficial de Brevo si el remitente no está configurado o es placeholder
      if (!cleanSenderEmail || cleanSenderEmail.includes('tudominio.com') || cleanSenderEmail.includes('resend.dev')) {
        const diag = await diagnoseBrevo(brevoKey);
        if (diag.connected && diag.accountEmail) {
          cleanSenderEmail = diag.accountEmail;
        }
      }

      // Generate clean plain text version to guarantee multi-part MIME deliverability
      const plainText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: cleanSenderEmail },
          to: [{ email: to.trim() }],
          subject,
          htmlContent: html,
          textContent: plainText,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const logId = data.messageId || `brevo-${Date.now()}`;
        emailHistoryLogs.unshift({
          id: logId,
          to,
          subject,
          type,
          status: 'enviado',
          timestamp: new Date().toISOString(),
        });
        return { success: true, id: logId, mode: 'brevo_live' };
      } else {
        const errorMsg = data.message || `Error en Brevo (${res.status})`;
        console.warn('Brevo API error:', data);
        emailHistoryLogs.unshift({
          id: `err-${Date.now()}`,
          to,
          subject,
          type,
          status: 'fallido',
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: errorMsg, mode: 'brevo_error' };
      }
    } catch (err: any) {
      console.warn('Error calling Brevo API:', err.message);
      return { success: false, error: err.message, mode: 'brevo_error' };
    }
  }

  // 3. PRIORIDAD: Resend API (3,000 emails/mes)
  const resendKey = config?.resend_api_key || process.env.RESEND_API_KEY;
  const from = config?.email_remitente || process.env.EMAIL_FROM || 'Bóveda de Recursos <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        emailHistoryLogs.unshift({
          id: data.id || `email-${Date.now()}`,
          to,
          subject,
          type,
          status: 'enviado',
          timestamp: new Date().toISOString(),
        });
        return { success: true, id: data.id, mode: 'resend_live' };
      } else {
        console.warn('Resend API error:', data);
        emailHistoryLogs.unshift({
          id: `err-${Date.now()}`,
          to,
          subject,
          type,
          status: 'fallido',
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: data.message || 'Error en Resend', mode: 'resend_error' };
      }
    } catch (err: any) {
      console.warn('Failed to call Resend API:', err);
    }
  }

  // 4. MODO SIMULADO LOCAL (Gratis para pruebas)
  const logId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  emailHistoryLogs.unshift({
    id: logId,
    to,
    subject,
    type,
    status: 'simulado',
    timestamp: new Date().toISOString(),
  });

  console.log(`[EMAIL AUTOMATION SIMULADO] To: ${to} | Asunto: ${subject}`);
  return { success: true, id: logId, mode: 'simulado_gratis' };
}

/**
 * Plantilla de Email Dark Mode Luxe (Estilo Divisual Project / macOS Window)
 * Diseñada para alta conversión y máxima estética visual en todos los clientes de correo.
 */
export function buildBrandedEmailHtml({
  title,
  name,
  bodyContent,
  ctaText,
  ctaUrl,
  communityUrl,
  brandName = 'Iván Sifuentes',
  badge = '• BÓVEDA IA — ACCESO EXCLUSIVO •',
  headline,
  subtitleUnderCta = 'Estás a tiempo de llevar tus proyectos al siguiente nivel.',
  recipientEmail,
}: {
  title?: string;
  name: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  communityUrl?: string;
  brandName?: string;
  bannerUrl?: string;
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  headline?: string;
  subtitleUnderCta?: string;
  recipientEmail?: string;
}): string {
  const displayHeadline = headline || title || 'Acceso Exclusivo a la Bóveda de IA';

  const formattedBody = bodyContent
    .replace(/\{\{nombre\}\}/gi, name)
    .split('\n\n')
    .map(p => {
      let htmlP = p
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 700;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color: #fbbf24; font-style: italic;">$1</em>')
        .replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">${htmlP}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || displayHeadline}</title>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #0b0b0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #cbd5e1;">
  
  <!-- CONTENEDOR PRINCIPAL TIPO VENTANA MACOS (Luxe Divisual Style) -->
  <div style="max-width: 580px; margin: 0 auto; background-color: #141418; border: 1px solid #2a2a35; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
    
    <!-- BARRA SUPERIOR MACOS (3 PUNTOS) -->
    <div style="background-color: #1a1a22; padding: 13px 18px; border-bottom: 1px solid #252530; text-align: left;">
      <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background-color: #ff5f56; margin-right: 7px; vertical-align: middle;"></span>
      <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background-color: #ffbd2e; margin-right: 7px; vertical-align: middle;"></span>
      <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background-color: #27c93f; vertical-align: middle;"></span>
    </div>

    <!-- CUERPO DE LA VENTANA -->
    <div style="padding: 38px 32px 34px 32px;">
      
      <!-- BADGE / PILL SUPERIOR -->
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #fbbf24; background-color: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.28); border-radius: 9999px;">
          ${badge}
        </span>
      </div>

      <!-- TITULAR EDITORIAL EN GEORGIA SERIF CON ACENTOS DORADOS -->
      <h1 style="margin: 0 0 16px 0; font-family: 'Georgia', serif; font-size: 24px; font-weight: 700; line-height: 1.35; color: #ffffff; text-align: center;">
        ${displayHeadline}
      </h1>

      <!-- LÍNEA DIVISORIA DORADA -->
      <div style="width: 44px; height: 2px; background-color: #c59b27; margin: 0 auto 28px auto; border-radius: 2px;"></div>

      <!-- CONTENIDO NARRATIVO Y CONVERSACIONAL -->
      <div style="font-size: 15px; line-height: 1.75; color: #cbd5e1;">
        ${formattedBody}
      </div>

      <!-- BOTÓN DORADO METÁLICO (LUXE CTA) -->
      ${ctaUrl && ctaText ? `
        <div style="text-align: center; margin: 34px 0 20px 0;">
          <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #c59b27; background: linear-gradient(135deg, #d4af37 0%, #c59b27 100%); color: #0a0a0c; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; text-decoration: none; padding: 15px 32px; border-radius: 10px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.35); text-transform: uppercase;">
            ${ctaText} &rarr;
          </a>
          ${subtitleUnderCta ? `
            <p style="margin: 12px 0 0 0; font-size: 13px; font-style: italic; color: #94a3b8; text-align: center;">
              Accede ahora. <span style="color: #fbbf24; font-weight: 600;">${subtitleUnderCta}</span>
            </p>
          ` : ''}
        </div>
      ` : ''}

      <!-- CANAL SECUNDARIO WHATSAPP -->
      ${communityUrl ? `
        <div style="margin: 28px 0 0 0; padding: 14px 18px; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            ¿Tienes alguna duda técnica? <a href="${communityUrl}" target="_blank" style="color: #34d399; font-weight: 700; text-decoration: underline;">Únete al grupo de WhatsApp</a> para resolverla en vivo.
          </p>
        </div>
      ` : ''}

      <!-- FIRMA PERSONAL EDITORIAL -->
      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #252530;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8; font-style: italic;">Te veo dentro.</p>
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">${brandName}</p>
        <p style="margin: 3px 0 6px 0; font-size: 13px; font-weight: 700; color: #fbbf24;">Bóveda de Inteligencia Artificial</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">
          🏆 Mentor de Automatizaciones & Flujos con IA &middot; Skool
        </p>
      </div>

    </div>
  </div>

  <!-- WATERMARK Y PIE DE PÁGINA EXTERIOR -->
  <div style="max-width: 580px; margin: 26px auto 0 auto; text-align: center; font-size: 11px; color: #475569; line-height: 1.6;">
    <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">Claude Code &times; Iván Sifuentes</p>
    <p style="margin: 0 0 6px 0;">&copy; 2026 Iván Sifuentes &middot; Bóveda de IA</p>
    ${recipientEmail ? `<p style="margin: 0 0 4px 0;">Enviado a <span style="color: #94a3b8;">${recipientEmail}</span></p>` : ''}
    <p style="margin: 0;"><a href="mailto:ivansifuentes340@gmail.com?subject=Baja" style="color: #64748b; text-decoration: underline;">Cancelar suscripción</a></p>
  </div>

</body>
</html>`;
}

/**
 * 1. Email de Bienvenida Inmediato (apenas se inscribe el lead)
 * Enfoque Divisual Dark Luxe + FÓRMULA 100K
 */
export async function sendWelcomeEmail(lead: Lead, config?: ClassroomConfig) {
  const skoolUrl = config?.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about';
  const communityUrl = config?.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
  const brandName = 'Iván Sifuentes';

  const subject = `Bienvenido a la Bóveda de IA.`;
  const headline = `Bienvenido a los recursos de IA de Iván Sifuentes.`;

  const bodyContent = `Hola ${lead.nombre}, te doy la bienvenida.

Ya tienes tu acceso desbloqueado a las herramientas gratuitas, la Fábrica de Imágenes y los Superprompts para crear personajes consistentes.

*Pruébalos hoy mismo. Te van a ahorrar días enteros de trabajo.*

Pero quiero ser completamente honesto contigo:

Las herramientas gratuitas son solo el primer paso. El verdadero salto ocurre cuando dejas de usar la IA como un simple juguete y comienzas a **automatizar sistemas completos que generan ingresos y escalan tu contenido**.

Por eso creé un espacio privado y avanzado:

Nuestra comunidad oficial en **Skool**.

Allí encuentras los flujos de trabajo premium, herramientas sin restricciones, acompañamiento directo y las estrategias exactas que no comparto en abierto.`;

  const html = buildBrandedEmailHtml({
    title: subject,
    headline,
    badge: '• BÓVEDA IA — ACCESO EXCLUSIVO •',
    name: lead.nombre,
    bodyContent,
    ctaText: 'VER LA COMUNIDAD EN SKOOL',
    ctaUrl: skoolUrl,
    subtitleUnderCta: 'Estás a tiempo de llevar tus proyectos al siguiente nivel.',
    communityUrl,
    brandName,
    recipientEmail: lead.email,
  });

  return sendEmail({ to: lead.email, subject, html, type: 'bienvenida', config });
}

/**
 * 2. Notificación Automática de Nuevo Módulo / Recurso (Estilo Luxe Divisual)
 */
export async function sendContentUpdateEmail({
  lead,
  moduleTitle,
  moduleDesc,
  config,
}: {
  lead: Lead;
  moduleTitle: string;
  moduleDesc?: string;
  config?: ClassroomConfig;
}) {
  const brandName = 'Iván Sifuentes';
  const skoolUrl = config?.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about';
  const subject = `Nuevo recurso disponible: ${moduleTitle}`;
  const headline = `Acabo de subir una nueva actualización a la Bóveda.`;

  const bodyContent = `Hola ${lead.nombre},

Te aviso rápido porque acabo de liberar un nuevo recurso en la Bóveda:

**${moduleTitle}**
*${moduleDesc || 'Nueva herramienta y prompts listos para implementar de inmediato.'}*

Ya puedes entrar a tu panel para probarlo y ver cómo aplicarlo en tus contenidos.

Recuerda que si quieres dominar las automatizaciones a fondo y tener acceso a nuestras sesiones en vivo y plantillas premium, te espero en la comunidad privada de Skool.`;

  const html = buildBrandedEmailHtml({
    title: subject,
    headline,
    badge: '• NUEVO RECURSO DISPONIBLE •',
    name: lead.nombre,
    bodyContent,
    ctaText: 'ACCEDER AL NUEVO RECURSO',
    ctaUrl: skoolUrl,
    subtitleUnderCta: 'Pruébalo antes de que pase desapercibido.',
    communityUrl: config?.whatsapp_comunidad_url,
    brandName,
    recipientEmail: lead.email,
  });

  return sendEmail({ to: lead.email, subject, html, type: 'actualizacion', config });
}

/**
 * 3. Email de Seguimiento Día 2: "¿Ya probaste la Fábrica de Imágenes IA?"
 */
export async function sendFollowUpDay2Email(lead: Lead, config?: ClassroomConfig) {
  const skoolUrl = config?.cta_oferta_url || 'https://www.skool.com/ia-automatiza-7412/about';
  const subject = `¿Ya probaste la Fábrica de Imágenes IA?`;
  const headline = `Una pregunta rápida sobre tus resultados con IA.`;

  const bodyContent = `Hola ${lead.nombre},

Hace un par de días te di acceso a la Fábrica de Imágenes y al Superprompt de personajes.

Quería preguntarte: *¿ya lograste generar tus primeras imágenes consistentes?*

Muchos creadores cometen el error de acumular herramientas y prompts sin probarlos en un proyecto real. Mi recomendación es que hoy mismo abras la lección 2, pegues el prompt y veas la magia en ChatGPT.

Y si ya lo probaste y estás listo para crear flujos automatizados que trabajen por ti en piloto automático:

En nuestra comunidad de **Skool** te muestro exactamente cómo conectar estas imágenes con clonación de voz, avatares y edición automática.`;

  const html = buildBrandedEmailHtml({
    title: subject,
    headline,
    badge: '• SEGUIMIENTO — CASO PRÁCTICO •',
    name: lead.nombre,
    bodyContent,
    ctaText: 'VER CASOS AVANZADOS EN SKOOL',
    ctaUrl: skoolUrl,
    subtitleUnderCta: 'Aprende los flujos completos que ahorran 20 horas a la semana.',
    communityUrl: config?.whatsapp_comunidad_url,
    brandName: 'Iván Sifuentes',
    recipientEmail: lead.email,
  });

  return sendEmail({ to: lead.email, subject, html, type: 'calentamiento', config });
}

/**
 * 3. Notificación a Webhook de WhatsApp (n8n, Make, Zapier, Evolution API o Extensiones)
 */
export async function triggerWhatsAppWebhook({
  lead,
  config,
  evento = 'lead_registrado',
}: {
  lead: Lead;
  config?: ClassroomConfig;
  evento?: string;
}) {
  const webhookUrl = config?.whatsapp_webhook_url;
  if (!webhookUrl) return { success: false, reason: 'No webhook URL configured' };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento,
        lead: {
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          pais_codigo: lead.pais_codigo,
          interes: lead.metadata?.interes,
          creado_en: lead.created_at,
        },
        comunidad_url: config?.whatsapp_comunidad_url,
        timestamp: new Date().toISOString(),
      }),
    });

    return { success: res.ok, status: res.status };
  } catch (err: any) {
    console.warn('Error triggering WhatsApp Webhook:', err.message);
    return { success: false, error: err.message };
  }
}
