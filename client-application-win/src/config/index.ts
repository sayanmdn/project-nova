import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { NovaConfig, CLIOptions } from '../types';

const DEFAULT_CONFIG: NovaConfig = {
  server: {
    baseUrl: 'http://localhost:4000',
    timeout: 30000
  },
  audio: {
    sampleRate: 16000,
    chunkDuration: 3.0,
    silenceThreshold: -40,
    silenceDuration: 2.0
  },
  wakeWord: {
    confidenceThreshold: 0.8,
    cooldownPeriod: 1.0
  }
};

export class ConfigManager {
  private config: NovaConfig;

  constructor(configPath?: string, cliOptions?: CLIOptions) {
    this.config = { ...DEFAULT_CONFIG };
    
    if (configPath && fs.existsSync(configPath)) {
      this.loadFromFile(configPath);
    }
    
    if (cliOptions) {
      this.applyCliOptions(cliOptions);
    }
  }

  private loadFromFile(configPath: string): void {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const fileConfig = yaml.parse(fileContent) as Partial<NovaConfig>;
      this.config = this.mergeConfig(this.config, fileConfig);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
  }

  private applyCliOptions(options: CLIOptions): void {
    if (options.server) {
      this.config.server.baseUrl = options.server;
    }
    if (options.chunkDuration) {
      this.config.audio.chunkDuration = options.chunkDuration;
    }
    if (options.confidenceThreshold) {
      this.config.wakeWord.confidenceThreshold = options.confidenceThreshold;
    }
    if (options.silenceThreshold) {
      this.config.audio.silenceThreshold = options.silenceThreshold;
    }
  }

  private mergeConfig(base: NovaConfig, override: Partial<NovaConfig>): NovaConfig {
    return {
      server: { ...base.server, ...override.server },
      audio: { ...base.audio, ...override.audio },
      wakeWord: { ...base.wakeWord, ...override.wakeWord }
    };
  }

  public getConfig(): NovaConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<NovaConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  public saveToFile(configPath: string): void {
    try {
      const yamlContent = yaml.stringify(this.config);
      fs.writeFileSync(configPath, yamlContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save config to ${configPath}: ${error}`);
    }
  }

  public static getDefaultConfigPath(): string {
    return path.join(process.cwd(), 'config.yaml');
  }
}