import type { AnalyticsProvenance } from '@hogwatch/core';
import styles from './DataProvenance.module.css';

const formatUpdatedAt = (updatedAt: string) => new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(updatedAt));

export function DataProvenance({ provenance }: { provenance: AnalyticsProvenance }) {
  const isFixture = provenance.source === 'mock';

  return (
    <aside className={styles.dataProvenance} aria-label="Data coverage">
      <div className={styles.lead}>
        <span className={styles.marker} aria-hidden="true" />
        <div>
          <span className="overline">DATA STATUS</span>
          <strong className={styles.title}>{isFixture ? 'Fixture data · not live results' : 'Provider data'}</strong>
        </div>
      </div>
      <p className={styles.coverage}>{provenance.coverage}</p>
      <div className={styles.meta}>
        <span>{provenance.provider}</span>
        <time dateTime={provenance.updatedAt}>As of {formatUpdatedAt(provenance.updatedAt)} UTC</time>
      </div>
      {provenance.sources?.length ? <div className={styles.sources} aria-label="Evidence sources">{provenance.sources.map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank">{source.title}</a>)}</div> : null}
    </aside>
  );
}
