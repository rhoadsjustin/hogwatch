import {
  calculateHogIndex,
  METRIC_IDS,
  METRIC_METADATA,
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
  type Player,
  type PlayerInsight,
  type PlayerReport,
  type SeasonDashboard,
  type TrendSeries,
} from '@hogwatch/core';

export interface HogWatchRepository {
  getSeasonDashboard(): Promise<SeasonDashboard>;
  getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined>;
  getCoachReport(coachId: string): Promise<CoachReport | undefined>;
  getPlayerReport(playerId: string): Promise<PlayerReport | undefined>;
  getMetricTrend(metricId: string): Promise<MetricTrend | undefined>;
  compareGames(gameAId: string, gameBId: string): Promise<GameComparison | undefined>;
  listGames(): Promise<Game[]>;
  listCoaches(): Promise<Coach[]>;
  listPlayers(): Promise<Player[]>;
}

const games: Game[] = [
  { id: 'north-alabama', week: 1, opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', result: 'W', arkansasScore: 41, opponentScore: 10, date: 'Sep 5', hogIndex: 68, metrics: { 'success-rate': 44, 'pressure-allowed': 34, 'pressure-generated': 31, explosives: 6, 'explosives-allowed': 4, 'rush-success': 46, 'red-zone-touchdown-rate': 60, 'missed-tackles': 9 } },
  { id: 'utah', week: 2, opponent: 'Utah', opponentShort: 'UTAH', location: 'away', result: 'L', arkansasScore: 24, opponentScore: 27, date: 'Sep 12', hogIndex: 74, metrics: { 'success-rate': 46, 'pressure-allowed': 29, 'pressure-generated': 37, explosives: 7, 'explosives-allowed': 5, 'rush-success': 48, 'red-zone-touchdown-rate': 67, 'missed-tackles': 8 } },
  { id: 'georgia', week: 3, opponent: 'Georgia', opponentShort: 'UGA', location: 'home', date: 'Sep 19', metrics: {} },
  { id: 'tulsa', week: 4, opponent: 'Tulsa', opponentShort: 'TLSA', location: 'home', date: 'Sep 26', metrics: {} },
  { id: 'texas-am', week: 5, opponent: 'Texas A&M', opponentShort: 'TAMU', location: 'away', date: 'Oct 3', metrics: {} },
  { id: 'tennessee', week: 6, opponent: 'Tennessee', opponentShort: 'TENN', location: 'home', date: 'Oct 10', metrics: {} },
];

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

const isMetricId = (metricId: string): metricId is MetricId => METRIC_IDS.includes(metricId as MetricId);
const completedGames = () => games.filter((game) => game.result);

const makeTrend = (metricId: MetricId): TrendSeries | undefined => {
  const played = completedGames();
  const values = played.map((game) => game.metrics[metricId]).filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  const metadata = METRIC_METADATA[metricId];
  return { metricId, label: metadata.label, suffix: metadata.suffix, values, weeks: played.slice(0, values.length).map((game) => game.week), goodDirection: metadata.goodDirection };
};

const metricTrend = (metricId: MetricId): MetricTrend | undefined => {
  if (metricId === 'hog-index') {
    const played = completedGames().filter((game) => game.hogIndex !== undefined);
    return { metricId, label: METRIC_METADATA[metricId].label, values: played.map((game) => game.hogIndex as number), weeks: played.map((game) => game.week), goodDirection: 'up' };
  }
  return makeTrend(metricId);
};

const metricSignal = (metricId: MetricId, latest: Game, previous: Game): Metric | undefined => {
  const value = latest.metrics[metricId];
  const previousValue = previous.metrics[metricId];
  if (value === undefined || previousValue === undefined) return undefined;
  const metadata = METRIC_METADATA[metricId];
  return { id: metricId, label: metadata.label, value, unit: metadata.suffix, delta: value - previousValue, goodDirection: metadata.goodDirection };
};

const gameAnalysis = (game: Game): GameAnalysis => ({ ...gameCopy[game.id], game, hogIndex: gameHogIndexes[game.id] });

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
    return { team: 'Arkansas', season: 2026, record: `${wins}-${played.length - wins}`, projectedRecord: '5-7', completedGames: played.length, latestGame, hogIndex: latestIndex, hogIndexDelta: latestIndex && previousIndex ? latestIndex.total - previousIndex.total : undefined, story: 'Protection improved against a real pass rush.', signals };
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    const game = games.find((candidate) => candidate.id === gameId);
    return game ? gameAnalysis(game) : undefined;
  }

  async getCoachReport(coachId: string): Promise<CoachReport | undefined> {
    const coach = coaches.find((candidate) => candidate.id === coachId);
    const trend = coachTrends[coachId];
    if (!coach || !trend) return undefined;
    return { coach, implication: trend.implication, trend: { metricId: 'hog-index', label: `${coach.name} score`, values: trend.values, weeks: [1, 2, 3, 4], goodDirection: 'up' } };
  }

  async getPlayerReport(playerId: string): Promise<PlayerReport | undefined> {
    const player = players.find((candidate) => candidate.id === playerId);
    const insight = playerInsights[playerId];
    return player && insight ? { player, insight } : undefined;
  }

  async getMetricTrend(metricId: string): Promise<MetricTrend | undefined> {
    return isMetricId(metricId) ? metricTrend(metricId) : undefined;
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
    return { gameA, gameB, metricComparisons, summary: 'The process improved from the opener: Arkansas allowed less pressure and generated more of its own, but explosive gains remain the volatile issue.' };
  }

  async listGames(): Promise<Game[]> { return games; }
  async listCoaches(): Promise<Coach[]> { return coaches; }
  async listPlayers(): Promise<Player[]> { return players; }
}

export const mockHogWatchRepository = new MockHogWatchRepository();
