declare module 'mic' {
  import { Readable } from 'stream';

  interface MicOptions {
    rate?: number;
    channels?: number;
    debug?: boolean;
    exitOnSilence?: number;
    device?: string;
    additionalParameters?: string[];
  }

  interface MicInstance {
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getAudioStream(): Readable;
  }

  function mic(options?: MicOptions): MicInstance;
  export = mic;
}