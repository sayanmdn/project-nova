import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger';
import { whisperConfig, wakeWordConfig } from '../config';

export class WhisperService {
  private isInitialized = false;
  private tempDir = path.join(process.cwd(), 'temp');

  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.tempDir);
      await fs.ensureDir('logs');

      // Check if CUDA is available
      const cudaAvailable = await this.checkCudaAvailability();
      logger.info(`CUDA availability: ${cudaAvailable}`);

      this.isInitialized = true;
      logger.info('Whisper service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Whisper service:', error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Whisper service not initialized');
    }

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid audio buffer: empty or null');
    }

    if (audioBuffer.length < 1024) {
      throw new Error('Audio file too small: likely corrupted or invalid');
    }

    const tempFilePath = path.join(this.tempDir, `${Date.now()}_${filename}`);

    try {
      // Write audio buffer to temp file
      await fs.writeFile(tempFilePath, audioBuffer);

      // Validate the written file
      const stats = await fs.stat(tempFilePath);
      if (stats.size === 0) {
        throw new Error('Written audio file is empty');
      }

      logger.debug(`Audio file written: ${tempFilePath}, size: ${stats.size} bytes`);

      // Run Whisper transcription
      const transcript = await this.runWhisperTranscription(tempFilePath);

      return transcript.trim();
    } catch (error) {
      logger.error('Transcription failed:', error);
      throw error;
    } finally {
      // Clean up temp file
      try {
        await fs.remove(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp file:', cleanupError);
      }
    }
  }

  async detectWakeWord(audioBuffer: Buffer, filename: string): Promise<{ detected: boolean; confidence: number }> {
    if (!this.isInitialized) {
      throw new Error('Whisper service not initialized');
    }

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid audio buffer: empty or null');
    }

    if (audioBuffer.length < 1024) {
      throw new Error('Audio file too small: likely corrupted or invalid');
    }

    const tempFilePath = path.join(this.tempDir, `wake_${Date.now()}_${filename}`);

    try {
      // Write audio buffer to temp file
      await fs.writeFile(tempFilePath, audioBuffer);

      // Validate the written file
      const stats = await fs.stat(tempFilePath);
      if (stats.size === 0) {
        throw new Error('Written audio file is empty');
      }

      logger.debug(`Wake word audio file written: ${tempFilePath}, size: ${stats.size} bytes`);

      // Get transcription
      const transcript = await this.runWhisperTranscription(tempFilePath);
      const normalizedTranscript = transcript.toLowerCase().trim();

      // Simple wake word detection (replace with more sophisticated method)
      const detected = normalizedTranscript.includes(wakeWordConfig.phrase.toLowerCase());
      const confidence = detected ? 0.9 : 0.1; // Simplified confidence calculation

      logger.debug(`Wake word detection - Transcript: "${normalizedTranscript}", Detected: ${detected}, Confidence: ${confidence}`);

      return { detected, confidence };
    } catch (error) {
      logger.error('Wake word detection failed:', error);
      throw error;
    } finally {
      // Clean up temp file
      try {
        await fs.remove(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp file:', cleanupError);
      }
    }
  }

  private async fixRawPCMData(filePath: string): Promise<void> {
    const buffer = await fs.readFile(filePath);

    // Check if this is raw PCM data (no RIFF header)
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) !== 'RIFF') {
      logger.info(`Detected raw PCM data, adding WAV header: ${filePath}`);

      // Create WAV header for 16-bit, 16kHz, mono PCM
      const sampleRate = 16000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * bitsPerSample / 8;
      const blockAlign = numChannels * bitsPerSample / 8;
      const dataSize = buffer.length;
      const chunkSize = 36 + dataSize;

      const header = Buffer.alloc(44);
      let offset = 0;

      // RIFF header
      header.write('RIFF', offset); offset += 4;
      header.writeUInt32LE(chunkSize, offset); offset += 4;
      header.write('WAVE', offset); offset += 4;

      // fmt chunk
      header.write('fmt ', offset); offset += 4;
      header.writeUInt32LE(16, offset); offset += 4; // PCM format chunk size
      header.writeUInt16LE(1, offset); offset += 2;  // PCM format
      header.writeUInt16LE(numChannels, offset); offset += 2;
      header.writeUInt32LE(sampleRate, offset); offset += 4;
      header.writeUInt32LE(byteRate, offset); offset += 4;
      header.writeUInt16LE(blockAlign, offset); offset += 2;
      header.writeUInt16LE(bitsPerSample, offset); offset += 2;

      // data chunk
      header.write('data', offset); offset += 4;
      header.writeUInt32LE(dataSize, offset);

      // Write the complete WAV file
      const wavData = Buffer.concat([header, buffer]);
      await fs.writeFile(filePath, wavData);

      logger.info(`Added WAV header, new file size: ${wavData.length} bytes`);
    }
  }

  private async validateAudioFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const data = JSON.parse(output);
            // Check if it has audio streams
            const hasAudio = data.streams && data.streams.some((stream: any) => stream.codec_type === 'audio');
            resolve(hasAudio);
          } catch {
            resolve(false);
          }
        } else {
          logger.warn(`ffprobe validation failed for ${filePath}: ${error}`);
          resolve(false);
        }
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }

  private async runWhisperTranscription(filePath: string): Promise<string> {
    // First try to fix raw PCM data if needed
    await this.fixRawPCMData(filePath);

    // Then validate the audio file
    const isValidAudio = await this.validateAudioFile(filePath);
    if (!isValidAudio) {
      throw new Error('Invalid audio file: cannot be processed by ffmpeg');
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-m', whisperConfig.model,
        '-f', filePath,
        '--output-txt',
        '--output-dir', this.tempDir,
        '--language', whisperConfig.language
      ];

      if (whisperConfig.device === 'cuda') {
        args.push('--device', 'cuda');
      }

      // For this implementation, we'll use a Python subprocess to call Whisper
      // In a real implementation, you might want to use the Whisper API directly
      const pythonScript = `
import whisper
import sys
import os

try:
    # Check if file exists and is readable
    if not os.path.exists("${filePath}"):
        print("ERROR: Audio file does not exist", file=sys.stderr)
        sys.exit(1)

    if os.path.getsize("${filePath}") == 0:
        print("ERROR: Audio file is empty", file=sys.stderr)
        sys.exit(1)

    # Load model and transcribe with CUDA/CPU fallback
    import torch

    device_name = "${whisperConfig.device}"

    # Load model on specified device
    if device_name == "cuda" and torch.cuda.is_available():
        device = "cuda"
        model = whisper.load_model("${whisperConfig.model}", device=device)
    else:
        device = "cpu"
        model = whisper.load_model("${whisperConfig.model}", device=device)

    # Try transcription with fallback to CPU on CUDA errors
    try:
        result = model.transcribe("${filePath}")
    except Exception as cuda_error:
        if device == "cuda" and ("nan" in str(cuda_error).lower() or "invalid values" in str(cuda_error).lower()):
            print("WARNING: CUDA failed with NaN values, falling back to CPU", file=sys.stderr)
            # Reload model on CPU
            model = whisper.load_model("${whisperConfig.model}", device="cpu")
            result = model.transcribe("${filePath}")
        else:
            raise cuda_error

    transcript_text = result["text"]
    print(f"TRANSCRIPT: {transcript_text}", file=sys.stderr)
    print(transcript_text)

except Exception as e:
    print(f"ERROR: Whisper transcription failed: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

      const tempPyFile = path.join(this.tempDir, `whisper_${Date.now()}.py`);

      fs.writeFileSync(tempPyFile, pythonScript);

      const process = spawn('python3', [tempPyFile]);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        // Clean up Python file
        fs.remove(tempPyFile).catch(() => {});

        if (code === 0) {
          const transcript = output.trim();
          logger.info(`Whisper transcription result: "${transcript}"`);
          resolve(transcript);
        } else {
          logger.error(`Whisper process failed with code ${code}, stderr: ${error}`);
          reject(new Error(`Whisper process failed with code ${code}: ${error}`));
        }
      });

      process.on('error', (err) => {
        fs.remove(tempPyFile).catch(() => {});
        reject(err);
      });
    });
  }

  private async checkCudaAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const pythonScript = `
import torch
print(torch.cuda.is_available())
`;

      const tempPyFile = path.join(this.tempDir, `cuda_check_${Date.now()}.py`);

      try {
        fs.writeFileSync(tempPyFile, pythonScript);

        const process = spawn('python3', [tempPyFile]);
        let output = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.on('close', () => {
          fs.remove(tempPyFile).catch(() => {});
          resolve(output.trim() === 'True');
        });

        process.on('error', () => {
          fs.remove(tempPyFile).catch(() => {});
          resolve(false);
        });
      } catch (error) {
        resolve(false);
      }
    });
  }

  async getGpuInfo(): Promise<{ gpu_count: number; current_device: number; device_name: string }> {
    return new Promise((resolve) => {
      const pythonScript = `
import torch
if torch.cuda.is_available():
    print(f"{torch.cuda.device_count()}")
    print(f"{torch.cuda.current_device()}")
    print(f"{torch.cuda.get_device_name()}")
else:
    print("0")
    print("0")
    print("CPU")
`;

      const tempPyFile = path.join(this.tempDir, `gpu_info_${Date.now()}.py`);

      try {
        fs.writeFileSync(tempPyFile, pythonScript);

        const process = spawn('python3', [tempPyFile]);
        let output = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.on('close', () => {
          fs.remove(tempPyFile).catch(() => {});
          const lines = output.trim().split('\n');
          resolve({
            gpu_count: parseInt(lines[0] || '0', 10),
            current_device: parseInt(lines[1] || '0', 10),
            device_name: lines[2] || 'CPU'
          });
        });

        process.on('error', () => {
          fs.remove(tempPyFile).catch(() => {});
          resolve({
            gpu_count: 0,
            current_device: 0,
            device_name: 'CPU'
          });
        });
      } catch (error) {
        resolve({
          gpu_count: 0,
          current_device: 0,
          device_name: 'CPU'
        });
      }
    });
  }
}