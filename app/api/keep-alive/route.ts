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
        return NextResponse.json({
          success: true,
          message: 'Supabase keep-alive ping exitoso. Base de datos activa.',
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
