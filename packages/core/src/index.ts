export type Trend = 'up' | 'down' | 'flat';

export const METRIC_IDS = [
  'success-rate',
  'defensive-success-rate',
  'pressure-allowed',
  'pressure-generated',
  'four-man-pressure',
  'explosives',
  'explosives-allowed',
  'explosive-play-differential',
  'rush-success',
  'yards-before-contact',
  'red-zone-touchdown-rate',
  'turnover-worthy-play-rate',
  'missed-tackles',
  'penalty-rate',
  'pre-snap-penalty-rate',
  'special-teams-score',
  'second-half-success-rate',
  'hog-index',
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export type MetricMetadata = {
  label: string;
  suffix?: string;
  goodDirection: 'up' | 'down';
  category: 'offense' | 'defense' | 'coaching' | 'development' | 'composite';
  valueKind: 'percentage' | 'count' | 'yards' | 'score';
};

export const METRIC_METADATA: Record<MetricId, MetricMetadata> = {
  'success-rate': { label: 'Offensive success rate', suffix: '%', goodDirection: 'up', category: 'offense', valueKind: 'percentage' },
  'defensive-success-rate': { label: 'Defensive success rate allowed', suffix: '%', goodDirection: 'down', category: 'defense', valueKind: 'percentage' },
  'pressure-allowed': { label: 'Pressure allowed', suffix: '%', goodDirection: 'down', category: 'offense', valueKind: 'percentage' },
  'pressure-generated': { label: 'Pressure generated', suffix: '%', goodDirection: 'up', category: 'defense', valueKind: 'percentage' },
  'four-man-pressure': { label: 'Four-man pressure', suffix: '%', goodDirection: 'up', category: 'defense', valueKind: 'percentage' },
  explosives: { label: 'Explosive plays', goodDirection: 'up', category: 'offense', valueKind: 'count' },
  'explosives-allowed': { label: 'Explosives allowed', goodDirection: 'down', category: 'defense', valueKind: 'count' },
  'explosive-play-differential': { label: 'Explosive-play differential', goodDirection: 'up', category: 'composite', valueKind: 'count' },
  'rush-success': { label: 'Rush success', suffix: '%', goodDirection: 'up', category: 'offense', valueKind: 'percentage' },
  'yards-before-contact': { label: 'Yards before contact', suffix: ' yds', goodDirection: 'up', category: 'offense', valueKind: 'yards' },
  'red-zone-touchdown-rate': { label: 'Red-zone TD rate', suffix: '%', goodDirection: 'up', category: 'offense', valueKind: 'percentage' },
  'turnover-worthy-play-rate': { label: 'Turnover-worthy play rate', suffix: '%', goodDirection: 'down', category: 'offense', valueKind: 'percentage' },
  'missed-tackles': { label: 'Missed tackles', goodDirection: 'down', category: 'defense', valueKind: 'count' },
  'penalty-rate': { label: 'Penalty rate', suffix: '%', goodDirection: 'down', category: 'coaching', valueKind: 'percentage' },
  'pre-snap-penalty-rate': { label: 'Pre-snap penalty rate', suffix: '%', goodDirection: 'down', category: 'coaching', valueKind: 'percentage' },
  'special-teams-score': { label: 'Special teams score', goodDirection: 'up', category: 'coaching', valueKind: 'score' },
  'second-half-success-rate': { label: 'Second-half success rate', suffix: '%', goodDirection: 'up', category: 'coaching', valueKind: 'percentage' },
  'hog-index': { label: 'HOG Index', goodDirection: 'up', category: 'composite', valueKind: 'score' },
};

export const isMetricId = (value: string): value is MetricId => METRIC_IDS.includes(value as MetricId);

export type Metric = {
  id: MetricId;
  label: string;
  value: number;
  unit?: string;
  delta?: number;
  goodDirection?: 'up' | 'down';
};

export type HogIndex = {
  total: number;
  offense: number;
  defense: number;
  coaching: number;
  development: number;
};

/**
 * States where an analytics report came from and what it currently covers.
 * Provider implementations replace this object with their own retrieval and
 * freshness details; presentation surfaces should preserve it verbatim.
 */
export type AnalyticsProvenance = {
  source: 'mock' | 'provider';
  provider: string;
  coverage: string;
  updatedAt: string;
  sources?: { title: string; url: string }[];
};

/** HOG Index component weights. These must sum to one. */
export const HOG_INDEX_WEIGHTS = {
  offense: 0.3,
  defense: 0.3,
  coaching: 0.25,
  development: 0.15,
} as const;

/**
 * Canonical HogWatch entity ID. Every provider — fixture, official schedule,
 * or future stats vendor — must derive game and team IDs through this function
 * so the same opponent resolves to the same ID on every code path.
 */
export const toHogWatchId = (value: string): string => value
  .toLowerCase()
  .replace(/&/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export type Game = {
  id: string;
  week: number;
  opponent: string;
  opponentShort: string;
  location: 'home' | 'away';
  result?: 'W' | 'L';
  arkansasScore?: number;
  opponentScore?: number;
  date: string;
  hogIndex?: number;
  metrics: Partial<Record<MetricId, number>>;
  opponentMetricBaselines?: Partial<Record<MetricId, OpponentMetricBaseline>>;
  prediction?: GamePrediction;
};

export type PredictionFactor = {
  label: string;
  detail: string;
  tone: 'edge' | 'watch' | 'neutral';
};

/**
 * How much real, in-season evidence stands behind a prediction's inputs.
 * `preseason` means no completed games have informed the Arkansas rating yet.
 */
export type PredictionConfidence = 'preseason' | 'early' | 'established';

export const PREDICTION_CONFIDENCE_LABELS: Record<PredictionConfidence, string> = {
  preseason: 'Preseason inputs only',
  early: 'Early-season sample',
  established: 'Established sample',
};

/** How a finished game scored the prediction that preceded it. */
export type PredictionOutcome = {
  actualMargin: number;
  marginError: number;
  calledWinnerCorrectly: boolean;
  /** Squared error of the win probability against the binary result. Lower is better. */
  brierScore: number;
};

/**
 * A transparent pregame call. Margin and score are both denominated in
 * scoreboard points, and the win probability is the same normal distribution
 * that produces `likelyMargin` — so the number and the range can never
 * disagree. Predictions are kept after kickoff and scored, not deleted.
 */
export type GamePrediction = {
  winProbability: number;
  projectedArkansasScore: number;
  projectedOpponentScore: number;
  projectedMargin: number;
  /** Central 60% range of the modeled margin, in points. */
  likelyMargin: { low: number; high: number };
  marginStandardDeviation: number;
  confidence: PredictionConfidence;
  summary: string;
  factors: readonly PredictionFactor[];
  outcome?: PredictionOutcome;
};

/**
 * A team's strength expressed in scoreboard points relative to an average FBS
 * team, so that subtracting two ratings yields a point margin rather than a
 * difference of index units.
 */
export type TeamRating = {
  /** Points better than an average team on a neutral field. */
  power: number;
  /** Points scored above an average offense. */
  offense: number;
  /** Points prevented relative to an average defense. Higher is better. */
  defense: number;
};

export type PredictionInput = {
  arkansas: TeamRating;
  opponent: TeamRating;
  location: Game['location'];
  confidence: PredictionConfidence;
  /** Documented game-specific adjustment in points (travel, availability, scheme). */
  matchupAdjustment?: number;
};

/**
 * The published conversion between HogWatch's 0–100 grading scale and the
 * scoreboard. Changing any value here changes every projection, so it is
 * covered by tests in the same way as the HOG Index weights.
 */
export const POWER_RATING = {
  /** HOG Index value treated as an average FBS team. */
  averageIndex: 50,
  /** Scoreboard points per HOG Index point above average. */
  pointsPerIndexPoint: 0.35,
  /** Home-field advantage, in points. */
  homeFieldPoints: 2.5,
  /** Points an average offense scores against an average defense. */
  averageTeamPoints: 26,
  /** Standard deviation of a single college football game's margin, in points. */
  marginStandardDeviation: 16,
  /** z for the central 60% interval reported as `likelyMargin`. */
  likelyRangeZ: 0.8416,
} as const;

const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/**
 * Abramowitz & Stegun 26.2.17. Accurate to about 7.5e-8, which is far finer
 * than the whole-percent win probabilities HogWatch reports.
 */
export const standardNormalCdf = (z: number): number => {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
};

/** Converts a HOG Index grade into a point-denominated team rating. */
export const ratingFromHogIndex = (index: Pick<HogIndex, 'total' | 'offense' | 'defense'>): TeamRating => ({
  power: round1((index.total - POWER_RATING.averageIndex) * POWER_RATING.pointsPerIndexPoint),
  offense: round1((index.offense - POWER_RATING.averageIndex) * POWER_RATING.pointsPerIndexPoint),
  defense: round1((index.defense - POWER_RATING.averageIndex) * POWER_RATING.pointsPerIndexPoint),
});

export const calculateHogIndex = (x: Omit<HogIndex, 'total'>): HogIndex => ({
  ...x,
  total: Math.round(
    x.offense * HOG_INDEX_WEIGHTS.offense +
      x.defense * HOG_INDEX_WEIGHTS.defense +
      x.coaching * HOG_INDEX_WEIGHTS.coaching +
      x.development * HOG_INDEX_WEIGHTS.development,
  ),
});

/**
 * Projects a game from two point-denominated ratings. The margin comes from
 * the power ratings; the combined total comes from the offense/defense splits,
 * so projected scores move with the matchup instead of always summing to a
 * constant. Win probability is the normal CDF of the same margin distribution
 * that produces `likelyMargin`.
 */
export const calculateGamePrediction = (
  input: PredictionInput,
): Omit<GamePrediction, 'summary' | 'factors' | 'outcome'> => {
  const homeField = input.location === 'home' ? POWER_RATING.homeFieldPoints : -POWER_RATING.homeFieldPoints;
  const projectedMargin = round1(
    input.arkansas.power - input.opponent.power + homeField + (input.matchupAdjustment ?? 0),
  );
  const projectedTotal = 2 * POWER_RATING.averageTeamPoints
    + (input.arkansas.offense - input.opponent.defense)
    + (input.opponent.offense - input.arkansas.defense);
  const standardDeviation = POWER_RATING.marginStandardDeviation;
  const half = POWER_RATING.likelyRangeZ * standardDeviation;
  return {
    winProbability: Math.round(standardNormalCdf(projectedMargin / standardDeviation) * 100),
    projectedArkansasScore: Math.round(clamp((projectedTotal + projectedMargin) / 2, 3, 70)),
    projectedOpponentScore: Math.round(clamp((projectedTotal - projectedMargin) / 2, 3, 70)),
    projectedMargin,
    likelyMargin: { low: round1(projectedMargin - half), high: round1(projectedMargin + half) },
    marginStandardDeviation: standardDeviation,
    confidence: input.confidence,
  };
};

/** Scores a prediction once the game is final. Kept so the model has a record. */
export const scorePrediction = (
  prediction: Pick<GamePrediction, 'winProbability' | 'projectedMargin'>,
  final: { arkansasScore: number; opponentScore: number },
): PredictionOutcome => {
  const actualMargin = final.arkansasScore - final.opponentScore;
  const arkansasWon = actualMargin > 0 ? 1 : 0;
  return {
    actualMargin,
    marginError: round1(prediction.projectedMargin - actualMargin),
    calledWinnerCorrectly: (prediction.winProbability >= 50) === (arkansasWon === 1),
    brierScore: Math.round((prediction.winProbability / 100 - arkansasWon) ** 2 * 1000) / 1000,
  };
};

export type PredictionRecordEntry = {
  gameId: string;
  week: number;
  opponent: string;
  winProbability: number;
  projectedMargin: number;
  actualMargin: number;
  calledWinnerCorrectly: boolean;
  brierScore: number;
};

/** The model's running accountability report. */
export type PredictionRecord = {
  entries: readonly PredictionRecordEntry[];
  gamesScored: number;
  correctCalls: number;
  meanAbsoluteMarginError: number;
  brierScore: number;
  /** Brier score of always predicting a coin flip, for comparison. */
  coinFlipBrierScore: number;
  note: string;
  provenance: AnalyticsProvenance;
};

export const summarizePredictionRecord = (entries: readonly PredictionRecordEntry[]) => {
  if (entries.length === 0) {
    return { gamesScored: 0, correctCalls: 0, meanAbsoluteMarginError: 0, brierScore: 0, coinFlipBrierScore: 0.25 };
  }
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  return {
    gamesScored: entries.length,
    correctCalls: entries.filter((entry) => entry.calledWinnerCorrectly).length,
    meanAbsoluteMarginError: round1(total(entries.map((entry) => Math.abs(entry.projectedMargin - entry.actualMargin))) / entries.length),
    brierScore: Math.round((total(entries.map((entry) => entry.brierScore)) / entries.length) * 1000) / 1000,
    coinFlipBrierScore: 0.25,
  };
};

/**
 * Reference FBS distribution for each canonical metric. It gives raw values a
 * league context, and it is the single source of truth for chart domains and
 * percentiles on both platforms. These are documented reference values, not a
 * live league feed; a provider adapter should replace them wholesale.
 */
export type MetricDistribution = { mean: number; standardDeviation: number };

export const METRIC_DISTRIBUTIONS: Record<MetricId, MetricDistribution> = {
  'success-rate': { mean: 43, standardDeviation: 5 },
  'defensive-success-rate': { mean: 43, standardDeviation: 5 },
  'pressure-allowed': { mean: 32, standardDeviation: 6 },
  'pressure-generated': { mean: 32, standardDeviation: 6 },
  'four-man-pressure': { mean: 20, standardDeviation: 5 },
  explosives: { mean: 7, standardDeviation: 2.5 },
  'explosives-allowed': { mean: 7, standardDeviation: 2.5 },
  'explosive-play-differential': { mean: 0, standardDeviation: 3 },
  'rush-success': { mean: 42, standardDeviation: 6 },
  'yards-before-contact': { mean: 2.6, standardDeviation: 0.6 },
  'red-zone-touchdown-rate': { mean: 60, standardDeviation: 10 },
  'turnover-worthy-play-rate': { mean: 3, standardDeviation: 1.2 },
  'missed-tackles': { mean: 8, standardDeviation: 3 },
  'penalty-rate': { mean: 7, standardDeviation: 2 },
  'pre-snap-penalty-rate': { mean: 2.5, standardDeviation: 1 },
  'special-teams-score': { mean: 50, standardDeviation: 12 },
  'second-half-success-rate': { mean: 43, standardDeviation: 5 },
  'hog-index': { mean: 50, standardDeviation: 12 },
};

/**
 * Direction-aware national percentile: 100 always means "best football", even
 * for metrics where a lower raw number is better.
 */
export const metricPercentile = (metricId: MetricId, value: number): number => {
  const { mean, standardDeviation } = METRIC_DISTRIBUTIONS[metricId];
  const z = (value - mean) / standardDeviation;
  const directed = METRIC_METADATA[metricId].goodDirection === 'up' ? z : -z;
  return Math.round(clamp(standardNormalCdf(directed) * 100, 1, 99));
};

export type MetricChartDomain = { min: number; max: number; reference: number };

/**
 * A stable y-axis for a metric, so a two-point series cannot be autoscaled into
 * looking like a breakout. `reference` is the FBS average line.
 */
export const metricChartDomain = (metricId: MetricId): MetricChartDomain => {
  const { mean, standardDeviation } = METRIC_DISTRIBUTIONS[metricId];
  const kind = METRIC_METADATA[metricId].valueKind;
  const span = 2.5 * standardDeviation;
  const lowerBound = kind === 'count' || kind === 'yards' || kind === 'percentage' || kind === 'score' ? 0 : -Infinity;
  const upperBound = kind === 'percentage' || kind === 'score' ? 100 : Infinity;
  return {
    min: round1(Math.max(lowerBound, mean - span)),
    max: round1(Math.min(upperBound, mean + span)),
    reference: mean,
  };
};

/** Below this many observations a line chart overstates the signal. */
export const MINIMUM_TREND_POINTS = 4;

/**
 * HOG-scale index points per standard deviation of unit performance. It lets a
 * team with only a composite grade be expressed in the same canonical metric
 * vocabulary as a team with a full stat line, so a matchup can always be drawn.
 */
export const UNIT_GRADE_SPREAD = 20;

/**
 * Models a canonical metric value from a 0–100 unit grade using the reference
 * distribution. This is explicitly a stand-in for observed data: anything it
 * produces must be reported with a `modelled` basis so a reader can tell it
 * apart from a measured value.
 */
export const metricValueFromUnitGrade = (metricId: MetricId, unitGrade: number): number => {
  const { mean, standardDeviation } = METRIC_DISTRIBUTIONS[metricId];
  const z = (unitGrade - POWER_RATING.averageIndex) / UNIT_GRADE_SPREAD;
  const directed = METRIC_METADATA[metricId].goodDirection === 'up' ? z : -z;
  const kind = METRIC_METADATA[metricId].valueKind;
  const value = mean + directed * standardDeviation;
  const bounded = kind === 'percentage' || kind === 'score' ? clamp(value, 0, 100) : Math.max(0, value);
  return Math.round(bounded * 10) / 10;
};

/**
 * A team as an opponent: the same canonical metric vocabulary Arkansas uses,
 * plus point-denominated ratings, so any two teams can be compared directly.
 */
export type TeamMetricProfile = {
  metricId: MetricId;
  value: number;
  /** Direction-aware national percentile; 100 is always better football. */
  percentile: number;
  /** Whether the value was measured or modelled from a unit grade. */
  basis: 'observed' | 'modelled';
};

export type TeamProfile = {
  teamId: string;
  name: string;
  shortName: string;
  rating: TeamRating;
  metrics: readonly TeamMetricProfile[];
  note?: string;
};

export const teamMetricProfile = (
  metrics: Partial<Record<MetricId, number>>,
  basis: TeamMetricProfile['basis'] = 'observed',
): TeamMetricProfile[] =>
  (Object.entries(metrics) as [MetricId, number][])
    .filter(([, value]) => value !== undefined)
    .map(([metricId, value]) => ({ metricId, value, percentile: metricPercentile(metricId, value), basis }));

/**
 * The positional collisions a matchup preview is built from. Each pairs an
 * Arkansas metric against the opponent metric that directly opposes it, so the
 * preview reads as football rather than as two stat columns.
 */
export const MATCHUP_COLLISIONS = [
  { id: 'protection', label: 'Arkansas protection vs. pass rush', shortLabel: 'pass protection', arkansasMetricId: 'pressure-allowed', opponentMetricId: 'pressure-generated' },
  { id: 'pass-rush', label: 'Arkansas pass rush vs. protection', shortLabel: 'the four-man rush', arkansasMetricId: 'pressure-generated', opponentMetricId: 'pressure-allowed' },
  { id: 'run-game', label: 'Arkansas run game vs. run defense', shortLabel: 'the run game', arkansasMetricId: 'rush-success', opponentMetricId: 'defensive-success-rate' },
  { id: 'efficiency', label: 'Arkansas offense vs. defensive efficiency', shortLabel: 'offensive efficiency', arkansasMetricId: 'success-rate', opponentMetricId: 'defensive-success-rate' },
  { id: 'explosives', label: 'Arkansas explosives vs. explosives allowed', shortLabel: 'explosive plays', arkansasMetricId: 'explosives', opponentMetricId: 'explosives-allowed' },
] as const satisfies readonly {
  id: string; label: string; shortLabel: string; arkansasMetricId: MetricId; opponentMetricId: MetricId;
}[];

export type MatchupUnitEdge = {
  id: string;
  label: string;
  /** A lower-case noun phrase that reads naturally inside a sentence. */
  shortLabel: string;
  arkansas: TeamMetricProfile;
  opponent: TeamMetricProfile;
  /** Percentile gap, Arkansas minus opponent. */
  gap: number;
  edge: 'arkansas' | 'opponent' | 'even';
};

/** Percentile gap below which a collision is called even rather than an edge. */
export const MATCHUP_EVEN_THRESHOLD = 8;

export const calculateMatchupEdges = (
  arkansas: TeamProfile,
  opponent: TeamProfile,
): MatchupUnitEdge[] => {
  const find = (profile: TeamProfile, metricId: MetricId) => profile.metrics.find((metric) => metric.metricId === metricId);
  return MATCHUP_COLLISIONS.flatMap((collision): MatchupUnitEdge[] => {
    const arkansasMetric = find(arkansas, collision.arkansasMetricId);
    const opponentMetric = find(opponent, collision.opponentMetricId);
    if (!arkansasMetric || !opponentMetric) return [];
    const gap = arkansasMetric.percentile - opponentMetric.percentile;
    return [{
      id: collision.id,
      label: collision.label,
      shortLabel: collision.shortLabel,
      arkansas: arkansasMetric,
      opponent: opponentMetric,
      gap,
      edge: Math.abs(gap) < MATCHUP_EVEN_THRESHOLD ? 'even' : gap > 0 ? 'arkansas' : 'opponent',
    }];
  });
};

export type MatchupPreview = {
  game: Game;
  arkansas: TeamProfile;
  opponent: TeamProfile;
  prediction: GamePrediction;
  edges: readonly MatchupUnitEdge[];
  /** The collisions that most move the projection, biggest gap first. */
  swingFactors: readonly MatchupUnitEdge[];
  summary: string;
  provenance: AnalyticsProvenance;
};

export type Coach = {
  id: string;
  name: string;
  role: string;
  grade: string;
  scorecard: { label: string; score: number; grade: string }[];
  note: string;
};

export type Player = {
  id: string;
  name: string;
  number: number;
  position: string;
  classYear: string;
  height: string;
  weight: number;
  hometown: string;
  stats: Record<string, string | number>;
};

export type TrendSeries = {
  metricId: MetricId;
  label: string;
  suffix?: string;
  values: number[];
  weeks: number[];
  goodDirection: 'up' | 'down';
};

export type GameAnalysis = { game: Game; hogIndex?: HogIndex; story: string; thesis: string; provenance: AnalyticsProvenance };

export type PlayerInsight = {
  stock: 'Rising' | 'Steady'; stockNote: string; role: string; story: string;
  trend: TrendSeries; metricIds: MetricId[]; details: Record<string, string>;
};

export type PlayerReport = { player: Player; insight: PlayerInsight; provenance: AnalyticsProvenance };
export type CoachReport = { coach: Coach; implication: string; trend: TrendSeries; provenance: AnalyticsProvenance };

export type SeasonDashboard = {
  team: string; season: number; record: string; projectedRecord: string; completedGames: number;
  latestGame?: Game; hogIndex?: HogIndex; hogIndexDelta?: number; story: string; signals: Metric[]; provenance: AnalyticsProvenance;
};

export type MetricTrend = TrendSeries & { provenance: AnalyticsProvenance };
export type MetricTrendQuery = {
  metricId: MetricId;
  /** A trailing-average window; omit it to return the per-game series. */
  rollingWindow?: number;
  /** Normalizes each game to the opponent's same-perspective league baseline. */
  adjustment?: 'raw' | 'opponent-adjusted';
};
export type MetricComparison = {
  metricId: MetricId; label: string; gameA: number; gameB: number; delta: number; goodDirection: 'up' | 'down';
  gameAPercentile: number; gameBPercentile: number;
};
export type GameComparison = { gameA: Game; gameB: Game; metricComparisons: MetricComparison[]; summary: string; provenance: AnalyticsProvenance };

/**
 * A provider supplies these baselines in the same perspective as the raw
 * metric. For example, a defense's success-rate baseline is the success rate
 * it normally allows; a pass rush baseline is the pressure it normally creates.
 */
export type OpponentMetricBaseline = {
  opponentAverage: number;
  leagueAverage: number;
  sampleSize: number;
};

export type OpponentAdjustedMetric = {
  rawValue: number;
  adjustedValue: number;
  adjustment: number;
  baseline: OpponentMetricBaseline;
};

/**
 * Neutralizes opponent difficulty with a transparent first-pass formula:
 * raw value - (opponent average - league average). A stronger-than-average
 * opponent therefore gives appropriate credit without changing metric units.
 */
export const calculateOpponentAdjustedMetric = (
  rawValue: number,
  baseline: OpponentMetricBaseline,
): OpponentAdjustedMetric => {
  const adjustment = baseline.leagueAverage - baseline.opponentAverage;
  return {
    rawValue,
    adjustment,
    adjustedValue: Math.round((rawValue + adjustment) * 1000) / 1000,
    baseline,
  };
};

/** Returns a trailing average at every observed game, using shorter windows at season start. */
export const calculateRollingAverage = (values: readonly number[], windowSize: number): number[] => {
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    throw new RangeError('rolling window size must be a positive integer');
  }
  return values.map((_, index) => {
    const window = values.slice(Math.max(0, index - windowSize + 1), index + 1);
    return Math.round((window.reduce((total, value) => total + value, 0) / window.length) * 1000) / 1000;
  });
};
