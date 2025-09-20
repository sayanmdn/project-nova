import base64
import json

# Read the MP3 file and convert to base64
with open(r"D:\Mycodes\project-nova\Recording.mp3", "rb") as f:
    audio_bytes = f.read()

audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

print(f"Audio file size: {len(audio_bytes)} bytes")
print(f"Base64 length: {len(audio_base64)} characters")
print(f"First 100 characters: {audio_base64[:100]}")

# Create the JSON payload for testing
json_payload = {
    "audio_buffer": {
        "audio_data": audio_base64,
        "format": "mp3"
    }
}

# Save the full JSON payload to a file for curl testing
with open("audio_payload.json", "w") as f:
    json.dump(json_payload, f)

print("JSON payload saved to audio_payload.json")