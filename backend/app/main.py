from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import whisper
import torch
from datetime import datetime
import os

app = FastAPI()

# Load Whisper model (use env var for size, e.g., 'base')
model_size = os.getenv("MODEL_SIZE", "base")
model = whisper.load_model(model_size)

@app.get("/")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}

@app.post("/api/v1/listen")
async def transcribe_audio(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    audio_path = f"/tmp/{file.filename}"
    with open(audio_path, "wb") as f:
        f.write(await file.read())
    # Transcribe using Whisper
    result = model.transcribe(audio_path)
    os.remove(audio_path)
    return JSONResponse({
        "success": True,
        "transcript": result["text"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

@app.post("/api/v1/recognise")
