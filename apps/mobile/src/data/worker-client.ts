import type {
  AnalyticsProvenance, Coach, CoachReport, Game, GameAnalysis, GameComparison, MatchupPreview,
  MetricTrend, MetricTrendQuery, Player, PlayerReport, PredictionRecord, SeasonDashboard,
} from '@hogwatch/core';
import type { HogWatchRepository } from '@hogwatch/data';

export type HogWatchChatTurn = { role: 'user' | 'assistant'; content: string };

/** A pointer back into the data an answer used, so the app can highlight it. */
export type HogWatchChatReference = {
  label: string;
  metricId?: string;
  week?: number;
  value?: number;
};

export type HogWatchChatContext = {
  entity: 'season' | 'game' | 'matchup' | 'coach' | 'player' | 'metric' | 'record';
  id: string;
  metricIds: readonly string[];
  question?: string;
  history?: readonly HogWatchChatTurn[];
  /** What the reader is looking at, so the answer speaks to the visible chart. */
  view?: { metricId?: string; weeks?: readonly number[]; screen?: string };
};

export type HogWatchChatResult = {
  answer: string;
  references: HogWatchChatReference[];
  followUps: string[];
  provenance: AnalyticsProvenance;
  reportKind: HogWatchChatContext['entity'];
};

export type HogWatchChatClient = {
  ask(context: HogWatchChatContext): Promise<HogWatchChatResult>;
};

type ApiEnvelope<T> = { data?: T; error?: string; message?: string };

class HogWatchWorkerError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

class HogWatchWorkerClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    const body = await response.json().catch(() => undefined) as ApiEnvelope<T> | undefined;
    if (!response.ok || body?.data === undefined) {
      throw new HogWatchWorkerError(
        response.status,
        body?.message ?? `HogWatch live service is unavailable (${response.status}).`,
      );
    }
    return body.data;
  }

  private notFoundAsUndefined<T>(request: Promise<T>): Promise<T | undefined> {
    return request.catch((error: unknown) => {
      if (error instanceof HogWatchWorkerError && error.status === 404) return undefined;
      throw error;
    });
  }

  readonly repository: HogWatchRepository = {
    getSeasonDashboard: () => this.request<SeasonDashboard>('/api/season-dashboard'),
    getGameAnalysis: (gameId) => this.notFoundAsUndefined(this.request<GameAnalysis>(`/api/games/${encodeURIComponent(gameId)}`)),
    getMatchupPreview: (gameId) => this.notFoundAsUndefined(this.request<MatchupPreview>(`/api/matchups/${encodeURIComponent(gameId)}`)),
    getPredictionRecord: () => this.request<PredictionRecord>('/api/prediction-record'),
    getCoachReport: (coachId) => this.notFoundAsUndefined(this.request<CoachReport>(`/api/coaches/${encodeURIComponent(coachId)}`)),
    getPlayerReport: (playerId) => this.notFoundAsUndefined(this.request<PlayerReport>(`/api/players/${encodeURIComponent(playerId)}`)),
    getMetricTrend: (query: MetricTrendQuery) => this.notFoundAsUndefined(this.request<MetricTrend>(`/api/trends/${encodeURIComponent(query.metricId)}?adjustment=${query.adjustment ?? 'raw'}`)),
    compareGames: (gameAId, gameBId) => this.notFoundAsUndefined(this.request<GameComparison>(`/api/games/compare?gameAId=${encodeURIComponent(gameAId)}&gameBId=${encodeURIComponent(gameBId)}`)),
    listGames: () => this.request<Game[]>('/api/games'),
    listCoaches: () => this.request<Coach[]>('/api/coaches'),
    listPlayers: () => this.request<Player[]>('/api/players'),
  };

  readonly chat: HogWatchChatClient = {
    ask: (context) => this.request<HogWatchChatResult>('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    }),
  };
}

export const createHogWatchWorkerClient = (baseUrl: string): HogWatchWorkerClient =>
  new HogWatchWorkerClient(baseUrl.replace(/\/$/, ''));
