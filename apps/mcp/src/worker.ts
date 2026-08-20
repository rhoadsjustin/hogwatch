import { isMetricId } from '@hogwatch/core';
import { createHogWatchRepository, type HogWatchRepository, type LiveScheduleCache } from '@hogwatch/data';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createHogWatchServer } from './server.js';
import { createHogWatchChat, HogWatchChatNotFoundError, HogWatchChatUnavailableError, isChatEntity, type HogWatchChatRequest, type HogWatchChatTurn } from './hogwatch-chat.js';

export type WorkerEnvironment = {
  OPENAI_API_KEY?: string;
  HOGWATCH_LIVE_DATA_ENABLED?: string;
  HOGWATCH_OPENAI_MODEL?: string;
  HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK?: string;
  HOGWATCH_SCHEDULE_CACHE?: KVNamespaceLike;
  MCP_TOOL_RATE_LIMITER?: RateLimiter;
  HOGWATCH_ASK_RATE_LIMITER?: RateLimiter;
};

type KVNamespaceLike = {
  get(key: string, options: { type: 'json' }): Promise<unknown | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
};

type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

let repository: HogWatchRepository | undefined;
let repositoryKey: string | undefined;

const scheduleCacheFor = (cache: KVNamespaceLike | undefined): LiveScheduleCache | undefined => {
  if (!cache) return undefined;
  return {
    get: (key) => cache.get(key, { type: 'json' }),
    set: (key, snapshot, ttlSeconds) => cache.put(key, JSON.stringify(snapshot), {
      expirationTtl: Math.max(60, ttlSeconds),
    }),
  };
};

const repositoryFor = (environment: WorkerEnvironment) => {
  const key = `${environment.HOGWATCH_LIVE_DATA_ENABLED ?? ''}:${environment.HOGWATCH_OPENAI_MODEL ?? ''}:${environment.HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK ?? ''}:${Boolean(environment.OPENAI_API_KEY)}`;
  if (repositoryKey !== key) {
    repositoryKey = key;
    repository = createHogWatchRepository({
      OPENAI_API_KEY: environment.OPENAI_API_KEY,
      HOGWATCH_LIVE_DATA_ENABLED: environment.HOGWATCH_LIVE_DATA_ENABLED,
      HOGWATCH_OPENAI_MODEL: environment.HOGWATCH_OPENAI_MODEL,
      HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK: environment.HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK,
    }, { liveScheduleCache: scheduleCacheFor(environment.HOGWATCH_SCHEDULE_CACHE) });
  }
  return repository as HogWatchRepository;
};

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

const isToolCall = (body: unknown): boolean => {
  if (Array.isArray(body)) return body.some(isToolCall);
  return record(body)?.method === 'tools/call';
};

const requestId = (body: unknown): string | number | null => {
  const id = record(body)?.id;
  return typeof id === 'string' || typeof id === 'number' ? id : null;
};

const rateLimitResponse = (id: string | number | null) => Response.json({
  jsonrpc: '2.0', id,
  error: { code: -32029, message: 'Too many MCP tool calls. Try again in one minute.' },
}, { status: 429, headers: { 'cache-control': 'no-store', 'retry-after': '60' } });

const enforceToolRateLimit = async (request: Request, body: unknown, limiter: RateLimiter | undefined) => {
  if (!limiter || !isToolCall(body)) return undefined;
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'anonymous';
  try {
    const result = await limiter.limit({ key: `mcp-tools:${clientIp}` });
    return result.success ? undefined : rateLimitResponse(requestId(body));
  } catch {
    // An unavailable limiter must not make the read-only MCP endpoint unavailable.
    return undefined;
  }
};

const apiRateLimitResponse = () => json({ error: 'rate_limited', message: 'Too many live chat requests. Try again in one minute.' }, 429);

const enforceAskRateLimit = async (request: Request, limiter: RateLimiter | undefined) => {
  if (!limiter) return undefined;
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'anonymous';
  try {
    const result = await limiter.limit({ key: `hogwatch-ask:${clientIp}` });
    return result.success ? undefined : apiRateLimitResponse();
  } catch {
    // The answer endpoint remains available if the optional edge guard has a transient fault.
    return undefined;
  }
};

const apiNotFound = () => json({ error: 'not_found', message: 'The requested HogWatch resource was not found.' }, 404);

const api = async (request: Request, environment: WorkerEnvironment): Promise<Response> => {
  const url = new URL(request.url);
  const { pathname } = url;
  const repository = repositoryFor(environment);
  if (request.method === 'GET' && pathname === '/api/season-dashboard') return json({ data: await repository.getSeasonDashboard() });
  if (request.method === 'GET' && pathname === '/api/games') return json({ data: await repository.listGames() });
  if (request.method === 'GET' && pathname === '/api/coaches') return json({ data: await repository.listCoaches() });
  if (request.method === 'GET' && pathname === '/api/players') return json({ data: await repository.listPlayers() });
  if (request.method === 'GET' && pathname === '/api/prediction-record') return json({ data: await repository.getPredictionRecord() });
  if (request.method === 'GET' && pathname === '/api/games/compare') {
    const gameAId = url.searchParams.get('gameAId');
    const gameBId = url.searchParams.get('gameBId');
    if (!gameAId || !gameBId) return json({ error: 'invalid_request', message: 'Provide both gameAId and gameBId.' }, 400);
    const data = await repository.compareGames(gameAId, gameBId);
    return data ? json({ data }) : apiNotFound();
  }

  const matchupGameId = /^\/api\/matchups\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === 'GET' && matchupGameId) {
    const data = await repository.getMatchupPreview(decodeURIComponent(matchupGameId));
    return data ? json({ data }) : apiNotFound();
  }
  const gameId = /^\/api\/games\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === 'GET' && gameId) {
    const data = await repository.getGameAnalysis(decodeURIComponent(gameId));
    return data ? json({ data }) : apiNotFound();
  }
  const coachId = /^\/api\/coaches\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === 'GET' && coachId) {
    const data = await repository.getCoachReport(decodeURIComponent(coachId));
    return data ? json({ data }) : apiNotFound();
  }
  const playerId = /^\/api\/players\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === 'GET' && playerId) {
    const data = await repository.getPlayerReport(decodeURIComponent(playerId));
    return data ? json({ data }) : apiNotFound();
  }
  const metricId = /^\/api\/trends\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === 'GET' && metricId) {
    const decodedMetricId = decodeURIComponent(metricId);
    if (!isMetricId(decodedMetricId)) return apiNotFound();
    const adjustment = url.searchParams.get('adjustment') === 'opponent-adjusted' ? 'opponent-adjusted' : 'raw';
    const data = await repository.getMetricTrend({ metricId: decodedMetricId, adjustment });
    return data ? json({ data }) : apiNotFound();
  }
  if (pathname !== '/api/ask') return apiNotFound();
  if (request.method !== 'POST') return json({ error: 'method_not_allowed', message: 'Use POST for live chat.' }, 405);
  const limited = await enforceAskRateLimit(request, environment.HOGWATCH_ASK_RATE_LIMITER);
  if (limited) return limited;
  const body = await request.json().catch(() => undefined);
  const input = record(body);
  const entity = typeof input?.entity === 'string' ? input.entity : undefined;
  const id = typeof input?.id === 'string' ? input.id : undefined;
  const metricIds = Array.isArray(input?.metricIds) && input.metricIds.every((value) => typeof value === 'string') ? input.metricIds as string[] : undefined;
  const question = typeof input?.question === 'string' && input.question.trim() ? input.question.trim().slice(0, 500) : undefined;
  const history = Array.isArray(input?.history)
    ? input.history.flatMap((turn): HogWatchChatTurn[] => {
      const entry = record(turn);
      const role = entry?.role;
      const content = entry?.content;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) return [];
      return [{ role, content: content.trim().slice(0, 2000) }];
    }).slice(-6)
    : undefined;
  const viewInput = record(input?.view);
  const view = viewInput ? {
    metricId: typeof viewInput.metricId === 'string' ? viewInput.metricId : undefined,
    weeks: Array.isArray(viewInput.weeks) ? viewInput.weeks.filter((week): week is number => typeof week === 'number') : undefined,
    screen: typeof viewInput.screen === 'string' ? viewInput.screen.slice(0, 120) : undefined,
  } : undefined;
  if (!entity || !isChatEntity(entity) || !id || !id.trim()) {
    return json({ error: 'invalid_request', message: 'Provide a supported entity and non-empty ID.' }, 400);
  }
  try {
    const chat = createHogWatchChat(repository, {
      apiKey: environment.OPENAI_API_KEY,
      model: environment.HOGWATCH_OPENAI_MODEL,
    });
    const data = await chat.ask({ entity, id: id.trim(), metricIds, question, history, view } satisfies HogWatchChatRequest);
    return json({ data });
  } catch (error) {
    if (error instanceof HogWatchChatNotFoundError) return apiNotFound();
    if (error instanceof HogWatchChatUnavailableError) return json({ error: 'chat_unavailable', message: error.message }, 503);
    return json({ error: 'chat_unavailable', message: 'Live chat is temporarily unavailable.' }, 503);
  }
};

export default {
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return json({ status: 'ok', service: 'hogwatch-mcp' });
    if (pathname.startsWith('/api/')) return api(request, environment);
    if (pathname !== '/mcp') return json({ error: 'not_found' }, 404);

    const body = request.method === 'POST'
      ? await request.clone().json().catch(() => undefined)
      : undefined;
    const limited = await enforceToolRateLimit(request, body, environment.MCP_TOOL_RATE_LIMITER);
    if (limited) return limited;

    // Stateless transport is intentional: every Worker invocation is isolated,
    // and HogWatch's MCP tools are read-only request/response operations.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createHogWatchServer(repositoryFor(environment));
    await server.connect(transport);
    return transport.handleRequest(request, { parsedBody: body });
  },
};
