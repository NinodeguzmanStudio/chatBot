import { getDeviceFingerprint } from '@/lib/fingerprint';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function normalizeProps(props: AnalyticsProps = {}): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
      continue;
    }
    normalized[key] = String(value);
  }
  return normalized;
}

export async function trackEvent(event: string, props: AnalyticsProps = {}): Promise<void> {
  if (typeof window === 'undefined') return;

  const normalized = {
    locale: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ...normalizeProps(props),
  };
  const payload = {
    event,
    path: window.location.pathname,
    deviceId: getDeviceFingerprint(),
    props: normalized,
  };

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, {
        page_path: payload.path,
        ...normalized,
      });
    }
  } catch {
    // Analytics never blocks the UI.
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    void fetch('/api/track', {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore network or auth failures.
  }
}

export function trackOnce(key: string, event: string, props: AnalyticsProps = {}): void {
  if (typeof window === 'undefined') return;
  const storageKey = `aidark_event_once_${key}`;
  if (sessionStorage.getItem(storageKey) === '1') return;
  sessionStorage.setItem(storageKey, '1');
  void trackEvent(event, props);
}

