# api/media_endpoints.py

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
from google.cloud import speech, vision, texttospeech
import base64
import os
# Import từ file config/models mới
from core.models import TextToSpeechRequest
from core.config import GOOGLE_SPEECH_KEY_FILE, VISION_KEY, get_credential_path

router = APIRouter()

# --- Chuyển các hàm OCR, STT, TTS (bao gồm logic bên trong) sang đây ---

def ocr_cv_file_sync(content: bytes, mime_type: str) -> str:
    """
    Uses Google Cloud Vision (Synchronous) to OCR files (PDF/Images)
    by selecting the correct API method based on MIME_TYPE.
    """
    try:
        ocr_key_path = get_credential_path("ocr_key.json")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = ocr_key_path
        client = vision.ImageAnnotatorClient()
 
        print(f"Processing file ({mime_type}) with Google Vision (Sync)...")
 
        # Handle Documents (PDF, TIFF, DOCX)
        if mime_type in ["application/pdf", "image/tiff", "image/gif", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            print("Using PDF/TIFF/DOCX logic...")
            # Treat DOCX as PDF for Vision API input config
            actual_mime = "application/pdf" if "wordprocessingml" in mime_type else mime_type
 
            input_config = vision.InputConfig(content=content, mime_type=actual_mime)
            features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
            file_request = vision.AnnotateFileRequest(input_config=input_config, features=features)
            batch_request = vision.BatchAnnotateFilesRequest(requests=[file_request])
 
            response = client.batch_annotate_files(request=batch_request)
 
            file_response = response.responses[0]
            page_response = file_response.responses[0] # Get the first page
 
            if page_response.error.message:
                raise Exception(f"Vision API Error (PDF/DOCX): {page_response.error.message}")
 
            if page_response.full_text_annotation:
                return page_response.full_text_annotation.text
            else:
                return "No text found in file."
 
        # Handle Images (PNG, JPG)
        elif mime_type in ["image/png", "image/jpeg"]:
            print("Using Image logic (PNG/JPG)...")
            image = vision.Image(content=content)
 
            response = client.document_text_detection(image=image)
 
            if response.error.message:
                raise Exception(f"Vision API Error (Image): {response.error.message}")
 
            if response.full_text_annotation:
                return response.full_text_annotation.text
            else:
                return "No text found in image."
 
        else:
            return f"(OCR Error: Unsupported MIME type '{mime_type}'. Supported: PDF, PNG, JPG, GIF, TIFF, DOCX.)"
 
    except FileNotFoundError:
        print("CRITICAL ERROR: OCR key file not found.")
        return f"(Server Error: OCR key file not found.)"
    except Exception as e:
        print(f"OCR Error: {e}")
        return f"(Error processing OCR: {e})"

async def transcribe_audio(audio_content: bytes, language_code: str = "en-US") -> str:
    """
    Uses Google Cloud Speech-to-Text to convert audio bytes to text using the service account key.
    Supports English (en-US) and Vietnamese (vi-VN).
    """
    try:
        speech_key_path = get_credential_path("speech_key.json")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = speech_key_path
        client = speech.SpeechAsyncClient()
 
        audio = speech.RecognitionAudio(content=audio_content)
 
        print(f"Audio content size: {len(audio_content)} bytes")
        print(f"Language code: {language_code}")
 
        # Map Vietnamese language code to proper Google Cloud code
        if language_code.lower() in ["vi", "vi-vn", "vietnamese"]:
            language_code = "vi-VN"
        elif language_code.lower() in ["en", "en-us", "english"]:
            language_code = "en-US"
 
        # Choose model based on language
        # Vietnamese benefits from the enhanced model
        model_name = "latest_long" if language_code == "vi-VN" else "default"
        
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=language_code,
            enable_automatic_punctuation=True,
            use_enhanced=True,
            model=model_name,
        )
 
        print(f"Sending audio to Google Speech-to-Text with model: {model_name}...")
 
        response = await client.recognize(config=config, audio=audio)
 
        print(f"Response received: {len(response.results)} results")
 
        if not response.results:
            return "(Error: No speech detected in audio)"
 
        transcript = " ".join(
            result.alternatives[0].transcript 
            for result in response.results 
            if result.alternatives
        )
 
        if not transcript or not transcript.strip():
            return "(Error: No speech could be recognized)"
 
        print(f"Transcript: {transcript}")
        return transcript.strip()
 
    except FileNotFoundError:
        print("CRITICAL ERROR: Speech key file not found.")
        return "(Server Error: STT key file not found)"
    except Exception as e:
        print(f"Speech-to-Text Error: {type(e).__name__}: {e}")
        return f"(Error processing audio: {e})"

@router.post("/upload-cv")
async def handle_image_request(file: UploadFile = File(...)):
    content = await file.read()
    mime_type = file.content_type
    cv_text = await run_in_threadpool(ocr_cv_file_sync, content, mime_type)
 
    if "(Error" in cv_text or "(Server Error" in cv_text:
        return JSONResponse(status_code=500, content={"error": cv_text})
    return JSONResponse(content={"cv_text": cv_text})

@router.post("/process-voice")
async def handle_voice_request(audio: UploadFile = File(...), language: str = Form("en-US")):
    print(f"===== VOICE PROCESSING START =====")
    print(f"Received audio file: {audio.filename}")
    print(f"Content type: {audio.content_type}")
    print(f"Language: {language}")
 
    try:
        audio_content = await audio.read()
        print(f"Audio size: {len(audio_content)} bytes")
 
        if len(audio_content) < 1000:
            return JSONResponse(
                status_code=400,
                content={"error": "Audio file too short", "transcription": ""}
            )
 
        transcribed_text = await transcribe_audio(audio_content, language)
 
        if "(Error" in transcribed_text or "(Server Error" in transcribed_text:
            print(f"Transcription error: {transcribed_text}")
            return JSONResponse(
                status_code=500,
                content={"error": transcribed_text, "transcription": ""}
            )
 
        print(f"Successfully transcribed: {transcribed_text}")
        print(f"===== VOICE PROCESSING END =====")
        return JSONResponse(content={"transcription": transcribed_text})
    except Exception as e:
        print(f"Voice processing exception: {type(e).__name__}: {e}")
        print(f"===== VOICE PROCESSING ERROR =====")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "transcription": ""}
        )

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to natural speech using Google Cloud Text-to-Speech.
    Supports English (en-US) and Vietnamese (vi-VN).
    Returns base64 encoded audio.
    """
    try:
        speech_key_path = get_credential_path("speech_key.json")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = speech_key_path
        client = texttospeech.TextToSpeechAsyncClient()
 
        synthesis_input = texttospeech.SynthesisInput(text=request.text)
 
        # Get language from request, default to en-US
        language = request.language.lower() if request.language else "en-US"
 
        # Map Vietnamese language code to proper Google Cloud code
        if language in ["vi", "vi-vn", "vietnamese"]:
            language_code = "vi-VN"
            # Use a Vietnamese voice (female neural voice)
            voice_name = "vi-VN-Neural2-A"
        else:
            language_code = "en-US"
            voice_name = "en-US-Neural2-F"
 
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )
 
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.85,
            pitch=-2.0,
            volume_gain_db=0.0
        )
 
        response = await client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
 
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
 
        return JSONResponse(content={
            "audio": audio_base64,
            "format": "mp3"
        })
 
    except Exception as e:
        print(f"Text-to-Speech Error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to synthesize speech: {str(e)}"}
        )