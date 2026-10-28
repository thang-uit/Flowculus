import { formatCompactMinutes } from '@flowculus/file-formats';

import type { Locale } from '@/lib/i18n';

/** `35.2 minutes` below two hours, `331.2h` / `6.5h` beyond, for KPI read-outs. */
export const formatCycleMinutes = (
  value: number | null | undefined,
  unit: string,
  emptyValue: string,
): string => {
  if (value == null || !Number.isFinite(value)) return emptyValue;
  return value < 120
    ? `${Number(value.toFixed(2))} ${unit}`
    : formatCompactMinutes(value);
};

/** Compact duration for KPI chips ("35.2m", "1.3h", "304.8h"). */
export const formatKpiMinutes = (
  value: number | null | undefined,
  emptyValue: string,
): string =>
  value == null || !Number.isFinite(value) ? emptyValue : formatCompactMinutes(value);

export const formatPercent = (
  value: number | null | undefined,
  digits = 1,
): string | null =>
  value == null || !Number.isFinite(value)
    ? null
    : `${Number((value * 100).toFixed(digits))}%`;

export const formatCost = (
  value: number | null | undefined,
  currency: string | undefined,
  locale: Locale,
): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const safeCurrency = currency?.trim().toUpperCase();
  if (!safeCurrency) return Number(value.toFixed(2)).toString();
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${safeCurrency} ${Number(value.toFixed(2))}`;
  }
};

/** Human duration from milliseconds: `45m`, `6.5h`, `3d 4h`. */
export const formatDurationMs = (milliseconds: number | null | undefined): string => {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return '–';
  const minutes = milliseconds / 60_000;
  if (minutes < 1) return `${Math.round(milliseconds / 1000)}s`;
  if (minutes < 60) return `${Number(minutes.toFixed(minutes < 10 ? 1 : 0))}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number(hours.toFixed(1))}h`;
  const days = Math.floor(hours / 24);
  const restHours = Math.round(hours - days * 24);
  return restHours > 0 && days < 10
    ? `${days}d ${restHours}h`
    : `${Number((hours / 24).toFixed(1))}d`;
};

export const formatInteger = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);

/** Model currency when every costed node agrees on one. */
export const getModelCurrency = (
  nodes: Iterable<{ cost?: { currency?: string } }>,
): string | undefined => {
  const currencies = new Set<string>();
  for (const node of nodes) {
    const currency = node.cost?.currency?.trim().toUpperCase();
    if (currency) currencies.add(currency);
  }
  return currencies.size === 1 ? [...currencies][0] : undefined;
};
