declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    compress?: boolean;
    threshold?: number;
    thresholdStart?: number | null;
    thresholdEnd?: number | null;
    silence?: string;
    device?: string | null;
    recordProgram?: string;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
  }

  export function record(options?: RecordOptions): Recording;
}