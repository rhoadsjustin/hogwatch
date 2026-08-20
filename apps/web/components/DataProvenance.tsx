import type { AnalyticsProvenance } from '@hogwatch/core';

const formatUpdated = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

/**
 * Says where the numbers on a surface came from. HogWatch mixes a live
 * schedule with fixture-backed grading, so every screen has to be able to tell
 * a reader which half they are looking at.
 */
export function DataProvenance({ provenance, scope }: { provenance: AnalyticsProvenance; scope?: string }) {
  const fixture = provenance.source === 'mock';
  return (
    <aside className={`provenance ${fixture ? 'fixture' : 'live'}`} aria-label="Data provenance">
      <span className="provenanceDot" aria-hidden="true" />
      <div>
        <b>{fixture ? 'Fixture data' : 'Live data'}{scope ? ` · ${scope}` : ''}</b>
        <p>{provenance.coverage}</p>
        <small>{provenance.provider} · updated {formatUpdated(provenance.updatedAt)}</small>
        {provenance.sources?.length ? (
          <ul className="provenanceSources">
            {provenance.sources.map((source) => (
              <li key={source.url}><a href={source.url} rel="noreferrer noopener" target="_blank">{source.title}</a></li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

/** A compact marker for a single section whose basis differs from the page's. */
export function ProvenanceTag({ basis, detail }: { basis: 'fixture' | 'live' | 'modelled'; detail?: string }) {
  const copy = basis === 'fixture' ? 'FIXTURE' : basis === 'modelled' ? 'MODELLED' : 'LIVE';
  return <span className={`provenanceTag ${basis}`} title={detail}>{copy}</span>;
}
