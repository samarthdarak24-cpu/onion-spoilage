"""OnionSure Pipecat voice pipeline.

Adapts the pipecat-sarvam-azure-starter architecture for the OnionSure
multilingual farmer support use case.

Pipeline per WebSocket connection:
  Browser mic (PCM) → Sarvam STT → Azure OpenAI GPT-4o → Sarvam TTS → Browser speaker
"""

from __future__ import annotations

import asyncio
import os
from typing import List, Optional

import httpx
from loguru import logger
from openai import AsyncAzureOpenAI

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    LLMRunFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.turns.user_mute import AlwaysUserMuteStrategy
from pipecat.turns.user_start import ExternalUserTurnStartStrategy
from pipecat.turns.user_stop import ExternalUserTurnStopStrategy
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.services.azure.llm import AzureLLMService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

from server.system_prompts import build_opening_message, build_prompt
from server.voice_config import get_voice_config

# ── Resilient Azure LLM with timeouts + retries ──────────────────────────────

LLM_REQUEST_TIMEOUT_S = float(os.environ.get("LLM_REQUEST_TIMEOUT_S", "12.0"))
LLM_CONNECT_TIMEOUT_S = float(os.environ.get("LLM_CONNECT_TIMEOUT_S", "3.0"))
LLM_MAX_RETRIES = int(os.environ.get("LLM_MAX_RETRIES", "4"))


class ResilientAzureLLMService(AzureLLMService):
    def create_client(self, api_key=None, base_url=None, **kwargs):
        return AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=self._endpoint,
            api_version=self._api_version,
            timeout=httpx.Timeout(LLM_REQUEST_TIMEOUT_S, connect=LLM_CONNECT_TIMEOUT_S),
            max_retries=LLM_MAX_RETRIES,
        )


# ── Main bot runner ───────────────────────────────────────────────────────────

async def run_bot(
    websocket,
    session_context: Optional[dict] = None,
    initial_messages: Optional[List[dict]] = None,
) -> None:
    """
    Build and run one Pipecat pipeline for a single WebSocket client.
    Called once per /ws connection from server/main.py.
    """
    ctx = session_context or {}
    language_code = ctx.get("language_code", "hi")  # default Hindi
    voice = get_voice_config(language_code)

    logger.info(
        f"[bot] Starting pipeline — lang={language_code} ({voice.language_name}) "
        f"voice={voice.tts_voice} session={ctx.get('session_id', 'unknown')}"
    )

    # ── Transport ─────────────────────────────────────────────────────────────
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_audio_passthrough=True,
            serializer=ProtobufFrameSerializer(),
        ),
    )

    # ── Sarvam STT ───────────────────────────────────────────────────────────
    stt = SarvamSTTService(
        api_key=os.environ["SARVAM_API_KEY"],
        language=voice.stt_language,
        model=os.environ.get("SARVAM_STT_MODEL", "saaras:v2"),
    )

    # ── Azure OpenAI LLM ──────────────────────────────────────────────────────
    # Support both AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY env var names
    azure_api_key = os.environ.get("AZURE_OPENAI_API_KEY") or os.environ["AZURE_OPENAI_KEY"]
    llm = ResilientAzureLLMService(
        api_key=azure_api_key,
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        model=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    )

    # ── Sarvam TTS ───────────────────────────────────────────────────────────
    tts = SarvamTTSService(
        api_key=os.environ["SARVAM_API_KEY"],
        model=os.environ.get("SARVAM_TTS_MODEL", "bulbul:v2"),
        language=voice.stt_language,
        speaker=voice.tts_voice,
    )

    # ── Context / memory ──────────────────────────────────────────────────────
    system_prompt = build_prompt({**ctx, "language_name": voice.language_name})
    messages = [{"role": "system", "content": system_prompt}]

    if initial_messages:
        messages.extend(initial_messages)
    else:
        # Kick off with an opening greeting
        messages.append({
            "role": "user",
            "content": build_opening_message({**ctx, "language_name": voice.language_name}),
        })

    context = LLMContext(messages=messages)
    context_aggregator = llm.create_context_aggregator(context)

    # ── Pipeline ──────────────────────────────────────────────────────────────
    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
        ),
    )

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
