import { NextResponse } from 'next/server';
import { getLeads, getConfig } from '@/lib/db';
import { sendContentUpdateEmail, sendEmail, emailHistoryLogs, diagnoseBrevo, buildBrandedEmailHtml } from '@/lib/email';

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
    const { action, moduleTitle, moduleDesc, customSubject, customHtml, bodyContent, ctaText, ctaUrl, bannerUrl } = body;
    const config = await getConfig();
    const leads = await getLeads();

    // 1. Diagnóstico en tiempo real de Brevo
    if (action === 'diagnose_brevo') {
      const apiKey = body.brevo_api_key || config.brevo_api_key || process.env.BREVO_API_KEY;
      const senderEmail = body.email_remitente || config.email_remitente || process.env.BREVO_SENDER_EMAIL;
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
        brevo_api_key: body.brevo_api_key || config.brevo_api_key || process.env.BREVO_API_KEY,
        email_remitente: body.email_remitente || config.email_remitente || process.env.BREVO_SENDER_EMAIL,
      };

      const testSubject = customSubject || body.subject || `tu acceso a las herramientas de IA (prueba)`;
      const ctaBtnText = ctaText || 'Entrar a la Bóveda de Recursos';
      const ctaBtnUrl = ctaUrl || effectiveConfig.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
      const classroomTitle = effectiveConfig.nombre_classroom || 'Iván Sifuentes';

      const content = bodyContent || `Hola {{nombre}},\n\nTe escribo para confirmarte que tu sistema de envío con Brevo y Vercel está correctamente configurado.\n\nEste correo tiene un formato 100% limpio y conversacional, sin imágenes pesadas ni banners publicitarios, para que llegue directamente a la bandeja principal de tus prospectos sin caer en spam.\n\nTodo está listo para operar.`;

      const testHtml = buildBrandedEmailHtml({
        title: testSubject,
        name: body.nombre || 'Iván',
        bodyContent: content,
        ctaText: ctaBtnText,
        ctaUrl: ctaBtnUrl,
        communityUrl: effectiveConfig.whatsapp_comunidad_url,
        brandName: classroomTitle,
      });

      const result = await sendEmail({
        to,
        subject: testSubject.replace(/\{\{nombre\}\}/gi, body.nombre || 'Iván'),
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
      if (!customSubject || (!customHtml && !bodyContent)) {
        return NextResponse.json({ success: false, error: 'Asunto y contenido requeridos' }, { status: 400 });
      }

      const effectiveConfig = {
        ...config,
        brevo_api_key: body.brevo_api_key || config.brevo_api_key || process.env.BREVO_API_KEY,
        email_remitente: body.email_remitente || config.email_remitente || process.env.BREVO_SENDER_EMAIL,
      };

      const ctaBtnText = ctaText || 'Acceder a las herramientas';
      const ctaBtnUrl = ctaUrl || effectiveConfig.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
      const classroomTitle = effectiveConfig.nombre_classroom || 'Iván Sifuentes';

      const results: Array<{ email: string; nombre: string; success: boolean; error?: string; mode?: string }> = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const lead of leads) {
        try {
          const recipientName = lead.nombre || 'Amigo';
          const personalizedSubject = customSubject.replace(/\{\{nombre\}\}/gi, recipientName);

          const personalizedHtml = bodyContent
            ? buildBrandedEmailHtml({
                title: personalizedSubject,
                name: recipientName,
                bodyContent: bodyContent,
                ctaText: ctaBtnText,
                ctaUrl: ctaBtnUrl,
                communityUrl: effectiveConfig.whatsapp_comunidad_url,
                brandName: classroomTitle,
              })
            : (customHtml || '').replace(/\{\{nombre\}\}/gi, recipientName);

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
