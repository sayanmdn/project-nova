# NOVA Backend - Node.js TypeScript Implementation

A Node.js TypeScript implementation of the NOVA Backend API Server for voice-activated AI assistant functionality.

## Overview

NOVA Backend provides RESTful API endpoints for:
- Audio transcription using Whisper model
- Wake word detection ("Hi Nova")
- Text processing with LLM integration
- Health monitoring and GPU status

## Features

- **Audio Processing**: Whisper-powered transcription with CUDA acceleration
- **Wake Word Detection**: Real-time "Hi Nova" detection
- **Text Processing**: LLM integration for AI responses
- **Rate Limiting**: Configurable request limits per endpoint
- **Error Handling**: Comprehensive error handling and logging
- **Health Monitoring**: GPU status and service health checks

## API Endpoints

### Health Check
```
GET /
```
Returns server status, GPU availability, and version info.

### Wake Word Detection
```
POST /api/v1/recognise
Content-Type: multipart/form-data
```
Detects wake word in audio file.

### Audio Transcription
```
POST /api/v1/listen
Content-Type: multipart/form-data
```
Transcribes audio to text using Whisper.

### Text Processing
```
POST /api/v1/process
Content-Type: application/json
Body: { "text": "user input", "context": "optional" }
```
Processes text with LLM and returns AI response.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Install Python Dependencies**
   ```bash
   pip install torch whisper
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Requirements

### System Requirements
- Node.js 18+
- Python 3.8+ with PyTorch
- NVIDIA GPU with CUDA (recommended)
- 8GB+ RAM
- 4GB+ VRAM (for GPU acceleration)

### Dependencies
- **Express**: Web framework
- **Multer**: File upload handling
- **Winston**: Logging
- **Express-rate-limit**: Rate limiting
- **Helmet**: Security headers

## Configuration

### Environment Variables

```bash
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# Audio Processing
WHISPER_MODEL=base        # tiny, base, small, medium, large
WHISPER_DEVICE=cuda       # cuda, cpu
WHISPER_LANGUAGE=en

# Wake Word
WAKE_PHRASE=hi nova
WAKE_THRESHOLD=0.8

# Rate Limits (requests/minute)
RATE_LIMIT_HEALTH=100
RATE_LIMIT_RECOGNISE=60
RATE_LIMIT_LISTEN=30
RATE_LIMIT_PROCESS=20
```

### Whisper Models
- **tiny**: Fastest, least accurate (~39 MB)
- **base**: Good balance (~74 MB) - Default
- **small**: Better accuracy (~244 MB)
- **medium**: High accuracy (~769 MB)
- **large**: Best accuracy (~1550 MB)

## Audio Format Support

- **Primary**: WAV (audio/wav)
- **Secondary**: MP3 (audio/mpeg)
- **Max Size**: 25MB
- **Channels**: Mono preferred
- **Sample Rate**: 16kHz recommended

## Rate Limits

| Endpoint | Limit (per minute) |
|----------|-------------------|
| Health Check | 100 |
| Wake Word Detection | 60 |
| Transcription | 30 |
| Text Processing | 20 |

## Error Handling

All errors return JSON format:
```json
{
  "detail": "Error description"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid input)
- `413`: Payload Too Large (>25MB)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Development

### Scripts
```bash
npm run dev      # Development with ts-node
npm run build    # TypeScript compilation
npm start        # Production server
npm test         # Run tests
npm run lint     # Type checking
npm run clean    # Remove build files
```

### Project Structure
```
src/
├── api/           # Service integrations
│   ├── whisper.ts # Whisper integration
│   └── llm.ts     # LLM integration
├── config/        # Configuration
├── middleware/    # Express middleware
├── routes/        # API routes
├── types/         # TypeScript interfaces
├── utils/         # Utilities
└── index.ts       # Main server
```

## GPU Acceleration

### CUDA Setup
1. Install NVIDIA drivers
2. Install CUDA toolkit
3. Install PyTorch with CUDA:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

### CPU Fallback
If CUDA is unavailable, the system automatically falls back to CPU processing with reduced performance.

## Logging

Logs are written to:
- `logs/error.log` - Error level messages
- `logs/combined.log` - All messages
- Console output in development

Log levels: `error`, `warn`, `info`, `debug`

## Security

- **Helmet**: Security headers
- **CORS**: Cross-origin requests
- **Rate Limiting**: Request throttling
- **Input Validation**: Request validation
- **File Type Validation**: Audio format checking

## Performance

### Optimization Tips
- Use GPU acceleration when available
- Choose appropriate Whisper model size
- Configure rate limits based on usage
- Monitor memory usage with large files
- Use compression for responses

### Monitoring
- Health endpoint provides GPU status
- Winston logging for performance tracking
- Rate limit headers in responses

## Troubleshooting

### Common Issues

**CUDA not detected**
```bash
# Check CUDA installation
python -c "import torch; print(torch.cuda.is_available())"
```

**High memory usage**
- Use smaller Whisper model
- Reduce max file size
- Increase rate limits

**Slow transcription**
- Enable GPU acceleration
- Use faster Whisper model
- Check system resources

## License

MIT License - see LICENSE file for details.