"""Backend configuration.

Render (and most cloud hosts) should not rely on local JSON key files being
present in the repo. Prefer environment variables.
"""

import json
import os
from pathlib import Path

import google.generativeai as genai

# Base paths
BACKEND_DIR = Path(__file__).resolve().parents[1]
KEY_DIR = BACKEND_DIR / "key"

# Key file locations (can be overridden by env vars)
GOOGLE_SPEECH_KEY_FILE = os.getenv("GOOGLE_SPEECH_KEY_FILE", str(KEY_DIR / "speech_key.json"))
VISION_KEY = os.getenv("VISION_KEY", str(KEY_DIR / "ocr_key.json"))
CHATBOT_KEY_FILE = os.getenv("CHATBOT_KEY_FILE", str(KEY_DIR / "chatbot_key.json"))

def load_gemini_api_key(key_file: str) -> str:
    """Load Gemini API key from JSON file."""
    try:
        with open(key_file, 'r') as f:
            key_data = json.load(f)
            # Check for common key names in the JSON structure
            if isinstance(key_data, dict):
                for key_name in ['GOOGLE_API_KEY', 'api_key', 'key', 'apiKey', 'API_KEY']:
                    if key_name in key_data:
                        return key_data[key_name]
                # Fallback: return the first value found
                return list(key_data.values())[0] if key_data else ""
            elif isinstance(key_data, str):
                return key_data
            else:
                raise ValueError(f"Unexpected key format in {key_file}")
    except FileNotFoundError:
        print(f"WARNING: Key file '{key_file}' not found.")
        raise
    except Exception as e:
        print(f"Error reading key file: {e}")
        raise

def _get_gemini_api_key() -> str | None:
    """Resolve Gemini API key.

    Priority:
    1) Env var GOOGLE_API_KEY or GEMINI_API_KEY
    2) JSON file at CHATBOT_KEY_FILE
    """

    env_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if env_key:
        return env_key

    try:
        return load_gemini_api_key(CHATBOT_KEY_FILE)
    except FileNotFoundError:
        return None


# Initialize Gemini if key is available
GOOGLE_API_KEY = _get_gemini_api_key()
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Configure Gemini model (only if configured)
generation_config = {"temperature": 0.7}
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

GEMINI_MODEL = (
    genai.GenerativeModel(
        "gemini-2.5-flash-lite",
        generation_config=generation_config,
        safety_settings=safety_settings,
    )
    if GOOGLE_API_KEY
    else None
)