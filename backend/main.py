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

# --- 1. Tải API Key và Cấu hình Model AI ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SPEECH_KEY_FILE = "key.json"
if not GOOGLE_API_KEY:
    print("Lỗi: Không tìm thấy GOOGLE_API_KEY trong file .env")
    # Cân nhắc raise Exception ở đây
else:
    genai.configure(api_key=GOOGLE_API_KEY)
async def transcribe_audio(audio_content: bytes) -> str:
    try:
        client = speech.SpeechAsyncClient.from_service_account_file(
            GOOGLE_SPEECH_KEY_FILE
        )
        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="vi-VN", 
            enable_automatic_punctuation=True,
        )

        print("Đang gửi audio đến Google Speech-to-Text...")
        operation = await client.long_running_recognize(config=config, audio=audio)
        response = await operation.result(timeout=90) # Chờ kết quả

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

# --- 2. Khởi tạo app FastAPI ---
app = FastAPI()

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
    
    audio_content = await file.read()
    
    # 1. Chuyển đổi thành text
    transcribed_text = await transcribe_audio(audio_content)
    
    # 2. Gửi text cho Gemini
    return await get_gemini_evaluation(transcribed_text)
# --- 5. Phục vụ Frontend Tĩnh ---
app.mount("/", 
          StaticFiles(directory="../frontend/public", html=True), 
          name="public")
