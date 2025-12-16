# main.py

import json
import os
from pathlib import Path

import requests
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
# Import các router đã chia nhỏ
from api import ai_endpoints, media_endpoints, util_endpoints
# Lưu ý: core/config.py sẽ tự động chạy khi bạn import các file trên


def get_job_data():
    """Load job data for deployment.

    Priority:
    1) Fetch from JSON_DATA_URL (e.g., npoint.io)
    2) Fallback to local backend/job_data.json
    3) Return [] if both fail
    """

    url = os.getenv("JSON_DATA_URL")
    if url:
        try:
            resp = requests.get(url, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else []
        except Exception as e:
            print(f"Warning: failed to fetch JSON_DATA_URL: {e}")

    try:
        data_path = Path(__file__).resolve().parent / "job_data.json"
        with data_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Warning: failed to read local job_data.json: {e}")

    return []


# Global job dataset (usable by routers if imported)
JOBS = get_job_data()

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://carrer-coach-nnkd.vercel.app", # <-- Thay link Vercel của bạn vào đây
]

# --- Cấu hình Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ CÁC ENDPOINT ĐÃ CHIA NHỎ ---
# Sử dụng prefix /api để các endpoint trong router tự động có tiền tố /api
app.include_router(ai_endpoints.router, prefix="/api")
app.include_router(media_endpoints.router, prefix="/api")
app.include_router(util_endpoints.router, prefix="/api") 

# --- Cấu hình Static Files (Frontend) ---
app.mount("/", 
          StaticFiles(directory="../frontend/public", html=True), 
          name="public")

# Lưu ý: Toàn bộ code load key, config model, và định nghĩa các hàm đã được chuyển đi.
# Bạn có thể chạy file này bằng lệnh: uvicorn main:app --reload