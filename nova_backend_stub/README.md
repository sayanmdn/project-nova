# Nova Backend API Stub

A TypeScript/Express stub implementation of the Nova Backend API Layer 1.

## Features

- RESTful API endpoints for audio processing
- Mock transcription services
- Status tracking for processing requests
- TypeScript support with strict typing
- Express.js with security middleware (helmet, cors)
- Development server with hot reload

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Audio Management
- `POST /api/v1/audio/upload` - Upload audio data
- `GET /api/v1/audio/:id` - Get audio by ID
- `GET /api/v1/audio` - List all audio files
- `DELETE /api/v1/audio/:id` - Delete audio by ID

### Transcription
- `POST /api/v1/transcription` - Create transcription request
- `GET /api/v1/transcription/:id` - Get transcription by ID
- `GET /api/v1/transcription` - List all transcriptions
- `GET /api/v1/transcription/audio/:audioId` - Get transcriptions for audio

### Status Tracking
- `GET /api/v1/status/:id` - Get processing status
- `GET /api/v1/status` - List all statuses
- `DELETE /api/v1/status/:id` - Delete status by ID

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production

```bash
npm start
```

## Testing

Run the complete test suite:

```bash
npm test
```

### Test Coverage

✅ **All 52 tests pass** with comprehensive coverage:

#### Audio Routes (9 tests)
- POST `/api/v1/audio/upload` - Upload functionality with validation
- GET `/api/v1/audio/:id` - Retrieve audio by ID and 404 handling  
- GET `/api/v1/audio` - List all audio files
- DELETE `/api/v1/audio/:id` - Delete audio and error handling

#### Transcription Routes (10 tests)
- POST `/api/v1/transcription` - Create transcriptions with validation
- GET `/api/v1/transcription/:id` - Retrieve transcriptions by ID
- GET `/api/v1/transcription` - List all transcriptions
- GET `/api/v1/transcription/audio/:audioId` - Get transcriptions for specific audio

#### Status Routes (9 tests)
- GET `/api/v1/status/:id` - Status tracking with progression simulation
- GET `/api/v1/status` - List all statuses
- DELETE `/api/v1/status/:id` - Delete status with error handling

#### Middleware & Error Handling (6 tests)
- Custom API errors with status codes
- Standard error handling with defaults
- Request information logging
- Console error logging verification

#### Integration Tests (10 tests)
- Health check endpoint
- API root information
- CORS and security headers
- Content-type handling (JSON/URL-encoded)
- End-to-end workflow testing
- Concurrent operations handling

### Key Testing Features
- **Isolated test environment** - Tests don't interfere with each other
- **In-memory data persistence** - State cleared between tests
- **Comprehensive error scenarios** - 400, 404, 422, 500 status codes
- **Concurrent operations** - Multiple simultaneous requests
- **Complete workflow testing** - Upload → Transcribe → Status → Cleanup

## Configuration

Copy `.env.example` to `.env` and modify as needed:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin configuration