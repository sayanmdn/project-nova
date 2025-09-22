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
  
  for (let i = 0; i < samples.length; i++) {
    sum += Math.abs(samples[i]);
  }
  
  const average = sum / samples.length;
  return Math.min(100, (average / 32768) * 100);
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

export function createWavHeader(dataLength: number, sampleRate: number, channels: number): Buffer {
  const header = Buffer.alloc(44);
  
  // RIFF identifier
  header.write('RIFF', 0);
  // File size
  header.writeUInt32LE(36 + dataLength, 4);
  // WAVE identifier
  header.write('WAVE', 8);
  // FMT chunk identifier
  header.write('fmt ', 12);
  // FMT chunk length
  header.writeUInt32LE(16, 16);
  // Audio format (PCM)
  header.writeUInt16LE(1, 20);
  // Number of channels
  header.writeUInt16LE(channels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  // Block align (NumChannels * BitsPerSample/8)
  header.writeUInt16LE(channels * 2, 32);
  // Bits per sample
  header.writeUInt16LE(16, 34);
  // Data chunk identifier
  header.write('data', 36);
  // Data chunk size
  header.writeUInt32LE(dataLength, 40);
  
  return header;
}

export function pcmToWav(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const header = createWavHeader(pcmBuffer.length, sampleRate, channels);
  return Buffer.concat([header, pcmBuffer]);
}