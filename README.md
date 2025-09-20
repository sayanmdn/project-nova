# NOVA Backend Specification v1

## Overview
NOVA is a voice-activated AI assistant system consisting of a backend API server and a client application for audio processing and interaction.

## Architecture

### Layer 1: Backend API Server (NOVA Backend L1 v1)

**Base URL:** `http://localhost:4000`

#### API Endpoints

##### 1. Health Check
```
GET /
```
**Description:** Basic health check endpoint to verify server status.

##### 2. Audio Transcription
```
POST /api/v1/listen
```
**Description:** Converts audio file to text using Whisper model.

**Request:**
- **Content-Type:** `multipart/form-data` or `application/json`
- **Payload:** MP3 audio file (buffer or base64 string)
- **Max Size:** 25MB

**Response:**
```json
{
  "success": true,
  "transcript": "transcribed text from audio",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

##### 3. Wake Word Detection
```
POST /api/v1/recognise
```
**Description:** Detects if the wake phrase "Hi Nova" is present in audio.

**Request:**
- **Content-Type:** `multipart/form-data` or `application/json`
- **Payload:** MP3 audio file

**Response:**
```json
{
  "success": true,
  "detected": true/false,
  "confidence": 0.95,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

##### 4. Text Processing
```
POST /api/v1/process
```
**Description:** Processes text input through LLM and returns AI response.

**Request:**
```json
{
  "text": "user input text",
  "context": "optional conversation context"
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI generated response",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Technical Requirements

##### Audio Processing
- **Engine:** OpenAI Whisper model
- **Performance:** Optimized for speed and accuracy
- **Hardware:** NVIDIA CUDA GPU acceleration required
- **Supported Formats:** MP3 (primary), WAV (secondary)

##### System Requirements
- NVIDIA GPU with CUDA support
- Sufficient VRAM for Whisper model loading
- Python 3.8+ with PyTorch CUDA support

---

### Layer 2: CLI Client Application

#### Overview
A command-line interface (CLI) application that handles audio input, wake word detection, and user interaction through the terminal.

#### Core Functionality

##### 1. Audio Device Management
```bash
# List available audio input devices
./nova-cli --list-devices

# Start with specific audio device
./nova-cli --device 0

# Start with default audio device
./nova-cli --start
```

##### 2. CLI Interface Flow
The CLI application follows this interactive workflow:

1. **Startup & Device Selection**
   ```
   $ ./nova-cli --start
   
   NOVA Voice Assistant v1.0
   ========================
   
   Available Audio Devices:
   [0] Default Microphone
   [1] USB Headset Microphone  
   [2] Bluetooth Audio Device
   
   Select device [0-2]: 1
   
   ✓ Connected to: USB Headset Microphone
   ⚡ CUDA acceleration: Enabled
   🎯 Listening for "Hi Nova"...
   ```

2. **Wake Word Detection Mode**
   ```
   🔊 Monitoring audio... (Press Ctrl+C to stop)
   🎯 Listening for wake word...
   
   [Wake word detected! Confidence: 95%]
   🎤 Recording... (speak now)
   ```

3. **Active Recording & Processing**
   ```
   🎤 Recording... 
   ⏹️  Speech ended. Processing audio...
   
   📝 Transcript: "What's the weather like today?"
   🤖 Processing with AI...
   
   Response: "I'd be happy to help with weather information, but I don't have access to current weather data. You might want to check a weather app or website for the most up-to-date forecast in your area."
   
   🎯 Listening for "Hi Nova"... (Ready for next command)
   ```

##### 3. Command Line Options
```bash
# Basic usage
./nova-cli --start

# Advanced options
./nova-cli --start --device 1 --config ./config.yaml --verbose
./nova-cli --list-devices
./nova-cli --test-audio
./nova-cli --version
./nova-cli --help

# Configuration options via flags
./nova-cli --start \
  --server http://localhost:4000 \
  --chunk-duration 3.0 \
  --confidence-threshold 0.8 \
  --silence-threshold -40
```
##### 4. Audio Processing Workflow
The CLI application performs the following workflow:

1. **Device Selection & Initialization**
   - Display available audio input devices in a numbered list
   - Allow user to select preferred microphone via keyboard input
   - Initialize audio capture with selected device

2. **Continuous Wake Word Detection**
   - Record audio in small chunks (default: 3-second intervals)
   - Send audio chunks to `/api/v1/recognise` endpoint
   - Display real-time status in terminal
   - Show visual indicators for listening state

3. **Full Audio Capture Sequence**
   - When wake word is detected (`detected: true`), display confirmation
   - Begin full audio recording session
   - Stop sending chunks to `/recognise` endpoint during active recording
   - Continue recording until speech ends (silence detection)
   - Show recording progress in terminal

4. **Text Processing & Response Display**
   - Extract audio segment from wake word timestamp to end of speech
   - Send complete audio segment to `/api/v1/listen` for transcription
   - Display transcribed text in terminal
   - Process transcribed text through `/api/v1/process` endpoint
   - Display AI response in formatted terminal output
   - Return to wake word detection mode

##### 5. CLI User Experience Features

**Visual Indicators:**
- Real-time audio level meter during listening
- Animated spinner during processing
- Color-coded status messages (green for success, red for errors)
- Progress bars for file uploads and processing

**Terminal Output Formatting:**
```
╭─ NOVA Voice Assistant ─────────────────────╮
│ Status: 🎯 Listening for "Hi Nova"...      │
│ Device: USB Headset Microphone             │
│ Audio: ▓▓▓░░░░░░░ 30%                      │
╰────────────────────────────────────────────╯

[2024-01-01 12:30:45] Wake word detected!
[2024-01-01 12:30:46] 🎤 Recording...
[2024-01-01 12:30:52] ⏹️ Processing audio...
[2024-01-01 12:30:54] 📝 "What's the weather today?"
[2024-01-01 12:30:56] 🤖 AI Response:

┌─ Response ─────────────────────────────────┐
│ I'd be happy to help with weather info,   │
│ but I don't have access to current data.  │
│ Try checking a weather app for updates!   │
└────────────────────────────────────────────┘

Press Ctrl+C to exit, or continue speaking...
```

**Error Handling & User Feedback:**
- Clear error messages with suggested solutions
- Network connectivity status indicators
- Audio device connection status
- Server availability warnings
- Graceful degradation when services are unavailable
##### 6. Audio Chunking Strategy & Technical Implementation

**Timeline Visualization:**
```
Timeline: |----chunk1----chunk2----chunk3----[WAKE_DETECTED]----recording-----|
          |              |                    |                              |
          |              |                    |                              |
     /recognise     /recognise          /recognise                      /listen
```

**CLI State Management:**
- **IDLE**: Initial state, device selection
- **LISTENING**: Continuous wake word detection
- **TRIGGERED**: Wake word detected, preparing to record
- **RECORDING**: Active speech capture
- **PROCESSING**: Audio transcription and AI processing
- **RESPONDING**: Displaying AI response
- **ERROR**: Error state with recovery options

#### Implementation Details

##### Audio Buffer Management
- Maintain rolling buffer of recent audio (e.g., last 10 seconds)
- When wake word detected, include pre-wake audio context
- Implement silence detection to determine speech end

##### Error Handling
- Network connectivity issues
- Audio device disconnection
- API endpoint failures
- Audio format compatibility

##### Configuration Options
```yaml
# config.yaml
server:
  base_url: "http://localhost:4000"
  timeout: 30

audio:
  sample_rate: 16000
  chunk_duration: 3.0
  silence_threshold: -40
  silence_duration: 2.0

wake_word:
  confidence_threshold: 0.8
  cooldown_period: 1.0
```

## Development Guidelines

### Backend Development
1. Implement proper error handling and logging
2. Add input validation for all endpoints
3. Implement rate limiting and request size validation
4. Add health monitoring and metrics
5. Use async processing for better performance

### Client Development
1. Implement robust audio device handling
2. Add graceful degradation for network issues
3. Implement proper resource cleanup
4. Add configuration file support
5. Include comprehensive logging

### Testing Strategy
1. Unit tests for individual components
2. Integration tests for API endpoints
3. End-to-end testing with real audio samples
4. Performance testing under load
5. Hardware compatibility testing

## Deployment Considerations

### Hardware Requirements
- **GPU:** NVIDIA GPU with 4GB+ VRAM
- **RAM:** 8GB+ system memory
- **Storage:** SSD recommended for model loading
- **Network:** Stable local network connection

### Security Considerations
- Audio data encryption in transit
- Local processing to maintain privacy
- Secure model storage and loading
- Input validation and sanitization

### Performance Optimization
- Model caching and warm-up strategies
- Audio preprocessing optimization
- Efficient memory management
- Connection pooling for API calls