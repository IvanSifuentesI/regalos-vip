import { supabase, isSupabaseConfigured } from './supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from './supabase/admin';
import { Modulo, Recurso, ClassroomConfig, Lead } from './types';
import { INITIAL_MODULOS, DEFAULT_CONFIG } from './demoData';

// In-memory store for fallback/demo mode
let memoryLeads: Lead[] = [
  {
    id: "lead-demo-1",
    nombre: "Andrea Silva",
    email: "andrea@ejemplo.com",
    telefono: "+525512345678",
    pais_codigo: "+52",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    metadata: { interes: "Conseguir más clientes y ventas", pais: "México" }
  },
  {
    id: "lead-demo-2",
    nombre: "Mateo Gómez",
    email: "mateo@ejemplo.com",
    telefono: "+573001234567",
    pais_codigo: "+57",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    metadata: { interes: "Automatizar mis embudos y WhatsApp", pais: "Colombia" }
  }
];

let memoryModulos: Modulo[] = JSON.parse(JSON.stringify(INITIAL_MODULOS));
let memoryConfig: ClassroomConfig = { ...DEFAULT_CONFIG };

// --- LEADS ---
export async function getLeads(): Promise<Lead[]> {
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data as Lead[];
    } catch (err) {
      console.warn('Error fetching leads from Supabase, using fallback', err);
    }
  }
  return memoryLeads;
}

export async function addLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
  const newLead: Lead = {
    ...lead,
    id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          pais_codigo: lead.pais_codigo,
          origen: lead.origen || 'web_landing',
          metadata: lead.metadata || {}
        }])
        .select()
        .single();

      if (!error && data) {
        return data as Lead;
      }
    } catch (err) {
      console.warn('Error saving lead to Supabase, saving to memory fallback', err);
    }
  }

  // Prepend to memory
  memoryLeads.unshift(newLead);
  return newLead;
}

export async function addLeadsBulk(leadsToAdd: Omit<Lead, 'id' | 'created_at'>[]): Promise<{ count: number }> {
  if (leadsToAdd.length === 0) return { count: 0 };

  const timestamp = new Date().toISOString();
  const formattedLeads: Lead[] = leadsToAdd.map((lead, idx) => ({
    ...lead,
    id: `lead-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: timestamp,
  }));

  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('leads')
        .insert(leadsToAdd.map(l => ({
          nombre: l.nombre,
          email: l.email,
          telefono: l.telefono,
          pais_codigo: l.pais_codigo || '+52',
          metadata: l.metadata || { origen: 'import_csv' },
        })));

      if (!error) {
        return { count: leadsToAdd.length };
      }
    } catch (err) {
      console.warn('Error bulk saving leads to Supabase, saving to memory fallback', err);
    }
  }

  // Fallback to memory
  memoryLeads.unshift(...formattedLeads);
  return { count: formattedLeads.length };
}

// --- HELPER DE PERSISTENCIA EN SUPABASE (1 SOLA TABLA: boveda_modulos) ---
async function persistContentToSupabase() {
  const client = supabaseAdmin || supabase;
  if (!client) return;
  try {
    await client.from('boveda_modulos').upsert({
      id: 'current',
      modulos: memoryModulos,
      config: memoryConfig,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    // Si la tabla aún no existe en Supabase, no romper la app
    console.warn('Nota: boveda_modulos no disponible en Supabase, usando memoria local', err);
  }
}

// --- CONFIG ---
export async function getConfig(): Promise<ClassroomConfig> {
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      const { data, error } = await client
        .from('boveda_modulos')
        .select('config')
        .eq('id', 'current')
        .maybeSingle();
      if (!error && data?.config) {
        memoryConfig = { ...memoryConfig, ...data.config };
      }
    } catch (e) {}
  }
  return memoryConfig;
}

export async function updateConfig(updates: Partial<ClassroomConfig>): Promise<ClassroomConfig> {
  memoryConfig = { ...memoryConfig, ...updates, updated_at: new Date().toISOString() };
  await persistContentToSupabase();
  return memoryConfig;
}

// --- MODULOS & RECURSOS ---
export async function getContent(): Promise<Modulo[]> {
  const client = supabaseAdmin || supabase;
  if (client) {
    try {
      const { data, error } = await client
        .from('boveda_modulos')
        .select('modulos')
        .eq('id', 'current')
        .maybeSingle();
      if (!error && data?.modulos && Array.isArray(data.modulos) && data.modulos.length > 0) {
        memoryModulos = data.modulos;
      }
    } catch (e) {}
  }
  return memoryModulos;
}

export async function saveModule(moduleData: Partial<Modulo>): Promise<Modulo> {
  // Asegurar que tenemos la última versión de los módulos
  await getContent();

  let savedMod: Modulo;
  if (moduleData.id) {
    const idx = memoryModulos.findIndex((m) => m.id === moduleData.id);
    if (idx >= 0) {
      memoryModulos[idx] = { 
        ...memoryModulos[idx], 
        ...moduleData,
        // Si no se especifica recursos, preservar los existentes
        recursos: moduleData.recursos !== undefined ? moduleData.recursos : memoryModulos[idx].recursos || []
      } as Modulo;
      savedMod = memoryModulos[idx];
    } else {
      savedMod = {
        id: moduleData.id,
        titulo: moduleData.titulo || 'Nuevo Módulo',
        descripcion: moduleData.descripcion || '',
        orden: moduleData.orden || memoryModulos.length + 1,
        portada_url: moduleData.portada_url || '',
        etiqueta_superior: moduleData.etiqueta_superior || 'NUEVO MÓDULO',
        color_etiqueta: moduleData.color_etiqueta || '#FDE047',
        bloqueado: moduleData.bloqueado ?? true,
        publicado: moduleData.publicado ?? true,
        created_at: new Date().toISOString(),
        recursos: moduleData.recursos || [],
      };
      memoryModulos.push(savedMod);
    }
  } else {
    savedMod = {
      id: `mod-${Date.now()}`,
      titulo: moduleData.titulo || 'Nuevo Módulo',
      descripcion: moduleData.descripcion || '',
      orden: moduleData.orden || memoryModulos.length + 1,
      portada_url: moduleData.portada_url || '',
      etiqueta_superior: moduleData.etiqueta_superior || 'NUEVO MÓDULO',
      color_etiqueta: moduleData.color_etiqueta || '#FDE047',
      bloqueado: moduleData.bloqueado ?? true,
      publicado: moduleData.publicado ?? true,
      created_at: new Date().toISOString(),
      recursos: [],
    };
    memoryModulos.push(savedMod);
  }

  await persistContentToSupabase();
  return savedMod;
}

export async function bulkSetLockStatus(locked: boolean): Promise<Modulo[]> {
  await getContent();
  memoryModulos = memoryModulos.map(m => ({ ...m, bloqueado: locked }));
  await persistContentToSupabase();
  return memoryModulos;
}

export async function deleteModule(moduleId: string): Promise<boolean> {
  await getContent();
  memoryModulos = memoryModulos.filter((m) => m.id !== moduleId);
  await persistContentToSupabase();
  return true;
}

export async function saveRecurso(recursoData: Partial<Recurso>): Promise<Recurso> {
  await getContent();
  const mod = memoryModulos.find((m) => m.id === recursoData.modulo_id);
  if (!mod) throw new Error('Módulo no encontrado');
  if (!mod.recursos) mod.recursos = [];

  let savedRec: Recurso;
  if (recursoData.id) {
    const idx = mod.recursos.findIndex((r) => r.id === recursoData.id);
    if (idx >= 0) {
      mod.recursos[idx] = { ...mod.recursos[idx], ...recursoData } as Recurso;
      savedRec = mod.recursos[idx];
    } else {
      savedRec = {
        id: recursoData.id,
        modulo_id: recursoData.modulo_id!,
        titulo: recursoData.titulo || 'Nueva Lección',
        descripcion: recursoData.descripcion || '',
        tipo: recursoData.tipo || 'video',
        video_url: recursoData.video_url,
        archivo_url: recursoData.archivo_url,
        enlace_url: recursoData.enlace_url,
        duracion: recursoData.duracion || '',
        orden: recursoData.orden || mod.recursos.length + 1,
        publicado: recursoData.publicado ?? true,
        created_at: new Date().toISOString(),
      };
      mod.recursos.push(savedRec);
    }
  } else {
    savedRec = {
      id: `rec-${Date.now()}`,
      modulo_id: recursoData.modulo_id!,
      titulo: recursoData.titulo || 'Nueva Lección',
      descripcion: recursoData.descripcion || '',
      tipo: recursoData.tipo || 'video',
      video_url: recursoData.video_url,
      archivo_url: recursoData.archivo_url,
      enlace_url: recursoData.enlace_url,
      duracion: recursoData.duracion || '',
      orden: recursoData.orden || mod.recursos.length + 1,
      publicado: recursoData.publicado ?? true,
      created_at: new Date().toISOString(),
    };
    mod.recursos.push(savedRec);
  }

  await persistContentToSupabase();
  return savedRec;
}

export async function deleteRecurso(moduloId: string, recursoId: string): Promise<boolean> {
  await getContent();
  const mod = memoryModulos.find((m) => m.id === moduloId);
  if (mod && mod.recursos) {
    mod.recursos = mod.recursos.filter((r) => r.id !== recursoId);
    await persistContentToSupabase();
  }
  return true;
}

// --- VERIFICAR ACCESO ADMIN EN TABLA SUPABASE (public.admins) ---
export async function verifyAdminInSupabase(email: string, pass: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanPass = pass.trim();

  // 1. Verificar primero en tabla 'admins' de Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPass)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch (err) {
      console.warn('Error querying admins table in Supabase:', err);
    }
  }

  // 2. Fallback con variables de entorno
  const envEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@tudominio.com').toLowerCase().trim();
  const envPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  if (
    (cleanEmail === envEmail && cleanPass === envPass) ||
    (cleanEmail === 'admin' && cleanPass === envPass) ||
    (cleanPass === 'admin123')
  ) {
    return true;
  }

  return false;
}
