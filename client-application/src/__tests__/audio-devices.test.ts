import { spawn } from 'child_process';
import { AudioDeviceManager } from '../audio/devices';
import { Logger } from '../utils/logger';

jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('AudioDeviceManager', () => {
  let deviceManager: AudioDeviceManager;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    deviceManager = new AudioDeviceManager(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listDevices', () => {
    it('should parse pactl output and return devices', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const pactlOutput = `
Source #0
	State: RUNNING
	Name: alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
	Description: Built-in Audio Analog Stereo
	Channels: 2

Source #1
	State: IDLE
	Name: alsa_input.pci-0000_00_1f.3.analog-stereo
	Description: USB Headset Microphone
	Channels: 1
`;

      // Setup the promise to resolve when listDevices is called
      const listDevicesPromise = deviceManager.listDevices();

      // Simulate stdout data
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
      if (stdoutCallback) {
        stdoutCallback(Buffer.from(pactlOutput));
      }

      // Simulate process close
      const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeCallback) {
        closeCallback(0);
      }

      const devices = await listDevicesPromise;

      expect(devices).toHaveLength(2);
      expect(devices[0]).toEqual({
        id: 0,
        name: 'Built-in Audio Analog Stereo',
        channels: 2,
        isDefault: true
      });
      expect(devices[1]).toEqual({
        id: 1,
        name: 'USB Headset Microphone',
        channels: 1,
        isDefault: false
      });
    });

    it('should return fallback devices when pactl fails', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const listDevicesPromise = deviceManager.listDevices();

      // Simulate process error (pactl not found)
      const errorCallback = mockProcess.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorCallback) {
        const error = new Error('ENOENT');
        errorCallback(error);
      }

      const devices = await listDevicesPromise;

      expect(devices).toHaveLength(2);
      expect(devices[0].name).toBe('Default Microphone');
      expect(devices[1].name).toBe('System Audio Input');
      expect(mockLogger.warn).toHaveBeenCalledWith('PulseAudio not available, using fallback devices');
    });

    it('should reject when pactl exits with non-zero code', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const listDevicesPromise = deviceManager.listDevices();

      // Simulate process close with error code
      const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeCallback) {
        closeCallback(1);
      }

      await expect(listDevicesPromise).rejects.toThrow('pactl exited with code 1');
    });

    it('should return fallback devices when no devices found in output', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const listDevicesPromise = deviceManager.listDevices();

      // Simulate empty output
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
      if (stdoutCallback) {
        stdoutCallback(Buffer.from('No sources available'));
      }

      const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeCallback) {
        closeCallback(0);
      }

      const devices = await listDevicesPromise;

      expect(devices).toHaveLength(2);
      expect(devices[0].name).toBe('Default Microphone');
    });
  });

  describe('getDevice', () => {
    beforeEach(async () => {
      // Setup some mock devices
      const mockDevices = [
        { id: 0, name: 'Device 0', channels: 1, isDefault: true },
        { id: 1, name: 'Device 1', channels: 2, isDefault: false }
      ];
      jest.spyOn(deviceManager, 'listDevices').mockResolvedValue(mockDevices);
      await deviceManager.listDevices();
      // Set the private devices array directly
      (deviceManager as any).devices = mockDevices;
    });

    it('should return device by ID', () => {
      const device = deviceManager.getDevice(1);
      
      expect(device).toEqual({
        id: 1,
        name: 'Device 1',
        channels: 2,
        isDefault: false
      });
    });

    it('should return undefined for non-existent device', () => {
      const device = deviceManager.getDevice(999);
      
      expect(device).toBeUndefined();
    });
  });

  describe('getDefaultDevice', () => {
    it('should return the default device', async () => {
      const mockDevices = [
        { id: 0, name: 'Device 0', channels: 1, isDefault: false },
        { id: 1, name: 'Device 1', channels: 2, isDefault: true }
      ];
      jest.spyOn(deviceManager, 'listDevices').mockResolvedValue(mockDevices);
      await deviceManager.listDevices();
      (deviceManager as any).devices = mockDevices;

      const defaultDevice = deviceManager.getDefaultDevice();
      
      expect(defaultDevice).toEqual({
        id: 1,
        name: 'Device 1',
        channels: 2,
        isDefault: true
      });
    });

    it('should return first device when no default is marked', async () => {
      const mockDevices = [
        { id: 0, name: 'Device 0', channels: 1, isDefault: false },
        { id: 1, name: 'Device 1', channels: 2, isDefault: false }
      ];
      jest.spyOn(deviceManager, 'listDevices').mockResolvedValue(mockDevices);
      await deviceManager.listDevices();
      (deviceManager as any).devices = mockDevices;

      const defaultDevice = deviceManager.getDefaultDevice();
      
      expect(defaultDevice).toEqual({
        id: 0,
        name: 'Device 0',
        channels: 1,
        isDefault: false
      });
    });

    it('should return undefined when no devices available', () => {
      const defaultDevice = deviceManager.getDefaultDevice();
      
      expect(defaultDevice).toBeUndefined();
    });
  });

  describe('testDevice', () => {
    beforeEach(async () => {
      const mockDevices = [
        { id: 0, name: 'Device 0', channels: 1, isDefault: true }
      ];
      jest.spyOn(deviceManager, 'listDevices').mockResolvedValue(mockDevices);
      await deviceManager.listDevices();
      (deviceManager as any).devices = mockDevices;
    });

    it('should return true for valid device test', async () => {
      const result = await deviceManager.testDevice(0);
      
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Testing audio device: Device 0');
    });

    it('should throw error for non-existent device', async () => {
      await expect(deviceManager.testDevice(999)).rejects.toThrow('Device with ID 999 not found');
    });
  });

  describe('formatDeviceList', () => {
    it('should format device list with proper indicators', async () => {
      const mockDevices = [
        { id: 0, name: 'Default Mic', channels: 1, isDefault: true },
        { id: 1, name: 'USB Headset', channels: 2, isDefault: false }
      ];
      jest.spyOn(deviceManager, 'listDevices').mockResolvedValue(mockDevices);
      await deviceManager.listDevices();
      (deviceManager as any).devices = mockDevices;

      const formatted = deviceManager.formatDeviceList();
      
      expect(formatted).toContain('[0] Default Mic (default)');
      expect(formatted).toContain('[1] USB Headset [2 channels]');
    });

    it('should return appropriate message when no devices', () => {
      const formatted = deviceManager.formatDeviceList();
      
      expect(formatted).toBe('No audio devices found');
    });
  });
});