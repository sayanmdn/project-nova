import os

class Config:
    MODEL_SIZE = os.getenv("MODEL_SIZE", "base")
    MAX_AUDIO_SIZE_MB = 25
