import { EventEmitter } from 'events';
import { NovaApiClient } from './api/client';
import { AudioDeviceManager } from './audio/devices';
import { AudioRecorder } from './audio/recorder';
import { WakeWordDetector } from './audio/wakeword';
import { ConfigManager } from './config';
import { TerminalUI } from './ui/terminal';
import { Logger } from './utils/logger';
import { AppState, AudioDevice, CLIOptions, AudioMetrics, AudioChunk } from './types';
import { sleep } from './utils';

export class NovaApp extends EventEmitter {
  private config: ConfigManager;
  private logger: Logger;
  private ui: TerminalUI;
  private apiClient: NovaApiClient;
  private deviceManager: AudioDeviceManager;
  private recorder: AudioRecorder;
  private wakeWordDetector: WakeWordDetector;
  private options: CLIOptions;

  private currentState: AppState = AppState.IDLE;
  private selectedDevice: AudioDevice | null = null;
  private isRunning: boolean = false;
  private conversationContext: string = '';

  constructor(options: CLIOptions = {}) {
    super();

    this.options = options;
    this.logger = new Logger(options.verbose);
    this.config = new ConfigManager(options.config, options);
    this.ui = new TerminalUI();
    
    this.apiClient = new NovaApiClient(this.config.getConfig(), this.logger);
    this.deviceManager = new AudioDeviceManager(this.logger);
    this.recorder = new AudioRecorder(this.config.getConfig(), this.logger);
    this.wakeWordDetector = new WakeWordDetector(
      this.config.getConfig(), 
      this.apiClient, 
      this.logger
    );

    this.setupEventListeners();
    this.setupSignalHandlers();
  }

  private setupEventListeners(): void {
    // Recorder events
    this.recorder.on('data', (chunk: AudioChunk) => {
      this.handleAudioData(chunk);
    });

    this.recorder.on('silence', (duration: number) => {
      this.handleSilence(duration);
    });

    this.recorder.on('error', (error: Error) => {
      this.handleError('Recording error', error);
    });

    // Wake word detector events
    this.wakeWordDetector.on('detected', (confidence: number, timestamp: string) => {
      this.handleWakeWordDetected(confidence, timestamp);
    });

    this.wakeWordDetector.on('error', (error: Error) => {
      this.handleError('Wake word detection error', error);
    });
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.shutdown();
    });
  }

  public async start(): Promise<void> {
    try {
      this.ui.showWelcome();
      
      // Check server connectivity
      const isServerHealthy = await this.apiClient.healthCheck();
      if (!isServerHealthy) {
        throw new Error('Cannot connect to Nova backend server');
      }

      // List and select audio device
      await this.setupAudioDevice();
      
      // Start the main loop
      this.isRunning = true;
      this.setState(AppState.LISTENING);
      this.startListening();
      
      // Keep the application running
      while (this.isRunning) {
        await sleep(1000);
        this.updateUI();
      }

    } catch (error) {
      this.handleError('Failed to start application', error as Error);
    }
  }

  private async setupAudioDevice(): Promise<void> {
    const devices = await this.deviceManager.listDevices();

    if (devices.length === 0) {
      throw new Error('No audio devices found');
    }

    this.ui.showDeviceSelection(devices);

    // Use specified device from CLI option, or fall back to default
    if (this.options.device !== undefined) {
      const device = this.deviceManager.getDevice(this.options.device);
      if (!device) {
        throw new Error(`Device with ID ${this.options.device} not found`);
      }
      this.selectedDevice = device;
      this.logger.info(`Using specified device ID: ${this.options.device}`);
    } else {
      this.selectedDevice = this.deviceManager.getDefaultDevice() || devices[0];
    }

    if (this.selectedDevice) {
      this.ui.showDeviceConnected(this.selectedDevice);
      this.logger.info(`Selected audio device: ${this.selectedDevice.name}`);
    }
  }

  private startListening(): void {
    if (!this.selectedDevice) {
      throw new Error('No audio device selected');
    }

    this.recorder.startRecording(this.selectedDevice);
    this.wakeWordDetector.startListening();
    this.ui.showListening();
    
    this.logger.info('Started listening for wake word');
  }

  private handleAudioData(chunk: AudioChunk): void {
    if (this.currentState === AppState.LISTENING) {
      // Send chunk to wake word detector
      this.wakeWordDetector.addAudioChunk(chunk);
    }
  }

  private async handleWakeWordDetected(confidence: number, timestamp: string): Promise<void> {
    this.logger.info('Wake word detected, transitioning to TRIGGERED state.');
    this.logger.info(`Wake word detected with confidence: ${confidence}`);
    
    this.setState(AppState.TRIGGERED);
    this.ui.showWakeWordDetected(confidence);
    
    // Stop wake word detection temporarily
    this.wakeWordDetector.stopListening();
    
    // Start full recording session
    await this.startRecordingSession();
  }

  private async startRecordingSession(): Promise<void> {
    this.logger.info('Starting recording session.');
    this.setState(AppState.RECORDING);
    this.ui.showRecording();

    const recordingTimeout = setTimeout(() => {
      if (this.currentState === AppState.RECORDING) {
        this.logger.info('Recording session timed out.');
        this.endRecordingSession();
      }
    }, 30000); // 30 second max recording

    this.recorder.once('stop', () => {
      clearTimeout(recordingTimeout);
    });
  }

  private async endRecordingSession(): Promise<void> {
    this.logger.info('Attempting to end recording session.');
    if (this.currentState !== AppState.RECORDING) {
      this.logger.info(`Recording session not in RECORDING state. Current state: ${this.currentState}. Aborting endRecordingSession.`);
      return;
    }
    this.setState(AppState.PROCESSING);
    this.ui.showProcessing();
    
    const audioBuffer = this.recorder.stopRecording();
    this.logger.info('Recorder stopped. Processing audio buffer.');
    
    if (!audioBuffer) {
      this.handleError('No audio data recorded', new Error('Empty audio buffer'));
      this.logger.warn('Empty audio buffer after stopping recorder.');
      return;
    }

    try {
      this.logger.info('Transcribing audio...');
      // Transcribe audio
      const transcription = await this.apiClient.transcribeAudio(audioBuffer);
      
      if (!transcription.success) {
        throw new Error('Transcription failed');
      }
      this.logger.info(`Transcription successful: ${transcription.transcript}`);

      this.ui.showTranscript(transcription.transcript);
      
      this.logger.info('Processing text with AI...');
      // Process with AI
      const response = await this.apiClient.processText(
        transcription.transcript, 
        this.conversationContext
      );
      
      if (!response.success) {
        throw new Error('AI processing failed');
      }
      this.logger.info(`AI processing successful. Response: ${response.response}`);

      this.setState(AppState.RESPONDING);
      this.ui.showResponse(response.response);
      
      // Update conversation context
      this.conversationContext = `User: ${transcription.transcript}\nAssistant: ${response.response}`;
      
      // Return to listening mode
      setTimeout(() => {
        this.returnToListening();
      }, 2000);

    } catch (error) {
      this.handleError('Failed to process recording', error as Error);
      this.logger.error('Error during audio processing or AI interaction.', error);
    }
  }

  private handleSilence(duration: number): void {
    this.logger.info(`Silence detected for ${duration}ms. Current state: ${this.currentState}`);
    if (this.currentState === AppState.RECORDING) {
      this.logger.info('Ending recording session due to silence.');
      this.endRecordingSession();
    }
  }

  private returnToListening(): void {
    this.setState(AppState.LISTENING);
    this.wakeWordDetector.startListening();
    this.ui.showReadyForNext();
    this.logger.info('Returned to listening mode');
  }

  private handleError(message: string, error: Error): void {
    this.setState(AppState.ERROR);
    this.logger.error(message, error);
    this.ui.showError(message, error);
    
    // Try to recover after 3 seconds
    setTimeout(() => {
      if (this.isRunning) {
        this.returnToListening();
      }
    }, 3000);
  }

  private setState(state: AppState): void {
    this.currentState = state;
    this.logger.debug(`State changed to: ${state}`);
  }

  private updateUI(): void {
    const metrics: AudioMetrics = {
      level: this.recorder.getCurrentAudioLevel(),
      isRecording: this.recorder.isCurrentlyRecording(),
      state: this.currentState
    };
    
    this.ui.showStatus(metrics);
  }

  public async listDevices(): Promise<void> {
    try {
      const devices = await this.deviceManager.listDevices();
      this.ui.showDeviceSelection(devices);
    } catch (error) {
      this.handleError('Failed to list audio devices', error as Error);
    }
  }

  public async testAudio(): Promise<void> {
    try {
      this.ui.showInfo('Testing audio setup...');
      
      const devices = await this.deviceManager.listDevices();
      const defaultDevice = this.deviceManager.getDefaultDevice();
      
      if (!defaultDevice) {
        throw new Error('No default audio device found');
      }

      const isWorking = await this.deviceManager.testDevice(defaultDevice.id);
      
      if (isWorking) {
        this.ui.showInfo('Audio test successful');
      } else {
        throw new Error('Audio test failed');
      }

    } catch (error) {
      this.handleError('Audio test failed', error as Error);
    }
  }

  public showVersion(): void {
    console.log('Nova CLI v1.0.0');
  }

  public showHelp(): void {
    this.ui.showHelp();
  }

  public shutdown(): void {
    this.logger.info('Shutting down Nova CLI');
    this.ui.showShutdown();
    
    this.isRunning = false;
    this.recorder.cleanup();
    this.wakeWordDetector.cleanup();
    this.ui.cleanup();
    
    process.exit(0);
  }
}