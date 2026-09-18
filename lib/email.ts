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

/**
 * Send an email via Resend API (Free tier: 3,000 emails/mo) or log fallback
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
      const senderEmail = config?.email_remitente || process.env.EMAIL_FROM || 'notificaciones@tudominio.com';
      const senderName = config?.nombre_classroom || 'REGALOS EXCLUSIVOS';

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
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
        console.warn('Brevo API error:', data);
      }
    } catch (err: any) {
      console.warn('Error calling Brevo API:', err.message);
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
 * 1. Email de Bienvenida Inmediato (apenas se inscribe el lead)
 */
export async function sendWelcomeEmail(lead: Lead, config?: ClassroomConfig) {
  const communityUrl = config?.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
  const classroomTitle = config?.nombre_classroom || 'REGALOS EXCLUSIVOS';

  const subject = `🎁 ¡Bienvenido ${lead.nombre}! Tu acceso a la ${classroomTitle} está listo`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <div style="background-color: #FDE047; padding: 12px 20px; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; text-align: center; color: #000000; margin-bottom: 20px;">
        ACCESO CONFIRMADO · ${classroomTitle}
      </div>

      <h2 style="font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 12px;">
        ¡Hola ${lead.nombre}! 🎉
      </h2>

      <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
        Te damos la bienvenida a nuestra <strong>Bóveda Exclusiva de Recursos</strong>. Ya tienes desbloqueado el acceso completo a todas las plantillas, guiones y lecciones prácticas.
      </p>

      <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #065f46;">📌 Paso 1: Únete a la Comunidad Oficial de WhatsApp</h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #374151;">
          Ahí resolvemos dudas en vivo, compartimos nuevas plantillas y hacemos networking entre miembros.
        </p>
        <a href="${communityUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 10px 20px; font-weight: bold; font-size: 14px; border-radius: 10px;">
          💬 Unirme al Grupo de WhatsApp
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
        Puedes ingresar a ver las lecciones y descargar los archivos en cualquier momento desde tu dispositivo.
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
        Recibiste este correo porque te registraste con tu número ${lead.telefono}. Cero spam, solo valor.
      </div>
    </div>
  `;

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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <div style="background-color: #10b981; padding: 10px 20px; border-radius: 12px; font-weight: bold; font-size: 13px; text-transform: uppercase; text-align: center; color: #ffffff; margin-bottom: 20px;">
        ⚡ ACTUALIZACIÓN DE CONTENIDO
      </div>

      <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px;">
        ${lead.nombre}, acabamos de subir nuevo material 🚀
      </h2>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 17px; color: #111827; font-weight: bold;">
          ${moduleTitle}
        </h3>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
          ${moduleDesc || 'Nuevas herramientas y guiones prácticos listos para implementar.'}
        </p>
      </div>

      <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
        Entra a tu cuenta para ver la lección y descargar los archivos adjuntos.
      </p>

      <div style="margin-top: 30px; text-align: center;">
        <a href="${config?.whatsapp_comunidad_url || '#'}" style="display: inline-block; background-color: #FACC15; color: #000000; text-decoration: none; padding: 12px 24px; font-weight: 800; font-size: 14px; border-radius: 12px;">
          👉 Ver Novedades en el Classroom
        </a>
      </div>
    </div>
  `;

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
