import winston from 'winston';
import { Logger } from '../utils/logger';

jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    combine: jest.fn().mockReturnValue('combined-format'),
    timestamp: jest.fn().mockReturnValue('timestamp-format'),
    errors: jest.fn().mockReturnValue('errors-format'),
    json: jest.fn().mockReturnValue('json-format'),
    colorize: jest.fn().mockReturnValue('colorize-format'),
    simple: jest.fn().mockReturnValue('simple-format')
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

describe('Logger', () => {
  let mockWinstonLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockWinstonLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      add: jest.fn()
    } as any;

    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with info level when verbose is false', () => {
      new Logger(false);

      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'info',
        format: 'combined-format',
        transports: expect.arrayContaining([
          expect.any(winston.transports.File),
          expect.any(winston.transports.File)
        ])
      });
    });

    it('should create logger with debug level when verbose is true', () => {
      new Logger(true);

      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'debug',
        format: 'combined-format',
        transports: expect.arrayContaining([
          expect.any(winston.transports.File),
          expect.any(winston.transports.File)
        ])
      });
    });

    it('should add console transport when verbose is true', () => {
      new Logger(true);

      expect(mockWinstonLogger.add).toHaveBeenCalledWith(
        expect.any(winston.transports.Console)
      );
    });

    it('should not add console transport when verbose is false', () => {
      new Logger(false);

      expect(mockWinstonLogger.add).not.toHaveBeenCalled();
    });

    it('should default to non-verbose when no parameter provided', () => {
      new Logger();

      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info'
        })
      );
    });
  });

  describe('logging methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger();
    });

    it('should call winston info with message and meta', () => {
      const message = 'Test info message';
      const meta = { key: 'value' };

      logger.info(message, meta);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, meta);
    });

    it('should call winston info with just message when no meta', () => {
      const message = 'Test info message';

      logger.info(message);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, undefined);
    });

    it('should call winston error with message and error', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, error);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, error);
    });

    it('should call winston error with just message when no error', () => {
      const message = 'Test error message';

      logger.error(message);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, undefined);
    });

    it('should call winston warn with message and meta', () => {
      const message = 'Test warn message';
      const meta = { key: 'value' };

      logger.warn(message, meta);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    it('should call winston debug with message and meta', () => {
      const message = 'Test debug message';
      const meta = { key: 'value' };

      logger.debug(message, meta);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('file transports configuration', () => {
    beforeEach(() => {
      new Logger();
    });

    it('should create error log file transport', () => {
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: 'nova-cli-error.log',
        level: 'error'
      });
    });

    it('should create general log file transport', () => {
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: 'nova-cli.log'
      });
    });
  });

  describe('format configuration', () => {
    beforeEach(() => {
      new Logger();
    });

    it('should configure winston format correctly', () => {
      expect(winston.format.combine).toHaveBeenCalled();
      expect(winston.format.timestamp).toHaveBeenCalledWith({ format: 'YYYY-MM-DD HH:mm:ss' });
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
      expect(winston.format.json).toHaveBeenCalled();
    });
  });
});