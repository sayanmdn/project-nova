1 . There will be a http endpoint
	-> localhost:4000/
		This is NOVA Backend l1 v1
	-> localhost:4000/api/v1/listen
		payload will be mp3 file (buffer/base64 string), POST with max payload size of 25MB
		It will return the text of this audio file
	-> localhost:4000/api/v1/recognise
		payload will be mp3, it will return true, if the "Hi Nova" is said it will return true , else false
2. It will use the whisper model to convert mp3 to text, and then return back the text
	1. Best performant
	2. Model should use Nvidia CUDA drivers