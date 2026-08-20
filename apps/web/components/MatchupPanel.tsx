import { METRIC_METADATA, type MatchupPreview, type MatchupUnitEdge, type TeamMetricProfile } from '@hogwatch/core';
import { ProvenanceTag } from './DataProvenance';

const edgeCopy = (edge: MatchupUnitEdge, opponentShort: string) =>
  edge.edge === 'even' ? 'Even' : edge.edge === 'arkansas' ? 'ARK edge' : `${opponentShort} edge`;

function UnitBar({ who, metric, side }: { who: string; metric: TeamMetricProfile; side: 'ark' | 'opp' }) {
  const metadata = METRIC_METADATA[metric.metricId];
  return (
    <div className={`unitBar ${side}`}>
      <span className="unitWho">{who}</span>
      <span className="unitTrack">
        <i style={{ width: `${metric.percentile}%` }} />
        <span className="unitMedian" aria-hidden="true" />
      </span>
      <span className="unitValue">
        {metric.value}{metadata.suffix ?? ''}
        {metric.basis === 'modelled' && <em title="Modelled from a composite grade, not measured">~</em>}
      </span>
    </div>
  );
}

/**
 * A matchup as positional collisions rather than two stat columns. Both teams
 * sit on the same national-percentile axis so the bars are directly
 * comparable, and the tick marks the FBS median.
 */
export function MatchupPanel({ preview }: { preview: MatchupPreview }) {
  const modelled = preview.opponent.metrics.filter((metric) => metric.basis === 'modelled').length;

  return (
    <section className="matchupPanel" aria-label={`Arkansas versus ${preview.opponent.name} unit matchups`}>
      <div className="matchupHead">
        <div>
          <span className="overline">WHERE THIS GAME IS WON</span>
          <h2>Arkansas <em>vs.</em> {preview.opponent.name}</h2>
          <p>Both teams on the same national-percentile axis. Longer is better football, whichever way the raw number runs.</p>
        </div>
        <div className="matchupRatings">
          <div><span>ARK</span><b>{preview.arkansas.rating.power > 0 ? '+' : ''}{preview.arkansas.rating.power}</b><small>pts vs avg</small></div>
          <div><span>{preview.opponent.shortName}</span><b>{preview.opponent.rating.power > 0 ? '+' : ''}{preview.opponent.rating.power}</b><small>pts vs avg</small></div>
        </div>
      </div>

      <ol className="matchupEdges">
        {preview.edges.map((edge) => (
          <li key={edge.id} className={`matchupEdge ${edge.edge}`}>
            <div className="matchupEdgeHead">
              <span>{edge.label}</span>
              <b>{edgeCopy(edge, preview.opponent.shortName)}</b>
            </div>
            <UnitBar who="ARK" metric={edge.arkansas} side="ark" />
            <UnitBar who={preview.opponent.shortName} metric={edge.opponent} side="opp" />
          </li>
        ))}
      </ol>

      <div className="matchupSwing">
        <span className="overline">SWING FACTORS</span>
        <ul>
          {preview.swingFactors.map((edge) => (
            <li key={edge.id}>
              <b>{edge.shortLabel}</b>
              <span>{edge.edge === 'even' ? 'level' : `${edge.edge === 'arkansas' ? 'Arkansas' : preview.opponent.shortName} by ${Math.abs(edge.gap)} percentile points`}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="matchupFootnote">
        <ProvenanceTag basis="modelled" detail="Modelled from composite grades until a stats provider is connected" />
        {modelled} of {preview.opponent.metrics.length} {preview.opponent.name} values are modelled from composite grades, marked <em>~</em>.{' '}
        {preview.game.week > 1
          ? `Arkansas values are measured through Week ${preview.game.week - 1} where available.`
          : 'Arkansas has no completed games yet, so its values are modelled from the camp baseline too.'}
      </p>
    </section>
  );
}
