import type { Trend } from '@hogwatch/core';

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  trend?: Trend;
  tone?: 'good' | 'watch' | 'neutral';
};

/**
 * The arrow describes which way the number moved; the word describes whether
 * that was good football. They are not the same thing — pressure allowed
 * falling is a down arrow and an improvement.
 */
const toneCopy = { good: 'Improving', watch: 'Slipping', neutral: 'Holding' } as const;

export function MetricCard({ label, value, detail, trend, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className="metricCard">
      <span className="overline">{label}</span>
      <strong>{value}</strong>
      <div className="metricFoot">
        {detail && <span>{detail}</span>}
        {trend && <b className={`metricTrend ${tone}`}>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {toneCopy[tone]}</b>}
      </div>
    </article>
  );
}
