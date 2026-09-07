# OnionSure Multilingual AI Chatbot

Voice + text chatbot for illiterate and semi-literate farmers.
Built with **Pipecat + Sarvam AI (STT/TTS) + Azure OpenAI (GPT-4o)**.

## Languages Supported
Hindi · Marathi · Gujarati · Tamil · Telugu · Kannada · Bengali · Malayalam · Punjabi · Odia · English

## Architecture
```
Browser mic → WebSocket → Sarvam STT → Azure OpenAI GPT-4o → Sarvam TTS → Browser speaker
Browser text → POST /api/chat → Azure OpenAI → JSON reply
```

## Setup

### 1. Python environment
```bash
cd onionsure/chatbot
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment variables
```bash
cp .env.example .env
# Edit .env and fill in your keys
```

Required keys:
- `SARVAM_API_KEY` — Get from https://dashboard.sarvam.ai
- `AZURE_OPENAI_API_KEY` — Azure OpenAI resource key
- `AZURE_OPENAI_ENDPOINT` — e.g. `https://your-resource.openai.azure.com`
- `AZURE_OPENAI_DEPLOYMENT` — Your GPT-4o deployment name

### 3. Run the bot server
```bash
uvicorn server:app --host 0.0.0.0 --port 8765 --reload
```

Server runs at: `http://localhost:8765`
- Voice WebSocket: `ws://localhost:8765/ws/voice`
- Text API: `POST http://localhost:8765/api/chat`
- Health: `GET http://localhost:8765/health`

## Frontend Integration
The `ChatWidget` React component is at:
`onionsure/web/src/components/ChatWidget.tsx`

It is automatically injected in:
- `/farmer/dashboard` — Farmer portal
- `/farmer/inspections` — My Lots page
- `/farmer/report` — Inspection report
- `/farmer/dispute` — Raise dispute
- `/fpo/dashboard` — FPO portal
- `/buyer/dashboard` — Buyer portal

## What the bot answers
- Grade explanations (Grade A, URS, Rejected)
- Quality score meaning
- How to submit a lot
- How to read a certificate
- How to raise a dispute
- Navigation help
- Pre-Check / AI inspection process

The bot ONLY answers OnionSure-related questions.
Off-topic questions are politely declined.
