import { createHogWatchRepository, type HogWatchRepository, type LiveScheduleCache } from '@hogwatch/data';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createHogWatchServer } from './server.js';

export type WorkerEnvironment = {
  OPENAI_API_KEY?: string;
  HOGWATCH_LIVE_DATA_ENABLED?: string;
  HOGWATCH_OPENAI_MODEL?: string;
  HOGWATCH_SCHEDULE_CACHE?: KVNamespaceLike;
  MCP_TOOL_RATE_LIMITER?: RateLimiter;
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
  const key = `${environment.HOGWATCH_LIVE_DATA_ENABLED ?? ''}:${environment.HOGWATCH_OPENAI_MODEL ?? ''}:${Boolean(environment.OPENAI_API_KEY)}`;
  if (repositoryKey !== key) {
    repositoryKey = key;
    repository = createHogWatchRepository({
      OPENAI_API_KEY: environment.OPENAI_API_KEY,
      HOGWATCH_LIVE_DATA_ENABLED: environment.HOGWATCH_LIVE_DATA_ENABLED,
      HOGWATCH_OPENAI_MODEL: environment.HOGWATCH_OPENAI_MODEL,
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

export default {
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return json({ status: 'ok', service: 'hogwatch-mcp' });
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
