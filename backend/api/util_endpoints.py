# api/util_endpoints.py

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from core.models import JobRecommendationRequest
import json
import os
import re
import requests

router = APIRouter()

def get_job_data() -> list:
    """Load job data for local + Render deployment.

    Priority:
    1) Fetch from JSON_DATA_URL (npoint.io)
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
            print(f"Warning: JSON_DATA_URL returned status {resp.status_code}")
        except Exception as e:
            print(f"Warning: failed to fetch JSON_DATA_URL: {e}")

    try:
        # util_endpoints.py is in backend/api/, so go up one level to backend/
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(base_dir, "..", "job_data.json")
        if not os.path.exists(data_path):
            print(f"Không tìm thấy file data tại: {data_path}")
            return []

        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Lỗi load data: {e}")
        return []


# --- Load once at startup (global cache) ---
JOB_DATABASE = get_job_data()

# Danh sách skill phổ biến để gợi ý thiếu
COMMON_SKILLS = {
    'python', 'java', 'javascript', 'react', 'angular', 'vue', 'nodejs', 
    'docker', 'kubernetes', 'aws', 'azure', 'sql', 'mongodb', 'git',
    'typescript', 'golang', 'rust', 'c++', 'c#', '.net', 'flutter', 'swift'
}

@router.post("/recommend-jobs")
async def recommend_jobs(data: JobRecommendationRequest):
    """
    Match jobs using Rule-Based Filtering (No LLM).
    """
    try:
        if not JOB_DATABASE:
            return JSONResponse(status_code=500, content={"error": "Server chưa có dữ liệu việc làm."})

        # Chuẩn hóa dữ liệu user
        user_skills = set(skill.lower().strip() for skill in data.skills)
        user_role = data.role.lower().strip()
        
        matched_jobs = []

        for job in JOB_DATABASE:
            # Tạo text tổng hợp để search
            # Thêm dấu cách để tách các từ dính nhau
            job_name = job.get('job_name', '')
            job_desc = job.get('job_description', '')
            job_req = job.get('job_requirement', '')
            
            # Text full để kiểm tra ngữ cảnh
            full_text = f"{job_name} {job_desc} {job_req}".lower()
            
            # --- 2. THUẬT TOÁN TÍNH ĐIỂM (Scoring) ---
            match_score = 0
            required_skills_found = []

            # Check Skills (Dùng regex để bắt chính xác từ)
            # Ví dụ: chỉ bắt "java" nếu nó đứng riêng lẻ, không bắt trong "javascript"
            for skill in user_skills:
                # \b là ranh giới từ (word boundary)
                # re.escape để tránh lỗi nếu skill có ký tự đặc biệt (ví dụ C++)
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, full_text):
                    match_score += 15
                    required_skills_found.append(skill)

            # Check Role (Ưu tiên điểm cao nếu khớp title)
            if user_role:
                if user_role in job_name.lower():
                    match_score += 30 # Khớp tiêu đề quan trọng hơn
                elif user_role in full_text:
                    match_score += 10

            # Check Experience (Logic đơn giản)
            exp_req = 0
            if 'senior' in job_name.lower(): exp_req = 3
            elif 'junior' in job_name.lower() or 'fresher' in job_name.lower(): exp_req = 0
            elif 'mid' in job_name.lower(): exp_req = 2
            
            # Phạt điểm nếu kinh nghiệm quá chênh lệch
            if data.experience_years < exp_req:
                match_score -= 10
            else:
                match_score += 5

            # --- 3. LỌC KẾT QUẢ ---
            if match_score >= 15: # Ngưỡng điểm để hiển thị
                
                # Tìm skill còn thiếu (Missing Skills)
                missing = []
                for tech in COMMON_SKILLS:
                    if tech not in user_skills:
                        # Check xem job có cần tech này không
                        if re.search(r'\b' + re.escape(tech) + r'\b', full_text):
                            missing.append(tech)

                matched_jobs.append({
                    "job_name": job_name,
                    "company_name": job.get("company_name", "Unknown"),
                    "job_url": job.get("job_url", "#"), # URL THẬT
                    "job_description": job_desc[:200] + "...",
                    "job_requirement": job_req[:200] + "...",
                    "matchScore": min(max(match_score, 0), 100), # Clamp 0-100
                    "requiredSkills": required_skills_found[:5],
                    "missingSkills": missing[:5]
                })

        # Sắp xếp điểm cao nhất lên đầu
        matched_jobs.sort(key=lambda x: x['matchScore'], reverse=True)
        
        return JSONResponse(content={"jobs": matched_jobs[:20]})

    except Exception as e:
        print(f"Error logic: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})