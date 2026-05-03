import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Coins, Wand2, MessageSquareText, BookOpen, Heart, Activity, Languages, Settings2, MessageCircle, Calendar, X, Copy, Check, Loader2, Mic, Square, Play, Pause, Send, Image as ImageIcon, Cloud, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import LowCreditsModal from "@/components/LowCreditsModal";

// One-click buttons - palette jaune/chaleureuse comme Mission Lingala
const ONE_CLICK = [
  { key: "daily_sentences", label: "Créer 3 phrases pour mon enfant", icon: MessageSquareText, cost: 3, bg: "bg-sun-100", iconBg: "bg-white", iconColor: "text-brick" },
  { key: "mini_story", label: "Raconter une histoire", icon: BookOpen, cost: 8, bg: "bg-leaf-50", iconBg: "bg-white", iconColor: "text-leaf" },
  { key: "prayer", label: "Faire une prière", icon: Heart, cost: 5, bg: "bg-brick-50", iconBg: "bg-white", iconColor: "text-brick" },
  { key: "activity", label: "Activité parent-enfant du jour", icon: Activity, cost: 4, bg: "bg-sand-100", iconBg: "bg-white", iconColor: "text-brick" },
  { key: "sentence", label: "Une phrase simple", icon: Sparkles, cost: 1, bg: "bg-white", iconBg: "bg-sun-100", iconColor: "text-brick" },
];

const COACH_COST = 4;

const THEMES = ["famille", "nourriture", "emotions", "bible"];

function pick(arr, n = 1) {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

export default function Assistant() {
  const { user, setUser, childProfiles } = useAuth();
  const [result, setResult] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [translateInput, setTranslateInput] = useState("");
  const [childAge, setChildAge] = useState(5);
  const [learnedWords, setLearnedWords] = useState(["mama", "tata", "mayi"]);
  const [advanced, setAdvanced] = useState(false);
  const [advParams, setAdvParams] = useState({ theme: "famille", age: 5 });
  const [coachInput, setCoachInput] = useState("");
  const [coachAge, setCoachAge] = useState(5);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalKind, setModalKind] = useState("message");
  const [copied, setCopied] = useState(false);
  // Voice recording state (to attach to saved message)
  const [voiceDataUrl, setVoiceDataUrl] = useState("");
  const [voiceBlobUrl, setVoiceBlobUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendProfileId, setSendProfileId] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [driveConnected, setDriveConnected] = useState(null);
  const [driveSaveMsg, setDriveSaveMsg] = useState("");
  const [driveSaving, setDriveSaving] = useState(false);
  const [lowCredits, setLowCredits] = useState({ open: false, required: 0, action: "" });

  const openResultModal = (title, kind = "message") => {
    setModalTitle(title || "Résultat");
    setModalKind(kind);
    setModalOpen(true);
    setCopied(false);
    setVoiceDataUrl("");
    setVoiceBlobUrl("");
    setImageDataUrl("");
    setSendOpen(false);
    setSendMsg("");
  };
  const closeModal = () => {
    cleanupRecording();
    setModalOpen(false);
    setResult("");
    setError("");
    setVoiceDataUrl("");
    setVoiceBlobUrl("");
    setImageDataUrl("");
    setSendOpen(false);
  };
  const copyResult = async () => {
    try { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_e) {}
  };

  // ---- Voice recording ----
  const cleanupRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recRef.current && recRef.current.state !== "inactive") { try { recRef.current.stop(); } catch (_e) {} }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };
  useEffect(() => () => cleanupRecording(), []);

  // Fetch Drive connection status once
  useEffect(() => {
    api.get("/drive/status").then((r) => setDriveConnected(!!r.data?.connected)).catch(() => setDriveConnected(false));
  }, []);

  const saveToDrive = async () => {
    if (!result) return;
    setDriveSaving(true);
    setDriveSaveMsg("");
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const slug = (modalTitle || "assistant").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      // Build a combined text blob with metadata + content
      const header = `Mwana Lingala — ${modalTitle || "Assistant IA"}\n${new Date().toLocaleString("fr-FR")}\n\n`;
      const txt = header + result;
      const textB64 = btoa(unescape(encodeURIComponent(txt)));
      await api.post("/drive/upload", { filename: `${stamp}_${slug}.txt`, mime_type: "text/plain", data_b64: textB64 });
      // Also upload voice if present
      if (voiceDataUrl) {
        const b64 = voiceDataUrl.split(",")[1] || "";
        const mime = (voiceDataUrl.match(/^data:([^;]+);/) || [])[1] || "audio/webm";
        const ext = mime.includes("mp3") ? "mp3" : mime.includes("wav") ? "wav" : "webm";
        if (b64) await api.post("/drive/upload", { filename: `${stamp}_${slug}.${ext}`, mime_type: mime, data_b64: b64 });
      }
      // And image
      if (imageDataUrl) {
        const b64 = imageDataUrl.split(",")[1] || "";
        const mime = (imageDataUrl.match(/^data:([^;]+);/) || [])[1] || "image/png";
        const ext = mime.includes("jpeg") ? "jpg" : "png";
        if (b64) await api.post("/drive/upload", { filename: `${stamp}_${slug}.${ext}`, mime_type: mime, data_b64: b64 });
      }
      setDriveSaveMsg("✓ Sauvegardé dans Drive / Mwana Lingala");
      setTimeout(() => setDriveSaveMsg(""), 3500);
    } catch (err) {
      setDriveSaveMsg(err?.response?.data?.detail || "Erreur Drive");
      setTimeout(() => setDriveSaveMsg(""), 4000);
    } finally {
      setDriveSaving(false);
    }
  };

  const blobToDataURL = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob);
  });

  const MAX_REC_SEC = 60;

  const startRecord = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recRef.current = rec;
      const chunks = [];
      rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const d = await blobToDataURL(blob);
          setVoiceDataUrl(d);
          setVoiceBlobUrl(URL.createObjectURL(blob));
        } catch (_e) {}
        finally {
          if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
        }
      };
      rec.start();
      setRecording(true);
      setRecSec(0);
      const t0 = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setRecSec(s);
        if (s >= MAX_REC_SEC) stopRecord();
      }, 200);
    } catch (_e) {}
  };
  const stopRecord = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recRef.current && recRef.current.state !== "inactive") { try { recRef.current.stop(); } catch (_e) {} }
    setRecording(false);
  };
  const togglePreviewVoice = () => {
    const a = previewAudioRef.current;
    if (!a) return;
    if (previewingVoice) { a.pause(); setPreviewingVoice(false); }
    else { a.currentTime = 0; a.play(); setPreviewingVoice(true); }
  };

  // ---- Image generation ----
  const genImage = async () => {
    setGeneratingImage(true);
    try {
      const prompt = (result || modalTitle).slice(0, 300);
      const r = await api.post("/ai/generate-image", { prompt });
      setImageDataUrl(r.data.image_b64);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur génération image");
    } finally {
      setGeneratingImage(false);
    }
  };

  // ---- Send to child ----
  const openSend = () => {
    setSendOpen(true);
    setSendProfileId(childProfiles?.[0]?.profile_id || "");
  };
  const submitSend = async () => {
    setSending(true);
    try {
      await api.post("/parent-messages", {
        title: modalTitle,
        content: result,
        profile_id: sendProfileId || null,
        voice_b64: voiceDataUrl || null,
        image_b64: imageDataUrl || null,
        kind: modalKind,
      });
      setSendMsg("✓ Envoyé à votre enfant");
      setTimeout(() => { setSendOpen(false); setSendMsg(""); }, 1500);
    } catch (e) {
      setSendMsg(e?.response?.data?.detail || "Erreur envoi");
    } finally { setSending(false); }
  };

  useEffect(() => {
    // Load first child profile for age/learned words defaults
    api.get("/child-profiles").then((r) => {
      if (r.data?.[0]?.age) { setChildAge(r.data[0].age); setCoachAge(r.data[0].age); setAdvParams((p) => ({ ...p, age: r.data[0].age })); }
    }).catch(() => {});
    api.get("/progress").then(async (r) => {
      const ids = (r.data.learned_word_ids || []).slice(0, 5);
      if (ids.length) {
        const ws = await Promise.all(ids.map((id) => api.get(`/words/${id}`).then((x) => x.data.lingala).catch(() => null)));
        setLearnedWords(ws.filter(Boolean).slice(0, 3));
      }
    }).catch(() => {});
  }, []);

  const runOneClick = async (b) => {
    if ((user?.credits || 0) < b.cost) {
      setLowCredits({ open: true, required: b.cost, action: b.label });
      return;
    }
    setBusyKey(b.key);
    setError("");
    setResult("");
    const kindMap = { daily_sentences: "phrases", mini_story: "story", prayer: "prayer", activity: "message", sentence: "message" };
    openResultModal(b.label, kindMap[b.key] || "message");
    try {
      const theme = user?.christian_mode ? pick(["famille", "bible"])[0] : pick(["famille", "nourriture", "emotions"])[0];
      const words = (learnedWords.length >= 3 ? learnedWords : ["mama", "tata", "mayi"]).join(", ");
      const word = learnedWords[0] || "mayi";
      const params = { theme, age: childAge, words, word };
      const r = await api.post("/ai/generate", { action: b.key, params });
      setResult(r.data.content);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusyKey("");
    }
  };

  const runTranslate = async () => {
    if (!translateInput.trim()) return;
    if ((user?.credits || 0) < 2) {
      setLowCredits({ open: true, required: 2, action: "Traduire en Lingala" });
      return;
    }
    setBusyKey("translate");
    setError("");
    setResult("");
    openResultModal("Traduction en Lingala", "message");
    try {
      const r = await api.post("/ai/generate", { action: "translate", params: { french: translateInput } });
      setResult(r.data.content);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusyKey("");
    }
  };

  const runAdvanced = async (key, cost) => {
    if ((user?.credits || 0) < cost) {
      const btn = ONE_CLICK.find((b) => b.key === key);
      setLowCredits({ open: true, required: cost, action: btn?.label || "Action IA" });
      return;
    }
    setBusyKey(key);
    setError("");
    setResult("");
    const btn = ONE_CLICK.find((b) => b.key === key);
    const kindMap = { daily_sentences: "phrases", mini_story: "story", prayer: "prayer", activity: "message", sentence: "message" };
    openResultModal(btn?.label || "Résultat", kindMap[key] || "message");
    try {
      const r = await api.post("/ai/generate", { action: key, params: advParams });
      setResult(r.data.content);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusyKey("");
    }
  };

  const runCoach = async () => {
    if (!coachInput.trim()) return;
    if ((user?.credits || 0) < COACH_COST) {
      setLowCredits({ open: true, required: COACH_COST, action: "Coach Parental" });
      return;
    }
    setBusyKey("coach");
    setError("");
    setResult("");
    openResultModal("Coach Parental", "message");
    try {
      const r = await api.post("/ai/generate", { action: "coach", params: { question: coachInput.trim(), age: coachAge } });
      setResult(r.data.content);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Hero header chaleureux jaune/sun */}
      <div className="ml-card p-7 bg-gradient-to-br from-sun-100 via-white to-sand-100 border border-sun-200" data-testid="assistant-hero">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0">
              <Wand2 className="w-8 h-8 text-brick" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-brick uppercase tracking-widest">Powered by Claude AI</div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Assistant IA Lingala</h1>
              <p className="text-foreground/70 mt-1">Un clic. L'IA s'occupe du reste — adaptée à l'âge de votre enfant.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border-2 border-sun-200" data-testid="assistant-credits">
            <Coins className="w-5 h-5 text-brick" />
            <div>
              <div className="text-xs font-bold text-brick">Vos crédits</div>
              <div className="text-xl font-black">{user?.credits || 0}</div>
            </div>
            <Link to="/tarifs" className="ml-2 px-2.5 py-1 rounded-full bg-brick text-white text-xs font-black hover:bg-brick-600" data-testid="assistant-buy-credits">
              + Acheter
            </Link>
          </div>
        </div>
      </div>

      {/* ONE-CLICK BIG BUTTONS */}
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {ONE_CLICK.map((b) => {
          const insufficient = (user?.credits || 0) < b.cost;
          return (
            <button
              key={b.key}
              onClick={() => runOneClick(b)}
              disabled={busyKey !== ""}
              data-testid={`ai-action-${b.key}`}
              className={`ml-card p-6 text-left ${b.bg} border-2 ${insufficient ? "border-brick/30" : "border-transparent"} hover:border-leaf/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl ${b.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                  <b.icon className={`w-7 h-7 ${b.iconColor}`} strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-black leading-tight">{b.label}</div>
                  <div className={`text-xs ${insufficient ? "text-brick" : b.iconColor} mt-1 font-bold`}>
                    {busyKey === b.key ? "Génération..." : insufficient ? `🔒 ${b.cost} crédit${b.cost > 1 ? "s" : ""} requis` : `Coût : ${b.cost} crédit${b.cost > 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Traduction — quick input */}
      <div className="ml-card mt-5 p-6 bg-white border-2 border-sand-200" data-testid="translate-card">
        <div className="flex items-center gap-3">
          <Languages className="w-6 h-6 text-brick" />
          <div className="text-lg font-black">Traduire une phrase en Lingala</div>
          <span className="ml-auto text-xs font-bold text-foreground/60">2 crédits</span>
        </div>
        <div className="mt-3 flex gap-2 flex-col sm:flex-row">
          <input
            value={translateInput}
            onChange={(e) => setTranslateInput(e.target.value)}
            placeholder="Ex : Je t'aime mon enfant"
            className="flex-1 border-2 rounded-full px-4 py-3 bg-sand-100 outline-none focus:border-brick"
            data-testid="translate-input"
          />
          <button
            onClick={runTranslate}
            disabled={busyKey !== "" || !translateInput.trim()}
            data-testid="translate-btn"
            className="px-6 py-3 rounded-full bg-leaf text-white font-black hover:bg-leaf-700 active:scale-95 disabled:opacity-60"
          >
            {busyKey === "translate" ? "…" : "Traduire"}
          </button>
        </div>
      </div>

      {/* Coach Parental */}
      <div className="ml-card mt-5 p-6 bg-gradient-to-br from-leaf-50 to-white border-2 border-sand-200" data-testid="coach-card">
        <div className="flex items-center gap-3 flex-wrap">
          <MessageCircle className="w-6 h-6 text-brick" />
          <div className="text-lg font-black">Coach Parental</div>
          <span className="ml-auto text-xs font-bold text-foreground/60">{COACH_COST} crédits</span>
        </div>
        <p className="text-sm text-foreground/70 mt-2">
          Posez votre question sur la transmission du Lingala, la motivation de l'enfant, les difficultés de prononciation, etc. Le coach IA répond en français avec 1 ou 2 actions concrètes.
        </p>
        <textarea
          value={coachInput}
          onChange={(e) => setCoachInput(e.target.value)}
          placeholder="Ex : Mon enfant de 5 ans refuse de répéter les mots Lingala, que faire ?"
          rows={3}
          className="mt-3 w-full border-2 rounded-2xl px-4 py-3 bg-white outline-none focus:border-brick"
          data-testid="coach-input"
        />
        <div className="mt-3 flex gap-3 items-center flex-wrap">
          <label className="text-sm font-bold inline-flex items-center gap-2">
            Âge enfant :
            <input
              type="number"
              min={0}
              max={15}
              value={coachAge}
              onChange={(e) => setCoachAge(Number(e.target.value))}
              className="w-16 border-2 rounded-xl px-2 py-1 bg-sand-100 outline-none"
              data-testid="coach-age"
            />
          </label>
          <button
            onClick={runCoach}
            disabled={busyKey !== "" || !coachInput.trim()}
            data-testid="coach-btn"
            className="px-6 py-3 rounded-full bg-leaf text-white font-black hover:bg-leaf-700 active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> {busyKey === "coach" ? "Le coach réfléchit..." : "Demander conseil"}
          </button>
        </div>
      </div>

      {/* Programme hebdomadaire link */}
      <Link
        to="/app/programme"
        data-testid="programme-link"
        className="ml-card mt-5 p-6 bg-gradient-to-br from-sun-100 to-white border-2 border-sand-200 flex items-center gap-4 hover:shadow-lg transition-all"
      >
        <div className="w-14 h-14 rounded-2xl bg-sun-100 flex items-center justify-center shadow-sm shrink-0">
          <Calendar className="w-7 h-7 text-brick" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black">Programme hebdomadaire IA</div>
          <p className="text-sm text-foreground/70">Un plan d'apprentissage Lingala sur 7 jours, adapté à votre enfant. (12 crédits)</p>
        </div>
        <span className="text-brick font-black">Ouvrir →</span>
      </Link>

      {/* Result modal — typographie pro, actions voix/image/envoi */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={closeModal}
          data-testid="assistant-result-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-sand-200"
          >
            {/* Header — serif + decorative */}
            <div className="relative px-6 py-5 border-b-2 border-sand-200 bg-gradient-to-br from-sun-100 via-sand-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0 rotate-3">
                  <Wand2 className="w-6 h-6 text-brick" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-brick uppercase tracking-[0.2em]">Mwana Assistant</div>
                  <div className="text-xl sm:text-2xl font-black truncate" style={{ fontFamily: 'Georgia, "Nunito", serif' }}>
                    {modalTitle}
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  data-testid="assistant-modal-close"
                  className="w-10 h-10 rounded-full hover:bg-white/80 flex items-center justify-center active:scale-95 shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-7 bg-sand-50/30">
              {busyKey !== "" && !result && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-brick animate-spin" />
                    <Sparkles className="w-4 h-4 text-sun-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="font-black mt-4 text-lg" style={{ fontFamily: 'Georgia, serif' }}>L'IA réfléchit…</div>
                  <p className="text-sm text-foreground/60 mt-1">Quelques secondes de magie.</p>
                </div>
              )}
              {error && (
                <div className="p-4 rounded-2xl bg-brick-50 border-2 border-brick-100 text-brick-700 font-bold" data-testid="assistant-error">
                  {error}
                </div>
              )}
              {result && (
                <article className="mx-auto max-w-prose" data-testid="assistant-result-article">
                  {/* Image generated (optional) */}
                  {imageDataUrl && (
                    <figure className="mb-6 -mx-2 sm:-mx-4" data-testid="assistant-image">
                      <img
                        src={imageDataUrl}
                        alt={modalTitle}
                        className="w-full aspect-square sm:aspect-[4/3] object-cover rounded-3xl shadow-xl"
                      />
                      <figcaption className="text-xs text-foreground/50 text-center mt-2 italic">Illustration créée par IA · Nano Banana</figcaption>
                    </figure>
                  )}

                  {/* Decorative initial */}
                  <div className="relative">
                    <div
                      className="absolute -left-1 -top-2 text-7xl sm:text-8xl leading-none text-sun-200 font-black select-none pointer-events-none"
                      aria-hidden
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      "
                    </div>
                    <div
                      data-testid="assistant-result"
                      className="whitespace-pre-wrap leading-relaxed text-foreground/90 text-base sm:text-lg relative pl-8"
                      style={{ fontFamily: 'Georgia, "Nunito", serif' }}
                    >
                      {result}
                    </div>
                  </div>

                  {/* Voice playback */}
                  {voiceBlobUrl && (
                    <div className="mt-6 p-4 rounded-2xl bg-leaf-50 border-2 border-leaf-100" data-testid="voice-recorded">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePreviewVoice}
                          data-testid="voice-play"
                          className="w-11 h-11 rounded-full bg-leaf text-white flex items-center justify-center active:scale-95"
                        >
                          {previewingVoice ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <div className="flex-1 text-sm">
                          <div className="font-bold text-leaf-700">Votre voix enregistrée</div>
                          <div className="text-xs text-foreground/60">Elle sera jointe si vous envoyez au Mode Enfant</div>
                        </div>
                        <button
                          onClick={() => { setVoiceDataUrl(""); setVoiceBlobUrl(""); }}
                          data-testid="voice-clear"
                          className="px-3 py-1.5 rounded-full bg-white text-sm font-bold"
                        >
                          Effacer
                        </button>
                      </div>
                      <audio ref={previewAudioRef} src={voiceBlobUrl} onEnded={() => setPreviewingVoice(false)} className="hidden" />
                    </div>
                  )}
                </article>
              )}
            </div>

            {/* Action footer */}
            {result && !sendOpen && (
              <div className="px-4 sm:px-6 py-4 border-t-2 border-sand-200 bg-white">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <button
                    onClick={copyResult}
                    data-testid="assistant-copy"
                    className="px-3 py-2.5 rounded-full bg-sand-100 hover:bg-sand-200 font-bold inline-flex items-center justify-center gap-2 text-sm"
                  >
                    {copied ? <><Check className="w-4 h-4 text-leaf" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
                  </button>

                  {!recording && !voiceDataUrl && (
                    <button
                      onClick={startRecord}
                      data-testid="assistant-record-start"
                      className="px-3 py-2.5 rounded-full bg-brick-50 hover:bg-brick-100 text-brick-700 font-bold inline-flex items-center justify-center gap-2 text-sm"
                    >
                      <Mic className="w-4 h-4" /> Ma voix
                    </button>
                  )}
                  {recording && (
                    <button
                      onClick={stopRecord}
                      data-testid="assistant-record-stop"
                      className="px-3 py-2.5 rounded-full bg-brick text-white font-bold inline-flex items-center justify-center gap-2 text-sm animate-pulse"
                    >
                      <Square className="w-4 h-4" /> Arrêter ({recSec}s)
                    </button>
                  )}

                  {!imageDataUrl && (
                    <button
                      onClick={genImage}
                      disabled={generatingImage}
                      data-testid="assistant-gen-image"
                      className="px-3 py-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      Image IA <span className="text-xs font-normal opacity-70">· 2 cr</span>
                    </button>
                  )}

                  <button
                    onClick={openSend}
                    data-testid="assistant-send-child"
                    className="col-span-2 sm:col-auto sm:ml-auto px-5 py-2.5 rounded-full bg-leaf text-white font-black inline-flex items-center justify-center gap-2 text-sm hover:bg-leaf-700 active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Envoyer à mon enfant
                  </button>
                </div>

                {/* Google Drive — real integration */}
                <div className="mt-3 p-3 rounded-2xl bg-sand-50 border-2 border-sand-200 flex items-center gap-3 text-xs" data-testid="drive-row">
                  <Cloud className={`w-4 h-4 shrink-0 ${driveConnected ? "text-leaf-700" : "text-foreground/40"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">Sauvegarder sur Google Drive</div>
                    <div className="text-foreground/60 truncate">
                      {driveConnected === null && "…"}
                      {driveConnected === true && "Un dossier « Mwana Lingala » est utilisé sur ton Drive."}
                      {driveConnected === false && "Connecte ton Drive pour garder tes créations hors de notre serveur."}
                    </div>
                    {driveSaveMsg && (
                      <div className={`mt-1 font-bold ${driveSaveMsg.startsWith("✓") ? "text-leaf-700" : "text-brick-700"}`} data-testid="drive-save-msg">{driveSaveMsg}</div>
                    )}
                  </div>
                  {driveConnected ? (
                    <button
                      type="button"
                      onClick={saveToDrive}
                      disabled={driveSaving || !result}
                      data-testid="save-to-drive"
                      className="px-3 py-1.5 rounded-full bg-leaf text-white font-bold hover:bg-leaf-700 inline-flex items-center gap-1 disabled:opacity-60"
                    >
                      {driveSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                      Sauvegarder
                    </button>
                  ) : (
                    <Link
                      to="/app/parametres"
                      data-testid="google-drive-link"
                      className="px-3 py-1.5 rounded-full bg-white border-2 border-sand-200 font-bold hover:border-leaf inline-flex items-center gap-1"
                    >
                      Connecter <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Send sub-panel */}
            {sendOpen && (
              <div className="px-6 py-5 border-t-2 border-sand-200 bg-leaf-50/50" data-testid="send-panel">
                <div className="font-black text-lg mb-2">Envoyer à mon enfant</div>
                {childProfiles?.length > 0 ? (
                  <>
                    <div className="text-sm text-foreground/70 mb-3">Quel enfant recevra ce message ?</div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {childProfiles.map((p) => (
                        <button
                          key={p.profile_id}
                          onClick={() => setSendProfileId(p.profile_id)}
                          data-testid={`send-to-${p.profile_id}`}
                          className={`px-4 py-2 rounded-full font-bold text-sm border-2 ${sendProfileId === p.profile_id ? "bg-leaf text-white border-leaf" : "bg-white border-sand-200 hover:border-leaf"}`}
                        >
                          {p.name} ({p.age} ans)
                        </button>
                      ))}
                      <button
                        onClick={() => setSendProfileId("")}
                        className={`px-4 py-2 rounded-full font-bold text-sm border-2 ${sendProfileId === "" ? "bg-leaf text-white border-leaf" : "bg-white border-sand-200 hover:border-leaf"}`}
                      >
                        Tous les enfants
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-white border-2 border-sand-200 text-sm mb-4">
                    Aucun profil enfant. <Link to="/app/parent" className="text-leaf font-bold underline">Créer un profil</Link> pour l'associer.
                  </div>
                )}
                {sendMsg && <div className={`p-3 rounded-xl font-bold text-sm mb-3 ${sendMsg.startsWith("✓") ? "bg-leaf-50 text-leaf-700" : "bg-brick-50 text-brick-700"}`}>{sendMsg}</div>}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={submitSend}
                    disabled={sending}
                    data-testid="send-confirm"
                    className="flex-1 min-w-[120px] px-5 py-3 rounded-full bg-leaf text-white font-black inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                  <button
                    onClick={() => { setSendOpen(false); setSendMsg(""); }}
                    className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold"
                  >
                    Annuler
                  </button>
                </div>
                <p className="mt-3 text-xs text-foreground/60">
                  🔒 Ce message est privé. Enregistré uniquement sur votre compte. Visible en Mode {childProfiles?.[0]?.name || "Enfant"} sous "Messages de Papa/Maman".
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced toggle */}
      <button
        onClick={() => setAdvanced((a) => !a)}
        className="mt-8 text-sm text-brick underline inline-flex items-center gap-1"
        data-testid="toggle-advanced"
      >
        <Settings2 className="w-4 h-4" /> {advanced ? "Masquer" : "Options avancées"}
      </button>
      {advanced && (
        <div className="ml-card mt-3 p-6 bg-white border-2 border-sand-200" data-testid="advanced-panel">
          <p className="text-sm text-foreground/70">Personnalisez les paramètres pour les boutons ci-dessous.</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className="text-sm font-bold">Thème</span>
              <select value={advParams.theme} onChange={(e) => setAdvParams({ ...advParams, theme: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none font-bold">
                {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold">Âge enfant</span>
              <input type="number" min={0} max={15} value={advParams.age} onChange={(e) => setAdvParams({ ...advParams, age: Number(e.target.value) })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {ONE_CLICK.map((b) => (
              <button
                key={b.key}
                onClick={() => runAdvanced(b.key, b.cost)}
                disabled={busyKey !== ""}
                data-testid={`adv-${b.key}`}
                className="px-4 py-2 rounded-full bg-white border-2 border-sun-200 font-bold text-sm hover:border-brick disabled:opacity-60"
              >
                {b.label} ({b.cost} cr.)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Low credits modal — opens when user attempts an action without enough credits */}
      <LowCreditsModal
        open={lowCredits.open}
        onClose={() => setLowCredits({ open: false, required: 0, action: "" })}
        required={lowCredits.required}
        current={user?.credits || 0}
        action={lowCredits.action}
      />
    </div>
  );
}
