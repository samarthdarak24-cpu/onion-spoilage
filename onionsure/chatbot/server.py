"""
OnionSure Chatbot WebSocket Server
===================================
FastAPI + WebSocket server that accepts browser connections and spawns
a Pipecat voice pipeline per session.

Run:
    uvicorn server:app --host 0.0.0.0 --port 8765 --reload

Frontend connects via:  ws://localhost:8765/ws/voice
Text fallback API:      POST /api/chat  { "message": "...", "language": "hi" }
"""

import asyncio
import logging
import os
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("onionsure-chat-server")

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OnionSure AI Chatbot",
    description="Multilingual voice + text assistant for OnionSure platform",
    version="1.0.0",
)

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:4000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── OnionSure system prompt (shared with bot.py) ──────────────────────────
SYSTEM_PROMPT = """You are Kisaan Saathi (किसान साथी) — the official AI assistant for 
OnionSure, an AI-powered onion quality inspection and grading platform.
You ONLY answer questions related to OnionSure and onion quality grading.

PLATFORM KNOWLEDGE:
- Grade A: Quality score ≥ 85 — best quality, highest market price
- URS (Usable Reduced Standard): Score 65-84 — acceptable quality
- Rejected: Score < 65 — does not meet standards
- Quality Score: 0-100 (Vision 40% + Gas sensors 35% + Environment 25%)
- Central Lot ID: Unique ID for each batch (e.g. ON-2026-00421)
- Certificate: Digital quality certificate with QR code
- Dispute: Challenge incorrect grades within 7 days
- Pre-Check: Scan onions at home before procurement center visit
- FPO: Farmer Producer Organization — groups of farmers
- Procurement Center: Official AI grading location

LANGUAGE: Detect user's language and respond in the SAME language.
Supported: Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, Malayalam, Punjabi, Odia, English.
Use simple farmer-friendly language. Avoid technical jargon.
Keep responses short (2-4 sentences) and practical.
Only answer OnionSure/onion quality related questions.
For off-topic questions say: "मैं केवल OnionSure के बारे में मदद कर सकता हूँ। / I can only help with OnionSure topics." """


# ── Text chat endpoint (fallback when voice not available) ───────────────────

class ChatRequest(BaseModel):
    message: str
    language: str = "hi"
    conversation_id: str = "default"


class ChatResponse(BaseModel):
    reply: str
    language: str


# In-memory conversation history per session (bounded to 42 turns)
_conversations: dict[str, list[dict]] = {}


@app.post("/api/chat", response_model=ChatResponse)
async def text_chat(req: ChatRequest):
    """
    Text-based chat endpoint for the floating chat widget.
    Uses Azure OpenAI directly (no voice pipeline needed for text).
    """
    conv_id = req.conversation_id
    if conv_id not in _conversations:
        _conversations[conv_id] = [{"role": "system", "content": SYSTEM_PROMPT}]

    _conversations[conv_id].append({"role": "user", "content": req.message})

    # Support both AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY for compatibility
    endpoint   = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
    api_key    = os.environ.get("AZURE_OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_KEY", "")

    if not endpoint or not api_key:
        raise HTTPException(status_code=503, detail="LLM service not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.")

    url = f"{endpoint.rstrip('/')}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

    payload = {
        "messages": _conversations[conv_id][-20:],  # last 20 turns to stay within token limits
        "max_tokens": 250,
        "temperature": 0.7,
    }

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error(f"LLM error {resp.status}: {body}")
                    raise HTTPException(status_code=502, detail="LLM unavailable")
                data = await resp.json()
    except aiohttp.ClientError as e:
        logger.error(f"Network error calling LLM: {e}")
        raise HTTPException(status_code=502, detail="Could not reach LLM service")

    reply = data["choices"][0]["message"]["content"].strip()
    _conversations[conv_id].append({"role": "assistant", "content": reply})

    # Keep memory bounded
    if len(_conversations[conv_id]) > 42:
        _conversations[conv_id] = (
            _conversations[conv_id][:1] + _conversations[conv_id][-40:]
        )

    return ChatResponse(reply=reply, language=req.language)


# ── Voice WebSocket endpoint ─────────────────────────────────────────────────

@app.websocket("/ws/voice")
async def voice_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice chat.
    One Pipecat pipeline (Sarvam STT → Azure GPT-4o → Sarvam TTS) per connection.
    
    Query params:
      ?lang=hi   — BCP-47 language code (default: hi)
      ?role=farmer|fpo|buyer — user role for system prompt context
      ?name=...  — user's name for personalized greeting
    """
    await websocket.accept()
    
    # Read session context from query params
    lang = websocket.query_params.get("lang", "hi")
    role = websocket.query_params.get("role", "farmer")
    name = websocket.query_params.get("name", "Kisan bhai")
    
    session_context = {
        "language_code": lang,
        "role": role,
        "user_name": name,
        "session_id": id(websocket),
    }
    
    logger.info(f"Voice WebSocket connected — lang={lang} role={role} name={name}")

    try:
        # Use the production-grade bot from server/bot.py (with resilience + retries)
        from server.bot import run_bot
        await run_bot(websocket, session_context=session_context)
    except WebSocketDisconnect:
        logger.info("Client disconnected normally")
    except ImportError:
        # Fallback to simple bot.py if server package not available
        logger.warning("server.bot not available, falling back to bot.py")
        try:
            from bot import run_bot as run_simple_bot
            await run_simple_bot(websocket)
        except Exception as e:
            logger.error(f"Fallback bot error: {e}")
            try:
                await websocket.close(code=1011, reason="Bot unavailable")
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Bot error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    sarvam_key = bool(os.environ.get("SARVAM_API_KEY"))
    llm_key = bool(os.environ.get("AZURE_OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_KEY"))
    return {
        "status": "ok",
        "service": "OnionSure AI Chatbot",
        "voice": sarvam_key,
        "llm": llm_key,
        "languages": ["hi", "mr", "gu", "ta", "te", "kn", "bn", "ml", "pa", "or", "en"],
    }


@app.get("/languages")
async def list_languages():
    """List supported Indic languages."""
    return {
        "languages": [
            {"code": "hi", "name": "Hindi",     "native": "हिंदी"},
            {"code": "mr", "name": "Marathi",   "native": "मराठी"},
            {"code": "gu", "name": "Gujarati",  "native": "ગુજરાતી"},
            {"code": "ta", "name": "Tamil",     "native": "தமிழ்"},
            {"code": "te", "name": "Telugu",    "native": "తెలుగు"},
            {"code": "kn", "name": "Kannada",   "native": "ಕನ್ನಡ"},
            {"code": "bn", "name": "Bengali",   "native": "বাংলা"},
            {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
            {"code": "pa", "name": "Punjabi",   "native": "ਪੰਜਾਬੀ"},
            {"code": "or", "name": "Odia",      "native": "ଓଡ଼ିଆ"},
            {"code": "en", "name": "English",   "native": "English"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BOT_PORT", 8765))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
