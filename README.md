1 . There will be a http endpoint
	-> localhost:4000/api/v1/listen
		payload will be mp3 file (buffer/base64 string), POST with max payload size of 25MB
	-> localhost:4000/
		This is NOVA Backend l1 v1
2. It will use the whisper model to convert mp3 to text, and then return back the text
	1. Best performant
	2. Model should use Nvidia CUDA drivers