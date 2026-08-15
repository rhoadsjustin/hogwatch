import type { Trend } from '@hogwatch/core';
import { MetricCard } from './MetricCard';

export type ScorecardItem = {
  label: string;
  score: number;
  grade?: string;
  detail?: string;
  trend?: Trend;
};

type ScorecardProps = {
  items: ScorecardItem[];
  label: string;
};

function getTone(score: number): 'good' | 'watch' | 'neutral' {
  if (score >= 80) return 'good';
  if (score < 75) return 'watch';
  return 'neutral';
}

function getTrend(trend?: Trend): Trend {
  return trend ?? 'flat';
}

/** Consistent scorecards for coach, unit, and future position-group grades. */
export function Scorecard({ items, label }: ScorecardProps) {
  return (
    <div aria-label={label} className="scorecard" role="list">
      {items.map((item) => (
        <div key={item.label} role="listitem">
          <MetricCard
            detail={item.detail ?? item.grade}
            label={item.label}
            tone={getTone(item.score)}
            trend={getTrend(item.trend)}
            value={item.score}
          />
        </div>
      ))}
    </div>
  );
}
