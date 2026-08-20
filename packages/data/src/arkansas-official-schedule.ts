import { toHogWatchId } from '@hogwatch/core';
import { type LiveScheduleCache, type LiveScheduleSnapshot, validateLiveScheduleSnapshot } from './openai-web-search.ts';

const SCHEDULE_URL = 'https://arkansasrazorbacks.com/sport/m-footbl/schedule/';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type OfficialScheduleOptions = { cache?: LiveScheduleCache; ttlMs?: number; fetch?: FetchLike; now?: () => Date };

const stripMarkup = (value: string) => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#8217;|&rsquo;/g, '’')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const capture = (value: string, expression: RegExp) => expression.exec(value)?.[1];
const cacheKey = (season: number) => `hogwatch:official-arkansas:schedule:${season}:v1`;
const knownOpponentShortNames: Record<string, string> = {
  'North Alabama': 'UNA', Utah: 'UTAH', Georgia: 'UGA', Tulsa: 'TLSA', 'Texas A&M': 'TAMU',
  Tennessee: 'TENN', Vanderbilt: 'VAND', Missouri: 'MIZZ', Auburn: 'AUB', 'South Carolina': 'SCAR', Texas: 'TEX', LSU: 'LSU',
};

const opponentShort = (opponent: string) => {
  if (knownOpponentShortNames[opponent]) return knownOpponentShortNames[opponent];
  const words = opponent.replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  return words.length === 1 ? words[0]!.slice(0, 4).toUpperCase() : words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
};

export const parseArkansasOfficialSchedule = (html: string, season: number, updatedAt: string): LiveScheduleSnapshot => {
  const section = capture(html, /<section class="events">([\s\S]*?)<\/section>/);
  const entries = section?.split(/<div class="item">/).slice(1) ?? [];
  const games = entries.map((entry, index) => {
    const locationMarkup = capture(entry, /<div class="type\s+(home|away)">/);
    const location: 'home' | 'away' | undefined = locationMarkup === 'home' || locationMarkup === 'away'
      ? locationMarkup as 'home' | 'away'
      : undefined;
    const date = capture(entry, /<span class="month">[\s\S]*?<strong>([\s\S]*?)<\/strong>/);
    const opponentMarkup = capture(entry, /<div class="opponent">[\s\S]*?<span>([\s\S]*?)<\/span>/);
    const resultMarkup = capture(entry, /<div class="results-container">([\s\S]*?)<\/div>/);
    const opponent = opponentMarkup && stripMarkup(opponentMarkup).replace(/^at\s+/i, '');
    if ((location !== 'home' && location !== 'away') || !date || !opponent) {
      throw new Error('Arkansas official schedule changed its event markup.');
    }
    const result = resultMarkup && /\b([WL])\s*,\s*(\d+)\s*-\s*(\d+)/.exec(stripMarkup(resultMarkup));
    const arkansasScore = result ? Number(result[2]) : undefined;
    const opponentScore = result ? Number(result[3]) : undefined;
    return {
      id: toHogWatchId(opponent),
      week: index + 1,
      date: stripMarkup(date).replace(/\./g, ''),
      opponent,
      opponentShort: opponentShort(opponent),
      location,
      result: result?.[1] as 'W' | 'L' | undefined,
      arkansasScore,
      opponentScore,
      metrics: {},
    };
  });
  if (!games.length) throw new Error('Arkansas official schedule did not include any games.');
  const completed = games.filter((game) => game.result).length;
  return {
    season,
    games,
    provenance: {
      source: 'provider',
      provider: 'Arkansas Razorbacks official athletics',
      coverage: `Official Arkansas football schedule: ${games.length} scheduled regular-season games, ${completed} final score${completed === 1 ? '' : 's'} posted. Advanced HOG Index metrics are unavailable until a verified stats provider is connected.`,
      updatedAt,
      sources: [{ title: 'Schedule | Arkansas Razorbacks', url: SCHEDULE_URL }],
    },
  };
};

export class ArkansasOfficialScheduleProvider {
  private cached?: { expiresAt: number; snapshot: LiveScheduleSnapshot };
  private inFlight?: Promise<LiveScheduleSnapshot>;

  constructor(private readonly options: OfficialScheduleOptions = {}) {}

  async getSeasonSchedule(season = 2026): Promise<LiveScheduleSnapshot> {
    const now = this.options.now ?? (() => new Date());
    if (this.cached && this.cached.expiresAt > now().getTime()) return this.cached.snapshot;
    if (!this.inFlight) this.inFlight = this.fromCacheOrRequest(season, now).then((snapshot) => {
      this.cached = { snapshot, expiresAt: now().getTime() + (this.options.ttlMs ?? 15 * 60_000) };
      return snapshot;
    }).finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }

  private async fromCacheOrRequest(season: number, now: () => Date): Promise<LiveScheduleSnapshot> {
    const key = cacheKey(season);
    const cached = this.options.cache ? validateLiveScheduleSnapshot(await this.options.cache.get(key)) : undefined;
    if (cached) return cached;
    const response = await (this.options.fetch ?? fetch)(SCHEDULE_URL, {
      headers: { Accept: 'text/html', 'User-Agent': 'HogWatch schedule reader/1.0 (+https://hogwatch.workers.dev)' },
    });
    if (!response.ok) throw new Error(`Arkansas official schedule failed with HTTP ${response.status}.`);
    const snapshot = parseArkansasOfficialSchedule(await response.text(), season, now().toISOString());
    const ttlSeconds = Math.max(60, Math.ceil((this.options.ttlMs ?? 15 * 60_000) / 1_000));
    await this.options.cache?.set(key, snapshot, ttlSeconds).catch(() => undefined);
    return snapshot;
  }
}
