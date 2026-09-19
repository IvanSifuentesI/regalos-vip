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
 * Plantilla de Email 100% Humana, Anti-Spam & Conversacional (Estilo FÓRMULA 100K)
 * CERO banners pesados, CERO badges llamativos, CERO disparadores de spam.
 * Diseñada para caer directamente en la Bandeja Principal de Gmail / Outlook.
 */
export function buildBrandedEmailHtml({
  title,
  name,
  bodyContent,
  ctaText,
  ctaUrl,
  communityUrl,
  brandName = 'Iván Sifuentes',
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
}): string {
  const formattedBody = bodyContent
    .replace(/\{\{nombre\}\}/gi, name)
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #1f2937;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Mensaje de ' + brandName}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937;">
  <div style="max-width: 580px; margin: 0 auto;">
    
    <!-- CONTENIDO CONVERSACIONAL (Estilo Humano 1 a 1) -->
    <div style="font-size: 15px; line-height: 1.7; color: #1f2937;">
      ${formattedBody}
    </div>

    <!-- ENLACE / BOTÓN LIMPIO Y DISCRETO -->
    ${ctaUrl && ctaText ? `
      <div style="margin: 28px 0 20px 0;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          ${ctaText} &rarr;
        </a>
      </div>
    ` : ''}

    ${communityUrl && communityUrl !== ctaUrl ? `
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #4b5563;">
        P.D. También puedes unirte a nuestro <a href="${communityUrl}" target="_blank" style="color: #059669; font-weight: bold; text-decoration: underline;">grupo oficial de WhatsApp</a> si tienes dudas para resolverlas en vivo.
      </p>
    ` : ''}

    <!-- FIRMA PERSONAL HUMANA -->
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #111827;">${brandName}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Bóveda de Recursos & Automatizaciones IA</p>
    </div>

    <!-- PIE DE PÁGINA ANTI-SPAM LEGAL (Discreto) -->
    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">Recibes este mensaje porque te registraste en nuestra página para acceder a las herramientas y prompts de IA.</p>
      <p style="margin: 0;">Para darte de baja o dejar de recibir estos avisos, responde a este correo con la palabra "Baja".</p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * 1. Email de Bienvenida Inmediato (apenas se inscribe el lead)
 */
export async function sendWelcomeEmail(lead: Lead, config?: ClassroomConfig) {
  const communityUrl = config?.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
  const classroomTitle = config?.nombre_classroom || 'REGALOS EXCLUSIVOS';

  const subject = `tu acceso a los recursos de IA`;
  const bodyContent = `Hola ${lead.nombre},\n\nTe confirmo que ya tienes tu acceso listo a las herramientas y prompts de la Bóveda.\n\nPuedes entrar en cualquier momento para revisar los prompts de personajes y las plantillas que tenemos preparadas.\n\nTe dejo el enlace directo para que puedas empezar:\n\nSi tienes alguna pregunta mientras los pruebas, me puedes responder a este mismo correo o entrar al grupo de WhatsApp.`;

  const html = buildBrandedEmailHtml({
    title: `Tu acceso a la Bóveda`,
    name: lead.nombre,
    bodyContent,
    ctaText: 'Entrar a la Bóveda de Recursos',
    ctaUrl: communityUrl,
    communityUrl,
    brandName: classroomTitle,
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
  const classroomTitle = config?.nombre_classroom || 'REGALOS EXCLUSIVOS';
  const subject = `nuevo contenido: ${moduleTitle}`;
  const bodyContent = `Hola ${lead.nombre},\n\nTe aviso rápido que acabo de subir una nueva actualización a la Bóveda:\n\n**${moduleTitle}**\n${moduleDesc || 'Nuevas herramientas y prompts listos para implementar.'}\n\nPuedes revisarlo directamente en tu cuenta:`;

  const html = buildBrandedEmailHtml({
    title: moduleTitle,
    name: lead.nombre,
    bodyContent,
    ctaText: 'Ver contenido en la Bóveda',
    ctaUrl: config?.whatsapp_comunidad_url || '#',
    communityUrl: config?.whatsapp_comunidad_url,
    brandName: classroomTitle,
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
