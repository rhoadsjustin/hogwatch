import { METRIC_METADATA, MINIMUM_TREND_POINTS, metricChartDomain, metricPercentile, type MetricId } from '@hogwatch/core';

type MetricChartProps = {
  metricId: MetricId;
  values: number[];
  weeks?: number[];
  label?: string;
  suffix?: string;
  tone?: 'good' | 'watch' | 'cardinal';
};

const WIDTH = 320;
const HEIGHT = 78;
const PAD = 10;

const position = (value: number, min: number, max: number) => {
  const span = max - min || 1;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / span;
};

/**
 * One chart primitive for both a series and a two-game sample. Every metric is
 * drawn on its own fixed domain with the FBS average marked, so a small change
 * cannot be autoscaled into looking like a breakout. Below four observations
 * the series is plotted as points in context rather than as a trend line,
 * because a line between two dots asserts a direction the data cannot support.
 */
export function MetricChart({ metricId, values, weeks, label, suffix, tone = 'good' }: MetricChartProps) {
  const metadata = METRIC_METADATA[metricId];
  const domain = metricChartDomain(metricId);
  const unit = suffix ?? metadata.suffix ?? '';
  const title = label ?? metadata.label;
  const latest = values.at(-1);
  const first = values.at(0);
  const weekLabels = weeks ?? values.map((_, index) => index + 1);
  const enoughForLine = values.length >= MINIMUM_TREND_POINTS;
  const referenceY = HEIGHT - PAD - position(domain.reference, domain.min, domain.max) * (HEIGHT - PAD * 2);
  const pointAt = (value: number, index: number) => ({
    x: PAD + (index / Math.max(values.length - 1, 1)) * (WIDTH - PAD * 2),
    y: HEIGHT - PAD - position(value, domain.min, domain.max) * (HEIGHT - PAD * 2),
  });
  const points = values.map(pointAt);
  const delta = latest !== undefined && first !== undefined ? Math.round((latest - first) * 10) / 10 : 0;
  const improving = metadata.goodDirection === 'up' ? delta >= 0 : delta <= 0;

  return (
    <article className={`metricChart ${tone}`}>
      <div className="metricChartHead">
        <span className="overline">{title}</span>
        <b>{latest}{unit}</b>
      </div>
      <svg
        aria-label={`${title}: ${values.map((value, index) => `week ${weekLabels[index]} ${value}${unit}`).join(', ')}. FBS average ${domain.reference}${unit}. Axis fixed from ${domain.min} to ${domain.max}.`}
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <line className="metricChartReference" x1={PAD} x2={WIDTH - PAD} y1={referenceY} y2={referenceY} />
        {enoughForLine && <polyline className="metricChartLine" fill="none" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {points.map((point, index) => (
          <circle className={index === points.length - 1 ? 'metricChartDot latest' : 'metricChartDot'} cx={point.x} cy={point.y} key={`${point.x}-${index}`} r={index === points.length - 1 ? 4.5 : 3} />
        ))}
      </svg>
      <div className="metricChartAxis">
        <span>{domain.min}{unit}</span>
        <span className="metricChartRef">FBS avg {domain.reference}{unit}</span>
        <span>{domain.max}{unit}</span>
      </div>
      <div className="metricChartFoot">
        <span>{weekLabels.map((week) => `W${week}`).join(' · ')}</span>
        {latest !== undefined && (
          <b className={improving ? 'good' : 'watch'}>
            {delta > 0 ? '+' : ''}{delta}{unit} · {metricPercentile(metricId, latest)}th pct
          </b>
        )}
      </div>
      {!enoughForLine && (
        <p className="metricChartNote">
          {values.length} game{values.length === 1 ? '' : 's'} — plotted in place, not joined into a trend.
        </p>
      )}
    </article>
  );
}
