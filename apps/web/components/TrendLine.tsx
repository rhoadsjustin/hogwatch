type TrendLineProps = {
  values: number[];
  label: string;
  suffix?: string;
  tone?: 'good' | 'watch' | 'cardinal';
};

export function TrendLine({ values, label, suffix = '', tone = 'good' }: TrendLineProps) {
  const width = 320;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - 8 - ((value - min) / spread) * (height - 20);
    return `${x},${y}`;
  }).join(' ');

  return (
    <article className={`trendLine ${tone}`}>
      <div className="trendLineMeta"><span className="overline">{label}</span><b>{values.at(-1)}{suffix}</b></div>
      <svg aria-label={`${label} over ${values.length} games`} role="img" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" points={points} vectorEffect="non-scaling-stroke" />
        {points.split(' ').map((point, index) => {
          const [cx, cy] = point.split(',');
          return <circle cx={cx} cy={cy} key={`${point}-${index}`} r={index === values.length - 1 ? 4 : 2.5} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="weekTicks">{values.map((_, index) => <span key={index}>W{index + 1}</span>)}</div>
    </article>
  );
}
