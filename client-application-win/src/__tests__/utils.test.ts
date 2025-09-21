import {
  sleep,
  formatTimestamp,
  calculateAudioLevel,
  detectSilence,
  mergeAudioChunks,
  validateAudioBuffer,
  formatBytes,
  formatDuration
} from '../utils';
import { AudioChunk } from '../types';

describe('Utils', () => {
  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp to ISO string without milliseconds', () => {
      const timestamp = new Date('2024-01-01T12:30:45.123Z').getTime();
      const result = formatTimestamp(timestamp);
      
      expect(result).toBe('2024-01-01 12:30:45');
    });

    it('should use current time when no timestamp provided', () => {
      const result = formatTimestamp();
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('calculateAudioLevel', () => {
    it('should return 0 for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const level = calculateAudioLevel(buffer);
      
      expect(level).toBe(0);
    });

    it('should calculate audio level from 16-bit samples', () => {
      // Create buffer with known 16-bit values
      const buffer = Buffer.alloc(8);
      const samples = new Int16Array(buffer.buffer);
      samples[0] = 16384; // Half of max value
      samples[1] = -16384;
      samples[2] = 8192; // Quarter of max value
      samples[3] = -8192;
      
      const level = calculateAudioLevel(buffer);
      
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThanOrEqual(100);
    });

    it('should cap level at 100', () => {
      // Create buffer with maximum values
      const buffer = Buffer.alloc(4);
      const samples = new Int16Array(buffer.buffer);
      samples[0] = 32767; // Max positive
      samples[1] = -32768; // Max negative
      
      const level = calculateAudioLevel(buffer);
      
      expect(level).toBeLessThanOrEqual(100);
    });
  });

  describe('detectSilence', () => {
    it('should detect silence when level is below threshold', () => {
      const buffer = Buffer.alloc(4);
      const samples = new Int16Array(buffer.buffer);
      samples[0] = 100; // Very low level
      samples[1] = 100;
      
      const isSilent = detectSilence(buffer, -40);
      
      expect(isSilent).toBe(true);
    });

    it('should not detect silence when level is above threshold', () => {
      const buffer = Buffer.alloc(4);
      const samples = new Int16Array(buffer.buffer);
      samples[0] = 16384; // High level
      samples[1] = 16384;
      
      const isSilent = detectSilence(buffer, -40);
      
      expect(isSilent).toBe(false);
    });
  });

  describe('mergeAudioChunks', () => {
    it('should merge multiple audio chunks into single buffer', () => {
      const chunks: AudioChunk[] = [
        {
          buffer: Buffer.from([1, 2, 3, 4]),
          timestamp: 1000,
          duration: 100
        },
        {
          buffer: Buffer.from([5, 6, 7, 8]),
          timestamp: 1100,
          duration: 100
        }
      ];
      
      const merged = mergeAudioChunks(chunks);
      
      expect(merged).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it('should return empty buffer when no chunks provided', () => {
      const merged = mergeAudioChunks([]);
      
      expect(merged).toEqual(Buffer.alloc(0));
    });

    it('should handle single chunk', () => {
      const chunks: AudioChunk[] = [
        {
          buffer: Buffer.from([1, 2, 3, 4]),
          timestamp: 1000,
          duration: 100
        }
      ];
      
      const merged = mergeAudioChunks(chunks);
      
      expect(merged).toEqual(Buffer.from([1, 2, 3, 4]));
    });
  });

  describe('validateAudioBuffer', () => {
    it('should return true for valid audio buffer', () => {
      const buffer = Buffer.alloc(1024); // Even number of bytes
      
      expect(validateAudioBuffer(buffer)).toBe(true);
    });

    it('should return false for odd-length buffer', () => {
      const buffer = Buffer.alloc(1023); // Odd number of bytes
      
      expect(validateAudioBuffer(buffer)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      
      expect(validateAudioBuffer(buffer)).toBe(false);
    });

    it('should return false for null/undefined buffer', () => {
      expect(validateAudioBuffer(null as any)).toBe(false);
      expect(validateAudioBuffer(undefined as any)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2560000)).toBe('2.44 MB');
    });

    it('should handle large numbers', () => {
      expect(formatBytes(1234567890)).toBe('1.15 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only for durations under 1 minute', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(30000)).toBe('30s');
      expect(formatDuration(59000)).toBe('59s');
    });

    it('should format minutes and seconds for longer durations', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle partial seconds', () => {
      expect(formatDuration(1500)).toBe('1s'); // Rounds down
      expect(formatDuration(61500)).toBe('1m 1s'); // Rounds down
    });
  });
});