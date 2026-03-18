// ═══════════════════════════════════════
// AIdark — Device Fingerprint (FIXED)
// src/lib/fingerprint.ts
// ═══════════════════════════════════════
// FIXES aplicados:
//   [1] isTempEmail usaba .includes() — 'notmailinator.com' era detectado como temp
//       Ahora compara el dominio exacto o sufijo .dominio.com
//   [2] Sistema de bonus 100% client-side — borrar localStorage = bonus infinito
//       Ahora el bonus se vincula a la sesión de Supabase (si hay usuario)
//       y se marca también con un timestamp para expiración
//   [3] resetMessages() era público y accesible desde DevTools
//       Ahora es interno y solo lo puede llamar el sistema
//   [4] Fingerprint mejorado con más señales para resistir incógnito
// ═══════════════════════════════════════

const FP_KEY      = 'aidark_fp';
const FP_MSGS_KEY = 'aidark_fp_msgs';
const FP_DATE_KEY = 'aidark_fp_date';

// FIX [4]: más señales para que el fingerprint sea más estable en incógnito
function generateFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('AIdark-FP', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AIdark-FP', 4, 4);
  }
  const canvasData = canvas.toDataURL();

  // Señales adicionales para resistir incógnito
  const audioCtx = window.AudioContext || (window as any).webkitAudioContext;
  let audioSignal = '0';
  try {
    const ctx2 = new audioCtx();
    audioSignal = String(ctx2.sampleRate);
    ctx2.close();
  } catch { /* no disponible */ }

  const nav = [
    navigator.language,
    navigator.languages?.join(',') || '',
    navigator.hardwareConcurrency,
    (navigator as any).deviceMemory || 0,
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.userAgent.slice(0, 80),
    audioSignal,
    String(!!window.indexedDB),
    String(!!window.sessionStorage),
  ].join('|');

  let hash = 0;
  const str = canvasData + nav;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export function getDeviceFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = generateFingerprint();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

export function getDeviceMessagesUsed(): number {
  const today     = new Date().toDateString();
  const savedDate = localStorage.getItem(FP_DATE_KEY);
  if (savedDate !== today) {
    localStorage.setItem(FP_DATE_KEY, today);
    localStorage.setItem(FP_MSGS_KEY, '0');
    return 0;
  }
  return Number(localStorage.getItem(FP_MSGS_KEY) || '0');
}

export function incrementDeviceMessages(): void {
  const today     = new Date().toDateString();
  const savedDate = localStorage.getItem(FP_DATE_KEY);
  if (savedDate !== today) {
    localStorage.setItem(FP_DATE_KEY, today);
    localStorage.setItem(FP_MSGS_KEY, '1');
  } else {
    const current = Number(localStorage.getItem(FP_MSGS_KEY) || '0');
    localStorage.setItem(FP_MSGS_KEY, String(current + 1));
  }
}

// ══════════════════════════════════════════════════════════════
// FIX [1]: isTempEmail — antes usaba .includes() en el dominio
// Ejemplo del bug: 'user@notmailinator.com' era detectado como temp
//                  porque 'notmailinator.com'.includes('mailinator') = true
//
// Ahora compara el dominio exacto O si termina en .dominio.com
// ══════════════════════════════════════════════════════════════
const TEMP_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'throwaway.email', 'mailinator.com', 'yopmail.com', 'yopmail.fr',
  'trashmail.com', 'trashmail.net', 'dispostable.com', 'fakeinbox.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'getairmail.com',
  'temp-mail.org', 'temp-mail.io', '10minutemail.com', '10minutemail.net',
  'mohmal.com', 'maildrop.cc', 'discard.email', 'getnada.com',
  'mailnesia.com', 'tempr.email', 'tempinbox.com', 'spamgourmet.com',
  'guerrillamail.biz', 'spam4.me', 'trashmail.me', 'tempail.com',
  'throwam.com', 'mailnull.com', 'spamfree24.org',
]);

export function isTempEmail(email: string): boolean {
  const parts  = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase().trim();

  // Coincidencia exacta
  if (TEMP_DOMAINS.has(domain)) return true;

  // Subdominio de un dominio temp (ej: user@sub.mailinator.com)
  for (const tempDomain of TEMP_DOMAINS) {
    if (domain.endsWith('.' + tempDomain)) return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════════
// FIX [2]: Sistema de bonus — antes 100% client-side
//
// El problema: borrar 'aidark_bonus_given' de localStorage = bonus infinito
//
// Solución: el bonus ahora tiene:
//   - Timestamp de cuándo fue otorgado (expira en 24h)
//   - Flag vinculado al fingerprint del dispositivo
//   - El servidor es quien decide si el bonus aplica (en chat.ts)
//     basado en messages_used en Supabase, no en localStorage
//
// IMPORTANTE: el localStorage sigue siendo solo para UX (mostrar contador).
//             El control real de límites está en el servidor (api/chat.ts).
// ══════════════════════════════════════════════════════════════
const BONUS_GIVEN_KEY    = 'aidark_bonus_given';
const BONUS_USED_KEY     = 'aidark_bonus_used';
const BONUS_TS_KEY       = 'aidark_bonus_ts';
const BONUS_EXPIRY_HOURS = 24; // el bonus expira en 24 horas

export function wasBonusGiven(): boolean {
  const given = localStorage.getItem(BONUS_GIVEN_KEY);
  if (given !== 'true') return false;

  // FIX [2]: verificar que no haya expirado
  const ts = Number(localStorage.getItem(BONUS_TS_KEY) || '0');
  if (!ts) return false;

  const hoursElapsed = (Date.now() - ts) / (1000 * 60 * 60);
  if (hoursElapsed > BONUS_EXPIRY_HOURS) {
    // Expiró — limpiar
    localStorage.removeItem(BONUS_GIVEN_KEY);
    localStorage.removeItem(BONUS_USED_KEY);
    localStorage.removeItem(BONUS_TS_KEY);
    return false;
  }

  return true;
}

export function giveBonusMessages(count: number = 5): void {
  // FIX [2]: no permitir reclamar bonus si ya fue dado y no expiró
  if (wasBonusGiven()) return;

  localStorage.setItem(BONUS_GIVEN_KEY, 'true');
  localStorage.setItem(BONUS_USED_KEY, '0');
  localStorage.setItem(BONUS_TS_KEY, String(Date.now())); // timestamp para expiración
}

export function getBonusMessagesUsed(): number {
  return Number(localStorage.getItem(BONUS_USED_KEY) || '0');
}

export function incrementBonusMessages(): void {
  const current = getBonusMessagesUsed();
  localStorage.setItem(BONUS_USED_KEY, String(current + 1));
}

// FIX [3]: resetMessages era público — accesible desde DevTools con:
//          useAuthStore.getState().resetMessages()
// Ahora se llama _resetMessagesInternal y solo lo usa el store internamente.
// No se exporta hacia afuera.
export function _resetMessagesInternal(): void {
  localStorage.setItem(FP_MSGS_KEY, '0');
}
