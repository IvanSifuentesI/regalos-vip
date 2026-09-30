import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('id')
        .limit(1);

      if (!error) {
        // Ejecución automática de secuencia de seguimiento (Día 2: "¿Ya probaste la Fábrica?")
        let dripSent = 0;
        try {
          const { getLeads, getConfig } = await import('@/lib/db');
          const { sendFollowUpDay2Email } = await import('@/lib/email');
          const [leads, config] = await Promise.all([getLeads(), getConfig()]);
          const now = Date.now();

          for (const lead of leads) {
            if (!lead.email) continue;
            const createdAt = new Date(lead.created_at).getTime();
            const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);

            // Leads con más de 24 horas y menos de 72 horas que no hayan recibido el seguimiento
            if (hoursElapsed >= 24 && hoursElapsed <= 72 && !lead.metadata?.drip_day2_sent) {
              await sendFollowUpDay2Email(lead, config);
              dripSent++;

              await supabaseAdmin
                .from('leads')
                .update({
                  metadata: {
                    ...(lead.metadata || {}),
                    drip_day2_sent: true,
                    drip_day2_sent_at: new Date().toISOString(),
                  },
                })
                .eq('id', lead.id);
            }
          }
        } catch (dripErr: any) {
          console.warn('Drip process note:', dripErr.message);
        }

        return NextResponse.json({
          success: true,
          message: 'Supabase keep-alive ping exitoso y secuencia drip procesada.',
          dripFollowUpsSent: dripSent,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: false,
        message: 'Error al contactar Supabase',
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      message: 'Supabase Admin no configurado',
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
