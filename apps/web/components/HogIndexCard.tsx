import type { HogIndex } from '@hogwatch/core';

type HogIndexCardProps = {
  index: HogIndex;
  delta: number;
  week: number;
};

const parts: Array<{ key: keyof Omit<HogIndex, 'total'>; label: string }> = [
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'coaching', label: 'Coaching' },
  { key: 'development', label: 'Development' },
];

export function HogIndexCard({ index, delta, week }: HogIndexCardProps) {
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta} this week`;

  return (
    <article className="hogCard">
      <div className="hogCardTop">
        <div>
          <span className="overline">HOG INDEX</span>
          <p>Opponent-adjusted weekly grade</p>
        </div>
        <span className={delta >= 0 ? 'trendBadge up' : 'trendBadge down'}>{deltaLabel}</span>
      </div>
      <div className="hogValueRow">
        <strong>{index.total}</strong>
        <div className="indexRule" aria-hidden="true"><i style={{ width: `${index.total}%` }} /></div>
        <span>WEEK {week}</span>
      </div>
      <div className="hogParts">
        {parts.map((part) => (
          <div key={part.key}>
            <span>{part.label}</span>
            <b>{index[part.key]}</b>
          </div>
        ))}
      </div>
    </article>
  );
}
