import React, { useState } from "react";
import { Sparkles, Coins, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ACTIONS = [
  { key: "sentence", label: "Une phrase simple", cost: 1, fields: ["theme", "age"] },
  { key: "daily_sentences", label: "3 phrases du jour", cost: 3, fields: ["theme", "age"] },
  { key: "translate", label: "Traduire une phrase", cost: 2, fields: ["french"] },
  { key: "mini_story", label: "Mini-histoire apprenante", cost: 8, fields: ["words", "age"] },
  { key: "prayer", label: "Prière simple", cost: 5, fields: ["theme", "age"] },
  { key: "activity", label: "Activité parent-enfant", cost: 4, fields: ["word", "age"] },
];

const FIELD_CONFIG = {
  theme: { label: "Thème", placeholder: "famille", default: "famille" },
  age: { label: "Âge enfant", placeholder: "5", default: "5", type: "number" },
  french: { label: "Phrase française", placeholder: "Je t'aime mon enfant", default: "" },
  words: { label: "Mots clés (séparés par virgule)", placeholder: "mama, bolingo, mayi", default: "" },
  word: { label: "Mot Lingala", placeholder: "mayi", default: "" },
};

export default function Assistant() {
  const { user, setUser } = useAuth();
  const [selected, setSelected] = useState(ACTIONS[0]);
  const [values, setValues] = useState({ theme: "famille", age: "5" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleAction = (a) => {
    setSelected(a);
    const v = {};
    a.fields.forEach((f) => (v[f] = FIELD_CONFIG[f].default));
    setValues(v);
    setResult("");
    setError("");
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const params = { ...values };
      if (params.age) params.age = Number(params.age);
      const r = await api.post("/ai/generate", { action: selected.key, params });
      setResult(r.data.content);
      setUser({ ...user, credits: r.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const insufficient = (user?.credits || 0) < selected.cost;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black inline-block relative">
            Assistant IA
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5">Phrases, histoires, prières, activités — centrés sur votre enfant.</p>
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

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 mt-8">
        {/* Actions sidebar */}
        <div className="space-y-2">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => handleAction(a)}
              data-testid={`ai-action-${a.key}`}
              className={`w-full text-left p-4 rounded-2xl border-2 font-bold transition-all ${selected.key === a.key ? "bg-brick text-white border-brick" : "bg-white border-sand-200 hover:border-brick/40"}`}
            >
              <div className="flex items-center justify-between">
                <span>{a.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selected.key === a.key ? "bg-white/20" : "bg-sun-100 text-foreground"}`}>{a.cost} cr.</span>
              </div>
            </button>
          ))}
        </div>

        {/* Form + result */}
        <div className="ml-card p-6 bg-white" data-testid="assistant-panel">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brick" />
            <h2 className="text-xl font-black">{selected.label}</h2>
            <span className="ml-auto text-xs font-bold text-foreground/60">Coût : {selected.cost} crédits</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {selected.fields.map((f) => (
              <label key={f} className="block">
                <span className="text-sm font-bold">{FIELD_CONFIG[f].label}</span>
                <input
                  type={FIELD_CONFIG[f].type || "text"}
                  value={values[f] || ""}
                  onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                  placeholder={FIELD_CONFIG[f].placeholder}
                  className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
                  data-testid={`assistant-field-${f}`}
                />
              </label>
            ))}
          </div>

          {insufficient && (
            <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">
              Crédits insuffisants ({selected.cost} requis). <Link to="/app/mission" className="underline">Gagnez-en</Link> ou <Link to="/tarifs" className="underline">achetez un pack</Link>.
            </div>
          )}
          {error && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm">{error}</div>}

          <button
            onClick={generate}
            disabled={loading || insufficient}
            data-testid="assistant-generate-btn"
            className="mt-5 ml-btn-primary disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> {loading ? "Génération..." : `Générer (−${selected.cost} crédits)`}
          </button>

          {result && (
            <div className="mt-6 p-5 rounded-2xl bg-sand-100 whitespace-pre-wrap leading-relaxed" data-testid="assistant-result">
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
