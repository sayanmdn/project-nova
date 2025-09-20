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

### Layer 2: Client Application

#### Core Functionality

##### 1. Audio Device Management
```bash
# List available audio input devices
./nova-client --list-devices
```

##### 2. Continuous Audio Monitoring
The client application performs the following workflow:

1. **Device Selection**
   - Enumerate and display available audio input devices
   - Allow user selection of preferred microphone

2. **Wake Word Detection Loop**
   - Continuously record audio in small chunks (e.g., 3-second intervals)
   - Send audio chunks to `/api/v1/recognise` endpoint
   - Monitor for wake phrase detection

3. **Full Audio Capture**
   - When wake word is detected (`detected: true`), begin full audio recording
   - Stop sending chunks to `/recognise` endpoint during active recording
   - Continue recording until speech ends (silence detection)

4. **Audio Processing Pipeline**
   - Extract audio segment from wake word timestamp to end of speech
   - Send complete audio segment to `/api/v1/listen` for transcription
   - Process transcribed text through `/api/v1/process` endpoint
   - Display AI response in terminal

##### 3. Audio Chunking Strategy
```
Timeline: |----chunk1----chunk2----chunk3----[WAKE_DETECTED]----recording-----|
          |              |                    |                              |
          |              |                    |                              |
     /recognise     /recognise          /recognise                      /listen
```

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