import { PREDICTION_CONFIDENCE_LABELS, type GamePrediction } from '@hogwatch/core';

/**
 * The projection with its uncertainty attached. The bar shows the central 60%
 * range of the modelled margin, not a bare point estimate, because the same
 * distribution produces both the range and the win probability.
 */
export function PredictionCard({ prediction, opponentShort = 'OPP' }: { prediction: GamePrediction; opponentShort?: string }) {
  const lean = prediction.winProbability >= 50 ? 'Arkansas lean' : 'Upset path';
  const { low, high } = prediction.likelyMargin;
  const span = high - low || 1;
  const zeroOffset = Math.min(100, Math.max(0, ((0 - low) / span) * 100));
  const markerOffset = Math.min(100, Math.max(0, ((prediction.projectedMargin - low) / span) * 100));

  return (
    <section className="predictionCard" aria-label="HogWatch prediction">
      <div className="predictionLead">
        <div>
          <span className="overline">HOGWATCH PREDICTION</span>
          <h2>{lean}</h2>
          <p>{PREDICTION_CONFIDENCE_LABELS[prediction.confidence]} · margin in points, σ {prediction.marginStandardDeviation}</p>
        </div>
        <div className="predictionChance"><span>WIN CHANCE</span><strong>{prediction.winProbability}%</strong></div>
      </div>

      <div className="predictionScore">
        <strong>{prediction.projectedArkansasScore}</strong><span>ARK</span><i>—</i>
        <strong>{prediction.projectedOpponentScore}</strong><span>{opponentShort}</span>
      </div>

      <div className="predictionRange">
        <div className="predictionRangeHead">
          <span className="overline">LIKELY MARGIN · CENTRAL 60%</span>
          <b>{low > 0 ? '+' : ''}{low} to {high > 0 ? '+' : ''}{high}</b>
        </div>
        <div className="predictionRangeBar" role="img" aria-label={`Six outcomes in ten land between ${low} and ${high} points, centred on ${prediction.projectedMargin}`}>
          <i className="predictionRangeFill" />
          <span className="predictionRangeZero" style={{ left: `${zeroOffset}%` }} />
          <span className="predictionRangeMarker" style={{ left: `${markerOffset}%` }} />
        </div>
        <div className="predictionRangeAxis">
          <span>{opponentShort} by {Math.abs(low)}</span>
          <span className="predictionRangeTick" style={{ left: `${zeroOffset}%` }}>tied</span>
          <span>ARK by {Math.abs(high)}</span>
        </div>
      </div>

      <p className="predictionSummary">{prediction.summary}</p>

      <dl className="predictionFactors">
        {prediction.factors.map((factor) => (
          <div key={factor.label}><dt>{factor.label}</dt><dd className={factor.tone}>{factor.detail}</dd></div>
        ))}
      </dl>

      {prediction.outcome && (
        <div className={`predictionOutcome ${prediction.outcome.calledWinnerCorrectly ? 'hit' : 'miss'}`}>
          <span className="overline">HOW THE CALL AGED</span>
          <p>
            {prediction.outcome.calledWinnerCorrectly ? 'Called the winner.' : 'Called the wrong winner.'}{' '}
            Projected {prediction.projectedMargin > 0 ? '+' : ''}{prediction.projectedMargin}, actual {prediction.outcome.actualMargin > 0 ? '+' : ''}{prediction.outcome.actualMargin} —
            off by {Math.abs(prediction.outcome.marginError)} points. Brier {prediction.outcome.brierScore}.
          </p>
        </div>
      )}
    </section>
  );
}
