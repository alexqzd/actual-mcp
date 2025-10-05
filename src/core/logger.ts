/**
 * MCP-compliant logging module
 *
 * This module provides structured logging that works with the Model Context Protocol.
 * All logs are sent via MCP notifications (notifications/message) to avoid polluting
 * stdout/stderr when using stdio transport, which would break JSON-RPC communication.
 *
 * Features:
 * - Pre-connection log queuing (logs are queued until server connects)
 * - MCP-compliant structured logging with proper log levels
 * - Support for both stdio and SSE transports
 * - Integration with MCP logging/setLevel command
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * MCP-defined log levels in order of severity (lowest to highest)
 */
export type McpLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/**
 * Log level severity mapping (lower number = higher severity)
 */
export const LogLevelMap: Record<McpLogLevel, number> = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

/**
 * Valid log levels array
 */
export const validLogLevels: readonly McpLogLevel[] = [
  'emergency',
  'alert',
  'critical',
  'error',
  'warning',
  'notice',
  'info',
  'debug',
] as const;

/**
 * Log message structure
 */
interface QueuedLogMessage {
  level: McpLogLevel;
  logger: string;
  data: unknown;
}

/**
 * Centralized logger for MCP-compliant logging
 */
class Logger {
  private server: Server | null = null;
  private logQueue: QueuedLogMessage[] = [];
  private logLevels: Record<string, number> = { '.': LogLevelMap.info };
  private allowConsole = false;

  /**
   * Connect the logger to an MCP server
   * This flushes any queued messages and enables real-time logging
   *
   * @param server - The MCP server instance
   */
  public connect(server: Server): void {
    this.server = server;

    // Flush queued messages
    for (const message of this.logQueue) {
      this.sendLog(message.level, message.logger, message.data);
    }
    this.logQueue = [];
  }

  /**
   * Disconnect the logger from the MCP server
   * Used primarily for testing
   */
  public disconnect(): void {
    this.server = null;
    this.logQueue = [];
  }

  /**
   * Enable console fallback for SSE mode
   * This allows console.* calls before the server is connected
   *
   * @param enabled - Whether to enable console fallback
   */
  public setConsoleEnabled(enabled: boolean): void {
    this.allowConsole = enabled;
  }

  /**
   * Set the log level for a logger
   *
   * @param loggerName - The logger name (use '.' for root)
   * @param level - The log level
   */
  public setLevel(loggerName: string, level: McpLogLevel): void {
    this.logLevels[loggerName] = LogLevelMap[level];
  }

  /**
   * Set multiple log levels at once
   *
   * @param levels - Map of logger names to levels (null to remove)
   */
  public setLevels(levels: Record<string, McpLogLevel | null>): void {
    for (const name in levels) {
      const lvl = levels[name];
      if (lvl === null) {
        delete this.logLevels[name];
      } else {
        this.logLevels[name] = LogLevelMap[lvl];
      }
    }
  }

  /**
   * Get the effective log level for a logger
   *
   * @param loggerName - The logger name
   * @returns The numeric log level
   */
  private getEffectiveLogLevel(loggerName: string): number {
    return this.logLevels[loggerName] ?? this.logLevels['.'];
  }

  /**
   * Check if a log message should be sent based on current log level
   *
   * @param level - The log level
   * @param loggerName - The logger name
   * @returns Whether the message should be logged
   */
  private shouldLog(level: McpLogLevel, loggerName: string): boolean {
    return LogLevelMap[level] <= this.getEffectiveLogLevel(loggerName);
  }

  /**
   * Send a log message via MCP or queue it if not connected
   *
   * @param level - The log level
   * @param logger - The logger name
   * @param data - The log data (message string or object)
   */
  private sendLog(level: McpLogLevel, logger: string, data: unknown): void {
    if (!this.shouldLog(level, logger)) {
      return;
    }

    if (this.server) {
      // Server is connected, send via MCP
      this.server.sendLoggingMessage({ level, logger, data });
    } else {
      // Not connected yet
      if (this.allowConsole) {
        // SSE mode: allow console output before connection
        const message = typeof data === 'object' ? JSON.stringify(data) : String(data);
        const logFn =
          level === 'error' || level === 'critical' ? console.error : level === 'warning' ? console.warn : console.log;
        logFn(`[${level}] [${logger}]`, message);
      } else {
        // stdio mode: queue the message for later
        this.logQueue.push({ level, logger, data });
      }
    }
  }

  /**
   * Log a debug message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public debug(logger: string, data: unknown): void {
    this.sendLog('debug', logger, data);
  }

  /**
   * Log an info message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public info(logger: string, data: unknown): void {
    this.sendLog('info', logger, data);
  }

  /**
   * Log a notice message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public notice(logger: string, data: unknown): void {
    this.sendLog('notice', logger, data);
  }

  /**
   * Log a warning message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public warning(logger: string, data: unknown): void {
    this.sendLog('warning', logger, data);
  }

  /**
   * Log an error message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public error(logger: string, data: unknown): void {
    this.sendLog('error', logger, data);
  }

  /**
   * Log a critical message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public critical(logger: string, data: unknown): void {
    this.sendLog('critical', logger, data);
  }

  /**
   * Log an alert message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public alert(logger: string, data: unknown): void {
    this.sendLog('alert', logger, data);
  }

  /**
   * Log an emergency message
   *
   * @param logger - The logger name
   * @param data - The log data
   */
  public emergency(logger: string, data: unknown): void {
    this.sendLog('emergency', logger, data);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();
