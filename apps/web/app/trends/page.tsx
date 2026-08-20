import { AskCard } from '../../components/AskCard';
import { DataProvenance, ProvenanceTag } from '../../components/DataProvenance';
import { MetricChart } from '../../components/MetricChart';
import { BackLink, SectionHeading } from '../../components/PageChrome';
import { PredictionRecordCard } from '../../components/PredictionRecordCard';
import { hogWatchRepository } from '@hogwatch/data';
import { MINIMUM_TREND_POINTS, type MetricId } from '@hogwatch/core';

const TREND_IDS: MetricId[] = ['hog-index', 'success-rate', 'pressure-allowed', 'pressure-generated', 'rush-success', 'explosives-allowed'];

const toneFor = (metricId: MetricId): 'good' | 'watch' | 'cardinal' => {
  if (metricId === 'hog-index' || metricId === 'pressure-generated') return 'cardinal';
  if (metricId === 'explosives-allowed' || metricId === 'pressure-allowed') return 'watch';
  return 'good';
};

export default async function Trends() {
  const [dashboard, record, ...trends] = await Promise.all([
    hogWatchRepository.getSeasonDashboard(),
    hogWatchRepository.getPredictionRecord(),
    ...TREND_IDS.map((metricId) => hogWatchRepository.getMetricTrend({ metricId })),
  ]);
  const available = trends.filter((trend): trend is NonNullable<typeof trend> => Boolean(trend));
  const sampleSize = available.at(0)?.values.length ?? 0;
  const fixtureBacked = available.at(0)?.provenance.source === 'mock' && dashboard.provenance.source === 'provider';

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead">
      <div>
        <span className="overline">{dashboard.season} · FIXED AXES, NATIONAL CONTEXT</span>
        <h1>Trend <em>explorer</em></h1>
        <p>Every metric is drawn on its own fixed scale against the FBS average, so a small move cannot look like a breakout.</p>
      </div>
      <div className="filterChip">{sampleSize} GAME{sampleSize === 1 ? '' : 'S'}<br /><b>IN VIEW</b></div>
    </section>

    <DataProvenance provenance={dashboard.provenance} />

    <PredictionRecordCard record={record} />

    {sampleSize > 0 && sampleSize < MINIMUM_TREND_POINTS && (
      <section className="trendHero">
        <span className="overline">READ THIS FIRST</span>
        <h2>{sampleSize} games is a sample, not a trend.</h2>
        <p>Below {MINIMUM_TREND_POINTS} observations HogWatch plots each game in place against the league distribution instead of joining them into a line. The direction is still visible; the false confidence is not.</p>
      </section>
    )}

    {available.length > 0 ? (
      <section className="sectionBlock compact">
        <SectionHeading eyebrow="SEASON EXPLORER" title="Where the needle sits" />
        {fixtureBacked && <p className="sectionNote"><ProvenanceTag basis="fixture" /> Advanced metrics are fixture-backed while the schedule is live.</p>}
        <div className="trendStack">
          {available.map((trend) => (
            <MetricChart key={trend.metricId} metricId={trend.metricId} values={trend.values} weeks={trend.weeks} suffix={trend.suffix} tone={toneFor(trend.metricId)} />
          ))}
        </div>
      </section>
    ) : (
      <section className="pregameCard">
        <span className="overline">NO GRADED GAMES</span>
        <h2>Trends start after the first game is graded.</h2>
        <p>Until then the matchup previews on each game page carry the forward-looking view.</p>
      </section>
    )}

    <section className="trendMethod">
      <span className="overline">HOW TO READ THIS</span>
      <p>Each chart is fixed to a domain of two and a half standard deviations around the FBS average for that metric, with the average marked. Percentiles are direction-aware: 100 always means better football, even where a lower raw number is the good outcome.</p>
    </section>

    <AskCard
      context={{ entity: 'metric', entityId: available.at(0)?.metricId ?? 'hog-index', metricIds: available.map((trend) => trend.metricId), view: { screen: 'trend explorer', metricId: available.at(0)?.metricId, weeks: available.at(0)?.weeks } }}
      label="Ask HogWatch to explain these trends"
    />
  </div>;
}
