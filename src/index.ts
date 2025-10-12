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

/**
 * Creates a new MCP server instance with all tools, resources, and prompts configured.
 * Used for stdio mode and for creating per-connection server instances in SSE mode.
 */
function createServerInstance(enableWrite: boolean = false): Server {
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

  // Setup resources, tools, and prompts
  setupResources(server);
  setupTools(server, enableWrite);
  setupPrompts(server);

  return server;
}

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

    // Session-based transport management for SSE connections
    // Each SSE connection gets its own transport and server instance
    const sessions = new Map<string, { transport: SSEServerTransport; server: Server }>();

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
        const requestServer = createServerInstance(enableWrite);

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

    // SSE endpoint for establishing persistent connections
    app.get('/sse', bearerAuth, async (req: Request, res: Response) => {
      logger.info('sse', { message: 'Received GET request to /sse (establishing SSE stream)' });
      try {
        // Create a new SSE transport for this client
        // The endpoint for POST messages is '/messages'
        const transport = new SSEServerTransport('/messages', res);

        // Extract the session ID generated by the transport
        const sessionId = transport.sessionId;

        // Create a new server instance for this session
        const sessionServer = createServerInstance(enableWrite);

        // Store the session
        sessions.set(sessionId, { transport, server: sessionServer });

        // Set up cleanup handler when connection closes
        transport.onclose = () => {
          logger.info('sse', { message: `SSE connection closed for session ${sessionId}` });
          sessions.delete(sessionId);
          sessionServer.close();
        };

        // Connect the transport to the server
        await sessionServer.connect(transport);
        logger.connect(sessionServer);

        logger.info('sse', {
          message: `SSE connection established with session ID: ${sessionId}`,
          sessionId,
          activeSessions: sessions.size
        });
      } catch (error) {
        logger.error('sse', { message: 'Error establishing SSE stream', error });
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });

    // Messages endpoint for receiving client JSON-RPC requests
    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      logger.debug('sse', { message: 'Received POST request to /messages' });

      // Extract session ID from URL query parameter
      // The SSE protocol adds this based on the endpoint event
      const sessionId = req.query.sessionId as string | undefined;

      if (!sessionId) {
        logger.error('sse', { message: 'No session ID provided in request URL' });
        res.status(400).json({ error: 'Missing sessionId parameter' });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        logger.error('sse', {
          message: `No active session found for ID: ${sessionId}`,
          sessionId,
          activeSessions: Array.from(sessions.keys())
        });
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      try {
        // Handle the POST message with the correct transport for this session
        await session.transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error('sse', { message: 'Error handling POST message', error, sessionId });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error handling request' });
        }
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

    // Handle server shutdown - cleanup all active sessions
    process.on('SIGINT', async () => {
      logger.info('main', { message: 'SIGINT received, shutting down SSE server' });

      // Close all active SSE sessions
      for (const [sessionId, session] of sessions.entries()) {
        try {
          logger.info('sse', { message: `Closing session ${sessionId}` });
          await session.transport.close();
          session.server.close();
          sessions.delete(sessionId);
        } catch (error) {
          logger.error('sse', { message: `Error closing session ${sessionId}`, error });
        }
      }

      logger.info('main', { message: 'SSE server shutdown complete' });
      process.exit(0);
    });
  } else {
    // Create server instance for stdio mode with enableWrite flag
    const stdioServer = createServerInstance(enableWrite);
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    logger.connect(stdioServer);
    logger.info('main', { message: 'Actual Budget MCP Server (stdio) started' });

    // Handle SIGINT for stdio mode
    process.on('SIGINT', () => {
      logger.info('main', { message: 'SIGINT received, shutting down server' });
      stdioServer.close();
      process.exit(0);
    });
  }
}

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
