import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Flag, Send, Check, Image as ImageIcon, Volume2, Camera, Trash2, Mic, Square, Play, Pause } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { playWord } from "@/components/AudioButton";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
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
  const [theme, setTheme] = useState("famille");
  const [words, setWords] = useState([]);
  const [learned, setLearned] = useState([]);
  const [reportFor, setReportFor] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const [customFor, setCustomFor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const include = !!user?.christian_mode;

  const loadWords = () => {
    api.get(`/words?theme=${theme}&include_christian=${include}`).then((r) => setWords(r.data));
  };
  const loadProgress = () => {
    api.get("/progress").then((r) => setLearned(r.data.learned_word_ids || [])).catch(() => {});
  };

  useEffect(() => {
    loadWords();
    loadProgress();
    // eslint-disable-next-line
  }, [theme, include]);

  const markLearned = async (word_id) => {
    setLearned((l) => (l.includes(word_id) ? l : [...l, word_id]));
    try { await api.post("/progress", { word_id, learned: true }); } catch (_e) {}
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
            Mode Enfant
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5">Écoute, regarde, répète. Puis teste-toi.</p>
        </div>
        <Link to="/app/enfant/quiz" className="ml-btn-primary inline-flex items-center gap-2" data-testid="child-go-quiz">
          <Star className="w-5 h-5" /> Lancer un quiz
        </Link>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {THEMES.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTheme(t.slug)}
            data-testid={`child-theme-${t.slug}`}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap border-2 transition-all ${theme === t.slug ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200 hover:border-leaf/40"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {words.map((w) => {
          const isLearned = learned.includes(w.word_id);
          const hasCommunityAudio = !!w.audio;
          return (
            <div key={w.word_id} className="ml-card p-5 bg-white" data-testid={`word-card-${w.lingala}`}>
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
