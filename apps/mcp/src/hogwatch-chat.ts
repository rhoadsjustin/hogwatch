import {
  isMetricId,
  type AnalyticsProvenance,
  type CoachReport,
  type GameAnalysis,
  type MatchupPreview,
  type MetricTrend,
  type PlayerReport,
  type PredictionRecord,
  type SeasonDashboard,
} from '@hogwatch/core';
import type { HogWatchRepository } from '@hogwatch/data';

export const CHAT_ENTITIES = ['season', 'game', 'matchup', 'coach', 'player', 'metric', 'record'] as const;
export type ChatEntity = (typeof CHAT_ENTITIES)[number];

/** A single prior turn, so a follow-up keeps its thread. */
export type HogWatchChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * What the reader is actually looking at. Binding the answer to the visible
 * chart is the difference between an assistant and a summariser.
 */
export type HogWatchChatView = {
  metricId?: string;
  weeks?: readonly number[];
  screen?: string;
};

export type HogWatchChatRequest = {
  entity: ChatEntity;
  id: string;
  metricIds?: readonly string[];
  question?: string;
  history?: readonly HogWatchChatTurn[];
  view?: HogWatchChatView;
};

/**
 * A pointer back into the data the answer used, so a client can highlight the
 * exact bar or point being cited instead of showing prose beside a chart.
 */
export type HogWatchChatReference = {
  label: string;
  metricId?: string;
  week?: number;
  value?: number;
};

export type HogWatchChatResponse = {
  answer: string;
  references: HogWatchChatReference[];
  followUps: string[];
  provenance: AnalyticsProvenance;
  reportKind: ChatEntity;
};

type ChatReport = SeasonDashboard | GameAnalysis | MatchupPreview | CoachReport | PlayerReport | MetricTrend | PredictionRecord;
type ResponsesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class HogWatchChatUnavailableError extends Error {}
export class HogWatchChatNotFoundError extends Error {}

export const isChatEntity = (value: string): value is ChatEntity =>
  (CHAT_ENTITIES as readonly string[]).includes(value);

/** Maximum turns of history forwarded, to keep the grounded payload small. */
const HISTORY_LIMIT = 6;

const textFromResponse = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
  const response = body as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  if (!Array.isArray(response.output)) return undefined;
  for (const output of response.output) {
    if (typeof output !== 'object' || output === null || Array.isArray(output)) continue;
    const content = (output as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
      const text = (item as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim()) return text.trim();
    }
  }
  return undefined;
};

const asStringArray = (value: unknown, limit: number): string[] => (Array.isArray(value) ? value : [])
  .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  .map((item) => item.trim())
  .slice(0, limit);

const asReferences = (value: unknown): HogWatchChatReference[] => (Array.isArray(value) ? value : [])
  .flatMap((item): HogWatchChatReference[] => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
    const candidate = item as { label?: unknown; metricId?: unknown; week?: unknown; value?: unknown };
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
    if (!label) return [];
    const metricId = typeof candidate.metricId === 'string' && isMetricId(candidate.metricId) ? candidate.metricId : undefined;
    return [{
      label,
      metricId,
      week: typeof candidate.week === 'number' && Number.isFinite(candidate.week) ? candidate.week : undefined,
      value: typeof candidate.value === 'number' && Number.isFinite(candidate.value) ? candidate.value : undefined,
    }];
  })
  .slice(0, 6);

/**
 * The model is asked for JSON, but a plain-prose reply is still usable — it
 * simply arrives without references, rather than failing the request.
 */
const parseAnswer = (text: string): Pick<HogWatchChatResponse, 'answer' | 'references' | 'followUps'> => {
  const fallback = { answer: text, references: [] as HogWatchChatReference[], followUps: [] as string[] };
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return fallback;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;
  const record = parsed as { answer?: unknown; references?: unknown; followUps?: unknown };
  const answer = typeof record.answer === 'string' ? record.answer.trim() : '';
  if (!answer) return fallback;
  return { answer, references: asReferences(record.references), followUps: asStringArray(record.followUps, 3) };
};

const reportFor = async (repository: HogWatchRepository, request: HogWatchChatRequest): Promise<ChatReport | undefined> => {
  switch (request.entity) {
    case 'season': return repository.getSeasonDashboard();
    case 'game': return repository.getGameAnalysis(request.id);
    case 'matchup': return repository.getMatchupPreview(request.id);
    case 'record': return repository.getPredictionRecord();
    case 'coach': return repository.getCoachReport(request.id);
    case 'player': return repository.getPlayerReport(request.id);
    case 'metric': return isMetricId(request.id)
      ? repository.getMetricTrend({ metricId: request.id, adjustment: 'opponent-adjusted' })
      : undefined;
  }
};

const standingQuestion: Record<ChatEntity, string> = {
  season: 'Is Arkansas actually getting better?',
  game: 'What does this game grade actually say?',
  matchup: 'Where is this game won or lost?',
  record: 'How well has HogWatch predicted so far?',
  coach: 'What is this scorecard measuring, and what should change?',
  player: 'What is this player’s role trending toward?',
  metric: 'Is this trend real, or is it the schedule?',
};

const instructions = [
  'You are HogWatch’s Arkansas football analyst.',
  'Answer only from the supplied HogWatch report; never invent statistics, injuries, film observations, results, or forecasts.',
  'Reply with a JSON object: {"answer": string, "references": [{"label": string, "metricId"?: string, "week"?: number, "value"?: number}], "followUps": [string]}.',
  '"answer" is two to five sentences of plain prose that answers the reader’s question and names the report’s provenance and coverage.',
  'If the report says its coverage is fixture-backed, modelled, or incomplete, say so plainly in the answer.',
  '"references" cite only metrics, weeks, and values that literally appear in the report, so the app can highlight them.',
  '"followUps" are up to three short questions the same report could answer next.',
].join(' ');

export const createHogWatchChat = (
  repository: HogWatchRepository,
  options: { apiKey?: string; model?: string; fetcher?: ResponsesFetch },
) => {
  const fetcher = options.fetcher ?? fetch;
  return {
    async ask(request: HogWatchChatRequest): Promise<HogWatchChatResponse> {
      if (!options.apiKey) throw new HogWatchChatUnavailableError('Live chat is not configured.');
      const report = await reportFor(repository, request);
      if (!report) throw new HogWatchChatNotFoundError('The requested HogWatch report was not found.');
      const metricIds = (request.metricIds ?? []).filter(isMetricId);
      const question = request.question?.trim() || standingQuestion[request.entity];
      const history = (request.history ?? []).slice(-HISTORY_LIMIT);
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model ?? 'gpt-5.6-luna',
          instructions,
          input: JSON.stringify({ question, onScreen: request.view, conversation: history, requestedMetrics: metricIds, report }),
          text: { format: { type: 'json_object' } },
          max_output_tokens: 700,
        }),
      });
      const body: unknown = await response.json().catch(() => undefined);
      const text = response.ok ? textFromResponse(body) : undefined;
      if (!text) throw new HogWatchChatUnavailableError('Live chat is temporarily unavailable.');
      return { ...parseAnswer(text), provenance: report.provenance, reportKind: request.entity };
    },
  };
};
