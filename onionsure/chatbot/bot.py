"""
OnionSure Multilingual AI Chatbot — Pipecat voice agent
=========================================================
Pipeline: Browser mic → Sarvam STT → Azure OpenAI GPT-4o → Sarvam TTS → Browser speaker

Supports all major Indian languages via Sarvam AI:
  Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, Malayalam, Punjabi, Odia

The system prompt locks the bot to OnionSure topics so illiterate farmers get
accurate, relevant help in their own language.
"""

import asyncio
import os
import logging
from typing import Optional

from dotenv import load_dotenv
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import EndFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.azure.llm import AzureLLMService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transports.network.websocket_server import (
    WebsocketServerParams,
    WebsocketServerTransport,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("onionsure-bot")

# ── OnionSure system prompt — project-specific, multilingual aware ──────────
ONIONSURE_SYSTEM_PROMPT = """
You are the OnionSure AI Assistant — a helpful voice assistant for the OnionSure 
onion quality inspection platform. You ONLY answer questions related to OnionSure 
and onion quality grading. 

YOUR ROLE:
- Help farmers understand their quality grades (Grade A, URS, Rejected)
- Explain what each grade means for their income and pricing
- Guide users through submitting lots, checking certificates, and raising disputes
- Explain the AI inspection process (camera, IoT sensors, gas readings)
- Help with navigation on the platform
- Answer questions about the quality score (0-100) and what it means

LANGUAGES: 
- Detect the user's language automatically and respond in the SAME language
- Supported: Hindi (हिंदी), Marathi (मराठी), Gujarati (ગુજરાતી), Tamil (தமிழ்), 
  Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Bengali (বাংলা), Malayalam (മലയാളം), 
  Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), and English
- Use simple, clear language suitable for farmers who may not be tech-savvy
- Avoid jargon; use local terms when helpful (e.g., "मंडी", "किसान", "प्याज")

PLATFORM KNOWLEDGE:
1. Grade A: Quality score ≥ 85 — best quality, highest price
2. URS (Usable Reduced Standard): Score 65-84 — acceptable, slightly lower price  
3. Rejected: Score < 65 — does not meet standards
4. Quality Score: 0-100 based on Vision (40%) + Gas sensors (35%) + Environment (25%)
5. Central Lot ID: Unique ID for each onion batch, e.g. ON-2026-00421
6. Certificate: Digital quality certificate with QR code for verification
7. Dispute: Farmers can challenge grades they disagree with within 7 days
8. Pre-Check: Farmers can scan onions at home before taking to procurement center
9. FPO (Farmer Producer Organization): Groups of farmers working together
10. Procurement Center: Where official AI grading happens

BOUNDARIES:
- ONLY answer OnionSure and onion quality related questions
- For unrelated questions say: "मैं केवल OnionSure और प्याज की गुणवत्ता के बारे में 
  मदद कर सकता हूँ। / I can only help with OnionSure and onion quality topics."
- Keep responses concise (2-4 sentences for voice)
- Be encouraging and supportive to farmers

Start every new conversation by greeting the user and asking how you can help with 
their onion quality queries today.
"""


async def run_bot(websocket_client, stream_sid: Optional[str] = None):
    """
    Create and run the Pipecat pipeline for one connected client.
    Called once per WebSocket connection.
    """

    # ── Transport: WebSocket (browser ↔ bot) ────────────────────────────────
    transport = WebsocketServerTransport(
        websocket=websocket_client,
        params=WebsocketServerParams(
            audio_out_enabled=True,
            add_wav_header=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
        ),
    )

    # ── STT: Sarvam (Indic languages) ───────────────────────────────────────
    stt = SarvamSTTService(
        api_key=os.environ["SARVAM_API_KEY"],
        model="saarika:v2",           # Best Indic STT model
        language_code="unknown",      # Auto-detect language
    )

    # ── LLM: Azure OpenAI GPT-4o ────────────────────────────────────────────
    llm = AzureLLMService(
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        model=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    )

    # ── TTS: Sarvam (natural Indic voice) ───────────────────────────────────
    tts = SarvamTTSService(
        api_key=os.environ["SARVAM_API_KEY"],
        model="bulbul:v2",            # Multi-speaker, high quality
        target_language_code="hi-IN", # Default Hindi; auto-switches per conversation
        speaker="anushka",            # Friendly female voice
    )

    # ── Conversation context with system prompt ──────────────────────────────
    messages = [
        {
            "role": "system",
            "content": ONIONSURE_SYSTEM_PROMPT,
        }
    ]
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # ── Pipeline ─────────────────────────────────────────────────────────────
    pipeline = Pipeline(
        [
            transport.input(),           # mic audio from browser
            stt,                         # speech → text (Indic)
            context_aggregator.user(),   # accumulate user turn
            llm,                         # GPT-4o response
            tts,                         # text → speech (Indic)
            transport.output(),          # audio to browser
            context_aggregator.assistant(), # accumulate assistant turn
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,     # farmer can interrupt mid-sentence
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # ── Initial greeting ─────────────────────────────────────────────────────
    @transport.event_handler("on_client_connected")
    async def on_connected(transport, client):
        logger.info(f"Client connected: {client}")
        await task.queue_frames([
            context_aggregator.user().get_context_frame(),
        ])
        # Trigger a greeting via LLM
        context.add_message({
            "role": "user",
            "content": "Hello, greet me and ask how you can help with my onion quality queries.",
        })
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(transport, client):
        logger.info(f"Client disconnected: {client}")
        await task.queue_frames([EndFrame()])

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
