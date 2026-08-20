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
 * A transparent pregame call built from HogWatch's current form, camp
 * readiness, opponent comparison rating, and location. It is intentionally
 * separate from the postgame HOG Index: predictions should not alter grades.
 */
export type GamePrediction = {
  winProbability: number;
  projectedArkansasScore: number;
  projectedOpponentScore: number;
  projectedMargin: number;
  confidence: 'early';
  summary: string;
  factors: readonly PredictionFactor[];
};

export type PredictionInput = {
  currentHogIndex: number;
  campReadiness: number;
  opponentComparisonRating: number;
  location: Game['location'];
  matchupAdjustment?: number;
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
};
export type GameComparison = { gameA: Game; gameB: Game; metricComparisons: MetricComparison[]; summary: string; provenance: AnalyticsProvenance };

export const calculateHogIndex = (x: Omit<HogIndex, 'total'>): HogIndex => ({
  ...x,
  total: Math.round(
    x.offense * HOG_INDEX_WEIGHTS.offense +
      x.defense * HOG_INDEX_WEIGHTS.defense +
      x.coaching * HOG_INDEX_WEIGHTS.coaching +
      x.development * HOG_INDEX_WEIGHTS.development,
  ),
});

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/**
 * Turns the shared pregame inputs into a repeatable score projection. Current
 * in-season form receives more weight than camp readiness (70/30); home field
 * is worth 2.5 points. The opponent comparison rating and any matchup-specific
 * adjustment are both expressed on the same 0–100 HOG-style scale.
 */
export const calculateGamePrediction = (input: PredictionInput): Omit<GamePrediction, 'summary' | 'factors'> => {
  const teamReadiness = input.currentHogIndex * 0.7 + input.campReadiness * 0.3;
  const locationAdjustment = input.location === 'home' ? 2.5 : -2.5;
  const projectedMargin = Math.round((teamReadiness - input.opponentComparisonRating + locationAdjustment + (input.matchupAdjustment ?? 0)) * 10) / 10;
  const winProbability = Math.round((1 / (1 + Math.exp(-projectedMargin / 8))) * 100);
  const projectedArkansasScore = Math.round(clamp(26.5 + projectedMargin / 2, 10, 48));
  const projectedOpponentScore = Math.round(clamp(26.5 - projectedMargin / 2, 10, 48));
  return { winProbability, projectedArkansasScore, projectedOpponentScore, projectedMargin, confidence: 'early' };
};

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
