import type { PredictionRecord } from '@hogwatch/core';

/**
 * The model's own report card. A prediction product that never shows how its
 * calls aged is asking to be trusted on nothing.
 */
export function PredictionRecordCard({ record }: { record: PredictionRecord }) {
  const beatsCoinFlip = record.gamesScored > 0 && record.brierScore < record.coinFlipBrierScore;

  return (
    <section className="recordCard" aria-label="HogWatch prediction record">
      <div className="recordHead">
        <div>
          <span className="overline">MODEL RECORD</span>
          <h2>How the calls have aged</h2>
        </div>
        <span className={`recordVerdict ${record.gamesScored === 0 ? 'neutral' : beatsCoinFlip ? 'good' : 'watch'}`}>
          {record.gamesScored === 0 ? 'NO GAMES YET' : beatsCoinFlip ? 'BEATING A COIN FLIP' : 'NO BETTER THAN A COIN FLIP'}
        </span>
      </div>

      <div className="recordStats">
        <div><span>CORRECT CALLS</span><b>{record.correctCalls}/{record.gamesScored}</b></div>
        <div><span>MEAN MARGIN MISS</span><b>{record.meanAbsoluteMarginError}<small> pts</small></b></div>
        <div><span>BRIER SCORE</span><b>{record.brierScore}</b><small>coin flip {record.coinFlipBrierScore}</small></div>
      </div>

      <p className="recordNote">{record.note}</p>

      {record.entries.length > 0 && (
        <table className="recordTable">
          <caption className="visuallyHidden">Every scored HogWatch prediction</caption>
          <thead>
            <tr><th scope="col">Week</th><th scope="col">Opponent</th><th scope="col">Called</th><th scope="col">Projected</th><th scope="col">Actual</th></tr>
          </thead>
          <tbody>
            {record.entries.map((entry) => (
              <tr key={entry.gameId}>
                <td>W{entry.week}</td>
                <td>{entry.opponent}</td>
                <td className={entry.calledWinnerCorrectly ? 'good' : 'watch'}>{entry.winProbability}% {entry.calledWinnerCorrectly ? '✓' : '✗'}</td>
                <td>{entry.projectedMargin > 0 ? '+' : ''}{entry.projectedMargin}</td>
                <td>{entry.actualMargin > 0 ? '+' : ''}{entry.actualMargin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
