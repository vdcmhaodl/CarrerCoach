import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from google.cloud import speech
from google.cloud import vision
import json
import re  
from fastapi.concurrency import run_in_threadpool 
from fastapi.middleware.cors import CORSMiddleware

# Read API keys directly from key folder
GOOGLE_SPEECH_KEY_FILE = "key/speech_key.json"
VISION_KEY = "key/ocr_key.json"
CHATBOT_KEY_FILE = "key/chatbot_key.json"

# Load Gemini API key from JSON file
def load_gemini_api_key(key_file: str) -> str:
    """Load Gemini API key from JSON file."""
    try:
        with open(key_file, 'r') as f:
            key_data = json.load(f)
            # Assuming the key is stored under 'api_key' or similar field
            # Adjust based on your actual JSON structure
            if isinstance(key_data, dict):
                # Try common key names
                for key_name in ['GOOGLE_API_KEY', 'api_key', 'key', 'apiKey', 'API_KEY']:
                    if key_name in key_data:
                        return key_data[key_name]
                # If dict doesn't have expected key, return first value
                return list(key_data.values())[0] if key_data else ""
            elif isinstance(key_data, str):
                return key_data
            else:
                raise ValueError(f"Unexpected key format in {key_file}")
    except FileNotFoundError:
        print(f"LỖI NGHIÊM TRỌNG: Không tìm thấy file key '{key_file}'")
        raise
    except Exception as e:
        print(f"Lỗi khi đọc file key: {e}")
        raise

GOOGLE_API_KEY = load_gemini_api_key(CHATBOT_KEY_FILE)
genai.configure(api_key=GOOGLE_API_KEY)
async def transcribe_audio(audio_content: bytes) -> str:
    """
    Sử dụng Google Cloud Speech-to-Text để chuyển file âm thanh (dạng bytes)
    thành văn bản (text), sử dụng file key.json.
    """
    try:
        client = speech.SpeechAsyncClient.from_service_account_file(
            GOOGLE_SPEECH_KEY_FILE
        )

        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000, # Phải khớp với file ghi âm
            language_code="vi-VN", # Hoặc "en-US"
            enable_automatic_punctuation=True,
        )

        print("Đang gửi audio đến Google Speech-to-Text...")

        operation = await client.long_running_recognize(config=config, audio=audio)
        response = await operation.result(timeout=90)
        transcript = "".join(result.alternatives[0].transcript for result in response.results)
        
        if not transcript:
            raise Exception("Không nhận diện được giọng nói.")
            
        print(f"Transcript: {transcript}")
        return transcript

    except FileNotFoundError:
        print(f"LỖI NGHIÊM TRỌNG: Không tìm thấy file key '{GOOGLE_SPEECH_KEY_FILE}'")
        print("Hãy chắc chắn rằng file 'key.json' nằm trong thư mục '/backend'.")
        return f"(Lỗi server: Không tìm thấy file key STT.)"
    except Exception as e:
        print(f"Lỗi Speech-to-Text: {e}")
        return f"(Lỗi khi xử lý âm thanh: {e})"
generation_config = {"temperature": 0.7}
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]
model = genai.GenerativeModel('gemini-2.5-flash-lite',
                             generation_config=generation_config,
                             safety_settings=safety_settings)

def ocr_cv_file_sync(content: bytes, mime_type: str) -> str:
    """
    Sử dụng Google Cloud Vision (ĐỒNG BỘ) để OCR file (PDF/Ảnh)
    BẰNG CÁCH CHỌN ĐÚNG HÀM API DỰA TRÊN MIME_TYPE.
    """
    try:
        client = vision.ImageAnnotatorClient.from_service_account_file(VISION_KEY)
        
        print(f"Đang xử lý file ({mime_type}) bằng Google Vision (Sync)...")
        
        if mime_type == "application/pdf" or mime_type == "image/tiff" or mime_type == "image/gif" or mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            print("Đang dùng logic PDF/TIFF/DOCX...")
            # For DOCX, treat as PDF
            actual_mime = "application/pdf" if "wordprocessingml" in mime_type else mime_type
            input_config = vision.InputConfig(content=content, mime_type=actual_mime)
            features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
            file_request = vision.AnnotateFileRequest(input_config=input_config, features=features)
            batch_request = vision.BatchAnnotateFilesRequest(requests=[file_request])
            
            response = client.batch_annotate_files(request=batch_request)
            
            file_response = response.responses[0]
            page_response = file_response.responses[0] # Lấy trang đầu tiên
            
            if page_response.error.message:
                raise Exception(f"Lỗi Vision API (PDF/DOCX): {page_response.error.message}")
            
            if page_response.full_text_annotation:
                return page_response.full_text_annotation.text
            else:
                return "Không tìm thấy văn bản trong file."

        elif mime_type == "image/png" or mime_type == "image/jpeg":
            print("Đang dùng logic Ảnh (PNG/JPG)...")
            image = vision.Image(content=content)
            
            response = client.document_text_detection(image=image)
            
            if response.error.message:
                raise Exception(f"Lỗi Vision API (Ảnh): {response.error.message}")
            
            if response.full_text_annotation:
                return response.full_text_annotation.text
            else:
                return "Không tìm thấy văn bản trong file ảnh."
        
        else:
            return f"(Lỗi khi xử lý OCR: Không hỗ trợ MIME type '{mime_type}'. Chỉ hỗ trợ PDF, PNG, JPG, GIF, TIFF, DOCX.)"

    except FileNotFoundError:
        print(f"LỖI NGHIÊM TRỌNG: Không tìm thấy file key '{VISION_KEY}'")
        return f"(Lỗi server: Không tìm thấy file key OCR.)"
    except Exception as e:
        print(f"Lỗi OCR: {e}")
        return f"(Lỗi khi xử lý OCR: {e})"

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserInput(BaseModel):
    prompt: str

class CVAnalysisRequest(BaseModel):
    cv_text: str
    role: str = ""
    organization: str = ""

class CVGenerationRequest(BaseModel):
    role: str
    skills: list[str]
    experience: str
    education: str
    achievements: list[str] = []

async def get_gemini_evaluation(user_answer: str):
    """
    Hàm này chứa logic gọi Gemini mà chúng ta đã viết.
    Nó nhận text (từ gõ chữ hoặc STT) và trả về JSON.
    """
    prompt_template = f"""You are an expert interview coach named CareerCoach.
Analyze the user's input and return ONLY valid JSON (no markdown, no extra text outside curly braces).

If the input appears to be an interview answer:
Return:
{{
  "type": "evaluation",
  "feedback": "Detailed feedback on strengths and weaknesses of the answer, with suggestions for improvement. 2-3 sentences.",
  "suggested_answer": "An ideal example answer for this type of question. 2-3 sentences."
}}

If the input is a question or request:
Return:
{{
  "type": "general_answer",
  "response": "Direct answer to the user's question or request."
}}

---
User input: "{user_answer}"
---

Return ONLY the JSON object, nothing else."""
    
    try:
        response = await model.generate_content_async(prompt_template)
        raw_text = response.text.strip()
        
        # Remove markdown code blocks if present
        raw_text = re.sub(r'```json\s*', '', raw_text)
        raw_text = re.sub(r'```\s*', '', raw_text)
        
        # Try to extract JSON object
        match = re.search(r'(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})', raw_text, re.DOTALL)
        if match:
            json_str = match.group(1)
            # Clean up common JSON issues
            json_str = re.sub(r',\s*([\]\}])', r'\1', json_str)  # Remove trailing commas
            
            ai_data = json.loads(json_str)
            return JSONResponse(content=ai_data)
        else:
            # If no JSON found, create a default response
            return JSONResponse(
                content={
                    "type": "general_answer",
                    "response": raw_text[:500] if raw_text else "Please provide a clearer input."
                }
            )
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return JSONResponse(
            content={
                "type": "general_answer",
                "response": "I understood your message. Please try rephrasing your answer or question for better evaluation."
            }
        )
    except Exception as e:
        print(f"Error calling AI: {e}")
        return JSONResponse(
            content={
                "type": "general_answer",
                "response": "I'm currently processing your request. Please try again."
            }
        )
@app.post("/api/gemini")
async def handle_gemini_request(data: UserInput):
    return await get_gemini_evaluation(data.prompt)
@app.post("/api/process-voice")
async def handle_voice_request(file: UploadFile = File(...)):
    print(f"Nhận file âm thanh: {file.filename}")
    
    # Đọc nội dung file
    audio_content = await file.read()
    
    # 1. Chuyển đổi thành text
    transcribed_text = await transcribe_audio(audio_content)
    
    # 2. Gửi text cho Gemini
    return await get_gemini_evaluation(transcribed_text)
@app.post("/api/upload-cv")
async def handle_image_request(file: UploadFile = File(...)):
    content = await file.read()
    mime_type = file.content_type
    cv_text = await run_in_threadpool(ocr_cv_file_sync, content, mime_type)
    # ========================
    
    if "(Lỗi" in cv_text:
        return JSONResponse(status_code=500, content={"error": cv_text})
    return JSONResponse(content={"cv_text": cv_text})

@app.post("/api/analyze-cv")
async def analyze_cv(data: CVAnalysisRequest):
    """
    Analyze CV text and extract: role, skills, experience, pros/cons, learning path
    """
    prompt_template = f"""
    You are an expert career coach and resume analyzer.
    
    Analyze the following CV text and extract comprehensive insights:
    
    CV TEXT:
    {data.cv_text}
    
    TARGET ROLE (if provided): {data.role or 'Not specified'}
    TARGET ORGANIZATION (if provided): {data.organization or 'Not specified'}
    
    Provide a detailed analysis in JSON format with the following structure:
    {{
      "extracted_role": "Primary role/position based on CV (e.g., 'Software Engineer', 'Marketing Manager')",
      "skills": ["skill1", "skill2", "skill3", ...],
      "experience_years": "Estimated years of experience",
      "experience_summary": "Brief summary of work experience",
      "education": "Education background",
      "strengths": ["strength1", "strength2", ...],
      "weaknesses": ["area1 to improve", "area2 to improve", ...],
      "learning_path": {{
        "immediate": ["skill or area to learn immediately"],
        "short_term": ["skills for next 3-6 months"],
        "long_term": ["skills for 6-12 months"]
      }},
      "recommended_tasks": ["task1", "task2", ...]
    }}
    
    Return ONLY the JSON object, no additional text.
    """
    
    try:
        response = await model.generate_content_async(prompt_template)
        raw_text = response.text.strip()
        
        match = re.search(r'```json\s*({.*?})\s*```|({.*?})', raw_text, re.DOTALL)
        if match:
            json_str = match.group(1) or match.group(2)
            analysis_data = json.loads(json_str)
            return JSONResponse(content=analysis_data)
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Could not parse AI response", "raw": raw_text}
            )
    except Exception as e:
        print(f"Error in CV analysis: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/generate-cv")
async def generate_cv(data: CVGenerationRequest):
    """
    Generate a sample CV in markdown format based on user profile
    """
    skills_list = ", ".join(data.skills)
    achievements_list = "\n".join([f"- {a}" for a in data.achievements]) if data.achievements else "- [Add your achievements]"
    
    prompt_template = f"""
    You are an expert CV/resume writer.
    
    Create a professional CV in Markdown format for a candidate with the following profile:
    
    ROLE: {data.role}
    SKILLS: {skills_list}
    EXPERIENCE: {data.experience}
    EDUCATION: {data.education}
    ACHIEVEMENTS:
    {achievements_list}
    
    Generate a complete, professional CV in Markdown format with the following sections:
    - Header with name and contact (use placeholders)
    - Professional Summary
    - Skills
    - Work Experience
    - Education
    - Achievements
    - Additional relevant sections
    
    Make it ATS-friendly and professional. Use proper Markdown formatting.
    Return ONLY the Markdown content, no JSON, no code blocks.
    """
    
    try:
        response = await model.generate_content_async(prompt_template)
        cv_markdown = response.text.strip()
        
        # Remove markdown code blocks if present
        cv_markdown = re.sub(r'^```markdown\s*', '', cv_markdown)
        cv_markdown = re.sub(r'```\s*$', '', cv_markdown)
        
        return JSONResponse(content={"cv_markdown": cv_markdown})
    except Exception as e:
        print(f"Error in CV generation: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

class QuestionGenerationRequest(BaseModel):
    field: str
    role: str = ""
    skills: list[str] = []

@app.post("/api/generate-questions")
async def generate_questions(data: QuestionGenerationRequest):
    skills_text = ", ".join(data.skills) if data.skills else "general professional skills"
    role_text = data.role or data.field
    
    prompt_template = f"""You are a senior HR recruitment expert. Generate interview questions for the following profile:

TARGET ROLE: {role_text}
FIELD: {data.field}
KEY SKILLS: {skills_text}

Return ONLY a valid JSON array of 15-20 strings (no markdown, no text outside brackets).
Each question MUST start with exactly one tag: [Background], [Situation], or [Technical].

Example format:
[
  "[Background] Tell me about your experience with data analysis.",
  "[Situation] Describe how you handled a difficult deadline.",
  "[Technical] Explain the key concepts of machine learning."
]

Make questions specific to the role and skills. Return ONLY the JSON array, nothing else."""
    
    try:
        response = await model.generate_content_async(prompt_template)
        raw_text = response.text.strip()
        
        # Remove markdown code blocks if present
        raw_text = re.sub(r'```json\s*', '', raw_text)
        raw_text = re.sub(r'```\s*', '', raw_text)
        
        # Find JSON array
        match = re.search(r'(\[.*\])', raw_text, re.DOTALL)
        if match:
            json_str = match.group(1)
            # Clean up common JSON issues
            json_str = re.sub(r',\s*([\]\}])', r'\1', json_str)  # Remove trailing commas
            json_str = json_str.replace("\n", " ").replace("\r", " ")  # Remove newlines but keep spacing
            
            questions = json.loads(json_str)
            
            # Ensure we have a valid list
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            
            return JSONResponse(content={"questions": questions})
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Could not find JSON array from AI.", "raw": raw_text[:500]}
            )
    except json.JSONDecodeError as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"JSON parsing error: {str(e)}", "raw": raw_text[:500]}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error generating questions: {str(e)}"}
        )
    
app.mount("/", 
          StaticFiles(directory="../frontend/public", html=True), 
          name="public")