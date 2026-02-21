// ═══════════════════════════════════════
// AIdark — Device Fingerprint (anti-abuse)
// ═══════════════════════════════════════

const FP_KEY = 'aidark_fp';
const FP_MSGS_KEY = 'aidark_fp_msgs';
const FP_DATE_KEY = 'aidark_fp_date';

function generateFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('AIdark-FP', 2, 2);
  }
  const canvasData = canvas.toDataURL();
  const nav = [
    navigator.language,
    navigator.hardwareConcurrency,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.userAgent.slice(0, 50),
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
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(FP_DATE_KEY);
  if (savedDate !== today) {
    localStorage.setItem(FP_DATE_KEY, today);
    localStorage.setItem(FP_MSGS_KEY, '0');
    return 0;
  }
  return Number(localStorage.getItem(FP_MSGS_KEY) || '0');
}

export function incrementDeviceMessages(): void {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(FP_DATE_KEY);
  if (savedDate !== today) {
    localStorage.setItem(FP_DATE_KEY, today);
    localStorage.setItem(FP_MSGS_KEY, '1');
  } else {
    const current = Number(localStorage.getItem(FP_MSGS_KEY) || '0');
    localStorage.setItem(FP_MSGS_KEY, String(current + 1));
  }
}

// Blocked temp email domains
const TEMP_DOMAINS = [
  'tempmail', 'guerrillamail', 'throwaway', 'mailinator', 'yopmail',
  'trashmail', 'dispostable', 'fakeinbox', 'sharklasers', 'guerrillamailblock',
  'grr.la', 'getairmail', 'temp-mail', '10minutemail', 'mohmal',
  'maildrop', 'discard.email', 'getnada', 'mailnesia', 'tempr.email',
];

export function isTempEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return TEMP_DOMAINS.some((t) => domain.includes(t));
}

const BONUS_KEY = 'aidark_bonus_msgs';
const BONUS_GIVEN_KEY = 'aidark_bonus_given';
const BONUS_USED_KEY = 'aidark_bonus_used';

export function wasBonusGiven(): boolean {
  return localStorage.getItem(BONUS_GIVEN_KEY) === 'true';
}

export function giveBonusMessages(count: number): void {
  localStorage.setItem(BONUS_GIVEN_KEY, 'true');
  localStorage.setItem(BONUS_KEY, String(count));
  localStorage.setItem(BONUS_USED_KEY, '0');
}

export function getBonusMessagesUsed(): number {
  return Number(localStorage.getItem(BONUS_USED_KEY) || '0');
}

export function incrementBonusMessages(): void {
  const current = getBonusMessagesUsed();
  localStorage.setItem(BONUS_USED_KEY, String(current + 1));
}
