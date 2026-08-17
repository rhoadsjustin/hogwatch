import {
  calculateOpponentAdjustedMetric,
  calculateRollingAverage,
  isMetricId,
  calculateHogIndex,
  METRIC_IDS,
  METRIC_METADATA,
  type AnalyticsProvenance,
  type Coach,
  type CoachReport,
  type Game,
  type GameAnalysis,
  type GameComparison,
  type HogIndex,
  type Metric,
  type MetricComparison,
  type MetricId,
  type MetricTrend,
  type MetricTrendQuery,
  type Player,
  type PlayerInsight,
  type PlayerReport,
  type SeasonDashboard,
  type TrendSeries,
} from '@hogwatch/core';
import { OpenAIWebSearchScheduleProvider, type LiveScheduleCache } from './openai-web-search.ts';

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

export type ProviderSeasonSnapshot = {
  team: string;
  season: number;
  games: readonly ProviderGameInput[];
  coaches: readonly Coach[];
  players: readonly Player[];
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
  getCoachReport(coachId: string): Promise<CoachReport | undefined>;
  getPlayerReport(playerId: string): Promise<PlayerReport | undefined>;
  getMetricTrend(query: MetricTrendQuery): Promise<MetricTrend | undefined>;
  compareGames(gameAId: string, gameBId: string): Promise<GameComparison | undefined>;
  listGames(): Promise<Game[]>;
  listCoaches(): Promise<Coach[]>;
  listPlayers(): Promise<Player[]>;
}

const games: Game[] = [
  { id: 'north-alabama', week: 1, opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', result: 'W', arkansasScore: 41, opponentScore: 10, date: 'Sep 5', hogIndex: 68, metrics: { 'success-rate': 44, 'pressure-allowed': 34, 'pressure-generated': 31, 'four-man-pressure': 22, explosives: 6, 'explosives-allowed': 4, 'rush-success': 46, 'red-zone-touchdown-rate': 60, 'missed-tackles': 9 }, opponentMetricBaselines: { 'success-rate': { opponentAverage: 48, leagueAverage: 44, sampleSize: 8 }, 'pressure-allowed': { opponentAverage: 28, leagueAverage: 32, sampleSize: 8 }, 'pressure-generated': { opponentAverage: 27, leagueAverage: 32, sampleSize: 8 } } },
  { id: 'utah', week: 2, opponent: 'Utah', opponentShort: 'UTAH', location: 'away', result: 'L', arkansasScore: 24, opponentScore: 27, date: 'Sep 12', hogIndex: 74, metrics: { 'success-rate': 46, 'pressure-allowed': 29, 'pressure-generated': 37, 'four-man-pressure': 28, explosives: 7, 'explosives-allowed': 5, 'rush-success': 48, 'red-zone-touchdown-rate': 67, 'missed-tackles': 8 }, opponentMetricBaselines: { 'success-rate': { opponentAverage: 42, leagueAverage: 44, sampleSize: 8 }, 'pressure-allowed': { opponentAverage: 37, leagueAverage: 32, sampleSize: 8 }, 'pressure-generated': { opponentAverage: 36, leagueAverage: 32, sampleSize: 8 } } },
  { id: 'georgia', week: 3, opponent: 'Georgia', opponentShort: 'UGA', location: 'home', date: 'Sep 19', metrics: {} },
  { id: 'tulsa', week: 4, opponent: 'Tulsa', opponentShort: 'TLSA', location: 'home', date: 'Sep 26', metrics: {} },
  { id: 'texas-am', week: 5, opponent: 'Texas A&M', opponentShort: 'TAMU', location: 'away', date: 'Oct 3', metrics: {} },
  { id: 'tennessee', week: 6, opponent: 'Tennessee', opponentShort: 'TENN', location: 'home', date: 'Oct 10', metrics: {} },
];

const mockProvenance: AnalyticsProvenance = {
  source: 'mock',
  provider: 'HogWatch fixture repository',
  coverage: '2026 Arkansas schedule through Week 2; future games are placeholders.',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

const coaches: Coach[] = [
  { id: 'silverfield', name: 'Ryan Silverfield', role: 'Head Coach', grade: 'B+', note: 'Track discipline, situational decisions, special teams and second-half performance.', scorecard: [{ label: 'Game Management', score: 84, grade: 'A-' }, { label: 'Adjustments', score: 91, grade: 'A' }, { label: 'Discipline', score: 76, grade: 'B' }, { label: 'Development', score: 81, grade: 'B+' }, { label: 'Special Teams', score: 67, grade: 'C+' }] },
  { id: 'cramsey', name: 'Tim Cramsey', role: 'Offensive Coordinator', grade: 'B', note: 'Success rate and pressure allowed are the primary indicators.', scorecard: [{ label: 'Success Rate', score: 80, grade: 'B+' }, { label: 'Protection', score: 74, grade: 'B' }, { label: 'Explosives', score: 82, grade: 'B+' }, { label: 'Red Zone', score: 77, grade: 'B' }] },
  { id: 'roberts', name: 'Ron Roberts', role: 'Defensive Coordinator', grade: 'A-', note: 'Four-man pressure and explosive-play prevention tell us whether the structure is sustainable.', scorecard: [{ label: 'Success Rate', score: 87, grade: 'A-' }, { label: 'Pressure', score: 91, grade: 'A' }, { label: 'Explosives', score: 84, grade: 'B+' }, { label: 'Tackling', score: 79, grade: 'B+' }] },
];

const players: Player[] = [
  { id: 'kj-jackson', name: 'KJ Jackson', number: 7, position: 'QB', classYear: 'JR', height: '6′3″', weight: 218, hometown: 'Montgomery, AL', stats: { 'Comp %': '66.1%', Yards: 441, 'TD / INT': '3 / 0', 'TWP %': '1.8%' } },
  { id: 'quincy-rhodes', name: 'Quincy Rhodes Jr.', number: 5, position: 'EDGE', classYear: 'JR', height: '6′6″', weight: 275, hometown: 'North Little Rock, AR', stats: { 'Pressure rate': '14.8%', Sacks: 0, Hurries: 8, 'Run stops': 6 } },
];

const gameHogIndexes: Record<string, HogIndex> = {
  'north-alabama': calculateHogIndex({ offense: 67, defense: 70, coaching: 69, development: 66 }),
  utah: calculateHogIndex({ offense: 72, defense: 76, coaching: 75, development: 70 }),
};

const gameCopy: Record<string, Pick<GameAnalysis, 'story' | 'thesis'>> = {
  'north-alabama': { thesis: 'A winning formula showed up on film.', story: 'Arkansas took care of the opener, but the next opponent would be the real measure of whether the process traveled.' },
  utah: { thesis: 'A better process, but not enough finishing.', story: 'Arkansas protected the quarterback better and found more pressure without blitzing. The concern: explosive gains still created too much volatility.' },
  georgia: { thesis: 'The evidence starts before kickoff.', story: 'HogWatch will add the matchup context, opponent profile, and postgame grade here once the game is final.' },
  tulsa: { thesis: 'The evidence starts before kickoff.', story: 'HogWatch will add the matchup context, opponent profile, and postgame grade here once the game is final.' },
  'texas-am': { thesis: 'The evidence starts before kickoff.', story: 'HogWatch will add the matchup context, opponent profile, and postgame grade here once the game is final.' },
  tennessee: { thesis: 'The evidence starts before kickoff.', story: 'HogWatch will add the matchup context, opponent profile, and postgame grade here once the game is final.' },
};

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

const completedGames = () => games.filter((game) => game.result);

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

const gameAnalysis = (game: Game): GameAnalysis => ({ ...gameCopy[game.id], game, hogIndex: gameHogIndexes[game.id], provenance: mockProvenance });

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
    return { team: 'Arkansas', season: 2026, record: `${wins}-${played.length - wins}`, projectedRecord: '5-7', completedGames: played.length, latestGame, hogIndex: latestIndex, hogIndexDelta: latestIndex && previousIndex ? latestIndex.total - previousIndex.total : undefined, story: 'Protection improved against a real pass rush.', signals, provenance: mockProvenance };
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    const game = games.find((candidate) => candidate.id === gameId);
    return game ? gameAnalysis(game) : undefined;
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

  async compareGames(gameAId: string, gameBId: string): Promise<GameComparison | undefined> {
    const gameA = games.find((game) => game.id === gameAId);
    const gameB = games.find((game) => game.id === gameBId);
    if (!gameA?.result || !gameB?.result) return undefined;
    const metricComparisons = METRIC_IDS.filter((metricId) => metricId !== 'hog-index').flatMap((metricId): MetricComparison[] => {
      const gameAValue = gameA.metrics[metricId];
      const gameBValue = gameB.metrics[metricId];
      if (gameAValue === undefined || gameBValue === undefined) return [];
      return [{ metricId, label: METRIC_METADATA[metricId].label, gameA: gameAValue, gameB: gameBValue, delta: gameBValue - gameAValue, goodDirection: METRIC_METADATA[metricId].goodDirection }];
    });
    return { gameA, gameB, metricComparisons, summary: 'The process improved from the opener: Arkansas allowed less pressure and generated more of its own, but explosive gains remain the volatile issue.', provenance: mockProvenance };
  }

  async listGames(): Promise<Game[]> { return games; }
  async listCoaches(): Promise<Coach[]> { return coaches; }
  async listPlayers(): Promise<Player[]> { return players; }
}

export const mockHogWatchRepository = new MockHogWatchRepository();

class LiveScheduleRepository implements HogWatchRepository {
  constructor(private readonly fallback: HogWatchRepository, private readonly scheduleProvider: OpenAIWebSearchScheduleProvider) {}

  private async schedule() { return this.scheduleProvider.getSeasonSchedule(); }
  private async fallbackOnFailure<T>(live: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try { return await live(); } catch { return fallback(); }
  }

  async getSeasonDashboard(): Promise<SeasonDashboard> {
    return this.fallbackOnFailure<SeasonDashboard>(async () => {
      const { games, provenance } = await this.schedule();
      const completed = games.filter((game) => game.result);
      const wins = completed.filter((game) => game.result === 'W').length;
      return {
        team: 'Arkansas', season: 2026, record: `${wins}-${completed.length - wins}`, projectedRecord: '—', completedGames: completed.length,
        latestGame: completed.at(-1), story: completed.length
          ? 'Live final scores are synced. Advanced grading arrives only after verified play-level data is available.'
          : 'The official schedule is live. HOG Index grading begins after verified game data is available.',
        signals: [], provenance,
      };
    }, () => this.fallback.getSeasonDashboard());
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    return this.fallbackOnFailure(async () => {
      const { games, provenance } = await this.schedule();
      const game = games.find((candidate) => candidate.id === gameId);
      return game ? {
        game,
        thesis: game.result ? 'Final score confirmed; advanced grading is pending.' : 'The official schedule is confirmed.',
        story: game.result
          ? 'HogWatch will publish a scorecard after its advanced metrics are independently verified.'
          : 'Pregame context will be added after the supporting data is verified.',
        provenance,
      } : undefined;
    }, () => this.fallback.getGameAnalysis(gameId));
  }

  async getCoachReport(coachId: string) { return this.fallback.getCoachReport(coachId); }
  async getPlayerReport(playerId: string) { return this.fallback.getPlayerReport(playerId); }
  async getMetricTrend(query: MetricTrendQuery) { return this.fallback.getMetricTrend(query); }
  async compareGames(gameAId: string, gameBId: string) { return this.fallback.compareGames(gameAId, gameBId); }
  async listGames() { return this.fallbackOnFailure(async () => (await this.schedule()).games, () => this.fallback.listGames()); }
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
  if (environment.HOGWATCH_LIVE_DATA_ENABLED === 'true' && environment.OPENAI_API_KEY) {
    return new LiveScheduleRepository(mockHogWatchRepository, new OpenAIWebSearchScheduleProvider(environment.OPENAI_API_KEY, {
      model: environment.HOGWATCH_OPENAI_MODEL,
      cache: options.liveScheduleCache,
    }));
  }
  return mockHogWatchRepository;
};

/** The sole composition root used by both web and MCP runtimes. */
export const hogWatchRepository = createHogWatchRepository();
