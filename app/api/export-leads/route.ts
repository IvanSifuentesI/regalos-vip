import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/db';

export async function GET() {
  try {
    const leads = await getLeads();

    // CSV Header
    let csv = 'Nombre,Email,WhatsApp,País,Interés Principal,Fecha de Registro\n';

    leads.forEach((l) => {
      const nombre = `"${(l.nombre || '').replace(/"/g, '""')}"`;
      const email = `"${(l.email || '').replace(/"/g, '""')}"`;
      const telefono = `"${(l.telefono || '').replace(/"/g, '""')}"`;
      const pais = `"${(l.metadata?.pais || l.pais_codigo || '').replace(/"/g, '""')}"`;
      const interes = `"${(l.metadata?.interes || '').replace(/"/g, '""')}"`;
      const fecha = `"${new Date(l.created_at).toLocaleString('es-ES')}"`;

      csv += `${nombre},${email},${telefono},${pais},${interes},${fecha}\n`;
    });

    // Add UTF-8 BOM so Excel displays accents correctly
    const bom = '\uFEFF';
    const csvContent = bom + csv;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=leads-classroom-${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
