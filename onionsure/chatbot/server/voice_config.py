"""Sarvam STT/TTS language + voice configuration for OnionSure.

Supports 11 Indic languages + Indian English via Sarvam AI.
Override per-language voice via TTS_VOICE_<LANG_CODE> env vars.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from pipecat.transcriptions.language import Language


@dataclass(frozen=True)
class VoiceConfig:
    language_code: str
    language_name: str
    stt_language: Language
    tts_voice: str


VOICE_MAP: dict[str, VoiceConfig] = {
    "en": VoiceConfig("en", "English",   Language.EN_IN, "shubh"),
    "hi": VoiceConfig("hi", "Hindi",     Language.HI_IN, "shubh"),
    "mr": VoiceConfig("mr", "Marathi",   Language.MR_IN, "shubh"),
    "gu": VoiceConfig("gu", "Gujarati",  Language.GU_IN, "shubh"),
    "ta": VoiceConfig("ta", "Tamil",     Language.TA_IN, "shubh"),
    "te": VoiceConfig("te", "Telugu",    Language.TE_IN, "shubh"),
    "kn": VoiceConfig("kn", "Kannada",   Language.KN_IN, "shubh"),
    "bn": VoiceConfig("bn", "Bengali",   Language.BN_IN, "shubh"),
    "ml": VoiceConfig("ml", "Malayalam", Language.ML_IN, "shubh"),
    "pa": VoiceConfig("pa", "Punjabi",   Language.PA_IN, "shubh"),
    "or": VoiceConfig("or", "Odia",      Language.OR_IN, "shubh"),
}


def get_voice_config(language_code: str) -> VoiceConfig:
    cfg = VOICE_MAP.get(language_code, VOICE_MAP["en"])
    env_voice = os.environ.get(f"TTS_VOICE_{cfg.language_code.upper()}")
    if env_voice:
        cfg = VoiceConfig(
            language_code=cfg.language_code,
            language_name=cfg.language_name,
            stt_language=cfg.stt_language,
            tts_voice=env_voice,
        )
    return cfg


def supported_languages() -> list[str]:
    return list(VOICE_MAP.keys())
