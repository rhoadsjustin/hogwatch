import Link from 'next/link';
import { AskCard } from '../components/AskCard';
import { HogIndexCard } from '../components/HogIndexCard';
import { MetricCard } from '../components/MetricCard';
import { SectionHeading } from '../components/PageChrome';
import { TrendLine } from '../components/TrendLine';
import { mockHogWatchRepository } from '@hogwatch/data';

const signalDetails = {
  'pressure-allowed': '34% in Week 1',
  'pressure-generated': '31% in Week 1',
  'explosives-allowed': 'One more than Week 1',
} as const;

export default async function Home() {
  const [dashboard, coaches, games, players, successRate, pressureGenerated] = await Promise.all([
    mockHogWatchRepository.getSeasonDashboard(),
    mockHogWatchRepository.listCoaches(),
    mockHogWatchRepository.listGames(),
    mockHogWatchRepository.listPlayers(),
    mockHogWatchRepository.getMetricTrend('success-rate'),
    mockHogWatchRepository.getMetricTrend('pressure-generated'),
  ]);
  const latest = dashboard.latestGame;

  return (
    <div className="shell dashboard">
      <section className="seasonMasthead">
        <div className="mastheadCopy">
          <span className="overline">{dashboard.season} SEASON · THROUGH WEEK {dashboard.completedGames}</span>
          <h1>Is Arkansas<br /><em>getting better?</em></h1>
          <p>HogWatch grades the habits that travel—not just the final score.</p>
        </div>
        <div className="recordBlock"><span className="overline">RECORD</span><strong>{dashboard.record.replace('-', '–')}</strong><span>Projected: {dashboard.projectedRecord}</span></div>
      </section>

      <section className="dashboardLead" aria-label="Season overview">
        {dashboard.hogIndex && <HogIndexCard delta={dashboard.hogIndexDelta ?? 0} index={dashboard.hogIndex} week={latest?.week ?? 0} />}
        <article className="storyCard">
          <span className="overline">THE FILM SAYS</span>
          <h2>{dashboard.story}</h2>
          <p>Pressure allowed fell five points at Utah while the defense generated its best four-man heat of the young season.</p>
          {latest && <Link className="textLink" href={`/games/${latest.id}`}>Read the Utah game grade <span>→</span></Link>}
        </article>
      </section>

      <section className="signalGrid" aria-label="Biggest signals">
        {dashboard.signals.map((signal) => {
          const improving = signal.goodDirection === 'up' ? (signal.delta ?? 0) >= 0 : (signal.delta ?? 0) <= 0;
          return <MetricCard detail={signalDetails[signal.id as keyof typeof signalDetails]} key={signal.id} label={signal.id === 'pressure-generated' ? 'Four-man pressure' : signal.label} tone={improving ? 'good' : 'watch'} trend={improving ? 'up' : 'down'} value={`${signal.value}${signal.unit ?? ''}`} />;
        })}
      </section>

      <section className="sectionBlock">
        <SectionHeading eyebrow="WEEK-TO-WEEK" title="What is moving" action={<Link className="quietLink" href="/trends">Explore all trends →</Link>} />
        <div className="trendPair">
          {successRate && <TrendLine label={successRate.label} suffix={successRate.suffix} values={successRate.values} />}
          {pressureGenerated && <TrendLine label="Defensive pressure" suffix={pressureGenerated.suffix} values={pressureGenerated.values} tone="cardinal" />}
        </div>
      </section>

      <section className="sectionBlock">
        <SectionHeading eyebrow="STAFF SCORECARD" title="Who owns the next step" />
        <div className="coachGrid">
          {coaches.map((coach) => <Link className="coachCard" href={`/coaches/${coach.id}`} key={coach.id}>
            <span className="overline">{coach.role}</span><strong>{coach.grade}</strong><h3>{coach.name}</h3><p>{coach.note}</p><span className="cardArrow">Open scorecard →</span>
          </Link>)}
        </div>
      </section>

      <section className="sectionBlock">
        <SectionHeading eyebrow="SCHEDULE" title="Results and what is next" />
        <div className="schedule">
          {games.map((game) => <Link href={`/games/${game.id}`} className={`gameRow ${game.result ? 'completed' : 'upcoming'}`} key={game.id}>
            <span className="weekLabel">W{game.week}</span>
            <span className="opponent"><b>{game.location === 'away' ? '@ ' : 'vs. '}{game.opponent}</b><small>{game.date}</small></span>
            {game.result ? <span className={`gameResult ${game.result === 'W' ? 'win' : 'loss'}`}>{game.result} <b>{game.arkansasScore}–{game.opponentScore}</b></span> : <span className="gameResult next">Preview <b>→</b></span>}
            <span className="rowIndex">{game.hogIndex ? <><b>{game.hogIndex}</b><small>HOG</small></> : '—'}</span>
          </Link>)}
        </div>
      </section>

      <section className="sectionBlock playerSection">
        <SectionHeading eyebrow="PLAYER STOCK" title="Watch the role, not just the box score" />
        <div className="playerLinks">{players.map((player) => <Link href={`/players/${player.id}`} key={player.id}><span>#{player.number} · {player.position}</span><b>{player.name}</b><i>Open profile →</i></Link>)}</div>
      </section>

      <AskCard context={{ entity: 'season', entityId: 'arkansas-2026', metricIds: ['hog-index', 'pressure-allowed', 'four-man-pressure', 'explosives-allowed'] }} inFlow label="Ask whether Arkansas is actually improving" />
    </div>
  );
}
