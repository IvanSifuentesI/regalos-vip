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

      const testSubject = customSubject || body.subject || `✅ Acceso VIP Confirmado: Conexión con Brevo Verificada`;
      const banner = bannerUrl || effectiveConfig.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
      const ctaBtnText = ctaText || '🚀 Ver Bóveda de Recursos';
      const ctaBtnUrl = ctaUrl || effectiveConfig.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
      const classroomTitle = effectiveConfig.nombre_classroom || 'REGALOS EXCLUSIVOS';

      const content = bodyContent || `¡Hola {{nombre}}! 🎉\n\nEste es un correo de prueba en vivo que confirma que tu API Key de Brevo está 100% activa y conectada a tu servidor en Vercel.\n\nA partir de este momento, todos tus mensajes, avisos de nuevas lecciones y recordatorios masivos se entregarán con este formato gráfico profesional, banner en alta resolución y botones dorados de alta conversión.\n\nTodo listo para maximizar tus resultados sin caer en la carpeta de spam.`;

      const testHtml = buildBrandedEmailHtml({
        badge: 'SISTEMA OFICIAL · PRUEBA EXITOSA',
        badgeColor: '#10B981',
        badgeTextColor: '#FFFFFF',
        title: '¡Tu integración de Brevo funciona al 100%! 🎉',
        name: body.nombre || 'Iván',
        bodyContent: content,
        ctaText: ctaBtnText,
        ctaUrl: ctaBtnUrl,
        communityUrl: effectiveConfig.whatsapp_comunidad_url,
        brandName: classroomTitle,
        bannerUrl: banner,
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

      const banner = bannerUrl || effectiveConfig.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
      const ctaBtnText = ctaText || '🚀 Acceder a las Herramientas';
      const ctaBtnUrl = ctaUrl || effectiveConfig.whatsapp_comunidad_url || 'https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl';
      const classroomTitle = effectiveConfig.nombre_classroom || 'REGALOS EXCLUSIVOS';

      const results: Array<{ email: string; nombre: string; success: boolean; error?: string; mode?: string }> = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const lead of leads) {
        try {
          const recipientName = lead.nombre || 'Amigo';
          const personalizedSubject = customSubject.replace(/\{\{nombre\}\}/gi, recipientName);

          const personalizedHtml = bodyContent
            ? buildBrandedEmailHtml({
                badge: body.badge || 'BÓVEDA VIP · RECORDATORIO OFICIAL',
                title: personalizedSubject,
                name: recipientName,
                bodyContent: bodyContent,
                ctaText: ctaBtnText,
                ctaUrl: ctaBtnUrl,
                communityUrl: effectiveConfig.whatsapp_comunidad_url,
                brandName: classroomTitle,
                bannerUrl: banner,
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
