# Nova CLI Client Application

A comprehensive TypeScript-based command-line interface for the Nova Voice Assistant system that handles audio input, wake word detection, and user interaction through the terminal.

## ✨ Features

- **Audio Device Management** - Automatic detection and selection of available microphones
- **Real-time Wake Word Detection** - Continuous monitoring for "Hi Nova" phrase
- **Smart Audio Recording** - Voice activity detection with automatic silence cutoff
- **AI-powered Processing** - Integration with Nova backend for transcription and AI responses
- **Rich Terminal UI** - Colored output, progress bars, and real-time audio level indicators
- **Comprehensive Configuration** - YAML config files with CLI option overrides
- **Robust Error Handling** - Graceful degradation and automatic recovery
- **Extensive Logging** - Winston-based structured logging with file output
- **Full Test Coverage** - 71 unit tests covering all major components

## 🔧 Prerequisites

- **Node.js 16+** with npm
- **TypeScript** (installed as dev dependency)
- **Audio system** with microphone access and permissions
- **Nova Backend API** server running (default: http://localhost:4000)
- **Linux/macOS** (PulseAudio support for device enumeration)

## 📦 Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript project
npm run build

# 3. Make CLI executable (important!)
chmod +x dist/cli.js

# 4. Run tests to verify installation
npm test

# 5. Copy example configuration
cp config.example.yaml config.yaml
```

## 🎯 Quick Start

```bash
# Start the voice assistant (development mode)
npm run dev

# Or use the compiled executable
./dist/cli.js start

# Check available audio devices first
./dist/cli.js list-devices
```

## 🚀 Usage

### Essential Commands

```bash
# Start the voice assistant (development)
npm run dev

# Start with compiled binary
./dist/cli.js start

# List all available audio devices
./dist/cli.js list-devices

# Test audio device functionality  
./dist/cli.js test-audio

# Show complete help and options
./dist/cli.js --help

# Display version information
./dist/cli.js version
```

### Advanced Usage Examples

```bash
# Start with specific audio device (device ID from list-devices)
./dist/cli.js start --device 1

# Connect to custom Nova backend server
./dist/cli.js start --server http://192.168.1.100:4000

# Enable verbose logging for debugging
./dist/cli.js start --verbose

# Use custom configuration file
./dist/cli.js start --config ./my-nova-config.yaml

# Combine multiple options
./dist/cli.js start --device 2 --verbose --server http://localhost:5000

# Development mode with custom settings
npm run dev -- start --device 0 --verbose --confidence-threshold 0.9
```

### Interactive Usage Flow

1. **Launch Application**
   ```bash
   ./dist/cli.js start
   ```

2. **Device Selection** (if multiple devices available)
   ```
   📱 Available Audio Devices:
   ● [0] Default Microphone (default)
   ○ [1] USB Headset Microphone [2 channels]
   ○ [2] Bluetooth Audio Device
   
   Select device [0-2]: 1
   
   ✓ Connected to: USB Headset Microphone
   ⚡ CUDA acceleration: Enabled
   🎯 Listening for "Hi Nova"...
   ```

3. **Wake Word Activation**
   ```
   🔊 Monitoring audio... (Press Ctrl+C to stop)
   🎯 Listening for wake word...
   
   [Wake word detected! Confidence: 95%]
   🎤 Recording... (speak now)
   ```

4. **Voice Processing**
   ```
   🎤 Recording... 
   ⏹️  Speech ended. Processing audio...
   
   📝 Transcript: "What's the weather like today?"
   🤖 Processing with AI...
   
   ┌─ Response ─────────────────────────────────┐
   │ I'd be happy to help with weather info,   │
   │ but I don't have access to current data.  │
   │ Try checking a weather app for updates!   │
   └────────────────────────────────────────────┘
   
   🎯 Listening for "Hi Nova"... (Ready for next command)
   ```

## Configuration

Create a `config.yaml` file based on `config.example.yaml`:

```yaml
server:
  baseUrl: "http://localhost:4000"
  timeout: 30000

audio:
  sampleRate: 16000
  chunkDuration: 3.0
  silenceThreshold: -40
  silenceDuration: 2.0

wakeWord:
  confidenceThreshold: 0.8
  cooldownPeriod: 1.0
```

### Configuration Options

- **server.baseUrl**: Nova backend API endpoint
- **server.timeout**: Request timeout in milliseconds
- **audio.sampleRate**: Audio sampling rate (16000 recommended)
- **audio.chunkDuration**: Duration of audio chunks for wake word detection
- **audio.silenceThreshold**: dB threshold for silence detection
- **audio.silenceDuration**: Seconds of silence to end recording
- **wakeWord.confidenceThreshold**: Minimum confidence for wake word detection
- **wakeWord.cooldownPeriod**: Cooldown between wake word detections

## Usage Flow

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Select audio device** (if multiple available)
   The application will list available microphones

3. **Wait for wake word**
   Say "Hi Nova" to activate the assistant

4. **Speak your command**
   After wake word detection, speak your request

5. **Receive AI response**
   The system will transcribe, process, and respond to your query

## 🏗️ Implementation Details

### Architecture Overview

The Nova CLI client follows a modular architecture with clear separation of concerns:

- **Audio Layer** - Device management, recording, and wake word detection
- **API Layer** - HTTP communication with Nova backend
- **UI Layer** - Terminal interface with real-time status updates  
- **Configuration Layer** - YAML config management with CLI overrides
- **Utility Layer** - Audio processing, logging, and helper functions

### Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Language** | TypeScript 5.x | Type safety and modern JavaScript features |
| **Testing** | Jest | Unit testing with 71 comprehensive tests |
| **CLI Framework** | Commander.js | Command-line argument parsing and subcommands |
| **HTTP Client** | Axios + FormData | API communication with multipart form support |
| **UI/UX** | Chalk + CLI Progress | Colored terminal output and progress indicators |
| **Logging** | Winston | Structured logging with file rotation |
| **Configuration** | YAML | Human-readable config files |
| **Audio** | node-record-lpcm16 | Cross-platform audio recording |
| **Build System** | TypeScript Compiler | Compilation to JavaScript with source maps |

### Project Structure

```
client-application/
├── src/                    # TypeScript source code
│   ├── audio/              # Audio subsystem
│   │   ├── devices.ts      # PulseAudio device enumeration
│   │   ├── recorder.ts     # Real-time audio recording with VAD
│   │   └── wakeword.ts     # Wake word detection pipeline
│   ├── api/                # Backend communication
│   │   └── client.ts       # Nova API client with form-data support
│   ├── config/             # Configuration management
│   │   └── index.ts        # YAML parsing and CLI option merging
│   ├── ui/                 # Terminal user interface
│   │   └── terminal.ts     # Rich console output with progress bars
│   ├── utils/              # Shared utilities
│   │   ├── index.ts        # Audio processing and helper functions
│   │   └── logger.ts       # Winston logger configuration
│   ├── types/              # TypeScript definitions
│   │   ├── index.ts        # Core interfaces and enums
│   │   ├── node-record-lpcm16.d.ts  # Audio library types
│   │   └── speaker.d.ts    # Speaker library types
│   ├── __tests__/          # Jest unit tests (71 tests)
│   │   ├── api-client.test.ts      # API client tests
│   │   ├── audio-devices.test.ts   # Device management tests
│   │   ├── config.test.ts          # Configuration tests
│   │   ├── logger.test.ts          # Logging tests
│   │   └── utils.test.ts           # Utility function tests
│   ├── app.ts              # Main application orchestrator
│   ├── cli.ts              # Command-line interface entry point
│   └── index.ts            # Public API exports
├── dist/                   # Compiled JavaScript output
│   ├── cli.js              # Executable CLI binary (chmod +x)
│   └── ...                 # Compiled modules with source maps
├── coverage/               # Jest coverage reports (HTML + LCOV)
├── config.example.yaml     # Example configuration file
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript compiler configuration
├── jest.config.js          # Jest testing configuration
└── README.md               # This documentation
```

### Key Implementation Features

#### 🎤 Audio Processing Pipeline
- **Device Discovery**: Automatic PulseAudio source enumeration
- **Real-time Recording**: 16kHz PCM audio capture with configurable chunk sizes
- **Voice Activity Detection**: Silence threshold-based speech endpoint detection
- **Audio Buffering**: Rolling buffer for wake word context preservation

#### 🧠 Wake Word Detection
- **Continuous Monitoring**: Background audio chunk processing  
- **API Integration**: Real-time calls to Nova `/api/v1/recognise` endpoint
- **Confidence Filtering**: Configurable threshold for false positive reduction
- **Cooldown Management**: Prevention of rapid re-triggering

#### 🌐 API Communication
- **HTTP Client**: Axios-based client with request/response interceptors
- **Form Data Support**: Multipart form uploads for audio files
- **Error Handling**: Automatic retries and graceful degradation
- **Health Monitoring**: Backend availability checking

#### 🎨 Terminal UI
- **Rich Output**: Colored text with emoji indicators
- **Progress Visualization**: Real-time audio level meters
- **Status Updates**: Live application state display
- **Interactive Feedback**: Clear user guidance and error messages

#### ⚙️ Configuration System
- **YAML Support**: Human-readable configuration files
- **CLI Overrides**: Command-line arguments take precedence
- **Default Values**: Sensible defaults for all parameters
- **Validation**: Type-safe configuration parsing

## 🧪 Development & Testing

### Available NPM Scripts

```bash
# Development
npm run dev              # Start in development mode with ts-node
npm run build            # Compile TypeScript to JavaScript
npm run clean            # Remove dist/ directory
npm run lint             # Type-check without emitting files

# Testing
npm test                 # Run all Jest unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report (HTML + LCOV)

# Production
npm start                # Run compiled JavaScript version
```

### Test Coverage

The application includes **71 comprehensive unit tests** covering:

- ✅ **Configuration Management** (10 tests) - YAML parsing, CLI options, validation
- ✅ **API Client** (20 tests) - HTTP requests, error handling, response parsing  
- ✅ **Audio Device Management** (15 tests) - Device enumeration, selection, testing
- ✅ **Utility Functions** (16 tests) - Audio processing, validation, formatting
- ✅ **Logging System** (10 tests) - Winston configuration, output formatting

```bash
# View detailed coverage report
npm run test:coverage
open coverage/index.html  # Opens HTML coverage report
```

### Build Process

1. **TypeScript Compilation**
   ```bash
   npm run build
   ```
   - Compiles `src/` to `dist/` with source maps
   - Generates declaration files (.d.ts)
   - Preserves directory structure

2. **Make Executable** (Important!)
   ```bash
   chmod +x dist/cli.js
   ```
   - Required for direct CLI execution
   - Should be run after each build

3. **Verify Build**
   ```bash
   ./dist/cli.js --help
   ```

## 🌐 API Integration

The Nova CLI communicates with the backend server through these REST endpoints:

| Endpoint | Method | Purpose | Request Format |
|----------|--------|---------|----------------|
| `/` | GET | Health check and server status | None |
| `/api/v1/recognise` | POST | Wake word detection | `multipart/form-data` (audio file) |
| `/api/v1/listen` | POST | Audio transcription via Whisper | `multipart/form-data` (audio file) |
| `/api/v1/process` | POST | AI text processing | `application/json` (text + context) |

### Example API Responses

```json
// Wake Word Detection Response
{
  "success": true,
  "detected": true,
  "confidence": 0.95,
  "timestamp": "2024-01-01T12:00:00Z"
}

// Transcription Response  
{
  "success": true,
  "transcript": "What's the weather like today?",
  "timestamp": "2024-01-01T12:00:00Z"
}

// AI Processing Response
{
  "success": true,
  "response": "I'd be happy to help with weather information...",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 🎤 Audio Problems

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **No devices found** | Empty device list | • Check microphone permissions<br>• Ensure PulseAudio running (Linux)<br>• Run `./dist/cli.js list-devices` |
| **Wake word ignored** | No detection despite speaking | • Speak clearly, closer to mic<br>• Lower `confidenceThreshold` in config<br>• Check audio levels in terminal |
| **Recording failure** | Error during audio capture | • Verify mic permissions<br>• Close other audio apps<br>• Try different device ID |
| **Poor audio quality** | Distorted or quiet audio | • Check microphone hardware<br>• Adjust system audio levels<br>• Try higher `sampleRate` |

#### 🌐 Network Problems  

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Server unreachable** | Connection refused errors | • Start Nova backend server<br>• Verify URL in config<br>• Test: `curl http://localhost:4000` |
| **Request timeouts** | Slow or failed API calls | • Increase `server.timeout`<br>• Check network connectivity<br>• Verify server performance |
| **Auth/CORS issues** | HTTP 401/403/CORS errors | • Check server configuration<br>• Verify API endpoint paths<br>• Review server logs |

#### ⚙️ Configuration Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Config not loaded** | Using default values | • Check file path and permissions<br>• Validate YAML syntax<br>• Use `--config` flag explicitly |
| **Invalid parameters** | Application crashes | • Compare with `config.example.yaml`<br>• Check data types and ranges<br>• Use verbose mode for details |

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
# Development mode with full logging
npm run dev -- start --verbose

# Production mode with debugging
./dist/cli.js start --verbose --config debug-config.yaml
```

Log files location:
- 📄 `nova-cli.log` - General application logs  
- 🚨 `nova-cli-error.log` - Error logs only
- 📊 `coverage/index.html` - Test coverage report

### System Requirements Check

```bash
# Verify Node.js version (16+ required)
node --version

# Check TypeScript installation  
npx tsc --version

# Test audio system (Linux)
pactl list sources short

# Verify Nova backend connectivity
curl -s http://localhost:4000 | echo "Backend: $(cat || echo 'Not running')"
```

## 📝 Implementation Notes

### State Management
The application follows a finite state machine pattern:
- `IDLE` → `LISTENING` → `TRIGGERED` → `RECORDING` → `PROCESSING` → `RESPONDING` → `LISTENING`

### Audio Processing
- **Format**: 16-bit PCM at 16kHz sample rate
- **Chunking**: 3-second intervals for wake word detection  
- **Buffer**: 30-second rolling buffer for context preservation
- **Silence Detection**: -40dB threshold with 2-second duration

### Performance Considerations
- Asynchronous audio processing to prevent UI blocking
- Connection pooling for API requests
- Memory-efficient audio buffering with automatic cleanup
- Graceful degradation when backend unavailable

## 📄 License

MIT License

Copyright (c) 2024 Nova Voice Assistant

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 🚀 Quick Reference

```bash
# Essential setup commands
npm install && npm run build && chmod +x dist/cli.js

# Start with default settings  
./dist/cli.js start

# Development with custom options
npm run dev -- start --device 1 --verbose --server http://localhost:4000

# Troubleshooting
./dist/cli.js list-devices
npm run test:coverage
```

For additional support, check the logs at `nova-cli.log` and `nova-cli-error.log`.