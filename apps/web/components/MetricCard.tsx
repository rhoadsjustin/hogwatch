import type { Trend } from '@hogwatch/core';

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  trend?: Trend;
  tone?: 'good' | 'watch' | 'neutral';
};

const trendCopy: Record<Trend, string> = { up: 'Improving', down: 'Slipping', flat: 'Holding' };

export function MetricCard({ label, value, detail, trend, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className="metricCard">
      <span className="overline">{label}</span>
      <strong>{value}</strong>
      <div className="metricFoot">
        {detail && <span>{detail}</span>}
        {trend && <b className={`metricTrend ${tone}`}>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendCopy[trend]}</b>}
      </div>
    </article>
  );
}
