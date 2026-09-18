// ==============================================================================
// BÓVEDA LEADS & SUPABASE SYNC — EXTENSIÓN CHROME PARA WHATSAPP WEB
// ==============================================================================
// Inyecta controles en web.whatsapp.com para capturar nombres y teléfonos
// y enviarlos directamente a tu base de datos Supabase en tiempo real.
// ==============================================================================

console.log('[Bóveda Supabase Extension] Iniciada en WhatsApp Web');

// Esperar a que la interfaz de WhatsApp Web cargue por completo
const observer = new MutationObserver(() => {
  const mainHeader = document.querySelector('#main header');
  if (mainHeader && !document.getElementById('boveda-sync-btn')) {
    injectSyncButton(mainHeader);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function injectSyncButton(headerElement) {
  const container = document.createElement('div');
  container.id = 'boveda-sync-container';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.marginLeft = '12px';
  container.style.gap = '8px';

  const btn = document.createElement('button');
  btn.id = 'boveda-sync-btn';
  btn.innerText = '⚡ Guardar en Supabase';
  btn.title = 'Guardar este contacto en tu tabla leads de Supabase';
  btn.style.backgroundColor = '#FACC15';
  btn.style.color = '#000000';
  btn.style.fontWeight = 'bold';
  btn.style.fontSize = '12px';
  btn.style.padding = '6px 12px';
  btn.style.borderRadius = '8px';
  btn.style.border = 'none';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  btn.style.transition = 'all 0.2s ease';

  btn.onmouseover = () => { btn.style.backgroundColor = '#EAB308'; };
  btn.onmouseout = () => { btn.style.backgroundColor = '#FACC15'; };

  btn.onclick = async () => {
    btn.innerText = '⏳ Guardando...';
    btn.disabled = true;

    try {
      const contactData = extractActiveContact();
      if (!contactData.telefono && !contactData.nombre) {
        alert('No se pudo detectar el contacto del chat activo.');
        return;
      }

      await sendLeadToSupabase(contactData);
      showToast('✅ ¡Lead guardado exitosamente en Supabase!');
    } catch (err) {
      console.error('[Bóveda Sync Error]', err);
      showToast('❌ Error al guardar en Supabase: ' + err.message);
    } finally {
      btn.innerText = '⚡ Guardar en Supabase';
      btn.disabled = false;
    }
  };

  container.appendChild(btn);
  headerElement.appendChild(container);
}

// Extrae el nombre o número del encabezado del chat activo
function extractActiveContact() {
  const header = document.querySelector('#main header');
  if (!header) return { nombre: '', telefono: '' };

  // Intentar obtener el título del chat
  const titleEl = header.querySelector('span[title]');
  const rawTitle = titleEl ? titleEl.getAttribute('title') || titleEl.innerText : '';

  // Determinar si el título es un número de teléfono o un nombre
  const isPhoneNumber = /^[\+\d\s\-\(\)]{7,}$/.test(rawTitle.trim());

  let nombre = isPhoneNumber ? 'Contacto WhatsApp' : rawTitle.trim();
  let telefono = isPhoneNumber ? rawTitle.trim() : '';

  // Si no tenemos teléfono en el título, buscar en subtítulos de información
  if (!telefono) {
    const subtitleEl = header.querySelector('span[class*="_ao3e"], span[dir="auto"]');
    if (subtitleEl && /^[\+\d\s\-\(\)]{7,}$/.test(subtitleEl.innerText)) {
      telefono = subtitleEl.innerText.trim();
    }
  }

  return {
    nombre: nombre || 'Lead de WhatsApp',
    telefono: telefono || rawTitle || '+52 0000000000',
    origen: 'chrome_extension_whatsapp'
  };
}

// Envío a Supabase o al endpoint de Next.js
async function sendLeadToSupabase(data) {
  // Obtener URL de destino guardada en la extensión o usar endpoint por defecto
  const settings = await chrome.storage.local.get(['apiUrl', 'supabaseUrl', 'supabaseAnonKey']);
  const endpoint = settings.apiUrl || 'http://localhost:3000/api/leads';

  const payload = {
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.telefono ? `${data.telefono.replace(/[^0-9]/g, '')}@lead-whatsapp.com` : '',
    pais_codigo: data.telefono.startsWith('+') ? data.telefono.split(' ')[0] : '+52',
    origen: 'extension_chrome_whatsapp',
    metadata: {
      capturado_desde: 'WhatsApp Web',
      navegador: navigator.userAgent
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Fallo HTTP ' + response.status);
  }

  return await response.json();
}

// Toast de notificación en WhatsApp Web
function showToast(msg) {
  const toast = document.createElement('div');
  toast.innerText = msg;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#111827';
  toast.style.color = '#ffffff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = 'bold';
  toast.style.zIndex = '99999';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}
