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
        
        if mime_type == "application/pdf" or mime_type == "image/tiff" or mime_type == "image/gif":
            print("Đang dùng logic PDF/TIFF...")
            input_config = vision.InputConfig(content=content, mime_type=mime_type)
            features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
            file_request = vision.AnnotateFileRequest(input_config=input_config, features=features)
            batch_request = vision.BatchAnnotateFilesRequest(requests=[file_request])
            
            response = client.batch_annotate_files(request=batch_request)
            
            file_response = response.responses[0]
            page_response = file_response.responses[0] # Lấy trang đầu tiên
            
            if page_response.error.message:
                raise Exception(f"Lỗi Vision API (PDF): {page_response.error.message}")
            
            if page_response.full_text_annotation:
                return page_response.full_text_annotation.text
            else:
                return "Không tìm thấy văn bản trong file PDF."

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
            return f"(Lỗi khi xử lý OCR: Không hỗ trợ MIME type '{mime_type}'. Chỉ hỗ trợ PDF, PNG, JPG, GIF, TIFF.)"

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
async def get_gemini_evaluation(user_answer: str):
    """
    Hàm này chứa logic gọi Gemini mà chúng ta đã viết.
    Nó nhận text (từ gõ chữ hoặc STT) và trả về JSON.
    """
    prompt_template = f"""
    Bạn là một AI Coach phỏng vấn tên là CareerCoach.
    Hãy phân tích input của người dùng và thực hiện MỘT trong hai tác vụ sau:

    **Tác vụ 1: Nếu input có vẻ là MỘT CÂU TRẢ LỜI PHỎNG VẤN**
    (ví dụ: "Điểm yếu của tôi là...", "Tôi nghĩ mình phù hợp vì...", "Tôi xử lý mâu thuẫn bằng cách...")
    
    Hãy đánh giá câu trả lời đó. Format phản hồi của bạn dưới dạng JSON như sau (đảm bảo JSON hợp lệ, không có text nào bên ngoài cặp ngoặc {{}}):
    {{
      "type": "evaluation",
      "feedback": "Nhận xét chi tiết về ưu/nhược điểm của câu trả lời.",
      "score": "Chấm điểm trên thang 10 (ví dụ: 8)",
      "suggested_answer": "Một câu trả lời mẫu lý tưởng cho câu hỏi mà bạn đoán người dùng đang trả lời."
    }}

    **Tác vụ 2: Nếu input có vẻ là MỘT CÂU HỎI hoặc MỘT YÊU CẦU**
    (ví dụ: "Cho tôi lời khuyên...", "Làm thế nào để...", "Câu hỏi phỏng vấn phổ biến là gì?", "Give concise interview tips...")
    
     
    Hãy trả lời câu hỏi hoặc yêu cầu đó. Format phản hồi của bạn dưới dạng JSON như sau (đảm bảo JSON hợp lệ, không có text nào bên ngoài cặp ngoặc {{}}):
    {{
      "type": "general_answer",
      "response": "Câu trả lời của bạn cho câu hỏi/yêu cầu của người dùng."
    }}
    **Tác vụ 3: Nếu User muốn học về một lĩnh vực cụ thể**
    (ví dụ: "Hãy giúp tôi luyện tập phỏng vấn cho vị trí kỹ sư phần mềm", "Tôi muốn học cách trả lời câu hỏi về quản lý thời gian", "Hãy cho tôi ví dụ về câu hỏi phỏng vấn cho vị trí marketing...")
    Hãy trả lời câu hỏi hoặc yêu cầu đó bằng cách cho 1 đoạn prompt mẫu để hướng dẫn lộ trình học trên các LLMs và link các khóa học trên mạng liên quan như coursera, KhanAcademy,... . Format phản hồi của bạn dưới dạng JSON như sau (đảm bảo JSON hợp lệ, không có text nào bên ngoài cặp ngoặc {{}}):
    {{
      "type": "general_answer",
      "response": "Câu trả lời của bạn cho câu hỏi/yêu cầu của người dùng."
    }}
    ---
    **Input của người dùng:**
    "{user_answer}"
    ---
    
    Hãy chọn Tác vụ 1 hoặc Tác vụ 2 hoặc Tác vụ 3 và chỉ trả về JSON.
    """
    
    try:
        response = await model.generate_content_async(prompt_template)
        raw_text = response.text.strip()
        
        match = re.search(r'```json\s*({.*?})\s*```|({.*?})', raw_text, re.DOTALL)
        if match:
            json_str = match.group(1) or match.group(2)
            ai_data = json.loads(json_str)
            return JSONResponse(content=ai_data)
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Không thể tìm thấy nội dung JSON từ AI.", "raw": raw_text}
            )
    except Exception as e:
        print(f"Lỗi khi gọi AI: {e}")
        return JSONResponse(status_code=500, content={"error": f"Lỗi máy chủ: {e}"})
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
@app.post ("/api/generate-questions")
async def generate_questions(job_title: str):
    prompt_template = f"""
    Bạn là một chuyên gia tuyển dụng nhân sự cấp cao.

    Dựa trên TÊN CÔNG VIỆC MỤC TIÊU sau:
    {job_title}

    Hãy tạo ra tối thiểu 30 câu hỏi phỏng vấn bằng tiếng Anh
    và CHIA THÀNH 3 NHÓM, mỗi NHÓM 10 câu hỏi:

    - [Background] ...  (hỏi về nền tảng, kinh nghiệm, học vấn)
    - [Situation] ...   (câu hỏi tình huống, hành vi)
    - [Technical] ...   (kiến thức chuyên môn)

    YÊU CẦU ĐỊNH DẠNG:

    1. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON các chuỗi (string).
    2. Mỗi phần tử trong mảng là một câu hỏi, và PHẢI bắt đầu bằng đúng một trong 3 tag:
       "[Background]", "[Situation]" hoặc "[Technical]".
       Ví dụ:
       [
         "[Background] Tell me about yourself.",
         "[Situation] Describe a time you solved a difficult problem.",
         "[Technical] Explain what a binary search tree is."
       ]

    3. Không dùng bullet markdown, không bọc trong ```json, không giải thích thêm.
    """
    response = await model.generate_content_async(prompt_template)
    raw_text = response.text.strip()
    match = re.search(r'(\[.*\])', raw_text, re.DOTALL)
    if match:
        json_str = match.group(1) or match.group(2)
        questions = json.loads(json_str)
        return JSONResponse(content={"questions": questions})
    else:
        return JSONResponse(
            status_code=500,
            content={"error": "Không thể tìm thấy mảng JSON từ AI.", "raw": raw_text}
        )
    
app.mount("/", 
          StaticFiles(directory="../frontend/public", html=True), 
          name="public")