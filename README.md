# Bóveda de Recursos — Lead Magnet estilo Skool Classroom

Plataforma de alta conversión diseñada con la estética y arquitectura de **Classroom de Skool**, creada específicamente para capturar leads calificados (**Nombre, Correo electrónico y WhatsApp internacional**) a cambio de recursos de alto valor percibido (Método LMT de **FÓRMULA 100K**), con base de datos en **Supabase**, panel de administración `/admin`, exportación de contactos en CSV y lista para desplegar en **Vercel**.

---

## 🌟 Características Principales

1. **Interfaz Idéntica a Skool Classroom**:
   - Cabecera limpia con banner, progreso de lecciones completadas y barra de avance.
   - Pestaña única **Classroom** (sin foro ni comunidad, 100% enfocada en entregar recursos).
   - Sidebar lateral con módulos, lecciones, duraciones y estados de completado.
   - Reproductor responsivo (YouTube, Vimeo, Loom) y tarjetas de descarga para Notion, Google Drive, plantillas de Excel, etc.

2. **Lead Magnet Gate (Desbloqueo de Alta Conversión)**:
   - "Efecto Vitrina": El visitante ve los recursos disponibles, generando deseo inmediato.
   - Modal de captura con los 5 bloques de CTA de FÓRMULA 100K:
     - Nombre completo
     - Correo electrónico
     - WhatsApp con selector internacional de banderas y prefijos (+52, +57, +34, +1, etc.)
     - Pregunta de segmentación / meta principal
   - Animación de celebración con confetti al desbloquear y persistencia en navegador (no vuelve a pedir datos en el mismo dispositivo).

3. **Panel de Administración (`/admin`)**:
   - **Gestión de Recursos**: Crea, edita, reordena y elimina módulos y lecciones en tiempo real (agrega videos, enlaces a Drive/Notion/Dropbox, descripciones).
   - **Gestión de Leads**:
     - Visualización en tabla con nombre, email, teléfono, país y fecha.
     - Botón directo de **"Abrir Chat WhatsApp"** (`wa.me`) con mensaje personalizado en 1 clic.
     - Botón **"Exportar a CSV"** listo para importar en ActiveCampaign, Brevo, Mailchimp o software de WhatsApp masivo.
   - **Configuración del Aula**: Personaliza el nombre del aula, subtítulo, banner, número de soporte y el llamado a la acción para vender tu producto o mentoría avanzada (High Ticket).

---

## 🚀 Inicio Rápido (Local)

1. Instalar dependencias (ya instaladas):
   ```bash
   npm install
   ```

2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

3. Acceder al Administrador:
   - URL: [http://localhost:3000/admin](http://localhost:3000/admin)
   - Correo por defecto: `admin@tudominio.com`
   - Contraseña por defecto: `admin123`

---

## 🗄️ Conexión con Supabase (En 3 Minutos)

El proyecto funciona inmediatamente con almacenamiento inteligente en memoria, pero para almacenar los leads y recursos en tu propia base de datos de Supabase:

1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto (gratuito).
2. Ve a la pestaña **SQL Editor** en el panel lateral de Supabase.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copia todo su contenido, pégalo en el editor SQL de Supabase y haz clic en **Run**.
   - Esto creará automáticamente las tablas: `leads`, `modulos`, `recursos` y `configuracion`, además de las políticas de seguridad (RLS) y los datos iniciales.
4. Ve a **Project Settings -> API** en Supabase y copia tus llaves:
   - `Project URL`
   - `anon public key`
   - `service_role secret key` (opcional para operaciones seguras de admin)
5. Crea un archivo `.env.local` en la raíz del proyecto (o edita el existente) con:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```

---

## 🌐 Despliegue en Vercel

1. Sube tu proyecto a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: skool classroom lead magnet"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```
2. Entra a [vercel.com](https://vercel.com) -> **Add New Project** -> Selecciona tu repositorio.
3. En **Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Haz clic en **Deploy**. ¡Listo! Tu página estará en vivo en `https://tu-proyecto.vercel.app`.
