import type { Coach, Game, Player } from '@hogwatch/core';

export const games: Game[] = [
  { id: 'north-alabama', week: 1, opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', result: 'W', arkansasScore: 41, opponentScore: 10, date: 'Sep 5', hogIndex: 68, metrics: { successRate: 44, pressureAllowed: 34, pressureGenerated: 31, explosives: 6, explosivesAllowed: 4, rushSuccess: 46, redZone: 60, missedTackles: 9 } },
  { id: 'utah', week: 2, opponent: 'Utah', opponentShort: 'UTAH', location: 'away', result: 'L', arkansasScore: 24, opponentScore: 27, date: 'Sep 12', hogIndex: 74, metrics: { successRate: 46, pressureAllowed: 29, pressureGenerated: 37, explosives: 7, explosivesAllowed: 5, rushSuccess: 48, redZone: 67, missedTackles: 8 } },
  { id: 'georgia', week: 3, opponent: 'Georgia', opponentShort: 'UGA', location: 'home', date: 'Sep 19', metrics: {} },
  { id: 'tulsa', week: 4, opponent: 'Tulsa', opponentShort: 'TLSA', location: 'home', date: 'Sep 26', metrics: {} },
  { id: 'texas-am', week: 5, opponent: 'Texas A&M', opponentShort: 'TAMU', location: 'away', date: 'Oct 3', metrics: {} },
  { id: 'tennessee', week: 6, opponent: 'Tennessee', opponentShort: 'TENN', location: 'home', date: 'Oct 10', metrics: {} },
];

export const coaches: Coach[] = [
  { id: 'silverfield', name: 'Ryan Silverfield', role: 'Head Coach', grade: 'B+', note: 'Track discipline, situational decisions, special teams and second-half performance.', scorecard: [{ label: 'Game Management', score: 84, grade: 'A-' }, { label: 'Adjustments', score: 91, grade: 'A' }, { label: 'Discipline', score: 76, grade: 'B' }, { label: 'Development', score: 81, grade: 'B+' }, { label: 'Special Teams', score: 67, grade: 'C+' }] },
  { id: 'cramsey', name: 'Tim Cramsey', role: 'Offensive Coordinator', grade: 'B', note: 'Success rate and pressure allowed are the primary indicators.', scorecard: [{ label: 'Success Rate', score: 80, grade: 'B+' }, { label: 'Protection', score: 74, grade: 'B' }, { label: 'Explosives', score: 82, grade: 'B+' }, { label: 'Red Zone', score: 77, grade: 'B' }] },
  { id: 'roberts', name: 'Ron Roberts', role: 'Defensive Coordinator', grade: 'A-', note: 'Four-man pressure and explosive-play prevention tell us whether the structure is sustainable.', scorecard: [{ label: 'Success Rate', score: 87, grade: 'A-' }, { label: 'Pressure', score: 91, grade: 'A' }, { label: 'Explosives', score: 84, grade: 'B+' }, { label: 'Tackling', score: 79, grade: 'B+' }] },
];

export const players: Player[] = [
  { id: 'kj-jackson', name: 'KJ Jackson', number: 7, position: 'QB', classYear: 'JR', height: '6′3″', weight: 218, hometown: 'Montgomery, AL', stats: { 'Comp %': '66.1%', Yards: 441, 'TD / INT': '3 / 0', 'TWP %': '1.8%' } },
  { id: 'quincy-rhodes', name: 'Quincy Rhodes Jr.', number: 5, position: 'EDGE', classYear: 'JR', height: '6′6″', weight: 275, hometown: 'North Little Rock, AR', stats: { 'Pressure rate': '14.8%', Sacks: 0, Hurries: 8, 'Run stops': 6 } },
];

type PlayerInsight = { stock: 'Rising' | 'Steady'; stockNote: string; role: string; story: string; trendLabel: string; suffix: string; weeklyValues: number[]; metricIds: string[]; details: Record<string, string> };

const playerInsights: Record<string, PlayerInsight> = {
  'kj-jackson': { stock: 'Rising', stockNote: 'Cleaner decisions', role: 'The offense is asking him to stay on schedule, then attack when protection earns it.', story: 'Jackson has avoided turnover-worthy throws while the front improved its protection. That makes the modest success-rate jump worth watching.', trendLabel: 'Completion rate', suffix: '%', weeklyValues: [63.8, 66.1], metricIds: ['completion-rate', 'turnover-worthy-play-rate', 'pressure-allowed'], details: { 'Comp %': 'Up 2.3 points since opener', Yards: 'Through two games', 'TD / INT': 'No interceptions', 'TWP %': 'Lower is better' } },
  'quincy-rhodes': { stock: 'Rising', stockNote: 'Winning his rushes', role: 'The edge is creating disruption without the defense having to overcommit a blitz.', story: 'Rhodes has helped make the pressure jump sustainable. The next question is whether those hurries begin to finish as sacks against SEC tackles.', trendLabel: 'Pressure rate', suffix: '%', weeklyValues: [11.4, 14.8], metricIds: ['pressure-rate', 'hurries', 'run-stops', 'four-man-pressure'], details: { 'Pressure rate': 'Up 3.4 points since opener', Sacks: 'Finish opportunities', Hurries: 'Through two games', 'Run stops': 'Early-down impact' } },
};

export const getGame = (id: string) => games.find((game) => game.id === id);
export const getCoach = (id: string) => coaches.find((coach) => coach.id === id);
export const getPlayer = (id: string) => players.find((player) => player.id === id);
export const getPlayerInsight = (id: string) => playerInsights[id];
