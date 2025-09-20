def validate_audio_file(file_path):
    # Add validation logic (e.g., check size < 25MB, format MP3/WAV)
    if os.path.getsize(file_path) > 25 * 1024 * 1024:
        raise ValueError("File exceeds 25MB")
    return True
