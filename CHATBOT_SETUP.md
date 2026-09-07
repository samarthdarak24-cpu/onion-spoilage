# OnionSure Multilingual AI Chatbot — Setup Guide

## What Was Built

A **voice + text AI chatbot** for illiterate/semi-literate farmers integrated into
the OnionSure platform. It uses:

- **Pipecat** — real-time voice AI pipeline orchestration
- **Sarvam AI** — Indic language STT (speech-to-text) + TTS (text-to-speech)
- **Azure OpenAI GPT-4o** — intelligent responses with OnionSure knowledge
- **React ChatWidget** — floating button widget matching OnionSure's green UI

## Languages Supported
Hindi · Marathi · Gujarati · Tamil · Telugu · Kannada · Bengali · Malayalam · Punjabi · Odia · English

## Pages With Chatbot
The widget appears automatically for:
- `/farmer/dashboard` — Farmer portal
- `/farmer/inspections` — My Lots
- `/farmer/report` — Inspection report  
- `/farmer/certificates` — Certificates
- `/farmer/dispute` — Raise dispute
- `/fpo/dashboard` — FPO portal
- `/buyer/dashboard` — Buyer portal

**Does NOT appear** on: admin, procurement officer, home/marketing pages

## What The Bot Answers
- Grade A / URS / Rejected — meanings and implications
- How to submit a lot and get a Central Lot ID
- How to read a quality certificate and score
- How to raise a dispute
- Pre-Check / AI inspection process explanation
- Navigation help within the platform

The bot **refuses** to answer off-topic questions.

---

## Quick Start

### Step 1: Get API Keys
1. **Sarvam AI**: Register at https://dashboard.sarvam.ai → get API key
2. **Azure OpenAI**: Create resource in Azure portal → deploy GPT-4o → get key + endpoint

### Step 2: Configure chatbot server
```bash
cd onionsure/chatbot
cp .env.example .env
# Edit .env with your keys
```

### Step 3: Run chatbot server (Python)
```bash
# Create virtualenv
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8765 --reload
```

Server runs at: **http://localhost:8765**
- Text API: `POST /api/chat`
- Voice WebSocket: `ws://localhost:8765/ws/voice`
- Health check: `GET /health`

### Step 4: Configure frontend
```bash
cd onionsure/web
cp .env.example .env
# VITE_BOT_URL=http://localhost:8765 (already default)
```

### Step 5: Run frontend (already running)
```bash
cd onionsure/web
npm run dev    # http://localhost:3000
```

### Step 6: Open any farmer page
Navigate to `/farmer/dashboard` — the green chat button appears bottom-right.

---

## Docker (Alternative)
```bash
cd onionsure/chatbot
cp .env.example .env  # fill keys
docker-compose up -d
```

---

## Architecture Diagram
```
Farmer Browser
    │
    ├─── Text ──→ POST /api/chat ─→ Azure OpenAI GPT-4o ─→ JSON reply
    │
    └─── Voice ─→ WS /ws/voice ──→ Pipecat Pipeline:
                                    Mic Audio
                                       ↓
                                   Sarvam STT (Indic)
                                       ↓
                                   Azure OpenAI GPT-4o
                                       ↓
                                   Sarvam TTS (Indic)
                                       ↓
                                   Speaker Audio
```

## Files Created
```
onionsure/chatbot/
├── bot.py           ← Pipecat voice pipeline
├── server.py        ← FastAPI WebSocket + text API server
├── requirements.txt ← Python dependencies
├── .env.example     ← Environment variables template
├── Dockerfile       ← Container build
├── docker-compose.yml
└── README.md

onionsure/web/src/components/
└── ChatWidget.tsx   ← React floating chat widget

onionsure/web/
├── .env.example     ← VITE_BOT_URL configuration
└── vite.config.ts   ← (updated)

onionsure/web/src/components/
└── Layout.tsx       ← (updated — injects ChatWidget for farmer/fpo/buyer)
```
