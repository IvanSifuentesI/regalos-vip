export interface Lead {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  pais_codigo: string;
  ip_address?: string;
  origen?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export type RecursoTipo = 'video' | 'descargable' | 'enlace' | 'texto';

export interface Recurso {
  id: string;
  modulo_id: string;
  titulo: string;
  descripcion?: string;
  tipo: RecursoTipo;
  video_url?: string;
  archivo_url?: string;
  enlace_url?: string;
  duracion?: string;
  orden: number;
  publicado: boolean;
  created_at: string;
}

export interface Modulo {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  portada_url?: string;
  publicado: boolean;
  etiqueta_superior?: string; // Ej: "EMPIEZA AQUI", "MONETIZA TUS REDES SOCIALES"
  color_etiqueta?: string;   // Default: "#FDE047"
  bloqueado?: boolean;       // True = Requiere registro para acceder, False = Libre
  created_at: string;
  recursos?: Recurso[];
}

export interface ClassroomConfig {
  id: number;
  nombre_classroom: string;
  subtitulo: string;
  banner_url?: string;
  whatsapp_soporte?: string;
  whatsapp_comunidad_url?: string;
  whatsapp_comunidad_texto?: string;
  anuncio_superior_texto?: string;
  cta_oferta_texto: string;
  cta_oferta_url: string;
  resend_api_key?: string;
  brevo_api_key?: string;
  email_webhook_url?: string;
  email_remitente?: string;
  auto_email_bienvenida?: boolean;
  auto_email_actualizaciones?: boolean;
  whatsapp_webhook_url?: string;
  has_vercel_brevo_key?: boolean;
  has_vercel_sender_email?: boolean;
  updated_at?: string;
}
