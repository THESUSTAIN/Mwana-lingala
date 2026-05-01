import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Flag, Send, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AudioButton, { speakLingala } from "@/components/AudioButton";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
];

export default function ModeEnfant() {
  const { user } = useAuth();
  const [theme, setTheme] = useState("famille");
  const [words, setWords] = useState([]);
  const [learned, setLearned] = useState([]);
  const [reportFor, setReportFor] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [reportMsg, setReportMsg] = useState("");

  const include = user?.christian_mode ? true : false;

  useEffect(() => {
    api.get(`/words?theme=${theme}&include_christian=${include}`).then((r) => setWords(r.data));
    api.get("/progress").then((r) => setLearned(r.data.learned_word_ids || [])).catch(() => {});
  }, [theme, include]);

  const markLearned = async (word_id) => {
    setLearned((l) => (l.includes(word_id) ? l : [...l, word_id]));
    try {
      await api.post("/progress", { word_id, learned: true });
    } catch (_e) {}
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Mode Enfant</h1>
          <p className="text-foreground/70 mt-1">Écoute, regarde, répète. Puis teste-toi.</p>
        </div>
        <Link to="/app/enfant/quiz" className="ml-btn-secondary inline-flex items-center gap-2" data-testid="child-go-quiz">
          <Star className="w-5 h-5" /> Lancer un quiz
        </Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {THEMES.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTheme(t.slug)}
            data-testid={`child-theme-${t.slug}`}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap ${theme === t.slug ? "bg-brick text-white" : "bg-white text-foreground/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {words.map((w) => {
          const isLearned = learned.includes(w.word_id);
          return (
            <div key={w.word_id} className="ml-card p-6 bg-white" data-testid={`word-card-${w.lingala}`}>
              {w.image && (
                <img src={w.image} alt={w.french} className="rounded-2xl w-full aspect-[4/3] object-cover" />
              )}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black text-brick">{w.lingala}</div>
                  <div className="text-foreground/70">{w.french}</div>
                </div>
                <AudioButton text={w.lingala} size="lg" testId={`word-audio-${w.lingala}`} />
              </div>
              <p className="mt-3 text-sm text-foreground/70 italic">
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
                  {isLearned ? (<span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> Appris</span>) : "J’ai appris"}
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

      {/* Report modal */}
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
              className="mt-4 w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
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
