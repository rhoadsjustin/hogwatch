import { isMetricId, type AnalyticsProvenance, type CoachReport, type GameAnalysis, type MetricTrend, type PlayerReport, type SeasonDashboard } from '@hogwatch/core';
import type { HogWatchRepository } from '@hogwatch/data';

export const CHAT_ENTITIES = ['season', 'game', 'coach', 'player', 'metric'] as const;
export type ChatEntity = (typeof CHAT_ENTITIES)[number];

export type HogWatchChatRequest = {
  entity: ChatEntity;
  id: string;
  metricIds?: readonly string[];
};

export type HogWatchChatResponse = {
  answer: string;
  provenance: AnalyticsProvenance;
  reportKind: ChatEntity;
};

type ChatReport = SeasonDashboard | GameAnalysis | CoachReport | PlayerReport | MetricTrend;
type ResponsesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class HogWatchChatUnavailableError extends Error {}
export class HogWatchChatNotFoundError extends Error {}

export const isChatEntity = (value: string): value is ChatEntity =>
  (CHAT_ENTITIES as readonly string[]).includes(value);

const answerFromResponse = (body: unknown): string | undefined => {
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

const reportFor = async (repository: HogWatchRepository, request: HogWatchChatRequest): Promise<ChatReport | undefined> => {
  switch (request.entity) {
    case 'season': return repository.getSeasonDashboard();
    case 'game': return repository.getGameAnalysis(request.id);
    case 'coach': return repository.getCoachReport(request.id);
    case 'player': return repository.getPlayerReport(request.id);
    case 'metric': return isMetricId(request.id)
      ? repository.getMetricTrend({ metricId: request.id, adjustment: 'opponent-adjusted' })
      : undefined;
  }
};

const instructions = [
  'You are HogWatch’s Arkansas football analyst.',
  'Answer in two to four concise sentences, using only the supplied HogWatch report.',
  'Name the report’s provenance and coverage in the answer.',
  'Do not invent statistics, injuries, film observations, results, or forecasts.',
  'If the report says coverage is incomplete or fixture-backed, say so plainly.',
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
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model ?? 'gpt-5.6-luna',
          instructions,
          input: JSON.stringify({ requestedMetrics: metricIds, report }),
          max_output_tokens: 240,
        }),
      });
      const body: unknown = await response.json().catch(() => undefined);
      const answer = response.ok ? answerFromResponse(body) : undefined;
      if (!answer) throw new HogWatchChatUnavailableError('Live chat is temporarily unavailable.');
      return { answer, provenance: report.provenance, reportKind: request.entity };
    },
  };
};
