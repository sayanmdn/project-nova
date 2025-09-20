# Stage 1: Builder stage for installing dependencies (keeps final image small)
FROM nvidia/cuda:12.0.0-devel-ubuntu22.04 AS builder

# Set environment variables to avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies (e.g., for audio processing and Python)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-venv \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Create a virtual environment and upgrade pip
RUN python3.10 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel

# Copy and install Python requirements (add your full list to requirements.txt)
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Install OpenAI Whisper and PyTorch with CUDA support
RUN pip install --no-cache-dir git+https://github.com/openai/whisper.git
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu120

# Stage 2: Runtime stage (lightweight, copies only essentials from builder)
FROM nvidia/cuda:12.0.0-runtime-ubuntu22.04

# Copy the virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy your application code (assumes 'app' folder with main.py for FastAPI)
COPY ./app /app
WORKDIR /app

# Expose the port NOVA uses
EXPOSE 4000

# Set environment variables (customize as needed; load .env at runtime if using)
ENV PORT=4000
ENV HOST=0.0.0.0
ENV MODEL_SIZE=base
ENV PYTHONUNBUFFERED=1

# Run as non-root user for security (best practice)
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Command to start the FastAPI server (adjust 'main:app' if your entrypoint differs)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4000", "--reload"]
