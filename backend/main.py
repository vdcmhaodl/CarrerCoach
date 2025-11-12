import os
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from google.cloud import speech
from google.cloud import vision
import sounddevice as sd
import json
import re  # Thư viện để xử lý văn bản (Regular Expressions)
from fastapi.concurrency import run_in_threadpool # <<< THÊM DÒNG NÀY

# --- 1. Tải API Key và Cấu hình Model AI ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SPEECH_KEY_FILE = "key.json"
VISION_KEY = "ocr.json"
if not GOOGLE_API_KEY:
    print("Lỗi: Không tìm thấy GOOGLE_API_KEY trong file .env")
    # Cân nhắc raise Exception ở đây
else:
    genai.configure(api_key=GOOGLE_API_KEY)
async def transcribe_audio(audio_content: bytes) -> str:
    """
    Sử dụng Google Cloud Speech-to-Text để chuyển file âm thanh (dạng bytes)
    thành văn bản (text), sử dụng file key.json.
    """
    try:
        # === THAY ĐỔI CHÍNH ===
        # Khởi tạo client Bất đồng bộ (Async) 
        # bằng file key của bạn
        client = speech.SpeechAsyncClient.from_service_account_file(
            GOOGLE_SPEECH_KEY_FILE
        )
        # ======================

        # Cấu hình file âm thanh
        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000, # Phải khớp với file ghi âm
            language_code="vi-VN", # Hoặc "en-US"
            enable_automatic_punctuation=True,
        )

        print("Đang gửi audio đến Google Speech-to-Text...")
        # Vẫn sử dụng 'await' vì client của chúng ta là 'SpeechAsyncClient'
        operation = await client.long_running_recognize(config=config, audio=audio)
        response = await operation.result(timeout=90) # Chờ kết quả

        # Nối các kết quả lại
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
        # Nếu lỗi, trả về text lỗi để Gemini phân tích
        return f"(Lỗi khi xử lý âm thanh: {e})"
# Cấu hình model
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
        # 1. Dùng client ĐỒNG BỘ (không có Async)
        client = vision.ImageAnnotatorClient.from_service_account_file(VISION_KEY)
        
        print(f"Đang xử lý file ({mime_type}) bằng Google Vision (Sync)...")
        
        if mime_type == "application/pdf" or mime_type == "image/tiff" or mime_type == "image/gif":
            # LOGIC CHO PDF/TIFF/GIF (Dùng batch_annotate_files)
            
            print("Đang dùng logic PDF/TIFF...")
            input_config = vision.InputConfig(content=content, mime_type=mime_type)
            features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
            file_request = vision.AnnotateFileRequest(input_config=input_config, features=features)
            batch_request = vision.BatchAnnotateFilesRequest(requests=[file_request])
            
            response = client.batch_annotate_files(request=batch_request)
            
            # Xử lý response
            file_response = response.responses[0]
            page_response = file_response.responses[0] # Lấy trang đầu tiên
            
            if page_response.error.message:
                raise Exception(f"Lỗi Vision API (PDF): {page_response.error.message}")
            
            if page_response.full_text_annotation:
                return page_response.full_text_annotation.text
            else:
                return "Không tìm thấy văn bản trong file PDF."

        elif mime_type == "image/png" or mime_type == "image/jpeg":
            # LOGIC CHO ẢNH PNG/JPG (Dùng document_text_detection)
            
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
            # Các loại file không hỗ trợ
            return f"(Lỗi khi xử lý OCR: Không hỗ trợ MIME type '{mime_type}'. Chỉ hỗ trợ PDF, PNG, JPG, GIF, TIFF.)"

    except FileNotFoundError:
        print(f"LỖI NGHIÊM TRỌNG: Không tìm thấy file key '{VISION_KEY}'")
        return f"(Lỗi server: Không tìm thấy file key OCR.)"
    except Exception as e:
        print(f"Lỗi OCR: {e}")
        return f"(Lỗi khi xử lý OCR: {e})"

# --- 2. Khởi tạo app FastAPI ---
app = FastAPI()

# --- 3. Định nghĩa kiểu dữ liệu Input (khớp với app.js) ---
class UserInput(BaseModel):
    prompt: str  # Đây sẽ là CÂU TRẢ LỜI của người dùng

# --- 4. Tạo API Endpoint (ĐÃ CẬP NHẬT) ---
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
    """
    Nhận text prompt từ frontend.
    """
    return await get_gemini_evaluation(data.prompt)
@app.post("/api/process-voice")
async def handle_voice_request(file: UploadFile = File(...)):
    """
    Nhận file âm thanh từ frontend.
    """
    print(f"Nhận file âm thanh: {file.filename}")
    
    # Đọc nội dung file
    audio_content = await file.read()
    
    # 1. Chuyển đổi thành text
    transcribed_text = await transcribe_audio(audio_content)
    
    # 2. Gửi text cho Gemini
    return await get_gemini_evaluation(transcribed_text)
@app.post("/api/upload-cv")
async def handle_image_request(file: UploadFile = File(...)):
    """_summary_
    Lọc từ khóa trong pdf, png, jpg CV
    """
    content = await file.read()
    mime_type = file.content_type
    # === SỬA LỖI (THE FIX) ===
    # Gọi hàm ĐỒNG BỘ (sync) trong một thread pool
    # để không làm block server FastAPI (async)
    cv_text = await run_in_threadpool(ocr_cv_file_sync, content, mime_type)
    # ========================
    
    if "(Lỗi" in cv_text:
        return JSONResponse(status_code=500, content={"error": cv_text})
    return JSONResponse(content={"cv_text": cv_text})
# --- 5. Phục vụ Frontend Tĩnh ---
app.mount("/", 
          StaticFiles(directory="../frontend/public", html=True), 
          name="public")