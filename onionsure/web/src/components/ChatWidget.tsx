/**
 * OnionSure Multilingual AI Chat Widget
 * ========================================
 * Floating voice + text assistant for farmers and FPO users.
 * Supports Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada,
 * Bengali, Malayalam, Punjabi, Odia, and English.
 *
 * Voice mode  → WebSocket to Pipecat/Sarvam bot at ws://localhost:8765/ws/voice
 * Text mode   → POST to http://localhost:8765/api/chat
 */

import React, {
  useState, useRef, useEffect, useCallback, useId,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX,
  Globe, ChevronDown, Loader2, User, Leaf,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

// ── Config ──────────────────────────────────────────────────────────────────
const BOT_BASE = (import.meta as any).env?.VITE_BOT_URL || 'http://localhost:8765';
const BOT_CHAT = BOT_BASE + '/api/chat';

// ── Language options ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', native: 'Auto' },
  { code: 'hi',   label: 'Hindi',      native: 'हिंदी' },
  { code: 'mr',   label: 'Marathi',    native: 'मराठी' },
  { code: 'gu',   label: 'Gujarati',   native: 'ગુજરાતી' },
  { code: 'ta',   label: 'Tamil',      native: 'தமிழ்' },
  { code: 'te',   label: 'Telugu',     native: 'తెలుగు' },
  { code: 'kn',   label: 'Kannada',    native: 'ಕನ್ನಡ' },
  { code: 'bn',   label: 'Bengali',    native: 'বাংলা' },
  { code: 'ml',   label: 'Malayalam',  native: 'മലയാളം' },
  { code: 'pa',   label: 'Punjabi',    native: 'ਪੰਜਾਬੀ' },
  { code: 'or',   label: 'Odia',       native: 'ଓଡ଼ିଆ' },
  { code: 'en',   label: 'English',    native: 'English' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

// ── Quick prompts farmers frequently ask ────────────────────────────────────
const QUICK_PROMPTS: Record<LangCode | 'auto', string[]> = {
  auto: [
    'What does Grade A mean?',
    'How to raise a dispute?',
    'What is my quality score?',
    'How to submit my lot?',
  ],
  hi: [
    'Grade A का क्या मतलब है?',
    'मेरा लॉट कैसे सबमिट करें?',
    'विवाद कैसे उठाएं?',
    'गुणवत्ता स्कोर क्या है?',
  ],
  mr: [
    'Grade A म्हणजे काय?',
    'माझा लॉट कसा सबमिट करायचा?',
    'तक्रार कशी नोंदवायची?',
    'प्याज तपासणी कशी होते?',
  ],
  gu: [
    'Grade A શું છે?',
    'મારો lot કેવી રીતે submit કરવો?',
    'ફરિયાદ કેવી રીતે કરવી?',
    'ગુણવત્તા સ્કોર શું છે?',
  ],
  ta: [
    'தர A என்றால் என்ன?',
    'என் லாட்டை எப்படி சமர்ப்பிப்பது?',
    'தகராறு எப்படி எழுப்புவது?',
    'தரச்சான்று என்றால் என்ன?',
  ],
  te: [
    'Grade A అంటే ఏమిటి?',
    'నా లాట్ ఎలా సమర్పించాలి?',
    'వివాదం ఎలా లేవనెత్తాలి?',
    'నాణ్యత స్కోర్ అంటే ఏమిటి?',
  ],
  kn: [
    'Grade A ಎಂದರೇನು?',
    'ನನ್ನ ಲಾಟ್ ಅನ್ನು ಹೇಗೆ ಸಲ್ಲಿಸಬೇಕು?',
    'ವಿವಾದ ಹೇಗೆ ಎತ್ತಬೇಕು?',
    'ಗುಣಮಟ್ಟ ಸ್ಕೋರ್ ಎಂದರೇನು?',
  ],
  bn: [
    'গ্রেড A মানে কী?',
    'আমার লট কীভাবে জমা দেব?',
    'বিতর্ক কীভাবে উত্থাপন করব?',
    'গুণমান স্কোর কী?',
  ],
  ml: [
    'Grade A എന്നാൽ എന്ത്?',
    'എന്റെ ലോട്ട് എങ്ങനെ സമർപ്പിക്കാം?',
    'തർക്കം എങ്ങനെ ഉന്നയിക്കാം?',
    'ഗുണനിലവാര സ്കോർ എന്ത്?',
  ],
  pa: [
    'Grade A ਦਾ ਕੀ ਮਤਲਬ ਹੈ?',
    'ਆਪਣਾ ਲਾਟ ਕਿਵੇਂ ਜਮ੍ਹਾਂ ਕਰਾਉਣਾ ਹੈ?',
    'ਵਿਵਾਦ ਕਿਵੇਂ ਚੁੱਕਣਾ ਹੈ?',
    'ਗੁਣਵੱਤਾ ਸਕੋਰ ਕੀ ਹੈ?',
  ],
  or: [
    'Grade A ର ଅର୍ଥ କ\'ଣ?',
    'ମୋ ଲଟ୍ ଜମା ଦେବ କ\'ଣ?',
    'ବିବାଦ ଉଠାଇବ କ\'ଣ?',
    'ଗୁଣ ସ୍କୋର୍ ଅର୍ଥ?',
  ],
  en: [
    'What does Grade A mean?',
    'How to submit my lot?',
    'How to raise a dispute?',
    'What is a quality certificate?',
  ],
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  ts: Date;
}

type Mode = 'text' | 'voice';
type VoiceState = 'idle' | 'connecting' | 'connected' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

const BOT_AVATAR = (
  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1B4332] to-[#40C074] text-white shadow-sm">
    <Leaf size={13} strokeWidth={2.5} />
  </div>
);

// ── Main widget ──────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth();
  const convId = useId();
  const [open, setOpen]               = useState(false);
  const [mode, setMode]               = useState<Mode>('text');
  const [lang, setLang]               = useState<LangCode>('auto');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [muted, setMuted]             = useState(false);

  const wsRef       = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];
  const quickPrompts = QUICK_PROMPTS[lang] ?? QUICK_PROMPTS.en;

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initial greeting when widget opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const name = user?.name ? user.name.split(' ')[0] : null;
      const greeting = name
        ? `नमस्ते ${name}! मैं OnionSure का AI सहायक हूँ। 🌱\nHello ${name}! I'm the OnionSure AI assistant.\n\nHow can I help you with your onion quality queries today?\nआज आपकी प्याज की गुणवत्ता के बारे में कैसे मदद करूं?`
        : 'नमस्ते! मैं OnionSure का AI सहायक हूँ। 🌱\nHello! I\'m the OnionSure AI assistant.\n\nHow can I help you with your onion quality queries today?\nआज आपकी प्याज की गुणवत्ता के बारे में कैसे मदद करूं?';
      setMessages([{
        id: uid(),
        role: 'bot',
        text: greeting,
        ts: new Date(),
      }]);
    }
  }, [open, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Text chat send ─────────────────────────────────────────────────────────
  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: uid(), role: 'user', text: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(BOT_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          language: lang,
          conversation_id: convId,
        }),
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();

      setMessages(prev => [...prev, {
        id: uid(),
        role: 'bot',
        text: data.reply,
        ts: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: uid(),
        role: 'bot',
        text: '⚠️ Could not reach the assistant. Please check your connection.\nसहायक से कनेक्ट नहीं हो सका। कृपया अपना कनेक्शन जांचें।',
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, lang, convId]);

  // ── Voice connection ───────────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    if (voiceState === 'connected') {
      // Disconnect
      wsRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setVoiceState('idle');
      return;
    }

    setVoiceState('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Build WebSocket URL with language + role context for personalized pipeline
      const effectiveLang = lang === 'auto' ? 'hi' : lang;
      const botWsBase = BOT_BASE.replace(/^http/, 'ws') + '/ws/voice';
      const wsUrl = `${botWsBase}?lang=${effectiveLang}&role=${user?.role || 'farmer'}&name=${encodeURIComponent(user?.name || 'Kisan')}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setVoiceState('connected');
        setMessages(prev => [...prev, {
          id: uid(),
          role: 'bot',
          text: '🎙️ Voice connected! Start speaking in your language.\nवॉयस कनेक्ट हो गया! अपनी भाषा में बोलें।',
          ts: new Date(),
        }]);

        // Stream mic audio to server
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(512, 1, 1);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !muted) {
            const buf = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(buf.length);
            for (let i = 0; i < buf.length; i++) {
              pcm[i] = Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767)));
            }
            ws.send(pcm.buffer);
          }
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        // Receive audio back from bot
        if (event.data instanceof ArrayBuffer) {
          const audioCtx = new AudioContext();
          audioCtx.decodeAudioData(event.data.slice(0)).then(decoded => {
            const src = audioCtx.createBufferSource();
            src.buffer = decoded;
            src.connect(audioCtx.destination);
            src.start();
          }).catch(() => {});
        } else {
          // Text transcript from bot
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === 'transcript' && msg.text) {
              setMessages(prev => [...prev, {
                id: uid(),
                role: msg.role === 'user' ? 'user' : 'bot',
                text: msg.text,
                ts: new Date(),
              }]);
            }
          } catch {}
        }
      };

      ws.onerror = () => {
        setVoiceState('error');
        setMessages(prev => [...prev, {
          id: uid(),
          role: 'bot',
          text: '⚠️ Voice service unavailable. Using text mode.\nवॉयस सेवा उपलब्ध नहीं। टेक्स्ट मोड उपयोग करें।',
          ts: new Date(),
        }]);
        setMode('text');
      };

      ws.onclose = () => {
        setVoiceState('idle');
        stream.getTracks().forEach(t => t.stop());
      };
    } catch (err: any) {
      setVoiceState('error');
      setMessages(prev => [...prev, {
        id: uid(),
        role: 'bot',
        text: err.name === 'NotAllowedError'
          ? '🎙️ Microphone access denied. Please allow microphone and try again.\nमाइक्रोफ़ोन अनुमति नहीं मिली। अनुमति दें और फिर कोशिश करें।'
          : '⚠️ Voice mode unavailable. Please use text mode.\nवॉयस मोड उपलब्ध नहीं। टेक्स्ट मोड उपयोग करें।',
        ts: new Date(),
      }]);
      setMode('text');
    }
  }, [voiceState, muted, lang, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI chat assistant"
        className="fixed bottom-6 right-6 z-[100] grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_8px_28px_rgba(27,67,50,0.45)] transition-colors"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #40C074 100%)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <X size={22} />
              </motion.span>
            : <motion.span key="chat" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.18 }}>
                <MessageCircle size={22} />
              </motion.span>
          }
        </AnimatePresence>

        {/* Unread pulse — only when closed */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fresh text-[9px] font-black text-white">
            AI
          </span>
        )}
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-24 right-6 z-[99] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_48px_rgba(0,0,0,0.18)]"
            style={{ width: 360, maxHeight: '80vh', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D5040 100%)' }}>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 border border-white/20">
                <Leaf size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black leading-tight">OnionSure AI</p>
                <p className="text-[10.5px] text-white/65 font-medium">
                  {voiceState === 'connected' ? '🎙️ Voice Active' : 'Ask in your language • किसी भी भाषा में पूछें'}
                </p>
              </div>

              {/* Language picker */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(v => !v)}
                  className="flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
                >
                  <Globe size={12} /> {currentLang.native} <ChevronDown size={11} />
                </button>
                <AnimatePresence>
                  {showLangMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-lg"
                    >
                      <div className="max-h-56 overflow-y-auto py-1">
                        {LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-[12px] transition hover:bg-green-50 ${lang === l.code ? 'bg-green-50 font-bold text-[#1B4332]' : 'text-gray-700'}`}
                          >
                            <span>{l.native}</span>
                            <span className="text-[10px] text-gray-400">{l.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Mode toggle (text / voice) ── */}
            <div className="flex shrink-0 border-b border-gray-100">
              {(['text', 'voice'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); if (m === 'voice') startVoice(); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition border-b-2 ${mode === m ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  {m === 'text' ? <><MessageCircle size={13} /> Text</> : <><Mic size={13} /> Voice</>}
                </button>
              ))}
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 200 }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'bot' ? BOT_AVATAR : (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500">
                      <User size={13} />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-[#1B4332] text-white'
                      : 'rounded-bl-sm bg-gray-50 text-gray-800 border border-gray-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-white/50' : 'text-gray-400'}`}>
                      {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2">
                  {BOT_AVATAR}
                  <div className="rounded-2xl rounded-bl-sm bg-gray-50 border border-gray-100 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Quick prompts ── */}
            {messages.length <= 1 && (
              <div className="shrink-0 px-3 pb-2">
                <p className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">Quick questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendText(q)}
                      className="rounded-full border border-[#1B4332]/20 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-[#1B4332] transition hover:bg-green-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Voice status bar ── */}
            {mode === 'voice' && (
              <div className={`shrink-0 px-4 py-2 flex items-center justify-between text-[12px] font-semibold ${
                voiceState === 'connected' ? 'bg-green-50 text-green-800' :
                voiceState === 'connecting' ? 'bg-amber-50 text-amber-700' :
                voiceState === 'error' ? 'bg-red-50 text-red-700' :
                'bg-gray-50 text-gray-500'
              }`}>
                <span className="flex items-center gap-1.5">
                  {voiceState === 'connecting' && <Loader2 size={13} className="animate-spin" />}
                  {voiceState === 'connected' && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                  {voiceState === 'connected' ? 'Voice Active — Speak now' :
                   voiceState === 'connecting' ? 'Connecting…' :
                   voiceState === 'error' ? 'Voice unavailable' : 'Click mic to start'}
                </span>
                {voiceState === 'connected' && (
                  <button onClick={() => setMuted(v => !v)}
                    className="rounded-lg p-1 hover:bg-green-100 transition">
                    {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                )}
              </div>
            )}

            {/* ── Input area ── */}
            <div className="shrink-0 border-t border-gray-100 p-3">
              {mode === 'text' ? (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question… / अपना सवाल लिखें…"
                    className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none transition focus:border-[#1B4332] focus:bg-white placeholder:text-gray-400"
                    style={{ maxHeight: 100 }}
                  />
                  <button
                    onClick={() => sendText(input)}
                    disabled={!input.trim() || loading}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #40C074)' }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startVoice}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold transition ${
                    voiceState === 'connected'
                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      : 'text-white'
                  }`}
                  style={voiceState !== 'connected' ? { background: 'linear-gradient(135deg, #1B4332, #40C074)' } : {}}
                >
                  {voiceState === 'connecting' ? (
                    <><Loader2 size={16} className="animate-spin" /> Connecting…</>
                  ) : voiceState === 'connected' ? (
                    <><MicOff size={16} /> Stop Voice</>
                  ) : (
                    <><Mic size={16} /> Start Voice Chat</>
                  )}
                </button>
              )}
              <p className="mt-2 text-center text-[10px] text-gray-400">
                Powered by Sarvam AI + Azure OpenAI · OnionSure topics only
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close language menu */}
      {showLangMenu && (
        <div className="fixed inset-0 z-[98]" onClick={() => setShowLangMenu(false)} />
      )}
    </>
  );
}
