# core/models.py

from pydantic import BaseModel
from typing import List

# Các model cho FastAPI Request Body
class UserInput(BaseModel):
    prompt: str

class CVAnalysisRequest(BaseModel):
    cv_text: str
    role: str = ""
    organization: str = ""

class CVGenerationRequest(BaseModel):
    role: str
    skills: List[str]
    experience: str
    education: str
    achievements: List[str] = []

class QuestionGenerationRequest(BaseModel):
    field: str
    role: str = ""
    skills: List[str] = []

class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "en-US"