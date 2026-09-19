import { NextResponse } from 'next/server';
import { getLeads, getConfig } from '@/lib/db';
import { sendContentUpdateEmail, sendEmail, emailHistoryLogs, diagnoseBrevo } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    success: true,
    logs: emailHistoryLogs,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, moduleTitle, moduleDesc, customSubject, customHtml } = body;
    const config = await getConfig();
    const leads = await getLeads();

    // 1. Diagnóstico en tiempo real de Brevo
    if (action === 'diagnose_brevo') {
      const apiKey = body.brevo_api_key || config.brevo_api_key;
      const senderEmail = body.email_remitente || config.email_remitente;
      const diagnosis = await diagnoseBrevo(apiKey, senderEmail);
      return NextResponse.json({ success: true, diagnosis });
    }

    // 2. Envío de correo de prueba en vivo
    if (action === 'test_send') {
      const to = body.to;
      if (!to) {
        return NextResponse.json({ success: false, error: 'Debes indicar el correo de destino' }, { status: 400 });
      }

      const effectiveConfig = {
        ...config,
        brevo_api_key: body.brevo_api_key || config.brevo_api_key,
        email_remitente: body.email_remitente || config.email_remitente,
      };

      const testSubject = body.subject || `✅ Correo de prueba: Conexión con Brevo confirmada`;
      const testHtml = body.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
          <div style="background-color: #10b981; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block; margin-bottom: 15px;">
            BREVO EN VIVO · PRUEBA EXITOSA
          </div>
          <h2 style="color: #111827; margin: 0 0 10px 0;">¡Tu sistema de correo está funcionando! 🎉</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Este mensaje confirma que tu API Key de Brevo está correctamente integrada con tu plataforma y lista para enviar correos a tus prospectos.
          </p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 10px; border: 1px solid #e5e7eb; margin: 20px 0; font-size: 13px; color: #374151;">
            <strong>Destinatario:</strong> ${to}<br/>
            <strong>Remitente utilizado:</strong> ${effectiveConfig.email_remitente || 'Auto-detectado de Brevo'}<br/>
            <strong>Capacidad:</strong> 300 emails por día gratis (9,000 al mes)
          </div>
          <p style="color: #10b981; font-weight: bold; font-size: 14px;">
            Ya puedes enviar tus recordatorios masivos con total seguridad.
          </p>
        </div>
      `;

      const result = await sendEmail({
        to,
        subject: testSubject,
        html: testHtml,
        type: 'calentamiento',
        config: effectiveConfig,
      });

      return NextResponse.json({
        success: result.success,
        mode: result.mode,
        id: result.id,
        error: result.error,
        to,
      });
    }

    // 3. Envío masivo de recordatorio / campaña personalizada
    if (action === 'broadcast_custom') {
      if (!customSubject || !customHtml) {
        return NextResponse.json({ success: false, error: 'Asunto y contenido requeridos' }, { status: 400 });
      }

      const effectiveConfig = {
        ...config,
        brevo_api_key: body.brevo_api_key || config.brevo_api_key,
        email_remitente: body.email_remitente || config.email_remitente,
      };

      const results: Array<{ email: string; nombre: string; success: boolean; error?: string; mode?: string }> = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const lead of leads) {
        try {
          const personalizedHtml = customHtml.replace(/\{\{nombre\}\}/gi, lead.nombre || 'Amigo');
          const personalizedSubject = customSubject.replace(/\{\{nombre\}\}/gi, lead.nombre || 'Amigo');

          const res = await sendEmail({
            to: lead.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            type: 'calentamiento',
            config: effectiveConfig,
          });

          if (res.success && res.mode !== 'brevo_error') {
            sentCount++;
            results.push({ email: lead.email, nombre: lead.nombre, success: true, mode: res.mode });
          } else {
            failedCount++;
            results.push({ email: lead.email, nombre: lead.nombre, success: false, error: res.error || 'Rechazado por Brevo', mode: res.mode });
          }
        } catch (e: any) {
          failedCount++;
          results.push({ email: lead.email, nombre: lead.nombre, success: false, error: e.message });
        }
      }

      return NextResponse.json({
        success: sentCount > 0 || leads.length === 0,
        sentCount,
        failedCount,
        total: leads.length,
        results,
        message: `Campaña enviada a ${sentCount} prospectos (${failedCount} errores)`,
      });
    }

    // 4. Notificar actualización de módulo
    if (action === 'notify_module_update') {
      if (!moduleTitle) {
        return NextResponse.json({ success: false, error: 'Título del módulo requerido' }, { status: 400 });
      }

      let sentCount = 0;
      for (const lead of leads) {
        try {
          await sendContentUpdateEmail({
            lead,
            moduleTitle,
            moduleDesc,
            config,
          });
          sentCount++;
        } catch (e) {
          console.warn('Error sending to lead', lead.email, e);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Notificación enviada a ${sentCount} prospectos`,
        totalLeads: leads.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
