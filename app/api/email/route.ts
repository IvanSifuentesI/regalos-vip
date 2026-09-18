import { NextResponse } from 'next/server';
import { getLeads, getConfig } from '@/lib/db';
import { sendContentUpdateEmail, sendEmail, emailHistoryLogs } from '@/lib/email';

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

    if (action === 'notify_module_update') {
      if (!moduleTitle) {
        return NextResponse.json({ success: false, error: 'Título del módulo requerido' }, { status: 400 });
      }

      // Broadcast update to all registered leads
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

    if (action === 'broadcast_custom') {
      if (!customSubject || !customHtml) {
        return NextResponse.json({ success: false, error: 'Asunto y contenido requeridos' }, { status: 400 });
      }

      let sentCount = 0;
      for (const lead of leads) {
        try {
          await sendEmail({
            to: lead.email,
            subject: customSubject,
            html: customHtml,
            type: 'calentamiento',
            config,
          });
          sentCount++;
        } catch (e) {
          console.warn('Error broadcasting to', lead.email, e);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Campaña enviada a ${sentCount} prospectos`,
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
