export type Trend = 'up' | 'down' | 'flat';

export const METRIC_IDS = [
  'success-rate',
  'pressure-allowed',
  'pressure-generated',
  'explosives',
  'explosives-allowed',
  'rush-success',
  'red-zone-touchdown-rate',
  'missed-tackles',
  'hog-index',
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export type MetricMetadata = {
  label: string;
  suffix?: string;
  goodDirection: 'up' | 'down';
};

export const METRIC_METADATA: Record<MetricId, MetricMetadata> = {
  'success-rate': { label: 'Offensive success rate', suffix: '%', goodDirection: 'up' },
  'pressure-allowed': { label: 'Pressure allowed', suffix: '%', goodDirection: 'down' },
  'pressure-generated': { label: 'Pressure generated', suffix: '%', goodDirection: 'up' },
  explosives: { label: 'Explosive plays', goodDirection: 'up' },
  'explosives-allowed': { label: 'Explosives allowed', goodDirection: 'down' },
  'rush-success': { label: 'Rush success', suffix: '%', goodDirection: 'up' },
  'red-zone-touchdown-rate': { label: 'Red-zone TD rate', suffix: '%', goodDirection: 'up' },
  'missed-tackles': { label: 'Missed tackles', goodDirection: 'down' },
  'hog-index': { label: 'HOG Index', goodDirection: 'up' },
};

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
