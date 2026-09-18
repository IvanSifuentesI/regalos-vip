import { NextResponse } from 'next/server';
import { addLead, getLeads, getConfig } from '@/lib/db';
import { sendWelcomeEmail, triggerWhatsAppWebhook } from '@/lib/email';

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
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

    // Automatically trigger Welcome Email and WhatsApp Webhook in the background
    try {
      const config = await getConfig();
      
      // 1. Send Welcome Email
      sendWelcomeEmail(savedLead, config).catch(err => 
        console.warn('Background welcome email error:', err)
      );

      // 2. Trigger WhatsApp Webhook (if configured)
      triggerWhatsAppWebhook({ lead: savedLead, config }).catch(err => 
        console.warn('Background whatsapp webhook error:', err)
      );
    } catch (e) {
      console.warn('Automation trigger error:', e);
    }

    return NextResponse.json({ success: true, lead: savedLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
