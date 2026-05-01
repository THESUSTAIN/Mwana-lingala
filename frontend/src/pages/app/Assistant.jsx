import React, { useEffect, useState } from "react";
import { Sparkles, Coins, Wand2, MessageSquareText, BookOpen, Heart, Activity, Languages, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// One-click buttons (sensible defaults). "translate" needs a small input.
const ONE_CLICK = [
  { key: "daily_sentences", label: "Créer 3 phrases pour mon enfant", icon: MessageSquareText, cost: 3, bg: "bg-sun-100" },
  { key: "mini_story", label: "Raconter une histoire", icon: BookOpen, cost: 8, bg: "bg-leaf-50" },
  { key: "prayer", label: "Faire une prière", icon: Heart, cost: 5, bg: "bg-brick-50" },
  { key: "activity", label: "Activité parent-enfant du jour", icon: Activity, cost: 4, bg: "bg-sand-100" },
  { key: "sentence", label: "Une phrase simple", icon: Sparkles, cost: 1, bg: "bg-white" },
];

const THEMES = ["famille", "nourriture", "emotions", "bible"];

function pick(arr, n = 1) {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

export default function Assistant() {
  const { user, setUser } = useAuth();
  const [result, setResult] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [translateInput, setTranslateInput] = useState("");
  const [childAge, setChildAge] = useState(5);
  const [learnedWords, setLearnedWords] = useState(["mama", "tata", "mayi"]);
  const [advanced, setAdvanced] = useState(false);
  const [advParams, setAdvParams] = useState({ theme: "famille", age: 5 });

  useEffect(() => {
    // Load first child profile for age/learned words defaults
    api.get("/child-profiles").then((r) => {
      if (r.data?.[0]?.age) { setChildAge(r.data[0].age); setAdvParams((p) => ({ ...p, age: r.data[0].age })); }
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
    setBusyKey(b.key);
    setError("");
    setResult("");
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
    setBusyKey("translate");
    setError("");
    setResult("");
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
    setBusyKey(key);
    setError("");
    setResult("");
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black inline-block relative">
            Assistant IA
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5">Un clic. L'IA s'occupe du reste — adaptée à l'âge de votre enfant.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-sun-100 border border-sun-200" data-testid="assistant-credits">
          <Coins className="w-5 h-5 text-brick" />
          <div>
            <div className="text-xs font-bold text-leaf">Vos crédits</div>
            <div className="text-xl font-black">{user?.credits || 0}</div>
          </div>
          <Link to="/app/mission" className="ml-2 text-xs font-bold text-leaf underline">+</Link>
        </div>
      </div>

      {/* ONE-CLICK BIG BUTTONS */}
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {ONE_CLICK.map((b) => {
          const insufficient = (user?.credits || 0) < b.cost;
          return (
            <button
              key={b.key}
              onClick={() => runOneClick(b)}
              disabled={busyKey !== "" || insufficient}
              data-testid={`ai-action-${b.key}`}
              className={`ml-card p-6 text-left ${b.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
                  <b.icon className="w-7 h-7 text-brick" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-black leading-tight">{b.label}</div>
                  <div className="text-xs text-foreground/70 mt-1">{busyKey === b.key ? "Génération..." : `Coût : ${b.cost} crédit${b.cost > 1 ? "s" : ""}`}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Traduction — quick input */}
      <div className="ml-card mt-5 p-6 bg-white" data-testid="translate-card">
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
            disabled={busyKey !== "" || !translateInput.trim() || (user?.credits || 0) < 2}
            data-testid="translate-btn"
            className="ml-btn-primary disabled:opacity-60"
          >
            {busyKey === "translate" ? "…" : "Traduire"}
          </button>
        </div>
      </div>

      {/* Result */}
      {(result || error) && (
        <div className="ml-card mt-5 p-6 bg-white" data-testid="assistant-result-card">
          {error && <div className="p-3 rounded-xl bg-brick-50 text-brick-700 font-bold">{error}</div>}
          {result && (
            <div className="flex gap-3 items-start">
              <Wand2 className="w-6 h-6 text-brick shrink-0 mt-1" />
              <div className="whitespace-pre-wrap leading-relaxed flex-1" data-testid="assistant-result">{result}</div>
            </div>
          )}
        </div>
      )}

      {/* Advanced toggle */}
      <button
        onClick={() => setAdvanced((a) => !a)}
        className="mt-8 text-sm text-foreground/60 underline inline-flex items-center gap-1"
        data-testid="toggle-advanced"
      >
        <Settings2 className="w-4 h-4" /> {advanced ? "Masquer" : "Options avancées"}
      </button>
      {advanced && (
        <div className="ml-card mt-3 p-6 bg-white" data-testid="advanced-panel">
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
                className="px-4 py-2 rounded-full bg-white border-2 border-sand-200 font-bold text-sm hover:border-brick/40 disabled:opacity-60"
              >
                {b.label} ({b.cost} cr.)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
