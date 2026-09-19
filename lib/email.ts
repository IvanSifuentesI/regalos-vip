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
export function extractSenderName(input?: string, fallback: string = 'REGALOS EXCLUSIVOS'): string {
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
 * Generador maestro de plantilla de email ultra-profesional (Anti-Spam, responsive con imagen banner)
 */
export function buildBrandedEmailHtml({
  badge = 'BÓVEDA VIP · ACCESO EXCLUSIVO',
  badgeColor = '#FDE047',
  badgeTextColor = '#000000',
  title,
  name,
  bodyContent,
  ctaText,
  ctaUrl,
  communityUrl = 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl',
  brandName = 'REGALOS EXCLUSIVOS',
  bannerUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
}: {
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  title: string;
  name: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  communityUrl?: string;
  brandName?: string;
  bannerUrl?: string;
}): string {
  const formattedBody = bodyContent
    .replace(/\{\{nombre\}\}/gi, name)
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #374151;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f4f5f7; padding: 25px 10px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
      
      <!-- HERO BANNER IMAGE -->
      <tr>
        <td style="padding: 0; background-color: #0f172a; text-align: center;">
          <img 
            src="${bannerUrl}" 
            alt="${brandName}" 
            width="600" 
            style="width: 100%; max-height: 220px; object-fit: cover; display: block; border-bottom: 3px solid #FACC15;" 
          />
        </td>
      </tr>

      <!-- TOP BADGE BAR -->
      <tr>
        <td style="padding: 18px 26px 0 26px;">
          <div style="display: inline-block; background-color: ${badgeColor}; color: ${badgeTextColor}; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; padding: 6px 14px; border-radius: 20px;">
            ${badge}
          </div>
        </td>
      </tr>

      <!-- CONTENT BODY -->
      <tr>
        <td style="padding: 16px 28px 28px 28px;">
          <h1 style="margin: 0 0 16px 0; font-size: 23px; font-weight: 900; color: #111827; letter-spacing: -0.5px; line-height: 1.3;">
            ${title}
          </h1>

          <div style="font-size: 15px; color: #374151; line-height: 1.7;">
            ${formattedBody}
          </div>

          <!-- PRIMARY CTA BUTTON -->
          ${ctaUrl && ctaText ? `
            <div style="text-align: center; margin: 32px 0 22px 0;">
              <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #FACC15; color: #000000; font-size: 15px; font-weight: 900; text-decoration: none; padding: 15px 36px; border-radius: 14px; box-shadow: 0 4px 14px rgba(250, 204, 21, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                ${ctaText}
              </a>
            </div>
          ` : ''}

          <!-- COMMUNITY WHATSAPP CALLOUT -->
          ${communityUrl ? `
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; margin-top: 24px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #065f46;">
                ¿Aún no estás en nuestro Grupo Oficial de WhatsApp?
              </p>
              <a href="${communityUrl}" target="_blank" style="color: #059669; font-size: 13px; font-weight: 800; text-decoration: underline;">
                👉 Haz clic aquí para unirte a la Comunidad (+2,400 miembros)
              </a>
            </div>
          ` : ''}
        </td>
      </tr>

      <!-- FOOTER ANTI-SPAM -->
      <tr>
        <td style="background-color: #f9fafb; padding: 22px; border-top: 1px solid #f3f4f6; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #1f2937;">
            ${brandName}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
            Recursos prácticos, prompts avanzados y automatizaciones con Inteligencia Artificial.
          </p>
          <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">
            Recibiste este correo porque te registraste en nuestra página oficial. Cero spam, solo herramientas de alto valor.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Email de Bienvenida Inmediato (apenas se inscribe el lead)
 */
export async function sendWelcomeEmail(lead: Lead, config?: ClassroomConfig) {
  const communityUrl = config?.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
  const classroomTitle = config?.nombre_classroom || 'REGALOS EXCLUSIVOS';

  const subject = `🎁 ¡Bienvenido ${lead.nombre}! Tu acceso a la ${classroomTitle} está listo`;
  const bodyContent = `¡Hola ${lead.nombre}! 🎉\n\nTe damos la bienvenida oficial a nuestra **Bóveda Exclusiva de Recursos**. Ya tienes desbloqueado el acceso completo a todas las plantillas, prompts de creación de imágenes IA y guiones prácticos.\n\nPuedes ingresar en cualquier momento para poner en práctica las herramientas gratuitas.\n\nPara aprovechar al máximo este material y resolver dudas en vivo, únete a nuestra comunidad oficial en el botón de abajo.`;

  const html = buildBrandedEmailHtml({
    badge: 'ACCESO CONFIRMADO · BÓVEDA VIP',
    title: `¡Bienvenido a ${classroomTitle}!`,
    name: lead.nombre,
    bodyContent,
    ctaText: '🚀 Entrar a la Bóveda de Recursos',
    ctaUrl: communityUrl,
    communityUrl,
    brandName: classroomTitle,
    bannerUrl: config?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  });

  return sendEmail({ to: lead.email, subject, html, type: 'bienvenida', config });
}

/**
 * 2. Notificación de Nuevo Módulo / Actualización de Contenido
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
  const classroomTitle = config?.nombre_classroom || 'Bóveda de Recursos';
  const subject = `🔥 Nuevo contenido agregado: "${moduleTitle}" en la ${classroomTitle}`;
  const bodyContent = `¡Hola ${lead.nombre}! 🚀\n\nAcabamos de subir nuevo material exclusivo a tu Bóveda:\n\n**${moduleTitle}**\n${moduleDesc || 'Nuevas herramientas y guiones prácticos listos para implementar.'}\n\nIngresa ahora mismo a tu cuenta para ponerlo en práctica.`;

  const html = buildBrandedEmailHtml({
    badge: '⚡ ACTUALIZACIÓN DE CONTENIDO',
    title: `Nuevo Contenido: ${moduleTitle}`,
    name: lead.nombre,
    bodyContent,
    ctaText: '👉 Ver Novedades en el Classroom',
    ctaUrl: config?.whatsapp_comunidad_url || '#',
    communityUrl: config?.whatsapp_comunidad_url,
    brandName: classroomTitle,
    bannerUrl: config?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  });

  return sendEmail({ to: lead.email, subject, html, type: 'actualizacion', config });
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
