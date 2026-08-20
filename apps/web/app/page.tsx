import Link from 'next/link';
import { AskCard } from '../components/AskCard';
import { DataProvenance, ProvenanceTag } from '../components/DataProvenance';
import { HogIndexCard } from '../components/HogIndexCard';
import { MetricCard } from '../components/MetricCard';
import { MetricChart } from '../components/MetricChart';
import { SectionHeading } from '../components/PageChrome';
import { hogWatchRepository } from '@hogwatch/data';

export default async function Home() {
  const [dashboard, coaches, games, players, successRate, pressureGenerated] = await Promise.all([
    hogWatchRepository.getSeasonDashboard(),
    hogWatchRepository.listCoaches(),
    hogWatchRepository.listGames(),
    hogWatchRepository.listPlayers(),
    hogWatchRepository.getMetricTrend({ metricId: 'success-rate' }),
    hogWatchRepository.getMetricTrend({ metricId: 'pressure-generated' }),
  ]);
  const latest = dashboard.latestGame;
  const nextGame = games.find((game) => !game.result);
  // When the schedule is live, the grading surfaces are still fixture-backed.
  // Label them rather than hiding them.
  const analyticsAreFixtures = dashboard.provenance.source === 'provider';

  return (
    <div className="shell dashboard">
      <section className="seasonMasthead">
        <div className="mastheadCopy">
          <span className="overline">{dashboard.season} SEASON · {dashboard.completedGames ? `THROUGH WEEK ${dashboard.completedGames}` : 'BEFORE WEEK 1'}</span>
          <h1>Is Arkansas<br /><em>getting better?</em></h1>
          <p>HogWatch grades the habits that travel—not just the final score.</p>
        </div>
        <div className="recordBlock"><span className="overline">RECORD</span><strong>{dashboard.record.replace('-', '–')}</strong><span>Projected: {dashboard.projectedRecord.replace('-', '–')}</span></div>
      </section>

      <DataProvenance provenance={dashboard.provenance} />

      <section className="dashboardLead" aria-label="Season overview">
        {dashboard.hogIndex
          ? <HogIndexCard delta={dashboard.hogIndexDelta ?? 0} index={dashboard.hogIndex} week={latest?.week ?? 0} />
          : <article className="hogCard empty"><span className="overline">HOG INDEX</span><p>Grading begins once the first game is final. Until then every game page carries a matchup preview instead.</p></article>}
        <article className="storyCard">
          <span className="overline">THE FILM SAYS</span>
          <h2>{dashboard.story}</h2>
          {latest
            ? <Link className="textLink" href={`/games/${latest.id}`}>Read the {latest.opponent} game grade <span>→</span></Link>
            : nextGame && <Link className="textLink" href={`/games/${nextGame.id}`}>See the {nextGame.opponent} matchup preview <span>→</span></Link>}
        </article>
      </section>

      {nextGame?.prediction && (
        <section className="nextUp" aria-label="Next matchup">
          <div>
            <span className="overline">NEXT UP · WEEK {nextGame.week}</span>
            <h2>Arkansas {nextGame.location === 'away' ? 'at' : 'vs.'} {nextGame.opponent}</h2>
            <p>{nextGame.prediction.summary}</p>
          </div>
          <div className="nextUpCall">
            <span>WIN CHANCE</span>
            <strong>{nextGame.prediction.winProbability}%</strong>
            <small>{nextGame.prediction.projectedArkansasScore}–{nextGame.prediction.projectedOpponentScore} · {nextGame.prediction.likelyMargin.low} to {nextGame.prediction.likelyMargin.high}</small>
            <Link className="quietLink" href={`/games/${nextGame.id}`}>Full matchup →</Link>
          </div>
        </section>
      )}

      {dashboard.signals.length > 0 && (
        <section className="signalGrid" aria-label="Biggest signals">
          {dashboard.signals.map((signal) => {
            const delta = signal.delta ?? 0;
            const improving = signal.goodDirection === 'up' ? delta >= 0 : delta <= 0;
            const previous = Math.round((signal.value - delta) * 10) / 10;
            return <MetricCard
              detail={`${previous}${signal.unit ?? ''} a week earlier`}
              key={signal.id}
              label={signal.label}
              tone={improving ? 'good' : 'watch'}
              trend={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}
              value={`${signal.value}${signal.unit ?? ''}`}
            />;
          })}
        </section>
      )}

      {(successRate || pressureGenerated) && (
        <section className="sectionBlock">
          <SectionHeading eyebrow="WEEK-TO-WEEK" title="What is moving" action={<Link className="quietLink" href="/trends">Explore all trends →</Link>} />
          {analyticsAreFixtures && <p className="sectionNote"><ProvenanceTag basis="fixture" /> Advanced metrics are fixture-backed until a stats provider is connected.</p>}
          <div className="trendPair">
            {successRate && <MetricChart metricId={successRate.metricId} values={successRate.values} weeks={successRate.weeks} suffix={successRate.suffix} />}
            {pressureGenerated && <MetricChart metricId={pressureGenerated.metricId} values={pressureGenerated.values} weeks={pressureGenerated.weeks} suffix={pressureGenerated.suffix} tone="cardinal" />}
          </div>
        </section>
      )}

      <section className="sectionBlock">
        <SectionHeading eyebrow="STAFF SCORECARD" title="Who owns the next step" />
        {analyticsAreFixtures && <p className="sectionNote"><ProvenanceTag basis="fixture" /> Staff grades are fixture-backed.</p>}
        <div className="coachGrid">
          {coaches.map((coach) => <Link className="coachCard" href={`/coaches/${coach.id}`} key={coach.id}>
            <span className="overline">{coach.role}</span><strong>{coach.grade}</strong><h3>{coach.name}</h3><p>{coach.note}</p><span className="cardArrow">Open scorecard →</span>
          </Link>)}
        </div>
      </section>

      <section className="sectionBlock">
        <SectionHeading eyebrow="SCHEDULE" title="Results and what is next" action={<Link className="quietLink" href="/compare">Compare two games →</Link>} />
        <div className="schedule">
          {games.map((game) => <Link href={`/games/${game.id}`} className={`gameRow ${game.result ? 'completed' : 'upcoming'}`} key={game.id}>
            <span className="weekLabel">W{game.week}</span>
            <span className="opponent"><b>{game.location === 'away' ? '@ ' : 'vs. '}{game.opponent}</b><small>{game.date}</small></span>
            {game.result
              ? <span className={`gameResult ${game.result === 'W' ? 'win' : 'loss'}`}>{game.result} <b>{game.arkansasScore}–{game.opponentScore}</b></span>
              : game.prediction
                ? <span className="gameResult prediction"><small>HOGWATCH</small><b>{game.prediction.winProbability}% · {game.prediction.projectedArkansasScore}–{game.prediction.projectedOpponentScore}</b></span>
                : <span className="gameResult next"><small>NO PREVIEW YET</small><b>Opponent profile missing</b></span>}
            <span className="rowIndex">{game.hogIndex ? <><b>{game.hogIndex}</b><small>HOG</small></> : '—'}</span>
          </Link>)}
        </div>
      </section>

      <section className="sectionBlock playerSection">
        <SectionHeading eyebrow="PLAYER STOCK" title="Watch the role, not just the box score" />
        {analyticsAreFixtures && <p className="sectionNote"><ProvenanceTag basis="fixture" /> Player reports are fixture-backed.</p>}
        <div className="playerLinks">{players.map((player) => <Link href={`/players/${player.id}`} key={player.id}><span>#{player.number} · {player.position}</span><b>{player.name}</b><i>Open profile →</i></Link>)}</div>
      </section>

      <AskCard
        context={{ entity: 'season', entityId: 'arkansas-2026', metricIds: ['hog-index', 'pressure-allowed', 'four-man-pressure', 'explosives-allowed'], view: { screen: 'season dashboard' } }}
        label="Ask whether Arkansas is actually improving"
      />
    </div>
  );
}
