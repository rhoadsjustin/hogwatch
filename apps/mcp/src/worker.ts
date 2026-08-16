import { createHogWatchRepository, type HogWatchRepository } from '@hogwatch/data';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createHogWatchServer } from './server.js';

export type WorkerEnvironment = {
  OPENAI_API_KEY?: string;
  HOGWATCH_LIVE_DATA_ENABLED?: string;
  HOGWATCH_OPENAI_MODEL?: string;
};

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

let repository: HogWatchRepository | undefined;
let repositoryKey: string | undefined;

const repositoryFor = (environment: WorkerEnvironment) => {
  const key = `${environment.HOGWATCH_LIVE_DATA_ENABLED ?? ''}:${environment.HOGWATCH_OPENAI_MODEL ?? ''}:${Boolean(environment.OPENAI_API_KEY)}`;
  if (repositoryKey !== key) {
    repositoryKey = key;
    repository = createHogWatchRepository(environment);
  }
  return repository as HogWatchRepository;
};

export default {
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return json({ status: 'ok', service: 'hogwatch-mcp' });
    if (pathname !== '/mcp') return json({ error: 'not_found' }, 404);

    // Stateless transport is intentional: every Worker invocation is isolated,
    // and HogWatch's MCP tools are read-only request/response operations.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createHogWatchServer(repositoryFor(environment));
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
