declare module 'speaker' {
  import { Writable } from 'stream';

  interface SpeakerOptions {
    channels?: number;
    bitDepth?: number;
    sampleRate?: number;
    device?: string;
  }

  class Speaker extends Writable {
    constructor(options?: SpeakerOptions);
  }

  export = Speaker;
}