import type { AnalyticsProvenance, Game } from '@hogwatch/core';

export type ResearchSource = { title: string; url: string };
export type LiveScheduleSnapshot = { season: number; games: Game[]; provenance: AnalyticsProvenance };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Annotation = { type?: string; title?: string; url?: string };
type Content = { text?: string; annotations?: Annotation[] };
type ResponsesPayload = { output_text?: string; output?: { content?: Content[] }[] };

const prompt = (season: number, today: string) => `Research the ${season} Arkansas Razorbacks football schedule and final scores as of ${today}. Use ArkansasRazorbacks.com official football schedule as the schedule authority. Use an official Arkansas game recap or official box score before marking any game final. Return only JSON: {"coverage":"short factual coverage statement","games":[{"week":1,"date":"Sep 5","opponent":"North Alabama","opponentShort":"UNA","location":"home","result":null,"arkansasScore":null,"opponentScore":null}]}. Use result "W" or "L" only for a final game, and then provide both integer scores. For future games set result and both scores to null. Include every scheduled regular-season game sorted by week. Do not infer advanced analytics, player statistics, HOG Index inputs, rankings, or predictions.`;
const record = (value: unknown): Record<string, unknown> | undefined => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const string = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const score = (value: unknown): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 200 ? value : undefined;
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const parseGames = (value: unknown): Game[] => {
  if (!Array.isArray(value)) throw new Error('OpenAI web-search response did not include games.');
  const games = value.map((item): Game => {
    const game = record(item);
    const week = score(game?.week); const date = string(game?.date); const opponent = string(game?.opponent); const opponentShort = string(game?.opponentShort);
    const location = game?.location; const result = game?.result === 'W' || game?.result === 'L' ? game.result : undefined;
    const arkansasScore = score(game?.arkansasScore); const opponentScore = score(game?.opponentScore);
    if (!week || !date || !opponent || !opponentShort || (location !== 'home' && location !== 'away')) throw new Error('OpenAI web-search response included an invalid scheduled game.');
    if (result && (arkansasScore === undefined || opponentScore === undefined)) throw new Error('A final game must include both final scores.');
    if (!result && (arkansasScore !== undefined || opponentScore !== undefined)) throw new Error('A non-final game must not include a score.');
    return { id: slugify(opponent), week, date, opponent, opponentShort, location, result, arkansasScore, opponentScore, metrics: {} };
  });
  if (!games.length || new Set(games.map((game) => game.week)).size !== games.length) throw new Error('OpenAI web-search response must provide uniquely numbered games.');
  return games.sort((a, b) => a.week - b.week);
};

const parseOutput = (payload: ResponsesPayload) => {
  const content = payload.output?.flatMap((item) => item.content ?? []) ?? [];
  const text = (payload.output_text ?? content.map((item) => item.text ?? '').join('\n')).trim().replace(/^```json\s*|\s*```$/g, '');
  if (!text) throw new Error('OpenAI web-search response did not contain structured data.');
  let json: unknown; try { json = JSON.parse(text); } catch { throw new Error('OpenAI web-search response was not valid JSON.'); }
  const sourceByUrl = new Map<string, ResearchSource>();
  for (const annotation of content.flatMap((item) => item.annotations ?? [])) if (annotation.type === 'url_citation' && annotation.url) sourceByUrl.set(annotation.url, { title: annotation.title ?? annotation.url, url: annotation.url });
  return { json, sources: [...sourceByUrl.values()] };
};

export class OpenAIWebSearchScheduleProvider {
  private cached?: { expiresAt: number; snapshot: LiveScheduleSnapshot };
  private inFlight?: Promise<LiveScheduleSnapshot>;
  constructor(private readonly apiKey: string, private readonly options: { model?: string; ttlMs?: number; fetch?: FetchLike; now?: () => Date } = {}) {}

  async getSeasonSchedule(season = 2026): Promise<LiveScheduleSnapshot> {
    const now = this.options.now ?? (() => new Date());
    if (this.cached && this.cached.expiresAt > now().getTime()) return this.cached.snapshot;
    if (!this.inFlight) this.inFlight = this.request(season, now).then((snapshot) => {
      this.cached = { snapshot, expiresAt: now().getTime() + (this.options.ttlMs ?? 15 * 60_000) }; return snapshot;
    }).finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }

  private async request(season: number, now: () => Date): Promise<LiveScheduleSnapshot> {
    const response = await (this.options.fetch ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.options.model ?? 'gpt-5.6-luna', tools: [{ type: 'web_search' }], input: prompt(season, now().toISOString().slice(0, 10)) }),
    });
    if (!response.ok) throw new Error(`OpenAI web search failed with HTTP ${response.status}.`);
    const parsed = parseOutput(await response.json() as ResponsesPayload); const result = record(parsed.json); const coverage = string(result?.coverage);
    if (!coverage || !parsed.sources.length) throw new Error('OpenAI web-search response did not include coverage and citations.');
    return { season, games: parseGames(result?.games), provenance: { source: 'provider', provider: 'OpenAI web search · Arkansas Razorbacks official athletics', coverage: `${coverage} Advanced HOG Index metrics are unavailable until a verified stats provider is connected.`, updatedAt: now().toISOString(), sources: parsed.sources } };
  }
}
