"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Smile, Mic, Send, X, Search, Trash2, Pause, Play, Square,
  FileText, Image as ImageIcon, Camera, User, BarChart3, Calendar,
  type LucideIcon,
} from "lucide-react";
import { uploadFile } from "@/lib/upload-client";
import type { MessageType } from "@/lib/services/messaging";

/* ─── types ───────────────────────────────────────────────────────── */

type SendFn = (body: string, opts?: { type: MessageType; attachmentUrl?: string; metadata?: Record<string, unknown> }) => void;
type ModalKey = "document" | "media" | "camera" | "audio" | "contact" | "poll" | "event";

const ATTACH_OPTIONS: { icon: LucideIcon; label: string; color: string; key: ModalKey }[] = [
  { icon: FileText, label: "Document", color: "#6366f1", key: "document" },
  { icon: ImageIcon, label: "Photos & videos", color: "#22c55e", key: "media" },
  { icon: Camera, label: "Camera", color: "#ec4899", key: "camera" },
  { icon: Mic, label: "Audio", color: "#f97316", key: "audio" },
  { icon: User, label: "Contact", color: "#06b6d4", key: "contact" },
  { icon: BarChart3, label: "Poll", color: "#eab308", key: "poll" },
  { icon: Calendar, label: "Event", color: "#a855f7", key: "event" },
];

/* ─── emoji data (lightweight — most common; loads fast) ──────────── */

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"] },
  { label: "Gestures", emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"] },
  { label: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟"] },
  { label: "Objects", emojis: ["🏗️","🏠","🏢","🏗️","🧱","🪵","🔨","⚒️","🛠️","🔧","🪛","📐","📏","📋","📊","📈","💼","🪪","📁","📂","📎","✏️","🖊️","📝","💰","💵","💳","🧾","📅","📆","⏰","🔔","📞","💻","🖥️","📱"] },
  { label: "Nature", emojis: ["🌍","🌎","🌏","🌱","🌲","🌳","🌴","🌵","🌺","🌻","🌹","🌷","🌸","💐","🍀","🍁","🍂","🍃","🌾","☀️","🌤️","⛅","🌥️","🌦️","🌧️","⛈️","🌩️","🌪️","🌈","⭐","🌟","💫","✨","☁️","🌊"] },
  { label: "Flags", emojis: ["🇳🇬","🏳️","🏴","🚩","🏁","🇬🇧","🇺🇸","🇬🇭","🇿🇦","🇰🇪","🇪🇬","🇨🇲","🇹🇿","🇪🇹","🇨🇩","🇸🇳","🇨🇮","🇲🇦","🇩🇿","🇦🇴"] },
];

/* ─── Emoji picker ────────────────────────────────────────────────── */

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(query))
    : EMOJI_CATEGORIES[cat].emojis;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 mb-2 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xl overflow-hidden">
      {/* category tabs */}
      <div className="flex items-center gap-0.5 px-2 py-2 border-b border-[#f0f0f0] dark:border-white/10 overflow-x-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={c.label} onClick={() => { setCat(i); setQuery(""); }} title={c.label}
            className={`px-2 py-1 rounded-md text-[14px] flex-shrink-0 transition-colors ${cat === i && !query ? "bg-[#ffd716]/15" : "hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>
            {c.emojis[0]}
          </button>
        ))}
      </div>
      {/* search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search emoji"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-[#f6f6f6] dark:bg-white/5 text-[12px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors" />
        </div>
      </div>
      {/* category label */}
      {!query && <p className="px-3 pb-1 text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider">{EMOJI_CATEGORIES[cat].label}</p>}
      {/* grid */}
      <div ref={ref} className="h-[200px] overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-8 gap-0.5">
          {filtered.map((e, i) => (
            <button key={`${e}-${i}`} onClick={() => onPick(e)} className="w-8 h-8 flex items-center justify-center rounded-md text-[20px] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">{e}</button>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-[12px] text-[#9a9a9a] py-6">No emoji found</p>}
      </div>
    </motion.div>
  );
}

/* ─── Inline voice recorder bar ───────────────────────────────────── */

function WaveformBars({ active, analyserRef }: { active: boolean; analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(Array(32).fill(3));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width, h = canvas.height;
    const barCount = 32;
    const barW = 2, gap = 2;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const analyser = analyserRef.current;
      if (active && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / barCount);
        for (let i = 0; i < barCount; i++) {
          const val = data[i * step] / 255;
          barsRef.current[i] += (val * (h - 4) + 3 - barsRef.current[i]) * 0.35;
        }
      } else {
        for (let i = 0; i < barCount; i++) barsRef.current[i] += (3 - barsRef.current[i]) * 0.15;
      }
      const isDark = document.documentElement.classList.contains("dark");
      const totalW = barCount * (barW + gap) - gap;
      const startX = (w - totalW) / 2;
      for (let i = 0; i < barCount; i++) {
        const bh = Math.max(2, barsRef.current[i]);
        const x = startX + i * (barW + gap);
        const y = (h - bh) / 2;
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.45)" : "rgba(100,100,100,0.5)";
        ctx.beginPath();
        ctx.roundRect(x, y, barW, bh, 1);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserRef]);

  return <canvas ref={canvasRef} width={200} height={28} className="flex-1 h-7" />;
}

function InlineRecorder({ onSend, onCancel }: { onSend: (blob: Blob, secs: number) => void; onCancel: () => void }) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [state, setState] = useState<"recording" | "paused">("recording");
  const [secs, setSecs] = useState(0);

  const startTimer = () => { timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000); };
  const stopTimer = () => { clearInterval(timerRef.current); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        // Audio analyser for waveform
        const actx = new AudioContext();
        const source = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); actx.close().catch(() => {}); };
        mediaRef.current = mr;
        mr.start(250);
        startTimer();
      })
      .catch(() => { toast.error("Microphone access denied"); onCancel(); });
    return () => { cancelled = true; stopTimer(); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pause() { mediaRef.current?.pause(); setState("paused"); stopTimer(); }
  function resume() { mediaRef.current?.resume(); setState("recording"); startTimer(); }
  function discard() { stopTimer(); mediaRef.current?.stop(); onCancel(); }

  function finish() {
    stopTimer();
    const mr = mediaRef.current;
    if (!mr) return;
    const currentSecs = secs;
    mr.onstop = () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      onSend(blob, currentSecs);
    };
    mr.stop();
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="flex items-center gap-2.5 p-3 border-t border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
      <div className="flex-1 flex items-center gap-2 rounded-full bg-[#e8e8e8] dark:bg-[#2a2a2a] pl-3 pr-2 py-2">
        <button onClick={discard} title="Delete recording" className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-white/60 dark:hover:bg-white/10 transition-all flex-shrink-0"><Trash2 size={17} /></button>

        {state === "paused" ? (
          <button onClick={resume} title="Continue recording" className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114] transition-colors flex-shrink-0"><Play size={16} className="ml-0.5" /></button>
        ) : (
          <button onClick={pause} title="Pause" className="w-8 h-8 rounded-full flex items-center justify-center text-[#1e1e1e] dark:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-all flex-shrink-0"><Pause size={16} /></button>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full transition-colors ${state === "recording" ? "bg-[#e5484d] animate-pulse" : "bg-[#22c55e]"}`} />
        </div>

        <WaveformBars active={state === "recording"} analyserRef={analyserRef} />

        <span className="text-[13px] font-semibold tabular-nums text-[#1e1e1e] dark:text-white flex-shrink-0 min-w-[36px] text-right">{fmt(secs)}</span>

        <button title="Mic" className="w-7 h-7 rounded-full flex items-center justify-center text-[#e5484d] flex-shrink-0"><Mic size={16} /></button>
      </div>

      <button onClick={finish} className="w-11 h-11 flex-shrink-0 rounded-full bg-[#ffd716] text-[#1e1e1e] flex items-center justify-center hover:bg-[#e6c114] hover:scale-105 transition-all shadow-md shadow-[#ffd716]/20 active:scale-95">
        <Send size={17} />
      </button>
    </motion.div>
  );
}

/* ─── Main chat input bar ─────────────────────────────────────────── */

export function ChatInputBar({ onSend, onOpenModal }: { onSend: SendFn; onOpenModal: (key: ModalKey) => void }) {
  const [input, setInput] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function sendText() {
    const body = input.trim();
    if (!body) return;
    onSend(body);
    setInput("");
    textRef.current?.focus();
  }

  function insertEmoji(e: string) {
    setInput((v) => v + e);
    textRef.current?.focus();
  }

  async function sendVoice(blob: Blob, secs: number) {
    setRecording(false);
    setUploading(true);
    try {
      const ext = blob.type.includes("webm") ? "webm" : "m4a";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
      const url = await uploadFile(file, "chat");
      onSend("", { type: "audio", attachmentUrl: url, metadata: { duration: secs, mimeType: blob.type } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  const hasText = input.trim().length > 0;

  /* ─ recording mode ─ */
  if (recording) {
    return (
      <AnimatePresence>
        <InlineRecorder onSend={sendVoice} onCancel={() => setRecording(false)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="px-3 py-2.5 border-t border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
      <div className="flex items-end gap-2">
        {/* + attach button */}
        <div className="relative flex-shrink-0 mb-0.5">
          <button type="button" onClick={() => { setAttachOpen((o) => !o); setEmojiOpen(false); }} aria-label="Attach"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${attachOpen ? "bg-[#ffd716] text-[#1e1e1e] rotate-45" : "text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#ececec] dark:hover:bg-white/10"}`}>
            <Plus size={20} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {attachOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setAttachOpen(false)} />
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  className="absolute bottom-full left-0 mb-2 z-40 w-56 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xl p-1.5">
                  {ATTACH_OPTIONS.map((o) => (
                    <button key={o.label} onClick={() => { setAttachOpen(false); onOpenModal(o.key); }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${o.color}1a`, color: o.color }}>
                        <o.icon size={15} />
                      </span>
                      {o.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* input bar */}
        <div className="flex-1 flex items-center gap-1.5 rounded-full border border-[#d4d4d4] dark:border-white/15 bg-[#f6f6f6] dark:bg-[#262626] px-3 min-h-[42px] transition-colors focus-within:border-[#ffd716]">
          {/* emoji */}
          <div className="relative flex-shrink-0">
            <button type="button" onClick={() => { setEmojiOpen((o) => !o); setAttachOpen(false); }} aria-label="Emoji"
              className={`flex items-center justify-center transition-colors ${emojiOpen ? "text-[#caa400]" : "text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white"}`}>
              <Smile size={22} />
            </button>
            <AnimatePresence>
              {emojiOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setEmojiOpen(false)} />
                  <EmojiPicker onPick={(e) => insertEmoji(e)} onClose={() => setEmojiOpen(false)} />
                </>
              )}
            </AnimatePresence>
          </div>

          {/* textarea */}
          <textarea
            ref={textRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            rows={1}
            placeholder="Type a message"
            className="flex-1 resize-none bg-transparent py-2 text-[14px] text-[#1e1e1e] dark:text-white placeholder:text-[#7a7a7a] dark:placeholder:text-white/40 focus:outline-none max-h-32 leading-relaxed"
          />
        </div>

        {/* send or mic */}
        {hasText || uploading ? (
          <button onClick={sendText} disabled={uploading} className="w-10 h-10 flex-shrink-0 rounded-full bg-[#ffd716] text-[#1e1e1e] flex items-center justify-center hover:bg-[#e6c114] hover:scale-105 transition-all active:scale-95 disabled:opacity-40 shadow-sm shadow-[#ffd716]/20">
            <Send size={16} />
          </button>
        ) : (
          <button onClick={() => setRecording(true)} title="Voice message" className="w-10 h-10 flex-shrink-0 rounded-full text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#ececec] dark:hover:bg-white/10 flex items-center justify-center transition-colors">
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
