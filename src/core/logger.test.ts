/**
 * Tests for the MCP-compliant logger module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevelMap, validLogLevels, type McpLogLevel } from './logger.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('Logger', () => {
  // Create a mock server
  const mockServer = {
    sendLoggingMessage: vi.fn(),
  } as unknown as Server;

  beforeEach(() => {
    // Reset the logger state before each test
    vi.clearAllMocks();
    // Disconnect logger to reset state
    logger.disconnect();
    // Reset log level to default
    logger.setLevel('.', 'info');
    // Disable console fallback
    logger.setConsoleEnabled(false);
  });

  describe('Log Level Management', () => {
    it('should set and respect log levels', () => {
      logger.connect(mockServer);

      // Set level to warning (only warning and above should log)
      logger.setLevel('.', 'warning');

      logger.debug('test', { message: 'debug message' });
      logger.info('test', { message: 'info message' });
      logger.warning('test', { message: 'warning message' });
      logger.error('test', { message: 'error message' });

      // Only warning and error should have been sent
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(2);
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'warning',
        logger: 'test',
        data: { message: 'warning message' },
      });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'error',
        logger: 'test',
        data: { message: 'error message' },
      });
    });

    it('should support setting multiple log levels', () => {
      logger.connect(mockServer);

      logger.setLevels({
        '.': 'error',
        custom: 'debug',
      });

      // Root logger should only log error
      logger.info('.', { message: 'info message' });
      expect(mockServer.sendLoggingMessage).not.toHaveBeenCalled();

      // Custom logger should log debug
      logger.debug('custom', { message: 'debug message' });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'debug',
        logger: 'custom',
        data: { message: 'debug message' },
      });
    });

    it('should remove log level when set to null', () => {
      logger.connect(mockServer);

      logger.setLevels({
        custom: 'debug',
      });
      logger.debug('custom', { message: 'debug message' });
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Remove custom level, should fall back to root
      logger.setLevel('.', 'error');
      logger.setLevels({ custom: null });
      logger.debug('custom', { message: 'debug message' });
      expect(mockServer.sendLoggingMessage).not.toHaveBeenCalled();
    });
  });

  describe('Pre-Connection Queuing', () => {
    it('should queue logs before server connection', () => {
      // Don't connect server yet
      logger.info('test', { message: 'queued message' });

      // Should not be sent yet
      expect(mockServer.sendLoggingMessage).not.toHaveBeenCalled();

      // Connect server
      logger.connect(mockServer);

      // Queued message should now be sent
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        logger: 'test',
        data: { message: 'queued message' },
      });
    });

    it('should flush multiple queued messages in order', () => {
      logger.info('test', { message: 'first' });
      logger.warning('test', { message: 'second' });
      logger.error('test', { message: 'third' });

      logger.connect(mockServer);

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(3);
      expect(mockServer.sendLoggingMessage).toHaveBeenNthCalledWith(1, {
        level: 'info',
        logger: 'test',
        data: { message: 'first' },
      });
      expect(mockServer.sendLoggingMessage).toHaveBeenNthCalledWith(2, {
        level: 'warning',
        logger: 'test',
        data: { message: 'second' },
      });
      expect(mockServer.sendLoggingMessage).toHaveBeenNthCalledWith(3, {
        level: 'error',
        logger: 'test',
        data: { message: 'third' },
      });
    });

    it('should respect log levels when queuing', () => {
      logger.setLevel('.', 'warning');

      logger.debug('test', { message: 'debug' });
      logger.info('test', { message: 'info' });
      logger.warning('test', { message: 'warning' });

      logger.connect(mockServer);

      // Only warning should have been queued and sent
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(1);
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'warning',
        logger: 'test',
        data: { message: 'warning' },
      });
    });
  });

  describe('Log Level Methods', () => {
    it('should support all MCP log levels', () => {
      logger.connect(mockServer);
      logger.setLevel('.', 'debug');

      logger.debug('test', { message: 'debug' });
      logger.info('test', { message: 'info' });
      logger.notice('test', { message: 'notice' });
      logger.warning('test', { message: 'warning' });
      logger.error('test', { message: 'error' });
      logger.critical('test', { message: 'critical' });
      logger.alert('test', { message: 'alert' });
      logger.emergency('test', { message: 'emergency' });

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(8);
    });

    it('should handle different data types', () => {
      logger.connect(mockServer);

      // String
      logger.info('test', 'string message');
      expect(mockServer.sendLoggingMessage).toHaveBeenLastCalledWith({
        level: 'info',
        logger: 'test',
        data: 'string message',
      });

      // Object
      logger.info('test', { foo: 'bar', count: 42 });
      expect(mockServer.sendLoggingMessage).toHaveBeenLastCalledWith({
        level: 'info',
        logger: 'test',
        data: { foo: 'bar', count: 42 },
      });

      // Array
      logger.info('test', [1, 2, 3]);
      expect(mockServer.sendLoggingMessage).toHaveBeenLastCalledWith({
        level: 'info',
        logger: 'test',
        data: [1, 2, 3],
      });
    });
  });

  describe('Console Fallback Mode', () => {
    it('should use console when enabled and not connected', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.setConsoleEnabled(true);
      logger.info('test', { message: 'console message' });

      expect(consoleSpy).toHaveBeenCalledWith('[info] [test]', '{"message":"console message"}');

      consoleSpy.mockRestore();
    });

    it('should use console.error for error and critical levels', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.setConsoleEnabled(true);
      logger.error('test', { message: 'error message' });
      logger.critical('test', { message: 'critical message' });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it('should use console.warn for warning level', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.setConsoleEnabled(true);
      logger.warning('test', { message: 'warning message' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[warning] [test]', '{"message":"warning message"}');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty logger name', () => {
      logger.connect(mockServer);
      logger.info('', { message: 'test' });

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        logger: '',
        data: { message: 'test' },
      });
    });

    it('should handle undefined data', () => {
      logger.connect(mockServer);
      logger.info('test', undefined);

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        logger: 'test',
        data: undefined,
      });
    });
  });

  describe('LogLevelMap', () => {
    it('should have correct severity ordering', () => {
      expect(LogLevelMap.emergency).toBeLessThan(LogLevelMap.alert);
      expect(LogLevelMap.alert).toBeLessThan(LogLevelMap.critical);
      expect(LogLevelMap.critical).toBeLessThan(LogLevelMap.error);
      expect(LogLevelMap.error).toBeLessThan(LogLevelMap.warning);
      expect(LogLevelMap.warning).toBeLessThan(LogLevelMap.notice);
      expect(LogLevelMap.notice).toBeLessThan(LogLevelMap.info);
      expect(LogLevelMap.info).toBeLessThan(LogLevelMap.debug);
    });

    it('should match validLogLevels array', () => {
      const mapKeys = Object.keys(LogLevelMap) as McpLogLevel[];
      expect(mapKeys.sort()).toEqual([...validLogLevels].sort());
    });
  });
});
