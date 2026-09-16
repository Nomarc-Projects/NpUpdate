"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X, Search, Send, Loader2, Camera as CameraIcon, StopCircle,
  Mic, Square, Pause, Play, Plus, Trash2, MapPin, Clock,
  Calendar, type LucideIcon,
} from "lucide-react";
import { uploadFile } from "@/lib/upload-client";
import { getProfessionals } from "@/lib/services/directory";
import type { MessageType } from "@/lib/services/messaging";
import { r2Url } from "@/lib/r2-public";

/* ─── shared ──────────────────────────────────────────────────────── */

type SendFn = (body: string, opts: { type: MessageType; attachmentUrl?: string; metadata?: Record<string, unknown> }) => void;

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-2xl overflow-hidden">
        {children}
      </motion.div>
    </div>
  );
}

function ModalHeader({ title, icon: Icon, onClose }: { title: string; icon: LucideIcon; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
      <div className="flex items-center gap-2.5">
        <Icon size={18} className="text-[#caa400]" />
        <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{title}</h3>
      </div>
      <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

/* ─── 1. Document picker ──────────────────────────────────────────── */

export function DocumentPicker({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function pick(f: File) {
    const maxMB = 25;
    if (f.size > maxMB * 1024 * 1024) { toast.error(`File too large (max ${maxMB}MB)`); return; }
    setFile(f);
  }

  async function send() {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "chat");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      onSend("", { type: "document", attachmentUrl: url, metadata: { fileName: file.name, fileSize: file.size, fileType: ext } });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Send a document" icon={Send} onClose={onClose} />
      <div className="p-5 space-y-4">
        <input ref={ref} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {!file ? (
          <button onClick={() => ref.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors">
            <Plus size={24} className="text-[#9a9a9a]" />
            <span className="text-[13px] text-[#9a9a9a]">Choose a file</span>
            <span className="text-[11px] text-[#b3b3b3]">PDF, DOC, XLS, PPT, ZIP · max 25 MB</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f5f5] dark:bg-white/5">
            <div className="w-10 h-10 rounded-lg bg-[#6366f1]/15 text-[#6366f1] flex items-center justify-center text-[11px] font-bold uppercase">{file.name.split(".").pop()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{file.name}</p>
              <p className="text-[11px] text-[#9a9a9a]">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }} className="text-[#9a9a9a] hover:text-[#e5484d]"><X size={16} /></button>
          </div>
        )}
        <button onClick={send} disabled={!file || uploading} className="w-full py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : "Send document"}
        </button>
      </div>
    </Overlay>
  );
}

/* ─── 2. Photos & Videos picker ───────────────────────────────────── */

export function MediaPicker({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  function pick(f: File) {
    if (f.size > 25 * 1024 * 1024) { toast.error("File too large (max 25 MB)"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function send() {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "chat");
      const isVideo = file.type.startsWith("video/");
      onSend(caption, { type: isVideo ? "video" : "image", attachmentUrl: url, metadata: { fileName: file.name, fileSize: file.size, mimeType: file.type } });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Send photo or video" icon={CameraIcon} onClose={onClose} />
      <div className="p-5 space-y-4">
        <input ref={ref} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {!file ? (
          <button onClick={() => ref.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors">
            <Plus size={24} className="text-[#9a9a9a]" />
            <span className="text-[13px] text-[#9a9a9a]">Choose a photo or video</span>
            <span className="text-[11px] text-[#b3b3b3]">JPG, PNG, GIF, MP4, WebM · max 25 MB</span>
          </button>
        ) : (
          <div className="rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
            {file.type.startsWith("video/") ? (
              <video src={preview!} controls className="w-full max-h-56 object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview!} alt="Preview" className="w-full max-h-56 object-contain" />
            )}
          </div>
        )}
        {file && <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption…" className={inputClass} />}
        <button onClick={send} disabled={!file || uploading} className="w-full py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : "Send"}
        </button>
      </div>
    </Overlay>
  );
}

/* ─── 3. Camera capture ───────────────────────────────────────────── */

export function CameraCapture({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => { if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; } streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Camera access denied. Please allow camera in your browser settings."));
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      setPhoto(b);
      setPhotoUrl(URL.createObjectURL(b));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }, "image/jpeg", 0.92);
  }

  async function send() {
    if (!photo) return;
    setUploading(true);
    try {
      const file = new File([photo], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "chat");
      onSend("", { type: "image", attachmentUrl: url, metadata: { fileName: file.name, fileSize: file.size, mimeType: "image/jpeg", source: "camera" } });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Take a photo" icon={CameraIcon} onClose={onClose} />
      <div className="p-5 space-y-4">
        {error ? (
          <p className="text-center text-[13px] text-[#e5484d] py-8">{error}</p>
        ) : !photo ? (
          <>
            <div className="rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <button onClick={capture} className="w-full py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors flex items-center justify-center gap-2">
              <StopCircle size={16} /> Capture
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl!} alt="Captured" className="w-full max-h-56 object-contain" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPhoto(null); setPhotoUrl(null); /* re-open camera would need remount */ onClose(); }} className="flex-1 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors">Retake</button>
              <button onClick={send} disabled={uploading} className="flex-1 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send photo"}
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* ─── 4. Audio voice recorder ─────────────────────────────────────── */

export function VoiceRecorder({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle");
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function startTimer() { timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000); }
  function stopTimer() { clearInterval(timerRef.current); }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunksRef.current, { type: mr.mimeType });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        setState("done");
      };
      mediaRef.current = mr;
      mr.start(250);
      setState("recording");
      startTimer();
    } catch { setError("Microphone access denied."); }
  }

  function pause() { mediaRef.current?.pause(); setState("paused"); stopTimer(); }
  function resume() { mediaRef.current?.resume(); setState("recording"); startTimer(); }
  function stop() { mediaRef.current?.stop(); stopTimer(); }
  function discard() { setBlob(null); setAudioUrl(null); setSecs(0); setState("idle"); }

  async function send() {
    if (!blob) return;
    setUploading(true);
    try {
      const ext = blob.type.includes("webm") ? "webm" : "m4a";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
      const url = await uploadFile(file, "chat");
      onSend("", { type: "audio", attachmentUrl: url, metadata: { duration: secs, mimeType: blob.type } });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  useEffect(() => () => { stopTimer(); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); }, []);

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Voice message" icon={Mic} onClose={onClose} />
      <div className="p-5 space-y-4">
        {error ? (
          <p className="text-center text-[13px] text-[#e5484d] py-8">{error}</p>
        ) : state === "idle" ? (
          <button onClick={start} className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#e5484d]/10 flex items-center justify-center"><Mic size={24} className="text-[#e5484d]" /></div>
            <span className="text-[13px] text-[#9a9a9a]">Tap to start recording</span>
          </button>
        ) : state === "done" ? (
          <>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f5f5f5] dark:bg-white/5">
              <audio src={audioUrl!} controls className="flex-1 h-10" />
              <span className="text-[13px] font-medium text-[#9a9a9a] tabular-nums">{fmt(secs)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={discard} className="flex-1 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#6b6b6b] dark:text-white/60 hover:border-[#e5484d] hover:text-[#e5484d] transition-colors flex items-center justify-center gap-2"><Trash2 size={14} /> Discard</button>
              <button onClick={send} disabled={uploading} className="flex-1 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#e5484d]/10 flex items-center justify-center">
                  <Mic size={28} className="text-[#e5484d]" />
                </div>
                {state === "recording" && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#e5484d] animate-pulse" />}
              </div>
              <span className="text-2xl font-bold tabular-nums text-[#1e1e1e] dark:text-white">{fmt(secs)}</span>
              <span className="text-[12px] text-[#9a9a9a]">{state === "recording" ? "Recording…" : "Paused"}</span>
            </div>
            <div className="flex gap-2">
              {state === "recording" ? (
                <button onClick={pause} className="flex-1 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#6b6b6b] dark:text-white/60 flex items-center justify-center gap-2"><Pause size={14} /> Pause</button>
              ) : (
                <button onClick={resume} className="flex-1 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#6b6b6b] dark:text-white/60 flex items-center justify-center gap-2"><Play size={14} /> Resume</button>
              )}
              <button onClick={stop} className="flex-1 py-2.5 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center justify-center gap-2"><Square size={14} /> Stop</button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* ─── 5. Contact picker ───────────────────────────────────────────── */

type ProCard = { id: string; name: string; headline: string; avatarUrl: string };

export function ContactPicker({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfessionals().then((r) => setResults(r.map((p) => ({ id: p.id, name: p.name, headline: p.headline, avatarUrl: p.avatarUrl })))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q ? results.filter((p) => `${p.name} ${p.headline}`.toLowerCase().includes(q)) : results;

  function pick(p: ProCard) {
    onSend(`Shared a contact: ${p.name}`, { type: "contact", metadata: { contactId: p.id, contactName: p.name, contactHeadline: p.headline, contactAvatar: p.avatarUrl } });
    onClose();
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Share a contact" icon={Send} onClose={onClose} />
      <div className="p-4 border-b border-[#f0f0f0] dark:border-white/10">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className={`${inputClass} pl-9`} />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-[#9a9a9a]" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[13px] text-[#9a9a9a] py-10">No people found</p>
        ) : filtered.slice(0, 20).map((p) => (
          <button key={p.id} onClick={() => pick(p)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatarUrl || r2Url("site/photo-1494790108377-be9c29b29330.jpg")} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate">{p.name}</p>
              <p className="text-[12px] text-[#9a9a9a] truncate">{p.headline}</p>
            </div>
          </button>
        ))}
      </div>
    </Overlay>
  );
}

/* ─── 6. Poll builder ─────────────────────────────────────────────── */

export function PollBuilder({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function updateOption(i: number, v: string) { setOptions((o) => o.map((x, j) => j === i ? v : x)); }
  function addOption() { if (options.length < 6) setOptions((o) => [...o, ""]); }
  function removeOption(i: number) { if (options.length > 2) setOptions((o) => o.filter((_, j) => j !== i)); }

  function send() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) { toast.error("Enter a question"); return; }
    if (opts.length < 2) { toast.error("Add at least 2 options"); return; }
    onSend(q, { type: "poll", metadata: { question: q, options: opts, votes: {} } });
    onClose();
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Create a poll" icon={Calendar} onClose={onClose} />
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Question</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do you want to ask?" className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Options</label>
          <div className="mt-1.5 space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className={inputClass} />
                {options.length > 2 && <button onClick={() => removeOption(i)} className="text-[#9a9a9a] hover:text-[#e5484d] flex-shrink-0"><X size={16} /></button>}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button onClick={addOption} className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[#caa400] hover:text-[#ffd716] transition-colors"><Plus size={14} /> Add option</button>
          )}
        </div>
        <button onClick={send} className="w-full py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Create poll</button>
      </div>
    </Overlay>
  );
}

/* ─── 7. Event builder ────────────────────────────────────────────── */

export function EventBuilder({ onSend, onClose }: { onSend: SendFn; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");

  function send() {
    const t = title.trim();
    if (!t) { toast.error("Enter an event title"); return; }
    if (!date) { toast.error("Pick a date"); return; }
    const datetime = time ? `${date}T${time}` : date;
    onSend(t, { type: "event", metadata: { eventTitle: t, eventDate: datetime, eventLocation: location.trim(), eventDescription: desc.trim() } });
    onClose();
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Share an event" icon={Calendar} onClose={onClose} />
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Event title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Site inspection at Lekki" className={`${inputClass} mt-1.5`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1"><Calendar size={13} /> Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1"><Clock size={13} /> Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1"><MapPin size={13} /> Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or virtual link" className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Description <span className="text-[#9a9a9a] font-normal">(optional)</span></label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What's this event about?" className={`${inputClass} mt-1.5 resize-none`} />
        </div>
        <button onClick={send} className="w-full py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Share event</button>
      </div>
    </Overlay>
  );
}
