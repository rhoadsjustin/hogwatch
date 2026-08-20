import type { GamePrediction } from '@hogwatch/core';

export function PredictionCard({ prediction }: { prediction: GamePrediction }) {
  const lean = prediction.winProbability >= 50 ? 'Arkansas lean' : 'Upset path';
  return (
    <section className="predictionCard" aria-label="HogWatch prediction">
      <div className="predictionLead">
        <div>
          <span className="overline">HOGWATCH PREDICTION</span>
          <h2>{lean}</h2>
          <p>Early model · form, camp, comparison, location</p>
        </div>
        <div className="predictionChance"><span>WIN CHANCE</span><strong>{prediction.winProbability}%</strong></div>
      </div>
      <div className="predictionScore"><strong>{prediction.projectedArkansasScore}</strong><span>ARK</span><i>—</i><strong>{prediction.projectedOpponentScore}</strong><span>OPP</span></div>
      <p className="predictionSummary">{prediction.summary}</p>
      <dl className="predictionFactors">
        {prediction.factors.map((factor) => <div key={factor.label}><dt>{factor.label}</dt><dd className={factor.tone}>{factor.detail}</dd></div>)}
      </dl>
    </section>
  );
}
