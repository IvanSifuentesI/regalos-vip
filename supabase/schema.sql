-- ==============================================================================
-- 🚀 SUPABASE SCHEMA DEFINITIVO — SOLO LEADS Y ADMINS
-- ==============================================================================
-- 1. ELIMINAR TABLAS INNECESARIAS (Todo el contenido/módulos se queda en la app)
-- ==============================================================================
DROP TABLE IF EXISTS public.recursos CASCADE;
DROP TABLE IF EXISTS public.modulos CASCADE;
DROP TABLE IF EXISTS public.configuracion CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;

-- 2. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 3. TABLA 1: LEADS (Prospectos capturados: Nombre, Email, Teléfono, Origen)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    pais_codigo TEXT DEFAULT '+52',
    ip_address TEXT,
    origen TEXT DEFAULT 'web_landing', -- 'web_landing', 'manychat_instagram', 'extension_chrome_whatsapp', 'import_csv'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telefono ON public.leads(telefono);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- ==============================================================================
-- 4. TABLA 2: ADMINS (Acceso al Modo Administrador)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Permitir guardar leads desde la web, ManyChat o extensiones
DROP POLICY IF EXISTS "Permitir insercion publica de leads" ON public.leads;
CREATE POLICY "Permitir insercion publica de leads"
    ON public.leads FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Permitir lectura de leads en el panel
DROP POLICY IF EXISTS "Permitir lectura de leads" ON public.leads;
CREATE POLICY "Permitir lectura de leads"
    ON public.leads FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Permitir verificar credenciales de admin
DROP POLICY IF EXISTS "Permitir verificar admins" ON public.admins;
CREATE POLICY "Permitir verificar admins"
    ON public.admins FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- ==============================================================================
-- 6. CREDENCIALES DE ADMIN INICIALES
-- (Puedes cambiar 'admin@tudominio.com' y 'admin123' por tus datos personales)
-- ==============================================================================
INSERT INTO public.admins (email, password)
VALUES ('admin@tudominio.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
