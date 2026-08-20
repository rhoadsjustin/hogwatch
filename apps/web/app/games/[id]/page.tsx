import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AskCard } from '../../../components/AskCard';
import { DataProvenance } from '../../../components/DataProvenance';
import { MatchupPanel } from '../../../components/MatchupPanel';
import { MetricCard } from '../../../components/MetricCard';
import { MetricChart } from '../../../components/MetricChart';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { PredictionCard } from '../../../components/PredictionCard';
import { hogWatchRepository } from '@hogwatch/data';
import { METRIC_METADATA, metricPercentile, type MetricId } from '@hogwatch/core';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [analysis, preview, pressureAllowedTrend, pressureGeneratedTrend] = await Promise.all([
    hogWatchRepository.getGameAnalysis(id),
    hogWatchRepository.getMatchupPreview(id),
    hogWatchRepository.getMetricTrend({ metricId: 'pressure-allowed' }),
    hogWatchRepository.getMetricTrend({ metricId: 'pressure-generated' }),
  ]);
  if (!analysis) notFound();
  const { game } = analysis;
  const isFinal = Boolean(game.result);
  const metrics = Object.entries(game.metrics) as [MetricId, number][];

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead">
      <div>
        <span className="overline">WEEK {game.week} · {game.date} · {game.location === 'away' ? 'ROAD' : 'HOME'}</span>
        <h1>Arkansas <em>{game.location === 'away' ? 'at' : 'vs.'}</em> {game.opponent}</h1>
      </div>
      {isFinal
        ? <div className="finalScore"><span>FINAL</span><strong>{game.arkansasScore}<i>–</i>{game.opponentScore}</strong><b className={game.result === 'W' ? 'win' : 'loss'}>{game.result}</b></div>
        : <div className="finalScore upcomingScore"><span>UP NEXT</span><strong>{game.date}</strong><b>Preview</b></div>}
    </section>

    <DataProvenance provenance={analysis.provenance} />

    {game.prediction && <PredictionCard prediction={game.prediction} opponentShort={game.opponentShort} />}

    {preview
      ? <MatchupPanel preview={preview} />
      : <section className="pregameCard">
          <span className="overline">NO MATCHUP PREVIEW</span>
          <h2>HogWatch has no opponent profile for {game.opponent}.</h2>
          <p>A preview needs the opponent&apos;s unit ratings. Until they are loaded this page shows the schedule entry only — it is deliberately blank rather than quietly guessing.</p>
        </section>}

    {isFinal && metrics.length > 0 && <>
      <section className="gameThesis"><span className="overline">GAME GRADE</span><h2>{analysis.thesis}</h2><p>{analysis.story}</p></section>

      {analysis.hogIndex && (
        <section className="sectionBlock compact">
          <SectionHeading eyebrow="HOG INDEX" title={`${analysis.hogIndex.total} against ${game.opponentShort}`} />
          <div className="gameIndex">
            <strong>{analysis.hogIndex.total}</strong>
            <p>Offense {analysis.hogIndex.offense} · Defense {analysis.hogIndex.defense} · Coaching {analysis.hogIndex.coaching} · Development {analysis.hogIndex.development}. The composite is opponent-adjusted before the components are weighted 30/30/25/15.</p>
          </div>
        </section>
      )}

      <section className="sectionBlock compact">
        <SectionHeading eyebrow="THE SCORECARD" title="Every snap tells a different part" action={<Link className="quietLink" href="/compare">Compare with another game →</Link>} />
        <div className="metricGrid">{metrics.map(([metricId, value]) => {
          const metric = METRIC_METADATA[metricId];
          const percentile = metricPercentile(metricId, value);
          const strong = percentile >= 60;
          return <MetricCard
            detail={`${percentile}th percentile nationally`}
            key={metricId}
            label={metric.label}
            tone={strong ? 'good' : percentile <= 40 ? 'watch' : 'neutral'}
            value={`${value}${metric.suffix ?? ''}`}
          />;
        })}</div>
      </section>

      <section className="sectionBlock compact">
        <SectionHeading eyebrow="GAME-TO-GAME" title="The pressure story" />
        <div className="trendPair">
          {pressureAllowedTrend && <MetricChart metricId={pressureAllowedTrend.metricId} values={pressureAllowedTrend.values} weeks={pressureAllowedTrend.weeks} suffix={pressureAllowedTrend.suffix} />}
          {pressureGeneratedTrend && <MetricChart metricId={pressureGeneratedTrend.metricId} values={pressureGeneratedTrend.values} weeks={pressureGeneratedTrend.weeks} suffix={pressureGeneratedTrend.suffix} tone="cardinal" />}
        </div>
      </section>
    </>}

    {isFinal && metrics.length === 0 && (
      <section className="pregameCard">
        <span className="overline">GRADE PENDING</span>
        <h2>The result is final. The grade is not.</h2>
        <p>HogWatch publishes its scorecard once the underlying advanced metrics have been independently verified. The prediction above is kept and scored either way.</p>
      </section>
    )}

    <AskCard
      context={{
        entity: preview && !isFinal ? 'matchup' : 'game',
        entityId: game.id,
        metricIds: ['hog-index', 'success-rate', 'pressure-allowed', 'pressure-generated', 'explosives-allowed'],
        view: { screen: isFinal ? 'game grade' : 'matchup preview', weeks: [game.week] },
      }}
      label={`Ask about Arkansas vs. ${game.opponent}`}
    />
  </div>;
}
