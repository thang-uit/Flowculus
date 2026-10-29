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
  locale: Locale = 'en',
): string | null =>
  value == null || !Number.isFinite(value)
    ? null
    : new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'percent',
        maximumFractionDigits: digits,
      }).format(value);

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

/** Human duration from milliseconds, with locale-aware numbers and units. */
export const formatDurationMs = (
  milliseconds: number | null | undefined,
  locale: Locale = 'en',
): string => {
  if (milliseconds == null || !Number.isFinite(milliseconds) || milliseconds < 0)
    return '–';
  const number = (value: number, fractionDigits = 0) =>
    new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      maximumFractionDigits: fractionDigits,
    }).format(value);
  const unit =
    locale === 'vi'
      ? { second: ' giây', minute: ' phút', hour: ' giờ', day: ' ngày' }
      : { second: 's', minute: 'm', hour: 'h', day: 'd' };
  const minutes = milliseconds / 60_000;
  if (milliseconds < 59_500)
    return `${number(Math.round(milliseconds / 1000))}${unit.second}`;
  if (minutes < 59.5) return `${number(minutes, minutes < 10 ? 1 : 0)}${unit.minute}`;
  const hours = minutes / 60;
  if (hours < 23.95) return `${number(hours, 1)}${unit.hour}`;
  const roundedHours = Math.round(hours);
  const days = Math.floor(roundedHours / 24);
  const restHours = roundedHours % 24;
  return restHours > 0 && days < 10
    ? `${number(days)}${unit.day} ${number(restHours)}${unit.hour}`
    : `${number(hours / 24, 1)}${unit.day}`;
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
