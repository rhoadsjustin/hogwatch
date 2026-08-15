import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { DataProvenance } from '../../../components/DataProvenance';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { TrendLine } from '../../../components/TrendLine';
import { mockHogWatchRepository } from '@hogwatch/data';
import { METRIC_METADATA, type MetricId } from '@hogwatch/core';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [analysis, pressureAllowedTrend, pressureGeneratedTrend] = await Promise.all([
    mockHogWatchRepository.getGameAnalysis(id),
    mockHogWatchRepository.getMetricTrend({ metricId: 'pressure-allowed' }),
    mockHogWatchRepository.getMetricTrend({ metricId: 'pressure-generated' }),
  ]);
  if (!analysis) notFound();
  const { game } = analysis;
  const isFinal = Boolean(game.result);

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead">
      <div><span className="overline">WEEK {game.week} · {game.date} · {game.location === 'away' ? 'ROAD' : 'HOME'}</span><h1>Arkansas <em>{game.location === 'away' ? 'at' : 'vs.'}</em> {game.opponent}</h1></div>
      {isFinal ? <div className="finalScore"><span>FINAL</span><strong>{game.arkansasScore}<i>–</i>{game.opponentScore}</strong><b className={game.result === 'W' ? 'win' : 'loss'}>{game.result}</b></div> : <div className="finalScore upcomingScore"><span>UP NEXT</span><strong>Preview</strong><b>{game.date}</b></div>}
    </section>
    <DataProvenance provenance={analysis.provenance} />
    {isFinal ? <>
      <section className="gameThesis"><span className="overline">GAME GRADE</span><h2>{analysis.thesis}</h2><p>{analysis.story}</p></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="HOG INDEX" title={`${analysis.hogIndex?.total ?? game.hogIndex} against ${game.opponentShort}`} /><div className="gameIndex"><strong>{analysis.hogIndex?.total ?? game.hogIndex}</strong><p>Six points above the opening-week baseline—the opponent-adjusted grade accounts for the road environment and Utah&apos;s defensive profile.</p></div></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="THE SCORECARD" title="Every snap tells a different part" /><div className="metricGrid">{(Object.entries(game.metrics) as [MetricId, number][]).map(([metricId, value]) => {
        const metric = METRIC_METADATA[metricId];
        const isConcern = metricId === 'explosives-allowed';
        return <MetricCard detail={metricId === 'pressure-allowed' ? '↓ 5 points from Week 1' : isConcern ? '↑ 1 from Week 1' : 'Week 2 result'} key={metricId} label={metric.label} tone={isConcern ? 'watch' : 'good'} trend={isConcern ? 'down' : 'up'} value={`${value}${metric.suffix ?? ''}`} />;
      })}</div></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="GAME-TO-GAME" title="The pressure story" /><div className="trendPair">{pressureAllowedTrend && <TrendLine label={pressureAllowedTrend.label} suffix={pressureAllowedTrend.suffix} values={pressureAllowedTrend.values} />}{pressureGeneratedTrend && <TrendLine label={pressureGeneratedTrend.label} suffix={pressureGeneratedTrend.suffix} tone="cardinal" values={pressureGeneratedTrend.values} />}</div></section>
    </> : <section className="pregameCard"><span className="overline">PREGAME DASHBOARD</span><h2>The evidence starts before kickoff.</h2><p>HogWatch will add the matchup context, opponent profile, and postgame grade here. Once the game is final, the same scorecard will show what changed from the season baseline.</p><div><b>Watch after kickoff</b><span>Pressure allowed · Early-down success · Four-man pressure · Explosives</span></div></section>}
    <AskCard context={{ entity: 'game', entityId: game.id, metricIds: ['hog-index', 'success-rate', 'pressure-allowed', 'pressure-generated', 'explosives-allowed'] }} label={`Ask about Arkansas vs. ${game.opponent}`} />
  </div>;
}
