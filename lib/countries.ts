export interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "México", code: "MX", dial_code: "+52", flag: "🇲🇽" },
  { name: "Colombia", code: "CO", dial_code: "+57", flag: "🇨🇴" },
  { name: "España", code: "ES", dial_code: "+34", flag: "🇪🇸" },
  { name: "Argentina", code: "AR", dial_code: "+54", flag: "🇦🇷" },
  { name: "Perú", code: "PE", dial_code: "+51", flag: "🇵🇪" },
  { name: "Chile", code: "CL", dial_code: "+56", flag: "🇨🇱" },
  { name: "Ecuador", code: "EC", dial_code: "+593", flag: "🇪🇨" },
  { name: "Guatemala", code: "GT", dial_code: "+502", flag: "🇬🇹" },
  { name: "Estados Unidos", code: "US", dial_code: "+1", flag: "🇺🇸" },
  { name: "Costa Rica", code: "CR", dial_code: "+506", flag: "🇨🇷" },
  { name: "Panamá", code: "PA", dial_code: "+507", flag: "🇵🇦" },
  { name: "República Dominicana", code: "DO", dial_code: "+1809", flag: "🇩🇴" },
  { name: "Bolivia", code: "BO", dial_code: "+591", flag: "🇧🇴" },
  { name: "Paraguay", code: "PY", dial_code: "+595", flag: "🇵🇾" },
  { name: "Uruguay", code: "UY", dial_code: "+598", flag: "🇺🇾" },
  { name: "Honduras", code: "HN", dial_code: "+504", flag: "🇭🇳" },
  { name: "El Salvador", code: "SV", dial_code: "+503", flag: "🇸🇻" },
  { name: "Nicaragua", code: "NI", dial_code: "+505", flag: "🇳🇮" },
  { name: "Venezuela", code: "VE", dial_code: "+58", flag: "🇻🇪" },
];

export async function detectUserCountry(): Promise<Country> {
  // 1. Detección por IP en tiempo real (rápida con timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const code = data.country_code?.toUpperCase();
      const found = COUNTRIES.find(c => c.code === code);
      if (found) return found;
    }
  } catch (e) {
    // Si falla o hay bloqueo, pasa al fallback
  }

  // 2. Detección por Timezone del navegador
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Lima')) return COUNTRIES.find(c => c.code === 'PE') || COUNTRIES[0];
    if (tz.includes('Mexico') || tz.includes('Monterrey') || tz.includes('Cancun')) return COUNTRIES.find(c => c.code === 'MX') || COUNTRIES[0];
    if (tz.includes('Bogota')) return COUNTRIES.find(c => c.code === 'CO') || COUNTRIES[0];
    if (tz.includes('Madrid') || tz.includes('Canary')) return COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0];
    if (tz.includes('Buenos_Aires') || tz.includes('Cordoba') || tz.includes('Mendoza')) return COUNTRIES.find(c => c.code === 'AR') || COUNTRIES[0];
    if (tz.includes('Santiago')) return COUNTRIES.find(c => c.code === 'CL') || COUNTRIES[0];
    if (tz.includes('Guayaquil') || tz.includes('Galapagos')) return COUNTRIES.find(c => c.code === 'EC') || COUNTRIES[0];
    if (tz.includes('Caracas')) return COUNTRIES.find(c => c.code === 'VE') || COUNTRIES[0];
    if (tz.includes('La_Paz')) return COUNTRIES.find(c => c.code === 'BO') || COUNTRIES[0];
    if (tz.includes('Montevideo')) return COUNTRIES.find(c => c.code === 'UY') || COUNTRIES[0];
    if (tz.includes('Asuncion')) return COUNTRIES.find(c => c.code === 'PY') || COUNTRIES[0];
    if (tz.includes('Santo_Domingo')) return COUNTRIES.find(c => c.code === 'DO') || COUNTRIES[0];
    if (tz.includes('Panama')) return COUNTRIES.find(c => c.code === 'PA') || COUNTRIES[0];
    if (tz.includes('Costa_Rica')) return COUNTRIES.find(c => c.code === 'CR') || COUNTRIES[0];
    if (tz.includes('Guatemala')) return COUNTRIES.find(c => c.code === 'GT') || COUNTRIES[0];
  } catch (e) {}

  // 3. Detección por idioma del navegador (ej. es-PE, es-MX, es-CO)
  try {
    const lang = (typeof navigator !== 'undefined' ? navigator.language : '').toUpperCase();
    const parts = lang.split('-');
    if (parts.length > 1) {
      const code = parts[1];
      const found = COUNTRIES.find(c => c.code === code);
      if (found) return found;
    }
  } catch (e) {}

  return COUNTRIES[0]; // Default México (+52)
}
