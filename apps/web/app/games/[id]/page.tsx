import { notFound } from 'next/navigation';
import { AskCard } from '../../../components/AskCard';
import { MetricCard } from '../../../components/MetricCard';
import { BackLink, SectionHeading } from '../../../components/PageChrome';
import { TrendLine } from '../../../components/TrendLine';
import { getGame } from '../../../lib/data';

const labels: Record<string, { label: string; suffix?: string; tone?: 'good' | 'watch' }> = {
  successRate: { label: 'Offensive success rate', suffix: '%', tone: 'good' },
  pressureAllowed: { label: 'Pressure allowed', suffix: '%', tone: 'good' },
  pressureGenerated: { label: 'Pressure generated', suffix: '%', tone: 'good' },
  explosives: { label: 'Explosive plays' },
  explosivesAllowed: { label: 'Explosives allowed', tone: 'watch' },
  rushSuccess: { label: 'Rush success', suffix: '%', tone: 'good' },
  redZone: { label: 'Red-zone TD rate', suffix: '%', tone: 'good' },
  missedTackles: { label: 'Missed tackles', tone: 'good' },
};

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();
  const isFinal = Boolean(game.result);

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead">
      <div><span className="overline">WEEK {game.week} · {game.date} · {game.location === 'away' ? 'ROAD' : 'HOME'}</span><h1>Arkansas <em>{game.location === 'away' ? 'at' : 'vs.'}</em> {game.opponent}</h1></div>
      {isFinal ? <div className="finalScore"><span>FINAL</span><strong>{game.arkansasScore}<i>–</i>{game.opponentScore}</strong><b className={game.result === 'W' ? 'win' : 'loss'}>{game.result}</b></div> : <div className="finalScore upcomingScore"><span>UP NEXT</span><strong>Preview</strong><b>{game.date}</b></div>}
    </section>
    {isFinal ? <>
      <section className="gameThesis"><span className="overline">GAME GRADE</span><h2>{game.result === 'W' ? 'A winning formula showed up on film.' : 'A better process, but not enough finishing.'}</h2><p>Arkansas protected the quarterback better and found more pressure without blitzing. The concern: explosive gains still created too much volatility.</p></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="HOG INDEX" title={`${game.hogIndex} against ${game.opponentShort}`} /><div className="gameIndex"><strong>{game.hogIndex}</strong><p>Six points above the opening-week baseline—the opponent-adjusted grade accounts for the road environment and Utah&apos;s defensive profile.</p></div></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="THE SCORECARD" title="Every snap tells a different part" /><div className="metricGrid">{Object.entries(game.metrics).map(([metricId, value]) => {
        const metric = labels[metricId];
        return <MetricCard detail={metricId === 'pressureAllowed' ? '↓ 5 points from Week 1' : metricId === 'explosivesAllowed' ? '↑ 1 from Week 1' : 'Week 2 result'} key={metricId} label={metric?.label ?? metricId} tone={metric?.tone} trend={metricId === 'explosivesAllowed' ? 'down' : 'up'} value={`${value}${metric?.suffix ?? ''}`} />;
      })}</div></section>
      <section className="sectionBlock compact"><SectionHeading eyebrow="GAME-TO-GAME" title="The pressure story" /><div className="trendPair"><TrendLine label="Pressure allowed" suffix="%" values={[34, 29]} /><TrendLine label="Pressure generated" suffix="%" tone="cardinal" values={[31, 37]} /></div></section>
    </> : <section className="pregameCard"><span className="overline">PREGAME DASHBOARD</span><h2>The evidence starts before kickoff.</h2><p>HogWatch will add the matchup context, opponent profile, and postgame grade here. Once the game is final, the same scorecard will show what changed from the season baseline.</p><div><b>Watch after kickoff</b><span>Pressure allowed · Early-down success · Four-man pressure · Explosives</span></div></section>}
    <AskCard context={{ entity: 'game', entityId: game.id, metricIds: ['hog-index', 'success-rate', 'pressure-allowed', 'pressure-generated', 'explosives-allowed'] }} label={`Ask about Arkansas vs. ${game.opponent}`} />
  </div>;
}
