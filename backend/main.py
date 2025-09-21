
import asyncio
import logging
import os
import tempfile
import torch
import whisper
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, Union
import io
import soundfile as sf
import librosa
import webrtcvad
from difflib import SequenceMatcher
import base64

from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
from pydantic import BaseModel, Field
import aiofiles

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="NOVA Backend L1 v1", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextProcessRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    context: Optional[str] = Field(None, max_length=50000)

class AudioBufferRequest(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    format: Optional[str] = Field("mp3", description="Audio format (mp3, wav, or raw)")
    sample_rate: Optional[int] = Field(16000, description="Sample rate for raw PCM data")
    channels: Optional[int] = Field(1, description="Number of channels for raw PCM data")
    bit_depth: Optional[int] = Field(16, description="Bit depth for raw PCM data")

class WhisperService:
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")

    async def load_model(self):
        if self.model is None:
            try:
                # Load Whisper model with CUDA support if available
                self.model = whisper.load_model("base", device=self.device)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise e

    async def transcribe(self, audio_path: str) -> str:
        await self.load_model()
        try:
            # Check if file exists and is readable
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            if os.path.getsize(audio_path) == 0:
                raise ValueError(f"Audio file is empty: {audio_path}")

            result = self.model.transcribe(audio_path, language="en")
            return result["text"].strip()
        except Exception as e:
            logger.error(f"Transcription failed for {audio_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load audio: {str(e)}")

class WakeWordDetector:
    def __init__(self):
        self.wake_phrase = "hi nova"
        self.similarity_threshold = 0.7
        self.vad = webrtcvad.Vad()
        self.vad.set_mode(3)  # Most aggressive filtering

    def similarity_score(self, text1: str, text2: str) -> float:
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def has_speech_activity(self, audio_data: bytes, sample_rate: int) -> bool:
        try:
            # Convert audio to the format expected by WebRTC VAD
            if sample_rate != 16000:
                # Resample to 16kHz for VAD
                audio_array, _ = librosa.load(io.BytesIO(audio_data), sr=16000)
                audio_data = (audio_array * 32767).astype(np.int16).tobytes()

            # Check if audio contains speech
            frame_duration = 30  # ms
            frame_size = int(16000 * frame_duration / 1000) * 2  # 2 bytes per sample

            for i in range(0, len(audio_data) - frame_size, frame_size):
                frame = audio_data[i:i + frame_size]
                if len(frame) == frame_size:
                    if self.vad.is_speech(frame, 16000):
                        return True
            return False
        except Exception as e:
            logger.warning(f"Speech activity detection failed: {e}")
            return True  # Assume speech activity if detection fails

    async def detect(self, transcript: str, audio_data: bytes = None, sample_rate: int = 16000) -> Dict[str, Any]:
        # Check for speech activity first
        has_speech = True
        if audio_data:
            has_speech = self.has_speech_activity(audio_data, sample_rate)

        if not has_speech:
            return {
                "detected": False,
                "confidence": 0.0,
                "reason": "No speech activity detected"
            }

        # Check for wake phrase in transcript
        transcript_clean = transcript.lower().strip()

        # Direct match
        if self.wake_phrase in transcript_clean:
            return {
                "detected": True,
                "confidence": 0.95,
                "reason": "Direct match found"
            }

        # Fuzzy matching for variations
        similarity = self.similarity_score(transcript_clean, self.wake_phrase)

        # Check individual words
        words = transcript_clean.split()
        for i in range(len(words) - 1):
            phrase = " ".join(words[i:i+2])
            word_similarity = self.similarity_score(phrase, self.wake_phrase)
            similarity = max(similarity, word_similarity)

        detected = similarity >= self.similarity_threshold
        confidence = min(similarity * 1.2, 1.0)  # Boost confidence slightly

        return {
            "detected": detected,
            "confidence": round(confidence, 2),
            "reason": f"Similarity score: {similarity:.2f}"
        }

class LLMService:
    def __init__(self):
        self.conversation_history = []

    async def process_text(self, text: str, context: Optional[str] = None) -> str:
        # Basic response logic - in production, integrate with actual LLM
        responses = {
            "weather": "I'd be happy to help with weather information, but I don't have access to current weather data. You might want to check a weather app or website for the most up-to-date forecast in your area.",
            "time": f"The current time is {datetime.now().strftime('%I:%M %p')}.",
            "date": f"Today's date is {datetime.now().strftime('%B %d, %Y')}.",
            "hello": "Hello! I'm NOVA, your voice assistant. How can I help you today?",
            "help": "I can help you with various tasks. You can ask me about the time, date, or general questions. What would you like to know?",
        }

        text_lower = text.lower()

        # Simple keyword matching
        for keyword, response in responses.items():
            if keyword in text_lower:
                return response

        # Default response
        return f"I understand you said: '{text}'. I'm still learning and may not have a specific response for that yet. Is there anything else I can help you with?"

# Global services
whisper_service = WhisperService()
wake_word_detector = WakeWordDetector()
llm_service = LLMService()

async def validate_audio_file(file: UploadFile) -> None:
    # Check file size (25MB limit)
    if file.size and file.size > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 25MB.")

    # Check content type
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid audio format. Supported formats: MP3, WAV")

async def save_temp_file(file: UploadFile) -> str:
    # Create temporary file
    suffix = ".mp3" if file.content_type and "mp3" in file.content_type else ".wav"
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix="nova_audio_")

    try:
        # Write file content
        content = await file.read()
        with os.fdopen(temp_fd, 'wb') as temp_file:
            temp_file.write(content)
        return temp_path, content
    except Exception as e:
        os.close(temp_fd)
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise e

async def save_buffer_to_temp_file(audio_buffer: bytes, format: str = "mp3", sample_rate: int = 16000, channels: int = 1, bit_depth: int = 16) -> str:
    # Create temporary file from buffer
    suffix = f".{format}"
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix="nova_buffer_")

    try:
        # For WAV format, ensure proper audio data processing
        if format.lower() == "wav":
            try:
                # First try to read as existing WAV file
                audio_data, sample_rate = sf.read(io.BytesIO(audio_buffer))

                # Write properly formatted WAV file
                with os.fdopen(temp_fd, 'wb') as temp_file:
                    temp_file.close()  # Close the file descriptor first

                # Use soundfile to write proper WAV format
                sf.write(temp_path, audio_data, sample_rate)

            except Exception as wav_error:
                logger.warning(f"Failed to process as WAV file: {wav_error}")

                # Likely raw PCM data - convert to proper WAV
                try:
                    # Close the original file descriptor
                    with os.fdopen(temp_fd, 'wb') as temp_file:
                        temp_file.close()

                    # Raw PCM data - convert using provided parameters
                    # Convert bytes to numpy array based on bit depth
                    if bit_depth == 16:
                        audio_array = np.frombuffer(audio_buffer, dtype=np.int16)
                        audio_float = audio_array.astype(np.float32) / 32768.0
                    elif bit_depth == 32:
                        audio_array = np.frombuffer(audio_buffer, dtype=np.int32)
                        audio_float = audio_array.astype(np.float32) / 2147483648.0
                    elif bit_depth == 8:
                        audio_array = np.frombuffer(audio_buffer, dtype=np.uint8)
                        audio_float = (audio_array.astype(np.float32) - 128.0) / 128.0
                    else:
                        raise ValueError(f"Unsupported bit depth: {bit_depth}")

                    # Reshape for multiple channels if needed
                    if channels > 1:
                        audio_float = audio_float.reshape(-1, channels)

                    # Write as proper WAV file using provided sample rate
                    sf.write(temp_path, audio_float, sample_rate)

                    logger.info(f"Converted {len(audio_buffer)} bytes of raw PCM to WAV")

                except Exception as pcm_error:
                    logger.error(f"Failed to convert raw PCM data: {pcm_error}")
                    # Final fallback: write raw data
                    with open(temp_path, 'wb') as f:
                        f.write(audio_buffer)
        else:
            # For other formats (MP3, etc.), write directly
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(audio_buffer)

        return temp_path, audio_buffer

    except Exception as e:
        try:
            os.close(temp_fd)
        except:
            pass
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise e

@app.get("/")
@limiter.limit("100/minute")
async def health_check(request: Request):
    cuda_available = torch.cuda.is_available()
    gpu_info = None

    if cuda_available:
        gpu_info = {
            "gpu_count": torch.cuda.device_count(),
            "current_device": torch.cuda.current_device(),
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.device_count() > 0 else None
        }

    return JSONResponse(content={
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "cuda_available": cuda_available,
        "gpu_info": gpu_info,
        "version": "1.0.0"
    })

@app.post("/api/v1/listen")
@limiter.limit("30/minute")
async def transcribe_audio(request: Request, file: Optional[UploadFile] = File(None)):
    temp_path = None
    try:
        # Handle file upload
        if file:
            await validate_audio_file(file)
            temp_path, _ = await save_temp_file(file)

        # Handle JSON buffer
        else:
            try:
                # Get JSON body for audio buffer
                body = await request.body()
                if not body:
                    raise HTTPException(status_code=400, detail="Either file upload or JSON audio_buffer must be provided")

                import json as json_module
                json_data = json_module.loads(body.decode())

                if "audio_buffer" not in json_data:
                    raise HTTPException(status_code=400, detail="audio_buffer field required in JSON payload")

                audio_buffer_data = json_data["audio_buffer"]
                audio_data = base64.b64decode(audio_buffer_data.get("audio_data", ""))
                format_type = audio_buffer_data.get("format", "mp3")
                sample_rate = audio_buffer_data.get("sample_rate", 16000)
                channels = audio_buffer_data.get("channels", 1)
                bit_depth = audio_buffer_data.get("bit_depth", 16)

                if len(audio_data) > 25 * 1024 * 1024:  # 25MB limit
                    raise HTTPException(status_code=413, detail="Audio data too large. Maximum size is 25MB.")

                temp_path, _ = await save_buffer_to_temp_file(audio_data, format_type, sample_rate, channels, bit_depth)
            except json_module.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON payload")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid audio data: {str(e)}")

        # Transcribe audio
        transcript = await whisper_service.transcribe(temp_path)

        logger.info(f"Transcription completed: {transcript[:100]}...")

        return JSONResponse(content={
            "success": True,
            "transcript": transcript,
            "timestamp": datetime.utcnow().isoformat()
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail="Transcription failed")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

@app.post("/api/v1/recognise")
@limiter.limit("60/minute")
async def recognise_wake_word(request: Request, file: Optional[UploadFile] = File(None)):
    temp_path = None
    try:
        audio_content = None

        # Handle file upload
        if file:
            await validate_audio_file(file)
            temp_path, audio_content = await save_temp_file(file)

        # Handle JSON buffer
        else:
            try:
                # Get JSON body for audio buffer
                body = await request.body()
                if not body:
                    raise HTTPException(status_code=400, detail="Either file upload or JSON audio_buffer must be provided")

                import json as json_module
                json_data = json_module.loads(body.decode())

                if "audio_buffer" not in json_data:
                    raise HTTPException(status_code=400, detail="audio_buffer field required in JSON payload")

                audio_buffer_data = json_data["audio_buffer"]
                audio_content = base64.b64decode(audio_buffer_data.get("audio_data", ""))
                format_type = audio_buffer_data.get("format", "mp3")
                sample_rate = audio_buffer_data.get("sample_rate", 16000)
                channels = audio_buffer_data.get("channels", 1)
                bit_depth = audio_buffer_data.get("bit_depth", 16)

                if len(audio_content) > 25 * 1024 * 1024:  # 25MB limit
                    raise HTTPException(status_code=413, detail="Audio data too large. Maximum size is 25MB.")

                temp_path, _ = await save_buffer_to_temp_file(audio_content, format_type, sample_rate, channels, bit_depth)
            except json_module.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON payload")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid audio data: {str(e)}")

        # Transcribe audio
        transcript = await whisper_service.transcribe(temp_path)

        # Detect wake word
        detection_result = await wake_word_detector.detect(
            transcript,
            audio_content,
            sample_rate=16000
        )

        logger.info(f"Wake word detection: {detection_result['detected']} (confidence: {detection_result['confidence']})")

        return JSONResponse(content={
            "success": True,
            "detected": detection_result["detected"],
            "confidence": detection_result["confidence"],
            "timestamp": datetime.utcnow().isoformat()
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Wake word detection error: {e}")
        raise HTTPException(status_code=500, detail="Wake word detection failed")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

@app.post("/api/v1/process")
@limiter.limit("20/minute")
async def process_text(request: Request, text_request: TextProcessRequest):
    try:
        # Validate input
        if not text_request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Process text with LLM
        response = await llm_service.process_text(
            text_request.text,
            text_request.context
        )

        logger.info(f"Text processed: {text_request.text[:100]}...")

        return JSONResponse(content={
            "success": True,
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text processing error: {e}")
        raise HTTPException(status_code=500, detail="Text processing failed")

@app.on_event("startup")
async def startup_event():
    logger.info("NOVA Backend L1 v1 starting up...")
    try:
        # Pre-load Whisper model
        await whisper_service.load_model()
        logger.info("Whisper model pre-loaded successfully")
    except Exception as e:
        logger.error(f"Failed to pre-load Whisper model: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("NOVA Backend L1 v1 shutting down...")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=4000,
        reload=False,
        log_level="info"
    )
