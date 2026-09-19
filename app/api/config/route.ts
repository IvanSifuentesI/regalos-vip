import { NextResponse } from 'next/server';
import { getConfig, updateConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getConfig();
    const envBrevoKey = process.env.BREVO_API_KEY || '';
    const envSenderEmail = process.env.BREVO_SENDER_EMAIL || '';

    const mergedConfig = {
      ...config,
      brevo_api_key: config.brevo_api_key || envBrevoKey,
      email_remitente: config.email_remitente || envSenderEmail,
      has_vercel_brevo_key: !!envBrevoKey,
      has_vercel_sender_email: !!envSenderEmail,
    };

    return NextResponse.json(
      { success: true, config: mergedConfig },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await updateConfig(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
