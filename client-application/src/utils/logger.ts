import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor(verbose: boolean = false) {
    this.logger = winston.createLogger({
      level: verbose ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'nova-cli-error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'nova-cli.log' 
        })
      ]
    });

    if (verbose) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error | any): void {
    this.logger.error(message, error);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}