import chalk from 'chalk';
import * as cliProgress from 'cli-progress';
import { AppState, AudioDevice, AudioMetrics } from '../types';
import { formatTimestamp, formatDuration } from '../utils';

export class TerminalUI {
  private progressBar: cliProgress.SingleBar | null = null;
  private currentState: AppState = AppState.IDLE;
  private statusLine: string = '';
  private lastUpdate: number = 0;

  constructor() {
    this.setupProgressBar();
  }

  private setupProgressBar(): void {
    this.progressBar = new cliProgress.SingleBar({
      format: ' {bar} | {percentage}% | {value}/{total} | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
  }

  public showWelcome(): void {
    console.log(chalk.cyan.bold('\n╭─ NOVA Voice Assistant ─────────────────────╮'));
    console.log(chalk.cyan('│') + '                v1.0.0                      ' + chalk.cyan('│'));
    console.log(chalk.cyan('╰────────────────────────────────────────────╯\n'));
  }

  public showDeviceSelection(devices: AudioDevice[]): void {
    console.log(chalk.yellow.bold('📱 Available Audio Devices:'));
    console.log(chalk.gray('────────────────────────────'));
    
    devices.forEach(device => {
      const prefix = device.isDefault ? chalk.green('●') : chalk.gray('○');
      const name = device.isDefault ? chalk.green.bold(device.name) : chalk.white(device.name);
      const info = device.channels > 1 ? chalk.gray(` [${device.channels} channels]`) : '';
      
      console.log(`${prefix} [${chalk.cyan(device.id)}] ${name}${info}`);
    });
    
    console.log('');
  }

  public showDeviceConnected(device: AudioDevice): void {
    console.log(chalk.green('✓') + ' Connected to: ' + chalk.bold(device.name));
    console.log(chalk.yellow('⚡') + ' CUDA acceleration: ' + chalk.green('Enabled'));
    console.log(chalk.blue('🎯') + ' Listening for "Hi Nova"...\n');
  }

  public showListening(): void {
    this.updateState(AppState.LISTENING);
    console.log(chalk.blue('🔊 Monitoring audio... ') + chalk.gray('(Press Ctrl+C to stop)'));
    console.log(chalk.blue('🎯 Listening for wake word...'));
  }

  public showWakeWordDetected(confidence: number): void {
    console.log('');
    console.log(chalk.green.bold(`[Wake word detected! Confidence: ${Math.round(confidence * 100)}%]`));
    console.log(chalk.red('🎤 Recording... ') + chalk.gray('(speak now)'));
  }

  public showRecording(): void {
    this.updateState(AppState.RECORDING);
    if (this.progressBar) {
      this.progressBar.start(100, 0, { status: 'Recording...' });
    }
  }

  public updateRecordingProgress(level: number): void {
    if (this.progressBar) {
      this.progressBar.update(level, { status: `Recording... ${Math.round(level)}%` });
    }
  }

  public showProcessing(): void {
    this.updateState(AppState.PROCESSING);
    if (this.progressBar) {
      this.progressBar.stop();
    }
    console.log(chalk.yellow('⏹️  Speech ended. Processing audio...'));
  }

  public showTranscript(transcript: string): void {
    console.log('');
    console.log(chalk.green('📝 Transcript: ') + chalk.white(`"${transcript}"`));
    console.log(chalk.blue('🤖 Processing with AI...'));
  }

  public showResponse(response: string): void {
    console.log('');
    console.log(chalk.cyan('┌─ Response ─────────────────────────────────┐'));
    
    // Word wrap the response
    const maxWidth = 42;
    const words = response.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    lines.forEach(line => {
      const padding = ' '.repeat(Math.max(0, maxWidth - line.length));
      console.log(chalk.cyan('│ ') + line + padding + chalk.cyan(' │'));
    });
    
    console.log(chalk.cyan('└────────────────────────────────────────────┘'));
  }

  public showReadyForNext(): void {
    console.log('');
    console.log(chalk.blue('🎯 Listening for "Hi Nova"... ') + chalk.gray('(Ready for next command)'));
  }

  public showError(message: string, error?: Error): void {
    console.log('');
    console.log(chalk.red.bold('❌ Error: ') + chalk.red(message));
    if (error && process.env.NODE_ENV === 'development') {
      console.log(chalk.gray(error.stack));
    }
  }

  public showWarning(message: string): void {
    console.log(chalk.yellow.bold('⚠️  Warning: ') + chalk.yellow(message));
  }

  public showInfo(message: string): void {
    console.log(chalk.blue('ℹ️  ') + chalk.white(message));
  }

  public showStatus(metrics: AudioMetrics): void {
    const now = Date.now();
    if (now - this.lastUpdate < 1000) return; // Update only every second
    
    this.lastUpdate = now;
    
    const stateEmoji = this.getStateEmoji(metrics.state);
    const levelBar = this.createAudioLevelBar(metrics.level);
    const timestamp = formatTimestamp();
    
    // Clear current line and show status
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    process.stdout.write(
      `${stateEmoji} ${this.getStateName(metrics.state)} | Audio: ${levelBar} ${Math.round(metrics.level)}% | ${timestamp}`
    );
  }

  private createAudioLevelBar(level: number): string {
    const barLength = 10;
    const filledLength = Math.round((level / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    return chalk.green('▓'.repeat(filledLength)) + chalk.gray('░'.repeat(emptyLength));
  }

  private getStateEmoji(state: AppState): string {
    switch (state) {
      case AppState.IDLE: return '⏸️ ';
      case AppState.LISTENING: return '🎯';
      case AppState.TRIGGERED: return '⚡';
      case AppState.RECORDING: return '🎤';
      case AppState.PROCESSING: return '⚙️ ';
      case AppState.RESPONDING: return '🤖';
      case AppState.ERROR: return '❌';
      default: return '❓';
    }
  }

  private getStateName(state: AppState): string {
    switch (state) {
      case AppState.IDLE: return 'Idle';
      case AppState.LISTENING: return 'Listening';
      case AppState.TRIGGERED: return 'Triggered';
      case AppState.RECORDING: return 'Recording';
      case AppState.PROCESSING: return 'Processing';
      case AppState.RESPONDING: return 'Responding';
      case AppState.ERROR: return 'Error';
      default: return 'Unknown';
    }
  }

  private updateState(state: AppState): void {
    this.currentState = state;
  }

  public showShutdown(): void {
    if (this.progressBar) {
      this.progressBar.stop();
    }
    console.log('\n');
    console.log(chalk.yellow('🛑 Shutting down Nova CLI...'));
    console.log(chalk.gray('Thank you for using Nova Voice Assistant!'));
  }

  public clearLine(): void {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  public showHelp(): void {
    console.log(chalk.cyan.bold('\nNova CLI Commands:'));
    console.log(chalk.gray('─────────────────'));
    console.log(chalk.white('  --start                 ') + chalk.gray('Start voice assistant'));
    console.log(chalk.white('  --list-devices          ') + chalk.gray('List audio devices'));
    console.log(chalk.white('  --device <id>           ') + chalk.gray('Use specific device'));
    console.log(chalk.white('  --config <file>         ') + chalk.gray('Use config file'));
    console.log(chalk.white('  --verbose               ') + chalk.gray('Enable verbose logging'));
    console.log(chalk.white('  --help                  ') + chalk.gray('Show this help'));
    console.log(chalk.white('  --version               ') + chalk.gray('Show version'));
    console.log('');
    console.log(chalk.yellow('During operation:'));
    console.log(chalk.white('  Ctrl+C                  ') + chalk.gray('Stop assistant'));
    console.log(chalk.white('  Say "Hi Nova"           ') + chalk.gray('Activate voice command'));
    console.log('');
  }

  public cleanup(): void {
    if (this.progressBar) {
      this.progressBar.stop();
    }
    this.clearLine();
  }
}