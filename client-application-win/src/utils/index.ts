import { AudioChunk } from '../types';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatTimestamp(timestamp: number = Date.now()): string {
  return new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19);
}

export function calculateAudioLevel(buffer: Buffer): number {
  if (buffer.length === 0) return 0;

  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  let sum = 0;
  let maxSample = 0;

  for (let i = 0; i < samples.length; i++) {
    const absValue = Math.abs(samples[i]);
    sum += absValue;
    maxSample = Math.max(maxSample, absValue);
  }

  const average = sum / samples.length;
  const level = Math.min(100, (average / 32768) * 100);

  // Debug logging for very low levels
  if (level < 10) {
    console.log(`[DEBUG] Audio Level: ${level.toFixed(1)}% | Max Sample: ${maxSample} | Avg: ${average.toFixed(1)} | Buffer: ${buffer.length} bytes`);
  }

  return level;
}

export function detectSilence(buffer: Buffer, threshold: number): boolean {
  const level = calculateAudioLevel(buffer);
  return level < Math.abs(threshold);
}

export function mergeAudioChunks(chunks: AudioChunk[]): Buffer {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.buffer.length, 0);
  const merged = Buffer.alloc(totalLength);
  
  let offset = 0;
  for (const chunk of chunks) {
    chunk.buffer.copy(merged, offset);
    offset += chunk.buffer.length;
  }
  
  return merged;
}

export function validateAudioBuffer(buffer: Buffer): boolean {
  return buffer !== null && buffer !== undefined && buffer.length > 0 && buffer.length % 2 === 0;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}