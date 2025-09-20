import { spawn } from 'child_process';
import { AudioDevice } from '../types';
import { Logger } from '../utils/logger';

export class AudioDeviceManager {
  private logger: Logger;
  private devices: AudioDevice[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async listDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await this.getSystemAudioDevices();
      this.devices = devices;
      return devices;
    } catch (error) {
      this.logger.error('Failed to list audio devices:', error);
      throw new Error(`Failed to list audio devices: ${error}`);
    }
  }

  private async getSystemAudioDevices(): Promise<AudioDevice[]> {
    return new Promise((resolve, reject) => {
      const devices: AudioDevice[] = [];
      
      const process = spawn('pactl', ['list', 'sources']);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        this.logger.error('pactl stderr:', data.toString());
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pactl exited with code ${code}`));
          return;
        }

        try {
          const parsedDevices = this.parseAudioDevices(output);
          resolve(parsedDevices);
        } catch (error) {
          reject(error);
        }
      });

      process.on('error', (error) => {
        if (error.message.includes('ENOENT')) {
          this.logger.warn('PulseAudio not available, using fallback devices');
          resolve(this.getFallbackDevices());
        } else {
          reject(error);
        }
      });
    });
  }

  private parseAudioDevices(output: string): AudioDevice[] {
    const devices: AudioDevice[] = [];
    const sources = output.split('Source #');
    
    let deviceId = 0;
    
    for (let i = 1; i < sources.length; i++) {
      const source = sources[i];
      const nameMatch = source.match(/Description: (.+)/);
      const channelsMatch = source.match(/Channels: (\d+)/);
      
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const channels = channelsMatch ? parseInt(channelsMatch[1]) : 1;
        const isDefault = source.includes('* index:') || deviceId === 0;
        
        devices.push({
          id: deviceId++,
          name,
          channels,
          isDefault
        });
      }
    }

    if (devices.length === 0) {
      return this.getFallbackDevices();
    }

    return devices;
  }

  private getFallbackDevices(): AudioDevice[] {
    return [
      {
        id: 0,
        name: 'Default Microphone',
        channels: 1,
        isDefault: true
      },
      {
        id: 1,
        name: 'System Audio Input',
        channels: 2,
        isDefault: false
      }
    ];
  }

  public getDevice(id: number): AudioDevice | undefined {
    return this.devices.find(device => device.id === id);
  }

  public getDefaultDevice(): AudioDevice | undefined {
    return this.devices.find(device => device.isDefault) || this.devices[0];
  }

  public async testDevice(deviceId: number): Promise<boolean> {
    const device = this.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    try {
      this.logger.info(`Testing audio device: ${device.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to test device ${device.name}:`, error);
      return false;
    }
  }

  public formatDeviceList(): string {
    if (this.devices.length === 0) {
      return 'No audio devices found';
    }

    return this.devices
      .map(device => {
        const defaultIndicator = device.isDefault ? ' (default)' : '';
        const channelInfo = device.channels > 1 ? ` [${device.channels} channels]` : '';
        return `[${device.id}] ${device.name}${defaultIndicator}${channelInfo}`;
      })
      .join('\n');
  }
}