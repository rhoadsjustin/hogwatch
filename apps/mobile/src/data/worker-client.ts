import type { AnalyticsProvenance, Coach, CoachReport, Game, GameAnalysis, GameComparison, MetricTrend, MetricTrendQuery, Player, PlayerReport, SeasonDashboard } from '@hogwatch/core';
import type { HogWatchRepository } from '@hogwatch/data';

export type HogWatchChatContext = {
  entity: 'season' | 'game' | 'coach' | 'player' | 'metric';
  id: string;
  metricIds: readonly string[];
};

export type HogWatchChatResult = {
  answer: string;
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
    getCoachReport: (coachId) => this.notFoundAsUndefined(this.request<CoachReport>(`/api/coaches/${encodeURIComponent(coachId)}`)),
    getPlayerReport: (playerId) => this.notFoundAsUndefined(this.request<PlayerReport>(`/api/players/${encodeURIComponent(playerId)}`)),
    getMetricTrend: (query: MetricTrendQuery) => this.notFoundAsUndefined(this.request<MetricTrend>(`/api/trends/${encodeURIComponent(query.metricId)}?adjustment=${query.adjustment ?? 'raw'}`)),
    compareGames: (gameAId, gameBId) => this.request<GameComparison>(`/api/games/compare?gameAId=${encodeURIComponent(gameAId)}&gameBId=${encodeURIComponent(gameBId)}`),
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
