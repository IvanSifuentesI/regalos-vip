import { NextResponse } from 'next/server';
import { getLeads, getConfig, recordLeadSequenceStage, markAllLeadsWelcomeSent } from '@/lib/db';
import { sendSequenceEmailForStage } from '@/lib/email';
import { Lead } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEQUENCE_STAGES = [
  { id: 'bienvenida', minHours: 0, label: 'Minuto 0: Bienvenida & Bóveda' },
  { id: 'dia_1', minHours: 24, label: 'Día 1: Superprompt de personajes' },
  { id: 'dia_2', minHours: 48, label: 'Día 2: Software de automatización' },
  { id: 'dia_4', minHours: 96, label: 'Día 4: Flujos de N8N en la nube' },
  { id: 'dia_7', minHours: 168, label: 'Día 7: Oferta de venta Skool ($14)' },
] as const;

type SequenceStageId = typeof SEQUENCE_STAGES[number]['id'];

interface LeadAuditItem {
  id: string;
  email: string;
  nombre: string;
  created_at: string;
  horasDesdeRegistro: number;
  stages: Record<SequenceStageId, {
    status: 'enviado' | 'listo_para_enviar' | 'en_cola';
    fecha?: string;
    horasFaltantes?: number;
  }>;
}

// Genera el informe de auditoría detallado para cada prospecto
function auditLeadsSequence(leads: Lead[]) {
  const now = Date.now();
  const summary = {
    totalLeads: leads.length,
    etapas: {
      bienvenida: { completados: 0, listos: 0, enCola: 0 },
      dia_1: { completados: 0, listos: 0, enCola: 0 },
      dia_2: { completados: 0, listos: 0, enCola: 0 },
      dia_4: { completados: 0, listos: 0, enCola: 0 },
      dia_7: { completados: 0, listos: 0, enCola: 0 },
    },
    items: [] as LeadAuditItem[],
  };

  for (const lead of leads) {
    const regTime = new Date(lead.created_at).getTime() || now;
    const hoursElapsed = Math.max(0, (now - regTime) / (1000 * 60 * 60));
    const seqMeta = (lead.metadata?.sequence as Record<string, any>) || {};

    const stageResults: Record<string, any> = {};

    for (const stage of SEQUENCE_STAGES) {
      const isSent = Boolean(seqMeta[stage.id]?.enviado);
      if (isSent) {
        stageResults[stage.id] = {
          status: 'enviado',
          fecha: seqMeta[stage.id]?.fecha || lead.created_at,
        };
        summary.etapas[stage.id].completados++;
      } else if (hoursElapsed >= stage.minHours) {
        stageResults[stage.id] = {
          status: 'listo_para_enviar',
          horasFaltantes: 0,
        };
        summary.etapas[stage.id].listos++;
      } else {
        const remaining = Math.max(0.1, stage.minHours - hoursElapsed);
        stageResults[stage.id] = {
          status: 'en_cola',
          horasFaltantes: Math.round(remaining * 10) / 10,
        };
        summary.etapas[stage.id].enCola++;
      }
    }

    summary.items.push({
      id: lead.id,
      email: lead.email,
      nombre: lead.nombre,
      created_at: lead.created_at,
      horasDesdeRegistro: Math.round(hoursElapsed * 10) / 10,
      stages: stageResults as any,
    });
  }

  return summary;
}

// Ejecuta el motor autónomo: despacha los correos vencidos según tiempo
async function executeSequenceEngine(options?: { leadId?: string; stageId?: SequenceStageId; limit?: number }) {
  const leads = await getLeads();
  const config = await getConfig();
  const now = Date.now();
  const dispatched: Array<{ email: string; stage: string; success: boolean; mode?: string; error?: string }> = [];

  const targetLeads = options?.leadId
    ? leads.filter(l => l.id === options.leadId)
    : leads;

  for (const lead of targetLeads) {
    const regTime = new Date(lead.created_at).getTime() || now;
    const hoursElapsed = (now - regTime) / (1000 * 60 * 60);
    const seqMeta = (lead.metadata?.sequence as Record<string, any>) || {};

    // Si se especificó una etapa forzada
    if (options?.stageId) {
      try {
        const res = await sendSequenceEmailForStage(options.stageId, lead, config);
        if (res.success && res.mode !== 'brevo_error') {
          await recordLeadSequenceStage(lead.id, options.stageId, { log_id: res.id });
          dispatched.push({ email: lead.email, stage: options.stageId, success: true, mode: res.mode });
        } else {
          dispatched.push({ email: lead.email, stage: options.stageId, success: false, error: res.error });
        }
      } catch (err: any) {
        dispatched.push({ email: lead.email, stage: options.stageId, success: false, error: err.message });
      }
      continue;
    }

    // Evaluación cronológica: despachar solo la etapa pendiente más antigua para proteger reputación
    for (const stage of SEQUENCE_STAGES) {
      const isSent = Boolean(seqMeta[stage.id]?.enviado);
      if (!isSent && hoursElapsed >= stage.minHours) {
        try {
          const res = await sendSequenceEmailForStage(stage.id, lead, config);
          if (res.success && res.mode !== 'brevo_error') {
            await recordLeadSequenceStage(lead.id, stage.id, { log_id: res.id });
            dispatched.push({ email: lead.email, stage: stage.id, success: true, mode: res.mode });
          } else {
            dispatched.push({ email: lead.email, stage: stage.id, success: false, error: res.error });
          }
        } catch (err: any) {
          dispatched.push({ email: lead.email, stage: stage.id, success: false, error: err.message });
        }
        // Despachamos solo una etapa por lead por ciclo para no saturar su bandeja
        break;
      }
    }

    if (options?.limit && dispatched.length >= options.limit) {
      break;
    }
  }

  return {
    processedLeads: targetLeads.length,
    dispatchedCount: dispatched.length,
    dispatched,
    timestamp: new Date().toISOString(),
  };
}

// Endpoint GET: Invocado por Vercel Cron automáticamente cada 2-4 horas
export async function GET() {
  try {
    const result = await executeSequenceEngine({ limit: 50 });
    return NextResponse.json({
      success: true,
      message: `Ciclo de automatización completado. Enviados: ${result.dispatchedCount} de ${result.processedLeads} prospectos.`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Endpoint POST: Invocado desde el panel de administración
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get_audit';

    // 1. Obtener informe y checklist completo
    if (action === 'get_audit') {
      const leads = await getLeads();
      const audit = auditLeadsSequence(leads);
      return NextResponse.json({ success: true, audit });
    }

    // 2. Ejecutar ciclo completo ahora
    if (action === 'run_now') {
      const result = await executeSequenceEngine();
      const leads = await getLeads();
      const audit = auditLeadsSequence(leads);
      return NextResponse.json({
        success: true,
        message: `Ciclo completado: ${result.dispatchedCount} correos enviados.`,
        result,
        audit,
      });
    }

    // 3. Sincronizar / Marcar bienvenida como enviada a todos los prospectos actuales
    if (action === 'mark_welcome_sent_all') {
      const count = await markAllLeadsWelcomeSent();
      const leads = await getLeads();
      const audit = auditLeadsSequence(leads);
      return NextResponse.json({
        success: true,
        message: `Se sincronizó el checklist: ${count} prospectos marcados con correo de bienvenida completado.`,
        count,
        audit,
      });
    }

    // 4. Enviar etapa específica a un lead puntual
    if (action === 'send_lead_stage') {
      const { leadId, stageId } = body;
      if (!leadId || !stageId) {
        return NextResponse.json({ success: false, error: 'leadId y stageId son requeridos' }, { status: 400 });
      }
      const result = await executeSequenceEngine({ leadId, stageId });
      const leads = await getLeads();
      const audit = auditLeadsSequence(leads);
      return NextResponse.json({
        success: true,
        message: `Etapa '${stageId}' enviada correctamente al prospecto.`,
        result,
        audit,
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
