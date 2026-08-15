import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createHogWatchServer } from './server.js';

await createHogWatchServer().connect(new StdioServerTransport());
