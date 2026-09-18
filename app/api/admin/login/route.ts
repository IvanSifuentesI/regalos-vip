import { NextResponse } from 'next/server';
import { verifyAdminInSupabase } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const isValid = await verifyAdminInSupabase(email, password);

    if (isValid) {
      return NextResponse.json({ success: true, message: 'Acceso autorizado' });
    } else {
      return NextResponse.json({ success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
