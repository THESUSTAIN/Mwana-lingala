import React, { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Star, Flag, Send, Check, Image as ImageIcon, Volume2, Camera, Trash2, Mic, Square, Play, Pause, Lock, Eye, EyeOff, LayoutGrid, Sparkles, ChevronLeft, ChevronRight, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { playWord } from "@/components/AudioButton";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
  { slug: "animaux", label: "Animaux" },
  { slug: "couleurs", label: "Couleurs" },
  { slug: "nombres", label: "Nombres" },
  { slug: "corps", label: "Corps" },
  { slug: "salutations", label: "Salutations" },
  { slug: "maison", label: "Maison" },
];

async function resizeImageToBase64(file, size = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = img.width / img.height;
        let w = size, h = size;
        if (ratio > 1) { h = Math.round(size / ratio); } else { w = Math.round(size * ratio); }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const MAX_RECORD_SEC = 8;

export default function ModeEnfant() {
  const { user, setUser } = useAuth();
  const ctx = useOutletContext() || {};
  const isChild = !!ctx.isChild;
  const activeChild = ctx.activeChild || null;
  const [searchParams, setSearchParams] = useSearchParams();
  // When child mode is active with a profile, filter themes to those configured for the child
  const profileThemes = activeChild?.themes?.length ? activeChild.themes : null;
  const visibleThemes = profileThemes ? THEMES.filter((t) => profileThemes.includes(t.slug)) : THEMES;
  const initialTheme = searchParams.get("theme") || (profileThemes?.[0]) || "famille";
  const validSlugs = visibleThemes.map((t) => t.slug);
  const [theme, setTheme] = useState(validSlugs.includes(initialTheme) ? initialTheme : (validSlugs[0] || "famille"));

  // Sync with URL when changed via tabs
  const changeTheme = (slug) => {
    setTheme(slug);
    setSearchParams({ theme: slug }, { replace: true });
  };

  // Sync URL change -> state (back/forward)
  useEffect(() => {
    const t = searchParams.get("theme");
    if (t && validSlugs.includes(t) && t !== theme) setTheme(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When active child profile changes, ensure theme is still valid for new profile
  useEffect(() => {
    if (!validSlugs.includes(theme)) setTheme(validSlugs[0] || "famille");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.profile_id]);
  const [words, setWords] = useState([]);
  const [learned, setLearned] = useState([]);
  // View modes (Learning Science: focus mode vs exploration mode)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("ml_enfant_view") || "learn"); // "learn" (flashcard) | "explore" (grid)
  const [imageOnly, setImageOnly] = useState(() => localStorage.getItem("ml_enfant_imageonly") === "1"); // Fluent Forever — pas de français
  useEffect(() => { localStorage.setItem("ml_enfant_view", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("ml_enfant_imageonly", imageOnly ? "1" : "0"); }, [imageOnly]);
  // Flashcard navigation
  const [cardIdx, setCardIdx] = useState(0);
  const [revealFr, setRevealFr] = useState(false);
  useEffect(() => { setCardIdx(0); setRevealFr(false); }, [theme, viewMode]);

  const [reportFor, setReportFor] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const [customFor, setCustomFor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Parent messages — "Messages de Papa/Maman"
  const [parentMessages, setParentMessages] = useState([]);
  const [openMsg, setOpenMsg] = useState(null);
  const msgAudioRef = useRef(null);
  useEffect(() => {
    const q = profileId ? `?profile_id=${profileId}` : "";
    api.get(`/parent-messages${q}`).then((r) => setParentMessages(r.data?.items || [])).catch(() => {});
  }, [profileId]);

  // Audio recording state
  const [recordFor, setRecordFor] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordedDataUrl, setRecordedDataUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recError, setRecError] = useState("");
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Use the active child's christian_mode if defined, else fall back to user's global preference
  const include = !!(activeChild ? activeChild.christian_mode : user?.christian_mode);
  const profileId = activeChild?.profile_id || null;

  const loadWords = () => {
    api.get(`/words?theme=${theme}&include_christian=${include}`).then((r) => setWords(r.data));
  };
  const loadProgress = () => {
    const q = profileId ? `?profile_id=${profileId}` : "";
    api.get(`/progress${q}`).then((r) => setLearned(r.data.learned_word_ids || [])).catch(() => {});
  };

  useEffect(() => {
    loadWords();
    loadProgress();
    // eslint-disable-next-line
  }, [theme, include, profileId]);

  const markLearned = async (word_id) => {
    setLearned((l) => (l.includes(word_id) ? l : [...l, word_id]));
    try { await api.post("/progress", { word_id, learned: true, profile_id: profileId }); } catch (_e) {}
  };

  // SRS review (Fluent Forever / Anki style) — quality 0=encore, 1=bien, 2=facile
  const reviewCard = async (word_id, quality) => {
    try { await api.post("/progress/review", { word_id, quality, profile_id: profileId }); } catch (_e) {}
    if (quality > 0) markLearned(word_id);
    setRevealFr(false);
    setCardIdx((i) => Math.min(words.length - 1, i + 1));
  };

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      await api.post("/report-error", { word_id: reportFor.word_id, suggested_translation: suggestion, comment: "" });
      setReportMsg("Merci, votre suggestion a bien été envoyée !");
      setTimeout(() => { setReportFor(null); setSuggestion(""); setReportMsg(""); }, 1500);
    } catch (e) {
      setReportMsg(e?.response?.data?.detail || "Erreur");
    }
  };

  const onPickImage = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !customFor) return;
    setUploading(true);
    try {
      const b64 = await resizeImageToBase64(file, 480);
      await api.post(`/words/${customFor.word_id}/custom-image`, { image_b64: b64 });
      setCustomFor(null);
      loadWords();
    } catch (err) {
      alert(err?.response?.data?.detail || "Upload échoué");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeCustom = async (word_id) => {
    await api.delete(`/words/${word_id}/custom-image`);
    setCustomFor(null);
    loadWords();
  };

  // ----- Recording handlers -----
  const cleanupRecorder = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch (_e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openRecorder = (w) => {
    setRecordFor(w);
    setRecError("");
    setRecordedUrl("");
    setRecordedDataUrl("");
    setRecSec(0);
    setPreviewing(false);
  };

  const closeRecorder = () => {
    cleanupRecorder();
    setRecordFor(null);
    setRecording(false);
    setRecordedUrl("");
    setRecordedDataUrl("");
    setRecSec(0);
    setPreviewing(false);
    setRecError("");
  };

  const startRecording = async () => {
    setRecError("");
    setRecordedUrl("");
    setRecordedDataUrl("");
    setRecSec(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setRecError("Votre navigateur ne supporte pas l'enregistrement audio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecRef.current = rec;
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const dataUrl = await blobToDataURL(blob);
          setRecordedDataUrl(dataUrl);
          setRecordedUrl(URL.createObjectURL(blob));
        } catch (e) {
          setRecError("Erreur lors de la finalisation.");
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      };
      rec.start();
      setRecording(true);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setRecSec(s);
        if (s >= MAX_RECORD_SEC) {
          stopRecording();
        }
      }, 200);
    } catch (e) {
      setRecError("Accès au micro refusé.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch (_e) {}
    }
    setRecording(false);
  };

  const togglePreview = () => {
    const a = previewAudioRef.current;
    if (!a) return;
    if (previewing) { a.pause(); setPreviewing(false); }
    else { a.currentTime = 0; a.play(); setPreviewing(true); }
  };

  const submitRecording = async () => {
    if (!recordFor || !recordedDataUrl) return;
    setSubmitting(true);
    setRecError("");
    try {
      const res = await api.post(`/words/${recordFor.word_id}/audio-submission`, { audio_b64: recordedDataUrl });
      if (res.data?.credits_total != null) setUser({ ...user, credits: res.data.credits_total });
      alert(`Merci ! +${res.data.credits_earned} crédits. Votre voix sera vérifiée par un modérateur.`);
      closeRecorder();
    } catch (e) {
      setRecError(e?.response?.data?.detail || "Envoi échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => cleanupRecorder(), []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" data-testid="image-file-input" />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black inline-block relative">
            {activeChild ? `Bonjour ${activeChild.name} !` : "Mode Enfant"}
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5">
            {activeChild
              ? `${activeChild.age} ans · ${visibleThemes.length} thème${visibleThemes.length > 1 ? "s" : ""} choisi${visibleThemes.length > 1 ? "s" : ""}. Écoute, regarde, répète !`
              : "Écoute, regarde, répète. Puis teste-toi."}
          </p>
        </div>
        <Link to="/app/enfant/quiz" className="ml-btn-primary inline-flex items-center gap-2" data-testid="child-go-quiz">
          <Star className="w-5 h-5" /> Lancer un quiz
        </Link>
      </div>

      {/* Messages de Papa / Maman */}
      {parentMessages.length > 0 && (
        <section className="mt-6 ml-card p-5 bg-gradient-to-br from-brick-50 to-sun-100 border-2 border-brick-100" data-testid="parent-messages-section">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💌</span>
            <div className="font-black text-lg">Messages de Papa/Maman</div>
            <span className="ml-auto text-xs font-bold text-brick bg-white/70 px-2 py-0.5 rounded-full">{parentMessages.length}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parentMessages.slice(0, 4).map((m) => (
              <button
                key={m.message_id}
                onClick={() => setOpenMsg(m)}
                data-testid={`parent-msg-${m.message_id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white hover:shadow-lg text-left active:scale-[0.98] transition-all"
              >
                {m.image_b64 ? (
                  <img src={m.image_b64} alt={m.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-sun-200 flex items-center justify-center text-2xl shrink-0">
                    {m.kind === "prayer" ? "🙏" : m.kind === "story" ? "📖" : m.kind === "phrases" ? "💬" : "💌"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate">{m.title}</div>
                  <div className="text-xs text-foreground/60 truncate">{(m.content || "").slice(0, 60)}…</div>
                  {m.voice_b64 && <div className="text-xs text-brick font-bold mt-0.5 inline-flex items-center gap-1"><Volume2 className="w-3 h-3" /> Voix incluse</div>}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Parent message modal */}
      {openMsg && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setOpenMsg(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" data-testid="parent-msg-modal">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">💌</span>
              <div className="flex-1">
                <div className="text-xs font-black text-brick uppercase tracking-widest">Message</div>
                <div className="text-xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{openMsg.title}</div>
              </div>
              <button onClick={() => setOpenMsg(null)} className="w-9 h-9 rounded-full hover:bg-sand-100 flex items-center justify-center"><Flag className="w-4 h-4 rotate-45" /></button>
            </div>
            {openMsg.image_b64 && <img src={openMsg.image_b64} alt="" className="w-full aspect-square object-cover rounded-2xl mb-3" />}
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed" style={{ fontFamily: 'Georgia, "Nunito", serif' }}>{openMsg.content}</div>
            {openMsg.voice_b64 && (
              <div className="mt-4 p-3 rounded-2xl bg-leaf-50 flex items-center gap-3">
                <button onClick={() => { const a = msgAudioRef.current; if (a) { a.currentTime = 0; a.play(); } }} className="w-12 h-12 rounded-full bg-leaf text-white flex items-center justify-center" data-testid="parent-msg-play">
                  <Play className="w-5 h-5 ml-0.5" />
                </button>
                <div className="text-sm font-bold">Écouter la voix de Papa/Maman</div>
                <audio ref={msgAudioRef} src={openMsg.voice_b64} className="hidden" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {visibleThemes.map((t) => (
          <button
            key={t.slug}
            onClick={() => changeTheme(t.slug)}
            data-testid={`child-theme-${t.slug}`}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap border-2 transition-all ${theme === t.slug ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200 hover:border-leaf/40"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* View mode toggle — Learning vs Exploration */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-sand-100 rounded-full p-1">
          <button
            onClick={() => setViewMode("learn")}
            data-testid="view-mode-learn"
            className={`px-5 py-2 rounded-full font-bold inline-flex items-center gap-2 text-sm transition-all ${viewMode === "learn" ? "bg-white text-leaf shadow" : "text-foreground/60"}`}
          >
            <Sparkles className="w-4 h-4" /> Cartes
          </button>
          <button
            onClick={() => setViewMode("explore")}
            data-testid="view-mode-explore"
            className={`px-5 py-2 rounded-full font-bold inline-flex items-center gap-2 text-sm transition-all ${viewMode === "explore" ? "bg-white text-leaf shadow" : "text-foreground/60"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Liste
          </button>
        </div>
        <button
          onClick={() => setImageOnly((v) => !v)}
          data-testid="toggle-image-only"
          className={`px-4 py-2 rounded-full font-bold inline-flex items-center gap-2 text-sm border-2 transition-all ${imageOnly ? "bg-brick text-white border-brick" : "bg-white text-foreground/70 border-sand-200 hover:border-brick/40"}`}
          title="Penser en Lingala — méthode Fluent Forever"
        >
          {imageOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {imageOnly ? "Sans français" : "Avec français"}
        </button>
      </div>

      {viewMode === "learn" && words.length > 0 && (() => {
        const w = words[Math.min(cardIdx, words.length - 1)];
        const isLocked = !!w?.locked;
        return (
          <div className="mt-8" data-testid="flashcard-view">
            <div className="text-sm text-foreground/60 text-center mb-3">
              Carte {Math.min(cardIdx + 1, words.length)} sur {words.length}
            </div>
            <div className="ml-card p-6 sm:p-10 bg-white max-w-2xl mx-auto relative">
              {isLocked && (
                <Link to="/tarifs" data-testid="flashcard-unlock" className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-sun-200 flex items-center justify-center mb-3 shadow-md">
                    <Lock className="w-8 h-8 text-brick" />
                  </div>
                  <div className="font-black text-xl">Mot Premium</div>
                  <p className="text-sm text-foreground/70 mt-1">Débloquez tous les mots avec le forfait Premium.</p>
                  <span className="mt-4 inline-block px-5 py-2.5 rounded-full bg-brick text-white text-sm font-bold">
                    Voir les tarifs →
                  </span>
                </Link>
              )}
              {w?.image ? (
                <img src={w.image} alt={w.french} className="w-full max-w-md mx-auto aspect-square object-cover rounded-3xl" />
              ) : (
                <div className="w-full max-w-md mx-auto aspect-square rounded-3xl bg-sand-100 flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-foreground/30" />
                </div>
              )}
              <div className="mt-7 text-center">
                <div className="text-5xl sm:text-6xl font-black text-leaf" data-testid="flashcard-lingala">{w?.lingala}</div>
                {(!imageOnly || revealFr) && (
                  <div className="text-foreground/70 text-xl mt-2" data-testid="flashcard-french">{w?.french}</div>
                )}
                {imageOnly && !revealFr && (
                  <button onClick={() => setRevealFr(true)} className="text-xs text-brick underline mt-2" data-testid="flashcard-reveal">
                    Afficher la traduction
                  </button>
                )}
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => playWord(w)}
                  data-testid="flashcard-audio"
                  className="w-20 h-20 rounded-full bg-sun-300 hover:bg-sun-500 shadow-xl flex items-center justify-center active:scale-95 transition-all"
                  aria-label={`Écouter ${w?.lingala}`}
                >
                  <Volume2 className="w-9 h-9 text-foreground" strokeWidth={2.5} />
                </button>
              </div>
              {w?.example_ln && (
                <p className="mt-6 text-center text-sm text-foreground/70 italic max-w-md mx-auto">
                  « {w.example_ln} »{!imageOnly && <> — <span className="not-italic">{w.example_fr}</span></>}
                </p>
              )}
            </div>
            {!isLocked && (
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl mx-auto" data-testid="flashcard-srs-buttons">
                <button
                  onClick={() => reviewCard(w.word_id, 0)}
                  data-testid="flashcard-again"
                  className="py-4 rounded-2xl bg-brick-50 text-brick-700 font-bold inline-flex items-center justify-center gap-2 hover:bg-brick-100 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-5 h-5" /> Encore
                </button>
                <button
                  onClick={() => reviewCard(w.word_id, 1)}
                  data-testid="flashcard-good"
                  className="py-4 rounded-2xl bg-leaf text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-leaf-700 active:scale-95 transition-all"
                >
                  <ThumbsUp className="w-5 h-5" /> Bien
                </button>
                <button
                  onClick={() => reviewCard(w.word_id, 2)}
                  data-testid="flashcard-easy"
                  className="py-4 rounded-2xl bg-sun-200 text-foreground font-bold inline-flex items-center justify-center gap-2 hover:bg-sun-300 active:scale-95 transition-all"
                >
                  <Star className="w-5 h-5" /> Facile
                </button>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between max-w-2xl mx-auto">
              <button
                onClick={() => { setCardIdx((i) => Math.max(0, i - 1)); setRevealFr(false); }}
                disabled={cardIdx === 0}
                data-testid="flashcard-prev"
                className="px-4 py-2 rounded-full bg-sand-100 font-bold inline-flex items-center gap-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <button
                onClick={() => { setCardIdx((i) => Math.min(words.length - 1, i + 1)); setRevealFr(false); }}
                disabled={cardIdx >= words.length - 1}
                data-testid="flashcard-next"
                className="px-4 py-2 rounded-full bg-sand-100 font-bold inline-flex items-center gap-2 disabled:opacity-40"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {viewMode === "explore" && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {words.map((w) => {
          const isLearned = learned.includes(w.word_id);
          const hasCommunityAudio = !!w.audio;
          const isLocked = !!w.locked;
          return (
            <div key={w.word_id} className={`ml-card p-5 bg-white relative ${isLocked ? "opacity-90" : ""}`} data-testid={`word-card-${w.lingala}`}>
              {isLocked && (
                <Link
                  to="/tarifs"
                  data-testid={`unlock-${w.lingala}`}
                  className="absolute inset-0 z-10 rounded-3xl bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 hover:bg-white/90 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-sun-200 flex items-center justify-center mb-3 shadow-md">
                    <Lock className="w-7 h-7 text-brick" />
                  </div>
                  <div className="font-black text-lg">Mot Premium</div>
                  <p className="text-xs text-foreground/70 mt-1">Débloquez tous les mots avec le forfait Premium.</p>
                  <span className="mt-3 inline-block px-4 py-2 rounded-full bg-brick text-white text-xs font-bold">
                    Voir les tarifs →
                  </span>
                </Link>
              )}
              <div className="relative group">
                {w.image ? (
                  <img src={w.image} alt={w.french} className="rounded-2xl w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="rounded-2xl w-full aspect-[4/3] bg-sand-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-foreground/30" />
                  </div>
                )}
                {w.custom && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-leaf text-white text-xs font-black shadow">
                    ♥ Ma photo
                  </div>
                )}
                {hasCommunityAudio && (
                  <div className="absolute top-2 left-2 mt-8 px-2 py-1 rounded-full bg-brick text-white text-xs font-black shadow inline-flex items-center gap-1">
                    <Mic className="w-3 h-3" /> Voix
                  </div>
                )}
                {!isChild && (
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <button
                    onClick={() => setCustomFor(w)}
                    data-testid={`personalize-${w.lingala}`}
                    className="w-10 h-10 rounded-full bg-white/95 shadow-md hover:bg-white flex items-center justify-center active:scale-95"
                    aria-label="Personnaliser la photo"
                    title="Ajouter une photo personnelle"
                  >
                    <Camera className="w-5 h-5 text-brick" />
                  </button>
                  <button
                    onClick={() => openRecorder(w)}
                    data-testid={`record-${w.lingala}`}
                    className="w-10 h-10 rounded-full bg-white/95 shadow-md hover:bg-white flex items-center justify-center active:scale-95"
                    aria-label="Enregistrer ma voix"
                    title="Enregistrer ma voix Lingala"
                  >
                    <Mic className="w-5 h-5 text-brick" />
                  </button>
                </div>
                )}
                <button
                  onClick={() => playWord(w)}
                  data-testid={`word-audio-${w.lingala}`}
                  aria-label={`Écouter ${w.lingala}`}
                  className="absolute left-1/2 -bottom-6 -translate-x-1/2 w-14 h-14 rounded-full bg-sun-300 hover:bg-sun-500 shadow-lg flex items-center justify-center active:scale-95 transition-all border-4 border-white"
                >
                  <Volume2 className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-9 text-center">
                <div className="text-3xl font-black text-leaf">{w.lingala}</div>
                <div className="text-foreground/70 mt-1">{w.french}</div>
              </div>

              <p className="mt-4 text-sm text-foreground/70 italic text-center">
                « {w.example_ln} » — <span className="not-italic">{w.example_fr}</span>
                <button
                  onClick={() => playWord({ ...w, audio: null, lingala: w.example_ln })}
                  className="ml-2 text-brick underline"
                  data-testid={`example-audio-${w.lingala}`}
                >
                  écouter
                </button>
              </p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => markLearned(w.word_id)}
                  data-testid={`learn-btn-${w.lingala}`}
                  className={`flex-1 px-4 py-3 rounded-full font-bold active:scale-95 transition-all ${isLearned ? "bg-leaf text-white" : "bg-leaf-50 text-leaf-700 hover:bg-leaf hover:text-white"}`}
                >
                  {isLearned ? (<span className="inline-flex items-center gap-2 justify-center"><Check className="w-4 h-4" /> Appris</span>) : "J'ai appris"}
                </button>
                <button
                  onClick={() => setReportFor(w)}
                  data-testid={`report-btn-${w.lingala}`}
                  className="px-3 py-3 rounded-full bg-sand-100 text-foreground/70 hover:bg-brick-50 hover:text-brick"
                  aria-label="Signaler une erreur"
                  title="Signaler une erreur"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Personnaliser photo */}
      {customFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setCustomFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-md w-full" data-testid="personalize-modal">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-brick" />
              <div className="text-xl font-black">Personnaliser "{customFor.lingala}"</div>
            </div>
            <p className="text-sm text-foreground/70 mt-2">
              Ajoutez une photo de votre enfant, de votre famille ou d'un objet de la maison pour rendre l'apprentissage plus personnel.
            </p>
            <div className="mt-5 rounded-2xl bg-sand-100 p-6 text-center">
              {customFor.image ? (
                <img src={customFor.image} alt="" className="w-32 h-32 object-cover rounded-2xl mx-auto" />
              ) : (
                <ImageIcon className="w-16 h-16 mx-auto text-foreground/30" />
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button onClick={onPickImage} disabled={uploading} data-testid="upload-photo-btn" className="flex-1 ml-btn-primary disabled:opacity-60">
                {uploading ? "Envoi..." : customFor.custom ? "Changer la photo" : "Choisir une photo"}
              </button>
              {customFor.custom && (
                <button
                  onClick={() => removeCustom(customFor.word_id)}
                  data-testid="remove-photo-btn"
                  className="px-4 py-3 rounded-full bg-brick-50 text-brick-700 font-bold inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              )}
            </div>
            <button onClick={() => setCustomFor(null)} className="mt-3 w-full py-3 rounded-full bg-sand-100 font-bold">
              Annuler
            </button>
            <p className="mt-4 text-xs text-foreground/60 text-center">
              Image privée, visible par vous seulement. Max 400 Ko.
            </p>
          </div>
        </div>
      )}

      {/* Enregistrer la voix */}
      {recordFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={closeRecorder}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-md w-full" data-testid="record-modal">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-brick" />
              <div className="text-xl font-black">Enregistrer "{recordFor.lingala}"</div>
            </div>
            <p className="text-sm text-foreground/70 mt-2">
              Prononcez clairement le mot <strong>{recordFor.lingala}</strong> ({recordFor.french}). Max {MAX_RECORD_SEC} secondes. Un modérateur validera avant publication.
            </p>

            <div className="mt-6 rounded-3xl bg-sand-100 p-8 flex flex-col items-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-colors ${recording ? "bg-brick text-white animate-pulse" : recordedDataUrl ? "bg-leaf text-white" : "bg-white text-foreground/40 shadow-inner"}`}>
                {recordedDataUrl && !recording ? <Check className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
              </div>
              <div className="mt-4 text-2xl font-black tabular-nums" data-testid="record-timer">
                {recSec.toString().padStart(2, "0")} : {(MAX_RECORD_SEC - recSec).toString().padStart(2, "0")}
              </div>
              <div className="text-xs text-foreground/60 mt-1">
                {recording ? "Enregistrement..." : recordedDataUrl ? "Enregistrement prêt à envoyer" : "Prêt à enregistrer"}
              </div>

              {recordedUrl && (
                <audio
                  ref={previewAudioRef}
                  src={recordedUrl}
                  onEnded={() => setPreviewing(false)}
                  className="hidden"
                />
              )}
            </div>

            {recError && <div className="mt-3 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{recError}</div>}

            <div className="mt-6 flex flex-col gap-3">
              {!recording && !recordedDataUrl && (
                <button onClick={startRecording} data-testid="record-start" className="ml-btn-primary inline-flex items-center justify-center gap-2">
                  <Mic className="w-5 h-5" /> Démarrer
                </button>
              )}
              {recording && (
                <button onClick={stopRecording} data-testid="record-stop" className="ml-btn-primary bg-brick inline-flex items-center justify-center gap-2">
                  <Square className="w-5 h-5" /> Arrêter
                </button>
              )}
              {recordedDataUrl && !recording && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={togglePreview}
                    data-testid="record-preview"
                    className="py-3 rounded-full bg-sand-100 font-bold inline-flex items-center justify-center gap-2"
                  >
                    {previewing ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Écouter</>}
                  </button>
                  <button
                    onClick={() => { setRecordedUrl(""); setRecordedDataUrl(""); setRecSec(0); }}
                    data-testid="record-redo"
                    className="py-3 rounded-full bg-sand-100 font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> Refaire
                  </button>
                  <button
                    onClick={submitRecording}
                    disabled={submitting}
                    data-testid="record-submit"
                    className="col-span-2 ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" /> {submitting ? "Envoi..." : "Envoyer (+10 crédits)"}
                  </button>
                </div>
              )}
              <button onClick={closeRecorder} className="py-3 rounded-full bg-white border-2 border-sand-200 font-bold">
                Annuler
              </button>
            </div>
            <p className="mt-4 text-xs text-foreground/60 text-center">
              Votre voix aidera d'autres familles à entendre la vraie prononciation Lingala.
            </p>
          </div>
        </div>
      )}

      {reportFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setReportFor(null)}>
          <form
            onSubmit={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-md w-full"
            data-testid="report-modal"
          >
            <div className="text-xl font-black">Signaler une erreur</div>
            <p className="text-sm text-foreground/70 mt-1">Proposez une meilleure traduction pour <strong>{reportFor.lingala}</strong> (actuel : {reportFor.french}).</p>
            <input
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              required
              placeholder="Votre suggestion..."
              className="mt-4 w-full border-2 rounded-2xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
              data-testid="report-input"
            />
            {reportMsg && <div className="mt-3 text-sm text-leaf-700">{reportMsg}</div>}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setReportFor(null)} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Annuler</button>
              <button type="submit" className="flex-1 ml-btn-primary inline-flex items-center justify-center gap-2" data-testid="report-submit">
                <Send className="w-4 h-4" /> Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
