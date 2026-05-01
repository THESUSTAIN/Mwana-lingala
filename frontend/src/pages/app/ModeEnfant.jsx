import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Flag, Send, Check, Image as ImageIcon, Volume2, Camera, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { speakLingala } from "@/components/AudioButton";

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

export default function ModeEnfant() {
  const { user } = useAuth();
  const [theme, setTheme] = useState("famille");
  const [words, setWords] = useState([]);
  const [learned, setLearned] = useState([]);
  const [reportFor, setReportFor] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const [customFor, setCustomFor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const include = user?.christian_mode ? true : false;

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
                <button
                  onClick={() => setCustomFor(w)}
                  data-testid={`personalize-${w.lingala}`}
                  className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/95 shadow-md hover:bg-white flex items-center justify-center active:scale-95"
                  aria-label="Personnaliser la photo"
                  title="Ajouter une photo personnelle"
                >
                  <Camera className="w-5 h-5 text-brick" />
                </button>
                <button
                  onClick={() => speakLingala(w.lingala)}
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
                  onClick={() => speakLingala(w.example_ln)}
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

      {/* Personnaliser */}
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
