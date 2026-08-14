import Link from 'next/link';
import { AskCard } from '../components/AskCard';
import { HogIndexCard } from '../components/HogIndexCard';
import { MetricCard } from '../components/MetricCard';
import { SectionHeading } from '../components/PageChrome';
import { TrendLine } from '../components/TrendLine';
import { coaches, games, players } from '../lib/data';

const latestIndex = { total: 74, offense: 72, defense: 78, coaching: 76, development: 71 };

export default function Home() {
  const played = games.filter((game) => game.result);
  const latest = played.at(-1);

  return (
    <div className="shell dashboard">
      <section className="seasonMasthead">
        <div className="mastheadCopy">
          <span className="overline">2026 SEASON · THROUGH WEEK 2</span>
          <h1>Is Arkansas<br /><em>getting better?</em></h1>
          <p>HogWatch grades the habits that travel—not just the final score.</p>
        </div>
        <div className="recordBlock"><span className="overline">RECORD</span><strong>1–1</strong><span>Projected: 5–7</span></div>
      </section>

      <section className="dashboardLead" aria-label="Season overview">
        <HogIndexCard delta={6} index={latestIndex} week={latest?.week ?? 0} />
        <article className="storyCard">
          <span className="overline">THE FILM SAYS</span>
          <h2>Protection improved against a real pass rush.</h2>
          <p>Pressure allowed fell five points at Utah while the defense generated its best four-man heat of the young season.</p>
          {latest && <Link className="textLink" href={`/games/${latest.id}`}>Read the Utah game grade <span>→</span></Link>}
        </article>
      </section>

      <section className="signalGrid" aria-label="Biggest signals">
        <MetricCard label="Pressure allowed" value="29%" detail="34% in Week 1" tone="good" trend="up" />
        <MetricCard label="Four-man pressure" value="37%" detail="31% in Week 1" tone="good" trend="up" />
        <MetricCard label="Explosives allowed" value="5" detail="One more than Week 1" tone="watch" trend="down" />
      </section>

      <section className="sectionBlock">
        <SectionHeading eyebrow="WEEK-TO-WEEK" title="What is moving" action={<Link className="quietLink" href="/trends">Explore all trends →</Link>} />
        <div className="trendPair">
          <TrendLine label="Offensive success rate" suffix="%" values={[44, 46]} />
          <TrendLine label="Defensive pressure" suffix="%" values={[31, 37]} tone="cardinal" />
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
