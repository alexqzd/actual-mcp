#!/usr/bin/env node
/**
 * MCP Server for Actual Budget
 *
 * This server exposes your Actual Budget data to LLMs through the Model Context Protocol,
 * allowing for natural language interaction with your financial data.
 *
 * Features:
 * - List and view accounts
 * - View transactions with filtering
 * - Generate financial statistics and analysis
 */

// CRITICAL: Intercept all console.* calls BEFORE any other imports
// The @actual-app/api library writes directly to stdout, which breaks stdio JSON-RPC
// We must suppress these outputs in stdio mode
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Suppress all console output - we'll use MCP logging instead
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};
console.debug = () => {};

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { NextFunction, Request, Response } from 'express';
import { parseArgs } from 'util';
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { z } from 'zod';
import { logger, type McpLogLevel } from './core/logger.js';

// Logging support
// Define log level enum schema for request validation
const LevelLiterals = ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'] as const;
const LevelEnum = z.enum(LevelLiterals);

// Initialize the MCP server
const server = new Server(
  {
    name: 'Actual Budget',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      logging: {},
    },
  }
);

// Setup logging request schemas and handlers
const SetLevelsRequestSchema = z.object({
  method: z.literal('logging/setLevels'),
  params: z.object({ levels: z.record(z.string(), LevelEnum.nullable()) }),
});
server.setRequestHandler(SetLevelsRequestSchema, (request: any) => {
  const levels = request.params.levels as Record<string, McpLogLevel | null>;
  logger.setLevels(levels);
  return {};
});

// Define SetLevel schema with level enum
const SetLevelRequestSchema = z.object({
  method: z.literal('logging/setLevel'),
  params: z.object({ level: LevelEnum }),
});
server.setRequestHandler(SetLevelRequestSchema, (request: any) => {
  const lvl = request.params.level as McpLogLevel;
  logger.setLevel('.', lvl);
  return {};
});

// Argument parsing
const {
  values: {
    sse: useSse,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    port,
    host,
    'test-resources': testResources,
    'test-custom': testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    port: { type: 'string' },
    host: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

const resolvedPort = port ? parseInt(port, 10) : 3000;
const resolvedHost = host || '0.0.0.0'; // Default to all interfaces

// Bearer authentication middleware
const bearerAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!enableBearer) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Authorization header required',
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: "Authorization header must start with 'Bearer '",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const expectedToken = process.env.BEARER_TOKEN;

  if (!expectedToken) {
    logger.error('auth', { message: 'BEARER_TOKEN environment variable not set' });
    res.status(500).json({
      error: 'Server configuration error',
    });
    return;
  }

  if (token !== expectedToken) {
    res.status(401).json({
      error: 'Invalid bearer token',
    });
    return;
  }

  next();
};

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // If testing resources, verify connectivity and list accounts, then exit
  if (testResources) {
    logger.info('test', { message: 'Testing resources...' });
    try {
      await initActualApi();
      const accounts = await fetchAllAccounts();
      logger.info('test', { message: `Found ${accounts.length} account(s).` });
      accounts.forEach((account) => logger.info('test', { message: `- ${account.id}: ${account.name}` }));
      logger.info('test', { message: 'Resource test passed.' });
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      logger.error('test', { message: 'Resource test failed', error });
      process.exit(1);
    }
  }

  if (testCustom) {
    logger.info('test', { message: 'Initializing custom test...' });
    try {
      await initActualApi();

      // Custom test here

      // ----------------

      logger.info('test', { message: 'Custom test passed.' });
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      logger.error('test', { message: 'Custom test failed', error });
    }
  }

  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    logger.warning('main', { message: 'Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set' });
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    logger.warning('main', { message: 'ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not' });
    logger.warning('main', { message: 'If your server requires authentication, initialization will fail' });
  }

  if (useSse) {
    const app = express();
    app.use(express.json());
    let transport: SSEServerTransport | null = null;

    // Log bearer auth status
    if (enableBearer) {
      logger.info('auth', { message: 'Bearer authentication enabled for SSE endpoints' });
    } else {
      logger.info('auth', { message: 'Bearer authentication disabled - endpoints are public' });
    }

    // HTTP transport (stateless)
    app.post('/mcp', bearerAuth, async (req: Request, res: Response) => {
      try {
        // In stateless mode, create a new instance of transport and server for each request
        // to ensure complete isolation. A single instance would cause request ID collisions
        // when multiple clients connect concurrently.
        const requestServer = new Server(
          {
            name: 'Actual Budget',
            version: '1.0.0',
          },
          {
            capabilities: {
              resources: {},
              tools: {},
              prompts: {},
              logging: {},
            },
          }
        );

        // Setup tools, resources, and prompts for this request's server instance
        setupResources(requestServer);
        setupTools(requestServer, enableWrite);
        setupPrompts(requestServer);

        // Setup logging for this server instance
        requestServer.setRequestHandler(SetLevelsRequestSchema, (request: any) => {
          const levels = request.params.levels as Record<string, McpLogLevel | null>;
          logger.setLevels(levels);
          return {};
        });
        requestServer.setRequestHandler(SetLevelRequestSchema, (request: any) => {
          const lvl = request.params.level as McpLogLevel;
          logger.setLevel('.', lvl);
          return {};
        });

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
        });

        res.on('close', () => {
          logger.debug('http', { message: 'HTTP request closed' });
          transport.close();
          requestServer.close();
        });

        await requestServer.connect(transport);
        logger.connect(requestServer);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error('http', { message: 'Error handling MCP request', error });
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // GET and DELETE not supported in stateless HTTP mode
    app.get('/mcp', bearerAuth, (_req: Request, res: Response) => {
      logger.debug('http', { message: 'Received GET request to /mcp (not supported in stateless mode)' });
      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed. SSE notifications not supported in stateless mode.',
        },
        id: null,
      });
    });

    app.delete('/mcp', bearerAuth, (_req: Request, res: Response) => {
      logger.debug('http', { message: 'Received DELETE request to /mcp (not supported in stateless mode)' });
      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed. Session termination not supported in stateless mode.',
        },
        id: null,
      });
    });

    app.get('/sse', bearerAuth, (_req: Request, res: Response) => {
      transport = new SSEServerTransport('/messages', res);
      server.connect(transport).then(() => {
        logger.connect(server);
        logger.info('main', { message: `Actual Budget MCP Server (SSE) started on port ${resolvedPort}` });
      });
    });
    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(500).json({ error: 'Transport not initialized' });
      }
    });

    app.listen(resolvedPort, resolvedHost, (error: any) => {
      if (error) {
        logger.error('main', { message: 'Server listen error', error });
      } else {
        logger.info('main', {
          message: `Actual Budget MCP Server (SSE) started on ${resolvedHost}:${resolvedPort}`,
        });
      }
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.connect(server);
    logger.info('main', { message: 'Actual Budget MCP Server (stdio) started' });
  }
}

setupResources(server);
setupTools(server, enableWrite);
setupPrompts(server);

// Handle unhandled promise rejections and exceptions to prevent crashes
// IMPORTANT: These handlers prevent Node.js from printing stack traces to stderr,
// which would break stdio JSON-RPC protocol
process.on('unhandledRejection', (reason, promise) => {
  logger.error('main', { message: 'Unhandled Rejection', promise: String(promise), reason: String(reason) });
  // Don't exit on unhandled rejections in stdio mode
});
process.on('uncaughtException', (error) => {
  logger.error('main', { message: 'Uncaught Exception', error: error.message, stack: error.stack });
  // In stdio mode, we can't let Node crash with a stack trace to stderr
  // Log it via MCP and continue running
});

process.on('SIGINT', () => {
  logger.info('main', { message: 'SIGINT received, shutting down server' });
  server.close();
  process.exit(0);
});

// Enable console fallback for SSE mode (allows console.* before connection)
if (useSse) {
  logger.setConsoleEnabled(true);
  // Restore console methods for SSE mode since it doesn't use stdio
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.debug = originalConsoleDebug;
}

main().catch((error: unknown) => {
  logger.error('main', { message: 'Server error', error });
  // Do not exit on server errors to keep server running
});
