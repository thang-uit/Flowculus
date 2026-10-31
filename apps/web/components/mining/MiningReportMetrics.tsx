import type { ReactNode } from 'react';
export interface MiningReportMetric {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: 'neutral' | 'attention' | 'positive' | 'danger';
}

export function MiningReportMetrics({
  items,
  label,
}: Readonly<{ items: MiningReportMetric[]; label: string }>) {
  return (
    <dl className="mining-report-metrics" aria-label={label}>
      {items.map((item) => (
        <div
          key={item.label}
          className="mining-report-metric"
          data-tone={item.tone ?? 'neutral'}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail ? (
            <dd className="mining-report-metric-detail">{item.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
