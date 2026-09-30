import { NextResponse } from 'next/server';
import { addLead, getLeadsWithStatus, getConfig } from '@/lib/db';
import { sendWelcomeEmail, triggerWhatsAppWebhook } from '@/lib/email';

export async function GET() {
  try {
    const { leads, isSupabase, error } = await getLeadsWithStatus();
    return NextResponse.json({ success: true, leads, isSupabase, error });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if bulk import action
    if (body.action === 'bulk_import' && Array.isArray(body.leads)) {
      const { addLeadsBulk } = await import('@/lib/db');
      const validLeads = body.leads.filter((l: any) => l.nombre && l.email);
      const res = await addLeadsBulk(validLeads);
      return NextResponse.json({ success: true, count: res.count }, { status: 201 });
    }

    // Normalize fields from ManyChat, Webhook CRM, TikTok, Instagram or Web Form
    const nombre = (
      body.nombre || 
      body.name || 
      (body.first_name ? `${body.first_name} ${body.last_name || ''}`.trim() : null) || 
      body.username || 
      body.user_name || 
      'Lead sin nombre'
    ).trim();

    const email = (
      body.email || 
      body.correo || 
      body.user_email || 
      ''
    ).trim().toLowerCase();

    const telefono = (
      body.telefono || 
      body.phone || 
      body.whatsapp || 
      body.whatsapp_phone || 
      body.phone_number || 
      ''
    ).trim();

    const pais_codigo = body.pais_codigo || (telefono.startsWith('+') ? telefono.split(' ')[0] : '+52');
    const origen = body.origen || body.source || body.channel || (body.first_name ? 'manychat_instagram' : 'web_landing');

    if (!email && !telefono) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un correo o teléfono' },
        { status: 400 }
      );
    }

    const savedLead = await addLead({
      nombre,
      email: email || `${telefono.replace(/[^0-9]/g, '')}@lead-whatsapp.com`,
      telefono: telefono || 'Sin teléfono',
      pais_codigo,
      origen,
      metadata: {
        ...(body.metadata || {}),
        raw_source: origen,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      },
    });

    // Automatically trigger Welcome Email and WhatsApp Webhook
    try {
      const config = await getConfig();
      
      // 1. Send Welcome Email (AWAIT REQUIRED: Vercel serverless functions terminate if not awaited)
      const emailResult = await sendWelcomeEmail(savedLead, config);
      console.log(`[WELCOME EMAIL RESULT] To: ${savedLead.email} | Mode: ${emailResult.mode} | Success: ${emailResult.success}`);

      if (emailResult.success) {
        const { recordLeadSequenceStage } = await import('@/lib/db');
        await recordLeadSequenceStage(savedLead.id, 'bienvenida', {
          log_id: emailResult.id,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Trigger WhatsApp Webhook (if configured)
      if (config.whatsapp_webhook_url) {
        await triggerWhatsAppWebhook({ lead: savedLead, config });
      }
    } catch (e: any) {
      console.warn('Automation trigger error:', e.message);
    }

    return NextResponse.json({ success: true, lead: savedLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
