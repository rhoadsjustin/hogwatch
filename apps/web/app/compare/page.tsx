import Link from 'next/link';
import { AskCard } from '../../components/AskCard';
import { DataProvenance } from '../../components/DataProvenance';
import { BackLink, SectionHeading } from '../../components/PageChrome';
import { hogWatchRepository } from '@hogwatch/data';

type CompareSearchParams = { a?: string; b?: string };

export default async function Compare({ searchParams }: { searchParams: Promise<CompareSearchParams> }) {
  const { a, b } = await searchParams;
  const games = await hogWatchRepository.listGames();
  const comparable = games.filter((game) => Object.keys(game.metrics).length > 0);
  const gameAId = a ?? comparable.at(0)?.id;
  const gameBId = b ?? comparable.at(-1)?.id;
  const comparison = gameAId && gameBId && gameAId !== gameBId
    ? await hogWatchRepository.compareGames(gameAId, gameBId)
    : undefined;

  return <div className="shell detailPage">
    <BackLink>Season dashboard</BackLink>
    <section className="detailMasthead">
      <div>
        <span className="overline">GAME COMPARISON</span>
        <h1>Two games, <em>side by side</em></h1>
        <p>Any two games that carry measured metrics can be compared — a final score is not required.</p>
      </div>
    </section>

    <form className="compareForm" method="get">
      <label>
        <span className="overline">BASELINE</span>
        <select defaultValue={gameAId} name="a">
          {comparable.map((game) => <option key={game.id} value={game.id}>W{game.week} · {game.opponent}</option>)}
        </select>
      </label>
      <label>
        <span className="overline">COMPARISON</span>
        <select defaultValue={gameBId} name="b">
          {comparable.map((game) => <option key={game.id} value={game.id}>W{game.week} · {game.opponent}</option>)}
        </select>
      </label>
      <button type="submit">Compare</button>
    </form>

    {comparable.length < 2 && (
      <section className="pregameCard">
        <span className="overline">NOT ENOUGH GRADED GAMES</span>
        <h2>Comparison needs two games with measured metrics.</h2>
        <p>HogWatch has {comparable.length} so far. Every scheduled game still has a matchup preview on its own page.</p>
      </section>
    )}

    {comparison && <>
      <DataProvenance provenance={comparison.provenance} />
      <section className="compareHero">
        <div><span className="overline">W{comparison.gameA.week}</span><h2>{comparison.gameA.opponent}</h2><small>{comparison.gameA.result ? `${comparison.gameA.result} ${comparison.gameA.arkansasScore}–${comparison.gameA.opponentScore}` : comparison.gameA.date}</small></div>
        <span className="compareVs" aria-hidden="true">→</span>
        <div><span className="overline">W{comparison.gameB.week}</span><h2>{comparison.gameB.opponent}</h2><small>{comparison.gameB.result ? `${comparison.gameB.result} ${comparison.gameB.arkansasScore}–${comparison.gameB.opponentScore}` : comparison.gameB.date}</small></div>
      </section>

      <section className="sectionBlock compact">
        <SectionHeading eyebrow="SHARED METRICS" title={comparison.summary} />
        <ol className="compareList">
          {comparison.metricComparisons.map((metric) => {
            const improved = metric.goodDirection === 'up' ? metric.delta > 0 : metric.delta < 0;
            const level = metric.delta === 0;
            return (
              <li className={`compareRow ${level ? 'level' : improved ? 'good' : 'watch'}`} key={metric.metricId}>
                <div className="compareRowHead">
                  <span>{metric.label}</span>
                  <b>{metric.delta > 0 ? '+' : ''}{metric.delta} · {level ? 'level' : improved ? 'better' : 'worse'}</b>
                </div>
                <div className="compareBars">
                  <div className="compareBar">
                    <span className="compareWho">W{comparison.gameA.week}</span>
                    <span className="compareTrack"><i style={{ width: `${metric.gameAPercentile}%` }} /><span className="compareMedian" aria-hidden="true" /></span>
                    <span className="compareValue">{metric.gameA} <small>{metric.gameAPercentile}th</small></span>
                  </div>
                  <div className="compareBar">
                    <span className="compareWho">W{comparison.gameB.week}</span>
                    <span className="compareTrack"><i style={{ width: `${metric.gameBPercentile}%` }} /><span className="compareMedian" aria-hidden="true" /></span>
                    <span className="compareValue">{metric.gameB} <small>{metric.gameBPercentile}th</small></span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="sectionNote">Bars are national percentile, so higher is always better football. The tick marks the FBS median.</p>
      </section>

      <p className="compareLinks">
        <Link className="quietLink" href={`/games/${comparison.gameA.id}`}>Open {comparison.gameA.opponent} →</Link>
        <Link className="quietLink" href={`/games/${comparison.gameB.id}`}>Open {comparison.gameB.opponent} →</Link>
      </p>

      <AskCard
        context={{ entity: 'game', entityId: comparison.gameB.id, metricIds: comparison.metricComparisons.map((metric) => metric.metricId), view: { screen: 'game comparison', weeks: [comparison.gameA.week, comparison.gameB.week] } }}
        label={`Ask what changed from ${comparison.gameA.opponent} to ${comparison.gameB.opponent}`}
      />
    </>}
  </div>;
}
