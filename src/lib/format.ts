import { CURRENCY_SYMBOLS } from './constants';

export function safeNumberFormat(value: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat('fr-FR', options).format(value);
  } catch {
    return value.toFixed(options?.minimumFractionDigits ?? 2).replace('.', ',');
  }
}

export function safeDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', options);
  } catch {
    const d = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return d;
  }
}

export function safeDateTime(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const d = typeof date === 'string' ? date : date.toISOString();
    return d;
  }
}

export function formatEur(value: number): string {
  return `${safeNumberFormat(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function formatEurShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M €`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K €`;
  }
  return formatEur(value);
}

export function formatCurrency(value: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${safeNumberFormat(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
  return safeDate(dateStr, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return safeDateTime(dateStr);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}
