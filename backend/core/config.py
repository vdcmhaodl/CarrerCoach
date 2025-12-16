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

def get_credential_path(filename: str) -> str:
    """Resolve a secret file path.

    Priority:
    1) Render secret mount: /etc/secrets/<filename>
    2) Local dev (repo): <repo>/backend/key/<filename>
    3) Local dev (cwd): <cwd>/backend/key/<filename> or <cwd>/key/<filename>
    """

    render_path = Path("/etc/secrets") / filename
    if render_path.is_file():
        return str(render_path)

    repo_path = KEY_DIR / filename
    if repo_path.is_file():
        return str(repo_path)

    cwd_backend_path = Path.cwd() / "backend" / "key" / filename
    if cwd_backend_path.is_file():
        return str(cwd_backend_path)

    cwd_key_path = Path.cwd() / "key" / filename
    if cwd_key_path.is_file():
        return str(cwd_key_path)

    raise FileNotFoundError(
        f"Secret file '{filename}' not found in /etc/secrets or local key folders."
    )


def _resolve_optional_key_file(env_value: str | None, filename: str) -> str:
    """Resolve a key file path without crashing at import time."""

    if env_value:
        try:
            if Path(env_value).is_file():
                return env_value
        except OSError:
            pass

    try:
        return get_credential_path(filename)
    except FileNotFoundError:
        # Keep old default behavior for local dev; endpoints can handle missing files.
        return str(KEY_DIR / filename)


# Key file locations (can be overridden by env vars)
GOOGLE_SPEECH_KEY_FILE = _resolve_optional_key_file(
    os.getenv("GOOGLE_SPEECH_KEY_FILE"),
    "speech_key.json",
)
VISION_KEY = _resolve_optional_key_file(
    os.getenv("VISION_KEY"),
    "ocr_key.json",
)
CHATBOT_KEY_FILE = _resolve_optional_key_file(
    os.getenv("CHATBOT_KEY_FILE"),
    "chatbot_key.json",
)

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