import { NextResponse } from 'next/server';
import { getContent, saveModule, deleteModule, saveRecurso, deleteRecurso } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const content = await getContent();
    return NextResponse.json(
      { success: true, modulos: content },
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
    const { action, moduleData, recursoData, moduleId, recursoId } = body;

    if (action === 'save_module') {
      const result = await saveModule(moduleData);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'delete_module') {
      await deleteModule(moduleId);
      return NextResponse.json({ success: true });
    }

    if (action === 'save_recurso') {
      const result = await saveRecurso(recursoData);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'delete_recurso') {
      await deleteRecurso(moduleId, recursoId);
      return NextResponse.json({ success: true });
    }

    if (action === 'bulk_lock') {
      const { bulkSetLockStatus } = await import('@/lib/db');
      const result = await bulkSetLockStatus(body.locked);
      return NextResponse.json({ success: true, modulos: result });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
