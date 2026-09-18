# ⚡ Bóveda Lead Magnet & WhatsApp Sync (Extensión Chrome)

Extensión de Chrome lista para usar e inspeccionar que inyecta un botón directo en **WhatsApp Web (`web.whatsapp.com`)** para capturar nombres y teléfonos de prospectos y enviarlos en tiempo real a tu base de datos de **Supabase**.

---

## 🚀 Cómo Instalar en Chrome (en 15 segundos)

1. Abre Google Chrome y escribe en la barra de direcciones:
   ```
   chrome://extensions/
   ```
2. Activa el interruptor **"Modo de desarrollador"** (Developer mode) en la esquina superior derecha.
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked) arriba a la izquierda.
4. Selecciona esta carpeta:
   ```
   C:\MIS APPS CREADAS\web-recursos-ivan\chrome-extension
   ```
5. ¡Listo! La extensión quedará instalada y visible en tu navegador.

---

## 📲 Cómo Usarla en WhatsApp Web

1. Entra a [web.whatsapp.com](https://web.whatsapp.com).
2. Haz clic en cualquier chat con un cliente o alumno.
3. Verás aparecer en la barra superior del chat el botón amarillo:
   **`⚡ Guardar en Supabase`**.
4. Haz clic en el botón:
   - Extrae el nombre y número del contacto activo.
   - Envía los datos por POST a tu API (`/api/leads`).
   - Se almacena de inmediato en la tabla `public.leads` de Supabase.
   - Muestra un toast de confirmación verde en pantalla.

---

## ⚙️ Configuración

Si tu web ya está desplegada en Vercel:
1. Haz clic en el icono de la extensión en la barra de Chrome.
2. En el campo **"URL de tu API de Leads"**, cambia `http://localhost:3000/api/leads` por tu URL de Vercel:
   ```
   https://tu-proyecto.vercel.app/api/leads
   ```
3. Pulsa **Guardar Configuración**.

---

## 👨‍💻 Código para Inspeccionar y Aprender
- **`manifest.json`**: Permisos de almacenamiento y coincidencia de URL (`https://web.whatsapp.com/*`).
- **`content.js`**: Cómo observar el DOM con `MutationObserver`, extraer selectores del chat activo e inyectar botones nativos con JavaScript puro.
- **`popup.html` & `popup.js`**: Interfaz de opciones persistente con `chrome.storage.local`.
