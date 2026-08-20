import {
  calculateGamePrediction,
  calculateMatchupEdges,
  calculateOpponentAdjustedMetric,
  calculateRollingAverage,
  calculateHogIndex,
  metricPercentile,
  metricValueFromUnitGrade,
  METRIC_IDS,
  METRIC_METADATA,
  POWER_RATING,
  ratingFromHogIndex,
  scorePrediction,
  summarizePredictionRecord,
  toHogWatchId,
  teamMetricProfile,
  type AnalyticsProvenance,
  type Coach,
  type CoachReport,
  type Game,
  type GameAnalysis,
  type GameComparison,
  type GamePrediction,
  type HogIndex,
  type MatchupPreview,
  type MatchupUnitEdge,
  type Metric,
  type MetricComparison,
  type MetricId,
  type MetricTrend,
  type MetricTrendQuery,
  type Player,
  type PlayerInsight,
  type PlayerReport,
  type PredictionConfidence,
  type PredictionFactor,
  type PredictionRecord,
  type PredictionRecordEntry,
  type SeasonDashboard,
  type TeamMetricProfile,
  type TeamProfile,
  type TrendSeries,
} from '@hogwatch/core';
import { OpenAIWebSearchScheduleProvider, type LiveScheduleCache } from './openai-web-search.ts';
import { ArkansasOfficialScheduleProvider } from './arkansas-official-schedule.ts';

export type { LiveScheduleCache } from './openai-web-search.ts';

/**
 * The provider-facing payload after its vendor-specific fields have been
 * mapped to HogWatch's canonical metric vocabulary. No UI or MCP code should
 * depend on the raw provider field names.
 */
export type NormalizedMetricValue = {
  metricId: MetricId;
  value: number;
  sourceField: string;
  sampleSize?: number;
};

export type ProviderGameInput = Omit<Game, 'metrics'> & {
  metrics: readonly NormalizedMetricValue[];
};

/**
 * A team as a provider hands it over: composite and unit grades on the HOG
 * 0–100 scale, plus any canonical metrics the vendor actually measured.
 */
export type ProviderTeamInput = {
  name: string;
  shortName: string;
  grades: TeamGrades;
  metrics?: Partial<Record<MetricId, number>>;
  note?: string;
};

export type ProviderSeasonSnapshot = {
  team: string;
  season: number;
  games: readonly ProviderGameInput[];
  coaches: readonly Coach[];
  players: readonly Player[];
  opponents?: readonly ProviderTeamInput[];
  provenance: AnalyticsProvenance;
};

/** A future vendor adapter implements this small transport boundary only. */
export interface HogWatchDataProvider {
  getSeasonSnapshot(input: { team: string; season: number }): Promise<ProviderSeasonSnapshot>;
}

export const normalizeMetricValues = (values: readonly NormalizedMetricValue[]): Partial<Record<MetricId, number>> => {
  const metrics: Partial<Record<MetricId, number>> = {};
  for (const value of values) {
    if (metrics[value.metricId] !== undefined) {
      throw new Error(`duplicate metric value for ${value.metricId}`);
    }
    metrics[value.metricId] = value.value;
  }
  return metrics;
};

export interface HogWatchRepository {
  getSeasonDashboard(): Promise<SeasonDashboard>;
  getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined>;
  getMatchupPreview(gameId: string): Promise<MatchupPreview | undefined>;
  getPredictionRecord(): Promise<PredictionRecord>;
  getCoachReport(coachId: string): Promise<CoachReport | undefined>;
  getPlayerReport(playerId: string): Promise<PlayerReport | undefined>;
  getMetricTrend(query: MetricTrendQuery): Promise<MetricTrend | undefined>;
  compareGames(gameAId: string, gameBId: string): Promise<GameComparison | undefined>;
  listGames(): Promise<Game[]>;
  listCoaches(): Promise<Coach[]>;
  listPlayers(): Promise<Player[]>;
}

/**
 * Composite and unit grades on the HOG 0–100 scale. `units` lets a provider
 * (or a fixture) say that a team's pass rush is stronger than its defence as a
 * whole; anything it omits falls back to the side-of-the-ball grade.
 */
export type TeamGrades = {
  total: number;
  offense: number;
  defense: number;
  units?: Partial<Record<MetricId, number>>;
};

type ScheduleEntry = {
  week: number;
  opponent: string;
  opponentShort: string;
  location: 'home' | 'away';
  date: string;
  result?: 'W' | 'L';
  arkansasScore?: number;
  opponentScore?: number;
  hogIndex?: number;
  metrics?: Partial<Record<MetricId, number>>;
  opponentMetricBaselines?: Game['opponentMetricBaselines'];
};

const scheduleEntries: ScheduleEntry[] = [
  { week: 1, opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', date: 'Sep 5', result: 'W', arkansasScore: 41, opponentScore: 10, hogIndex: 68, metrics: { 'success-rate': 44, 'pressure-allowed': 34, 'pressure-generated': 31, 'four-man-pressure': 22, explosives: 6, 'explosives-allowed': 4, 'rush-success': 46, 'red-zone-touchdown-rate': 60, 'missed-tackles': 9 }, opponentMetricBaselines: { 'success-rate': { opponentAverage: 48, leagueAverage: 44, sampleSize: 8 }, 'pressure-allowed': { opponentAverage: 28, leagueAverage: 32, sampleSize: 8 }, 'pressure-generated': { opponentAverage: 27, leagueAverage: 32, sampleSize: 8 } } },
  { week: 2, opponent: 'Utah', opponentShort: 'UTAH', location: 'away', date: 'Sep 12', result: 'L', arkansasScore: 24, opponentScore: 27, hogIndex: 74, metrics: { 'success-rate': 46, 'pressure-allowed': 29, 'pressure-generated': 37, 'four-man-pressure': 28, explosives: 7, 'explosives-allowed': 5, 'rush-success': 48, 'red-zone-touchdown-rate': 67, 'missed-tackles': 8 }, opponentMetricBaselines: { 'success-rate': { opponentAverage: 42, leagueAverage: 44, sampleSize: 8 }, 'pressure-allowed': { opponentAverage: 37, leagueAverage: 32, sampleSize: 8 }, 'pressure-generated': { opponentAverage: 36, leagueAverage: 32, sampleSize: 8 } } },
  { week: 3, opponent: 'Georgia', opponentShort: 'UGA', location: 'home', date: 'Sep 19' },
  { week: 4, opponent: 'Tulsa', opponentShort: 'TLSA', location: 'home', date: 'Sep 26' },
  { week: 5, opponent: 'Texas A&M', opponentShort: 'TAMU', location: 'away', date: 'Oct 3' },
  { week: 6, opponent: 'Tennessee', opponentShort: 'TENN', location: 'home', date: 'Oct 10' },
  { week: 7, opponent: 'Vanderbilt', opponentShort: 'VAND', location: 'away', date: 'Oct 17' },
  { week: 8, opponent: 'Missouri', opponentShort: 'MIZZ', location: 'home', date: 'Oct 31' },
  { week: 9, opponent: 'Auburn', opponentShort: 'AUB', location: 'away', date: 'Nov 7' },
  { week: 10, opponent: 'South Carolina', opponentShort: 'SCAR', location: 'home', date: 'Nov 14' },
  { week: 11, opponent: 'Texas', opponentShort: 'TEX', location: 'away', date: 'Nov 21' },
  { week: 12, opponent: 'LSU', opponentShort: 'LSU', location: 'home', date: 'Nov 28' },
];

/** Every fixture game ID comes from the same canonical function the live provider uses. */
const games: Game[] = scheduleEntries.map((entry) => ({
  id: toHogWatchId(entry.opponent),
  week: entry.week,
  opponent: entry.opponent,
  opponentShort: entry.opponentShort,
  location: entry.location,
  date: entry.date,
  result: entry.result,
  arkansasScore: entry.arkansasScore,
  opponentScore: entry.opponentScore,
  hogIndex: entry.hogIndex,
  metrics: entry.metrics ?? {},
  opponentMetricBaselines: entry.opponentMetricBaselines,
}));

/**
 * Opponent unit grades on the HOG 0–100 scale. They are the only pregame
 * opponent input HogWatch holds, and every opponent metric shown in a matchup
 * is modelled from them until a stats provider supplies measured values. Keyed
 * by canonical team ID so the fixture and live schedules resolve identically.
 */
const opponentGrades: Record<string, { name: string; shortName: string; grades: TeamGrades; note: string; matchupAdjustment?: number }> = {
  'north-alabama': { name: 'North Alabama', shortName: 'UNA', grades: { total: 34, offense: 33, defense: 35, units: { 'pressure-generated': 31, 'explosives-allowed': 30, 'pressure-allowed': 36 } }, note: 'An FCS opener that sets a floor rather than a benchmark.' },
  utah: { name: 'Utah', shortName: 'UTAH', grades: { total: 66, offense: 64, defense: 68, units: { 'pressure-generated': 74, 'pressure-allowed': 58, 'explosives-allowed': 63 } }, note: 'A physical front that tests protection before conference play.' },
  georgia: { name: 'Georgia', shortName: 'UGA', grades: { total: 88, offense: 86, defense: 90, units: { 'pressure-generated': 86, 'defensive-success-rate': 91, 'explosives-allowed': 78, 'pressure-allowed': 82 } }, note: 'The season’s highest benchmark on both sides of the ball.', matchupAdjustment: -1.5 },
  tulsa: { name: 'Tulsa', shortName: 'TLSA', grades: { total: 44, offense: 45, defense: 43, units: { 'pressure-generated': 40, 'explosives-allowed': 38, 'pressure-allowed': 41 } }, note: 'The clearest schedule edge on the non-conference slate.', matchupAdjustment: 1 },
  'texas-am': { name: 'Texas A&M', shortName: 'TAMU', grades: { total: 79, offense: 80, defense: 78, units: { 'pressure-generated': 83, 'explosives-allowed': 68, 'pressure-allowed': 76 } }, note: 'A road test where explosive plays usually decide the margin.', matchupAdjustment: -1 },
  tennessee: { name: 'Tennessee', shortName: 'TENN', grades: { total: 80, offense: 84, defense: 76, units: { 'pressure-generated': 72, 'explosives-allowed': 64, 'pressure-allowed': 81 } }, note: 'Tempo and explosive plays put the four-man rush under real strain.', matchupAdjustment: 0.5 },
  vanderbilt: { name: 'Vanderbilt', shortName: 'VAND', grades: { total: 62, offense: 63, defense: 61, units: { 'pressure-generated': 57, 'explosives-allowed': 64, 'pressure-allowed': 60 } }, note: 'A winnable road game that swings on second-half execution.' },
  missouri: { name: 'Missouri', shortName: 'MIZZ', grades: { total: 71, offense: 70, defense: 72, units: { 'pressure-generated': 76, 'explosives-allowed': 67, 'pressure-allowed': 68 } }, note: 'A near-even rating where home field carries real weight.' },
  auburn: { name: 'Auburn', shortName: 'AUB', grades: { total: 73, offense: 71, defense: 75, units: { 'pressure-generated': 81, 'explosives-allowed': 69, 'pressure-allowed': 66 } }, note: 'A front seven that punishes slow starts on the road.' },
  'south-carolina': { name: 'South Carolina', shortName: 'SCAR', grades: { total: 74, offense: 70, defense: 78, units: { 'pressure-generated': 84, 'explosives-allowed': 72, 'pressure-allowed': 65 } }, note: 'Defence-first profile; scoring efficiency decides this one.' },
  texas: { name: 'Texas', shortName: 'TEX', grades: { total: 87, offense: 85, defense: 89, units: { 'pressure-generated': 85, 'defensive-success-rate': 88, 'explosives-allowed': 80, 'pressure-allowed': 84 } }, note: 'A road trip against the schedule’s second elite roster.', matchupAdjustment: -1 },
  lsu: { name: 'LSU', shortName: 'LSU', grades: { total: 82, offense: 84, defense: 80, units: { 'pressure-generated': 78, 'explosives-allowed': 70, 'pressure-allowed': 83 } }, note: 'A rivalry closer where the passing game sets the ceiling.' },
};

/**
 * Arkansas's preseason grade. In-season form is blended over it so a Week 3
 * projection is not built entirely from two games.
 */
const ARKANSAS_CAMP_GRADES: TeamGrades = { total: 66, offense: 65, defense: 68 };
/** How much a completed-game sample outweighs the camp baseline. */
const IN_SEASON_FORM_WEIGHT = 0.7;

/** The canonical metrics every team profile carries, so any two can be compared. */
const PROFILE_METRIC_IDS: MetricId[] = [
  'success-rate',
  'defensive-success-rate',
  'pressure-allowed',
  'pressure-generated',
  'four-man-pressure',
  'rush-success',
  'explosives',
  'explosives-allowed',
];

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const gradeForMetric = (metricId: MetricId, grades: TeamGrades) => {
  const unit = grades.units?.[metricId];
  if (unit !== undefined) return unit;
  const { category } = METRIC_METADATA[metricId];
  if (category === 'offense') return grades.offense;
  if (category === 'defense') return grades.defense;
  return grades.total;
};

/**
 * Builds a comparable profile from unit grades, preferring measured values
 * wherever they exist and labelling everything else as modelled.
 */
const buildTeamProfile = (input: {
  teamId: string;
  name: string;
  shortName: string;
  grades: TeamGrades;
  observed?: Partial<Record<MetricId, number>>;
  note?: string;
}): TeamProfile => {
  const metrics: TeamMetricProfile[] = PROFILE_METRIC_IDS.map((metricId) => {
    const observed = input.observed?.[metricId];
    if (observed !== undefined) {
      return { metricId, value: observed, percentile: metricPercentile(metricId, observed), basis: 'observed' as const };
    }
    const modelled = metricValueFromUnitGrade(metricId, gradeForMetric(metricId, input.grades));
    return { metricId, value: modelled, percentile: metricPercentile(metricId, modelled), basis: 'modelled' as const };
  });
  return {
    teamId: input.teamId,
    name: input.name,
    shortName: input.shortName,
    rating: ratingFromHogIndex(input.grades),
    metrics,
    note: input.note,
  };
};

const opponentProfile = (game: Game): TeamProfile | undefined => {
  const entry = opponentGrades[toHogWatchId(game.opponent)];
  if (!entry) return undefined;
  return buildTeamProfile({
    teamId: toHogWatchId(game.opponent),
    name: entry.name,
    shortName: entry.shortName || game.opponentShort,
    grades: entry.grades,
    note: entry.note,
  });
};

const gameHogIndexes: Record<string, HogIndex> = {
  'north-alabama': calculateHogIndex({ offense: 67, defense: 70, coaching: 69, development: 66 }),
  utah: calculateHogIndex({ offense: 72, defense: 76, coaching: 75, development: 70 }),
};

const completedGames = (source: readonly Game[] = games) => source.filter((game) => game.result);

/** Only games played *before* the given week, so a projection cannot see its own result. */
const gamesBefore = (week: number, source: readonly Game[] = games) =>
  source.filter((game) => game.week < week && game.result);

const arkansasGradesBefore = (week: number, source: readonly Game[] = games): TeamGrades => {
  const played = gamesBefore(week, source).filter((game) => gameHogIndexes[game.id]);
  if (played.length === 0) return ARKANSAS_CAMP_GRADES;
  const indexes = played.map((game) => gameHogIndexes[game.id] as HogIndex);
  const blend = (form: number, camp: number) => Math.round(form * IN_SEASON_FORM_WEIGHT + camp * (1 - IN_SEASON_FORM_WEIGHT));
  return {
    total: blend(average(indexes.map((index) => index.total)), ARKANSAS_CAMP_GRADES.total),
    offense: blend(average(indexes.map((index) => index.offense)), ARKANSAS_CAMP_GRADES.offense),
    defense: blend(average(indexes.map((index) => index.defense)), ARKANSAS_CAMP_GRADES.defense),
  };
};

const arkansasObservedMetricsBefore = (week: number, source: readonly Game[] = games): Partial<Record<MetricId, number>> => {
  const played = gamesBefore(week, source);
  const observed: Partial<Record<MetricId, number>> = {};
  for (const metricId of PROFILE_METRIC_IDS) {
    const values = played.flatMap((game) => {
      const value = game.metrics[metricId];
      return value === undefined ? [] : [value];
    });
    if (values.length) observed[metricId] = round1(average(values));
  }
  return observed;
};

const confidenceBefore = (week: number, source: readonly Game[] = games): PredictionConfidence => {
  const played = gamesBefore(week, source).length;
  if (played === 0) return 'preseason';
  return played < 4 ? 'early' : 'established';
};

const arkansasProfileBefore = (week: number, source: readonly Game[] = games): TeamProfile => buildTeamProfile({
  teamId: 'arkansas',
  name: 'Arkansas',
  shortName: 'ARK',
  grades: arkansasGradesBefore(week, source),
  observed: arkansasObservedMetricsBefore(week, source),
  note: 'Camp baseline blended with completed-game form at 30/70.',
});

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(round1(value))}`;

const predictionFactors = (
  game: Game,
  edges: readonly MatchupUnitEdge[],
  arkansas: TeamProfile,
  opponent: TeamProfile,
): PredictionFactor[] => {
  const ranked = [...edges].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const arkansasEdge = ranked.find((edge) => edge.edge === 'arkansas');
  const opponentEdge = ranked.find((edge) => edge.edge === 'opponent');
  const ratingGap = round1(arkansas.rating.power - opponent.rating.power);
  const factors: PredictionFactor[] = [];
  if (arkansasEdge) {
    factors.push({ label: arkansasEdge.label, detail: `Arkansas ${signed(arkansasEdge.gap)} percentile`, tone: 'edge' });
  }
  if (opponentEdge) {
    factors.push({ label: opponentEdge.label, detail: `${opponent.shortName} ${signed(-opponentEdge.gap)} percentile`, tone: 'watch' });
  }
  factors.push({
    label: 'Neutral-field rating',
    detail: ratingGap >= 0 ? `Arkansas ${signed(ratingGap)} pts` : `${opponent.shortName} ${signed(-ratingGap)} pts`,
    tone: ratingGap >= 0 ? 'edge' : 'watch',
  });
  factors.push({
    label: game.location === 'home' ? 'Home field' : 'Road game',
    detail: `${signed(game.location === 'home' ? POWER_RATING.homeFieldPoints : -POWER_RATING.homeFieldPoints)} pts`,
    tone: game.location === 'home' ? 'edge' : 'watch',
  });
  return factors;
};

const predictionSummary = (
  game: Game,
  projection: Omit<GamePrediction, 'summary' | 'factors' | 'outcome'>,
  edges: readonly MatchupUnitEdge[],
  opponent: TeamProfile,
): string => {
  const lean = projection.winProbability >= 50 ? 'Arkansas' : opponent.name;
  const margin = Math.abs(projection.projectedMargin);
  const band = Math.abs(projection.winProbability - 50) <= 10
    ? 'This is close to a coin flip'
    : Math.abs(projection.winProbability - 50) >= 30
      ? 'The model is confident'
      : 'The model leans but does not commit';
  const decisive = [...edges].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  const swing = decisive
    ? decisive.edge === 'even'
      ? ` The widest gap is ${decisive.shortLabel}, and even that is close to level.`
      : ` The game turns on ${decisive.shortLabel}, where ${decisive.edge === 'arkansas' ? 'Arkansas' : opponent.name} holds the edge.`
    : '';
  return `${lean} by ${margin} at ${projection.winProbability}%, projected ${projection.projectedArkansasScore}–${projection.projectedOpponentScore}. ${band}: six outcomes in ten land between ${projection.likelyMargin.low} and ${projection.likelyMargin.high} points.${swing}`;
};

/**
 * Builds the pregame call for a game. Predictions are produced for completed
 * games too, from inputs frozen before kickoff, and scored against the result
 * so the model keeps a public record instead of erasing it.
 */
const predictionFor = (game: Game, source: readonly Game[] = games): GamePrediction | undefined => {
  const opponent = opponentProfile(game);
  if (!opponent) return undefined;
  const arkansas = arkansasProfileBefore(game.week, source);
  const edges = calculateMatchupEdges(arkansas, opponent);
  const projection = calculateGamePrediction({
    arkansas: arkansas.rating,
    opponent: opponent.rating,
    location: game.location,
    confidence: confidenceBefore(game.week, source),
    matchupAdjustment: opponentGrades[toHogWatchId(game.opponent)]?.matchupAdjustment,
  });
  const outcome = game.arkansasScore !== undefined && game.opponentScore !== undefined
    ? scorePrediction(projection, { arkansasScore: game.arkansasScore, opponentScore: game.opponentScore })
    : undefined;
  return {
    ...projection,
    summary: predictionSummary(game, projection, edges, opponent),
    factors: predictionFactors(game, edges, arkansas, opponent),
    outcome,
  };
};

const withPrediction = (game: Game, source: readonly Game[] = games): Game => {
  const prediction = predictionFor(game, source);
  return prediction ? { ...game, prediction } : game;
};

const matchupPreviewFor = (game: Game, provenance: AnalyticsProvenance, source: readonly Game[] = games): MatchupPreview | undefined => {
  const opponent = opponentProfile(game);
  const prediction = predictionFor(game, source);
  if (!opponent || !prediction) return undefined;
  const arkansas = arkansasProfileBefore(game.week, source);
  const edges = calculateMatchupEdges(arkansas, opponent);
  const swingFactors = [...edges].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 3);
  const modelled = [...arkansas.metrics, ...opponent.metrics].filter((metric) => metric.basis === 'modelled').length;
  return {
    game: { ...game, prediction },
    arkansas,
    opponent,
    prediction,
    edges,
    swingFactors,
    summary: `${prediction.summary}${opponent.note ? ` ${opponent.note}` : ''}`.trim(),
    provenance: {
      ...provenance,
      coverage: `${provenance.coverage} Opponent unit values in this matchup are modelled from composite grades (${modelled} of ${arkansas.metrics.length + opponent.metrics.length} values on this page).`,
    },
  };
};

const predictionRecordEntries = (source: readonly Game[] = games): PredictionRecordEntry[] =>
  completedGames(source).flatMap((game): PredictionRecordEntry[] => {
    const prediction = predictionFor(game, source);
    if (!prediction?.outcome) return [];
    return [{
      gameId: game.id,
      week: game.week,
      opponent: game.opponent,
      winProbability: prediction.winProbability,
      projectedMargin: prediction.projectedMargin,
      actualMargin: prediction.outcome.actualMargin,
      calledWinnerCorrectly: prediction.outcome.calledWinnerCorrectly,
      brierScore: prediction.outcome.brierScore,
    }];
  });

const predictionRecordFor = (provenance: AnalyticsProvenance, source: readonly Game[] = games): PredictionRecord => {
  const entries = predictionRecordEntries(source);
  const summary = summarizePredictionRecord(entries);
  const note = summary.gamesScored === 0
    ? 'No game has been played yet, so the model has no record to show.'
    : summary.brierScore < summary.coinFlipBrierScore
      ? `Through ${summary.gamesScored} game${summary.gamesScored === 1 ? '' : 's'} the model beats a coin flip (${summary.brierScore} vs ${summary.coinFlipBrierScore}) and misses the margin by ${summary.meanAbsoluteMarginError} points on average.`
      : `Through ${summary.gamesScored} game${summary.gamesScored === 1 ? '' : 's'} the model is no better than a coin flip (${summary.brierScore} vs ${summary.coinFlipBrierScore}). Treat its calls with that in mind.`;
  return { entries, ...summary, note, provenance };
};

/**
 * Expected wins, summing win probabilities rather than counting favourites, so
 * the projected record answers to the same model the game pages show.
 */
const projectedRecord = (source: readonly Game[] = games): string => {
  const played = completedGames(source);
  const wins = played.filter((game) => game.result === 'W').length;
  const upcoming = source.filter((game) => !game.result);
  const previewed = upcoming.flatMap((game) => {
    const prediction = predictionFor(game, source);
    return prediction ? [prediction.winProbability / 100] : [];
  });
  if (previewed.length === 0) return `${wins}-${played.length - wins}`;
  const expectedWins = Math.round(wins + previewed.reduce((total, probability) => total + probability, 0));
  const scoped = played.length + previewed.length;
  return `${expectedWins}-${scoped - expectedWins}`;
};

const fixtureProvenance = (): AnalyticsProvenance => ({
  source: 'mock',
  provider: 'HogWatch fixture repository',
  coverage: 'Fixture data: 2026 Arkansas schedule with Weeks 1–2 graded. Opponent ratings are HogWatch estimates, not a vendor feed.',
  updatedAt: '2026-08-15T00:00:00.000Z',
});

const mockProvenance: AnalyticsProvenance = fixtureProvenance();

const coaches: Coach[] = [
  { id: 'silverfield', name: 'Ryan Silverfield', role: 'Head Coach', grade: 'B+', note: 'Track discipline, situational decisions, special teams and second-half performance.', scorecard: [{ label: 'Game Management', score: 84, grade: 'A-' }, { label: 'Adjustments', score: 91, grade: 'A' }, { label: 'Discipline', score: 76, grade: 'B' }, { label: 'Development', score: 81, grade: 'B+' }, { label: 'Special Teams', score: 67, grade: 'C+' }] },
  { id: 'cramsey', name: 'Tim Cramsey', role: 'Offensive Coordinator', grade: 'B', note: 'Success rate and pressure allowed are the primary indicators.', scorecard: [{ label: 'Success Rate', score: 80, grade: 'B+' }, { label: 'Protection', score: 74, grade: 'B' }, { label: 'Explosives', score: 82, grade: 'B+' }, { label: 'Red Zone', score: 77, grade: 'B' }] },
  { id: 'roberts', name: 'Ron Roberts', role: 'Defensive Coordinator', grade: 'A-', note: 'Four-man pressure and explosive-play prevention tell us whether the structure is sustainable.', scorecard: [{ label: 'Success Rate', score: 87, grade: 'A-' }, { label: 'Pressure', score: 91, grade: 'A' }, { label: 'Explosives', score: 84, grade: 'B+' }, { label: 'Tackling', score: 79, grade: 'B+' }] },
];

const players: Player[] = [
  { id: 'kj-jackson', name: 'KJ Jackson', number: 7, position: 'QB', classYear: 'JR', height: '6′3″', weight: 218, hometown: 'Montgomery, AL', stats: { 'Comp %': '66.1%', Yards: 441, 'TD / INT': '3 / 0', 'TWP %': '1.8%' } },
  { id: 'quincy-rhodes', name: 'Quincy Rhodes Jr.', number: 5, position: 'EDGE', classYear: 'JR', height: '6′6″', weight: 275, hometown: 'North Little Rock, AR', stats: { 'Pressure rate': '14.8%', Sacks: 0, Hurries: 8, 'Run stops': 6 } },
];

const gameCopy: Record<string, Pick<GameAnalysis, 'story' | 'thesis'>> = {
  'north-alabama': { thesis: 'A winning formula showed up on film.', story: 'Arkansas took care of the opener, but the next opponent would be the real measure of whether the process traveled.' },
  utah: { thesis: 'A better process, but not enough finishing.', story: 'Arkansas protected the quarterback better and found more pressure without blitzing. The concern: explosive gains still created too much volatility.' },
};

/** Derived pregame copy, so no game shows a sentence written about a different game. */
const pregameCopy = (game: Game): Pick<GameAnalysis, 'story' | 'thesis'> => ({
  thesis: 'The evidence starts before kickoff.',
  story: `HogWatch has a full matchup preview for Week ${game.week} against ${game.opponent}. The postgame grade is added once the game is final.`,
});

const coachTrends: Record<string, { values: number[]; implication: string }> = {
  silverfield: { values: [70, 73, 75, 78], implication: 'The operation is trending toward cleaner football.' },
  cramsey: { values: [68, 71, 74, 77], implication: 'The line is giving the offense a chance to stay on schedule.' },
  roberts: { values: [72, 77, 81, 85], implication: 'The front is winning without borrowing numbers.' },
};

const playerInsights: Record<string, PlayerInsight> = {
  'kj-jackson': {
    stock: 'Rising', stockNote: 'Cleaner decisions', role: 'The offense is asking him to stay on schedule, then attack when protection earns it.', story: 'Jackson has avoided turnover-worthy throws while the front improved its protection. That makes the modest success-rate jump worth watching.',
    trend: { metricId: 'success-rate', label: 'Completion rate', suffix: '%', values: [63.8, 66.1], weeks: [1, 2], goodDirection: 'up' }, metricIds: ['success-rate', 'pressure-allowed'], details: { 'Comp %': 'Up 2.3 points since opener', Yards: 'Through two games', 'TD / INT': 'No interceptions', 'TWP %': 'Lower is better' },
  },
  'quincy-rhodes': {
    stock: 'Rising', stockNote: 'Winning his rushes', role: 'The edge is creating disruption without the defense having to overcommit a blitz.', story: 'Rhodes has helped make the pressure jump sustainable. The next question is whether those hurries begin to finish as sacks against SEC tackles.',
    trend: { metricId: 'pressure-generated', label: 'Pressure rate', suffix: '%', values: [11.4, 14.8], weeks: [1, 2], goodDirection: 'up' }, metricIds: ['pressure-generated', 'missed-tackles'], details: { 'Pressure rate': 'Up 3.4 points since opener', Sacks: 'Finish opportunities', Hurries: 'Through two games', 'Run stops': 'Early-down impact' },
  },
};

const makeTrend = (query: MetricTrendQuery): TrendSeries | undefined => {
  const samples = completedGames().flatMap((game) => {
    const value = game.metrics[query.metricId];
    if (value === undefined) return [];
    const baseline = game.opponentMetricBaselines?.[query.metricId];
    const normalized = query.adjustment === 'opponent-adjusted' && baseline
      ? calculateOpponentAdjustedMetric(value, baseline).adjustedValue
      : value;
    return [{ week: game.week, value: normalized }];
  });
  if (samples.length === 0) return undefined;
  const values = query.rollingWindow ? calculateRollingAverage(samples.map((sample) => sample.value), query.rollingWindow) : samples.map((sample) => sample.value);
  const metricId = query.metricId;
  const metadata = METRIC_METADATA[metricId];
  return { metricId, label: metadata.label, suffix: metadata.suffix, values, weeks: samples.map((sample) => sample.week), goodDirection: metadata.goodDirection };
};

const metricTrend = (query: MetricTrendQuery): MetricTrend | undefined => {
  const { metricId } = query;
  if (metricId === 'hog-index') {
    const played = completedGames().filter((game) => game.hogIndex !== undefined);
    const rawValues = played.map((game) => game.hogIndex as number);
    if (rawValues.length === 0) return undefined;
    const values = query.rollingWindow ? calculateRollingAverage(rawValues, query.rollingWindow) : rawValues;
    return { metricId, label: METRIC_METADATA[metricId].label, values, weeks: played.map((game) => game.week), goodDirection: 'up', provenance: mockProvenance };
  }
  const trend = makeTrend(query);
  return trend ? { ...trend, provenance: mockProvenance } : undefined;
};

const metricSignal = (metricId: MetricId, latest: Game, previous: Game): Metric | undefined => {
  const value = latest.metrics[metricId];
  const previousValue = previous.metrics[metricId];
  if (value === undefined || previousValue === undefined) return undefined;
  const metadata = METRIC_METADATA[metricId];
  return { id: metricId, label: metadata.label, value, unit: metadata.suffix, delta: value - previousValue, goodDirection: metadata.goodDirection };
};

/** A dashboard headline written from the numbers rather than fixed to one week. */
const seasonStory = (signals: Metric[], latest?: Game): string => {
  if (!latest) return 'The schedule is set. HogWatch grades every game from the moment the first one is final.';
  const improving = signals.filter((signal) => (signal.goodDirection === 'up' ? (signal.delta ?? 0) >= 0 : (signal.delta ?? 0) <= 0));
  if (!signals.length) return `Week ${latest.week} against ${latest.opponent} is in the books.`;
  if (improving.length === signals.length) return `Every tracked signal moved the right way against ${latest.opponent}.`;
  if (improving.length === 0) return `Week ${latest.week} moved every tracked signal the wrong way.`;
  const concern = signals.find((signal) => !improving.includes(signal));
  return `${improving[0]?.label ?? 'The process'} improved against ${latest.opponent}; ${(concern?.label ?? 'volatility').toLowerCase()} did not.`;
};

const gameAnalysis = (game: Game): GameAnalysis => ({
  ...(gameCopy[game.id] ?? pregameCopy(game)),
  game: withPrediction(game),
  hogIndex: gameHogIndexes[game.id],
  provenance: mockProvenance,
});

export class MockHogWatchRepository implements HogWatchRepository {
  async getSeasonDashboard(): Promise<SeasonDashboard> {
    const played = completedGames();
    const latestGame = played.at(-1);
    const previousGame = played.at(-2);
    const latestIndex = latestGame ? gameHogIndexes[latestGame.id] : undefined;
    const previousIndex = previousGame ? gameHogIndexes[previousGame.id] : undefined;
    const signalIds: MetricId[] = ['pressure-allowed', 'pressure-generated', 'explosives-allowed'];
    const signals = latestGame && previousGame ? signalIds.map((metricId) => metricSignal(metricId, latestGame, previousGame)).filter((signal): signal is Metric => Boolean(signal)) : [];
    const wins = played.filter((game) => game.result === 'W').length;
    return {
      team: 'Arkansas', season: 2026, record: `${wins}-${played.length - wins}`, projectedRecord: projectedRecord(),
      completedGames: played.length, latestGame: latestGame ? withPrediction(latestGame) : undefined,
      hogIndex: latestIndex, hogIndexDelta: latestIndex && previousIndex ? latestIndex.total - previousIndex.total : undefined,
      story: seasonStory(signals, latestGame), signals, provenance: mockProvenance,
    };
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    const game = games.find((candidate) => candidate.id === gameId);
    return game ? gameAnalysis(game) : undefined;
  }

  async getMatchupPreview(gameId: string): Promise<MatchupPreview | undefined> {
    const game = games.find((candidate) => candidate.id === gameId);
    return game ? matchupPreviewFor(game, mockProvenance) : undefined;
  }

  async getPredictionRecord(): Promise<PredictionRecord> {
    return predictionRecordFor(mockProvenance);
  }

  async getCoachReport(coachId: string): Promise<CoachReport | undefined> {
    const coach = coaches.find((candidate) => candidate.id === coachId);
    const trend = coachTrends[coachId];
    if (!coach || !trend) return undefined;
    return { coach, implication: trend.implication, trend: { metricId: 'hog-index', label: `${coach.name} score`, values: trend.values, weeks: [1, 2, 3, 4], goodDirection: 'up' }, provenance: mockProvenance };
  }

  async getPlayerReport(playerId: string): Promise<PlayerReport | undefined> {
    const player = players.find((candidate) => candidate.id === playerId);
    const insight = playerInsights[playerId];
    return player && insight ? { player, insight, provenance: mockProvenance } : undefined;
  }

  async getMetricTrend(query: MetricTrendQuery): Promise<MetricTrend | undefined> {
    return metricTrend(query);
  }

  /**
   * Compares any two games that both carry measured metrics. The gate is the
   * data, not the final score, so a graded game still compares before its
   * result is posted.
   */
  async compareGames(gameAId: string, gameBId: string): Promise<GameComparison | undefined> {
    const gameA = games.find((game) => game.id === gameAId);
    const gameB = games.find((game) => game.id === gameBId);
    if (!gameA || !gameB || gameA.id === gameB.id) return undefined;
    const metricComparisons = METRIC_IDS.filter((metricId) => metricId !== 'hog-index').flatMap((metricId): MetricComparison[] => {
      const gameAValue = gameA.metrics[metricId];
      const gameBValue = gameB.metrics[metricId];
      if (gameAValue === undefined || gameBValue === undefined) return [];
      return [{
        metricId, label: METRIC_METADATA[metricId].label, gameA: gameAValue, gameB: gameBValue,
        delta: Math.round((gameBValue - gameAValue) * 10) / 10, goodDirection: METRIC_METADATA[metricId].goodDirection,
        gameAPercentile: metricPercentile(metricId, gameAValue), gameBPercentile: metricPercentile(metricId, gameBValue),
      }];
    });
    if (metricComparisons.length === 0) return undefined;
    const improved = metricComparisons.filter((metric) => (metric.goodDirection === 'up' ? metric.delta > 0 : metric.delta < 0));
    return {
      gameA,
      gameB,
      metricComparisons,
      summary: `${improved.length} of ${metricComparisons.length} shared metrics moved the right way from ${gameA.opponent} to ${gameB.opponent}.`,
      provenance: mockProvenance,
    };
  }

  async listGames(): Promise<Game[]> { return games.map((game) => withPrediction(game)); }
  async listCoaches(): Promise<Coach[]> { return coaches; }
  async listPlayers(): Promise<Player[]> { return players; }
}

export const mockHogWatchRepository = new MockHogWatchRepository();

type ScheduleProvider = { getSeasonSchedule(season?: number): Promise<import('./openai-web-search.ts').LiveScheduleSnapshot> };

class OfficialThenAdminFallbackScheduleProvider implements ScheduleProvider {
  constructor(private readonly official: ScheduleProvider, private readonly adminFallback?: ScheduleProvider) {}

  async getSeasonSchedule(season?: number) {
    try {
      return await this.official.getSeasonSchedule(season);
    } catch (error) {
      if (this.adminFallback) return this.adminFallback.getSeasonSchedule(season);
      throw error;
    }
  }
}

class LiveScheduleRepository implements HogWatchRepository {
  constructor(private readonly fallback: HogWatchRepository, private readonly scheduleProvider: ScheduleProvider) {}

  private async schedule() { return this.scheduleProvider.getSeasonSchedule(); }
  private async fallbackOnFailure<T>(live: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try { return await live(); } catch { return fallback(); }
  }

  async getSeasonDashboard(): Promise<SeasonDashboard> {
    return this.fallbackOnFailure<SeasonDashboard>(async () => {
      const { games: liveGames, provenance } = await this.schedule();
      const completed = liveGames.filter((game) => game.result);
      const wins = completed.filter((game) => game.result === 'W').length;
      const previewed = liveGames.filter((game) => !game.result && predictionFor(game, liveGames)).length;
      return {
        team: 'Arkansas', season: 2026, record: `${wins}-${completed.length - wins}`,
        projectedRecord: projectedRecord(liveGames), completedGames: completed.length,
        latestGame: completed.at(-1) ? withPrediction(completed.at(-1) as Game, liveGames) : undefined,
        story: completed.length
          ? 'Live final scores are synced. HOG Index grading follows once verified play-level data is available.'
          : `The official schedule is live and ${previewed} matchup preview${previewed === 1 ? ' is' : 's are'} ready. HOG Index grading begins after the first game.`,
        signals: [], provenance,
      };
    }, () => this.fallback.getSeasonDashboard());
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    return this.fallbackOnFailure(async () => {
      const { games: liveGames, provenance } = await this.schedule();
      const game = liveGames.find((candidate) => candidate.id === gameId);
      return game ? {
        game: withPrediction(game, liveGames),
        thesis: game.result ? 'Final score confirmed; advanced grading is pending.' : 'The evidence starts before kickoff.',
        story: game.result
          ? 'HogWatch will publish a scorecard after its advanced metrics are independently verified.'
          : `HogWatch has a full matchup preview for Week ${game.week} against ${game.opponent}. The postgame grade is added once the game is final.`,
        provenance,
      } : undefined;
    }, () => this.fallback.getGameAnalysis(gameId));
  }

  async getMatchupPreview(gameId: string): Promise<MatchupPreview | undefined> {
    return this.fallbackOnFailure(async () => {
      const { games: liveGames, provenance } = await this.schedule();
      const game = liveGames.find((candidate) => candidate.id === gameId);
      return game ? matchupPreviewFor(game, provenance, liveGames) : undefined;
    }, () => this.fallback.getMatchupPreview(gameId));
  }

  async getPredictionRecord(): Promise<PredictionRecord> {
    return this.fallbackOnFailure(async () => {
      const { games: liveGames, provenance } = await this.schedule();
      return predictionRecordFor(provenance, liveGames);
    }, () => this.fallback.getPredictionRecord());
  }

  async getCoachReport(coachId: string) { return this.fallback.getCoachReport(coachId); }
  async getPlayerReport(playerId: string) { return this.fallback.getPlayerReport(playerId); }
  async getMetricTrend(query: MetricTrendQuery) { return this.fallback.getMetricTrend(query); }
  async compareGames(gameAId: string, gameBId: string) { return this.fallback.compareGames(gameAId, gameBId); }
  async listGames() {
    return this.fallbackOnFailure(async () => {
      const { games: liveGames } = await this.schedule();
      return liveGames.map((game) => withPrediction(game, liveGames));
    }, () => this.fallback.listGames());
  }
  async listCoaches() { return this.fallback.listCoaches(); }
  async listPlayers() { return this.fallback.listPlayers(); }
}

type HogWatchEnvironment = Record<string, string | undefined>;

const defaultEnvironment = (): HogWatchEnvironment =>
  typeof process === 'undefined' ? {} : process.env;

export const createHogWatchRepository = (
  environment: HogWatchEnvironment = defaultEnvironment(),
  options: { liveScheduleCache?: LiveScheduleCache } = {},
): HogWatchRepository => {
  if (environment.HOGWATCH_LIVE_DATA_ENABLED === 'true') {
    const official = new ArkansasOfficialScheduleProvider({ cache: options.liveScheduleCache });
    const adminFallback = environment.HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK === 'true' && environment.OPENAI_API_KEY
      ? new OpenAIWebSearchScheduleProvider(environment.OPENAI_API_KEY, { model: environment.HOGWATCH_OPENAI_MODEL, cache: options.liveScheduleCache })
      : undefined;
    return new LiveScheduleRepository(mockHogWatchRepository, new OfficialThenAdminFallbackScheduleProvider(official, adminFallback));
  }
  return mockHogWatchRepository;
};

/** The sole composition root used by both web and MCP runtimes. */
export const hogWatchRepository = createHogWatchRepository();

/** Exported for provider adapters and tests that need the canonical opponent set. */
export const listOpponentProfiles = (): TeamProfile[] => Object.entries(opponentGrades).map(([teamId, entry]) => buildTeamProfile({
  teamId, name: entry.name, shortName: entry.shortName, grades: entry.grades, note: entry.note,
}));
