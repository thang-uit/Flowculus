'use client';
import { useMiningStore } from './mining-store';
import { usePreferencesStore } from './use-preferences-store';
import { formatDurationMs } from './format';
/** Working-time durations stay in hours, never days of 24 hours. */
export function useMiningDuration() {
  const basis = useMiningStore((s) => s.result?.discovery.timePolicy.basis);
  const locale = usePreferencesStore((s) => s.locale);
  return (ms: number) =>
    basis === 'working'
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(ms / 3600000)} h`
      : formatDurationMs(ms);
}
