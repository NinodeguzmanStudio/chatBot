// ═══════════════════════════════════════
// AIdark — Utilities
// ═══════════════════════════════════════

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return 'Ayer';
  return `Hace ${days}d`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
