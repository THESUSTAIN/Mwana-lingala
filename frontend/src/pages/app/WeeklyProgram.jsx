import React, { useEffect, useState } from "react";
import { Calendar, Sparkles, Coins, RefreshCw, Wand2, Volume2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { speakLingala } from "@/components/AudioButton";
import { parseWeeklyProgram } from "@/lib/parseWeeklyProgram";

const ALL_THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
  { slug: "bible", label: "Bible / Valeurs" },
];

const COST = 12;

export default function WeeklyProgram() {
  const { user, setUser } = useAuth();
  const [program, setProgram] = useState(null);
  const [age, setAge] = useState(5);
  const [themes, setThemes] = useState(["famille", "emotions"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api.get("/weekly-program"),
        api.get("/child-profiles"),
      ]);
      if (p.data?.program_id) {
        setProgram(p.data);
        if (p.data.age) setAge(p.data.age);
        if (p.data.themes?.length) setThemes(p.data.themes);
      }
      if (c.data?.[0]?.age && !p.data?.program_id) setAge(c.data[0].age);
      if (c.data?.[0]?.themes?.length && !p.data?.program_id) setThemes(c.data[0].themes);
    } catch (_e) {}
  };

  useEffect(() => { load(); }, []);

  const toggleTheme = (slug) => {
    setThemes((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));
  };

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/weekly-program/generate", { age, themes: themes.length ? themes : ["famille"] });
      setProgram({ program_id: res.data.program_id, content: res.data.content, age, themes });
      if (res.data.credits_total != null) setUser({ ...user, credits: res.data.credits_total });
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const insufficient = (user?.credits || 0) < COST;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black inline-block relative">
            Programme hebdomadaire
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5 max-w-2xl">
            Un plan d'apprentissage Lingala sur 7 jours, généré par l'IA, adapté à l'âge de votre enfant et à vos thèmes prioritaires.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-sun-100 border border-sun-200" data-testid="programme-credits">
          <Coins className="w-5 h-5 text-brick" />
          <div>
            <div className="text-xs font-bold text-leaf">Vos crédits</div>
            <div className="text-xl font-black">{user?.credits || 0}</div>
          </div>
          <Link to="/app/mission" className="ml-2 text-xs font-bold text-leaf underline">+</Link>
        </div>
      </div>

      <div className="ml-card mt-8 p-6 bg-white" data-testid="programme-form">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brick" />
          <h2 className="text-lg font-black">Vos préférences</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-sm font-bold">Âge de l'enfant</span>
            <input
              type="number"
              min={0}
              max={15}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              data-testid="programme-age"
              className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
            />
          </label>
          <div>
            <span className="text-sm font-bold">Thèmes</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_THEMES.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTheme(t.slug)}
                  data-testid={`programme-theme-${t.slug}`}
                  className={`px-4 py-2 rounded-full font-bold border-2 text-sm ${themes.includes(t.slug) ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{error}</div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={generate}
            disabled={busy || insufficient}
            data-testid="programme-generate"
            className="ml-btn-primary disabled:opacity-60 inline-flex items-center gap-2"
          >
            {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
            {busy ? "Génération..." : program ? "Régénérer le programme" : "Générer mon programme"}
          </button>
          <span className="text-sm text-foreground/60 self-center">Coût : {COST} crédits</span>
          {insufficient && (
            <Link to="/app/mission" className="text-brick underline text-sm self-center font-bold">
              Gagner des crédits →
            </Link>
          )}
        </div>
      </div>

      {program?.content && (() => {
        const days = parseWeeklyProgram(program.content);
        const programId = program.program_id || "current";
        const checkedKey = `weekly_done_${programId}`;
        const checked = JSON.parse(localStorage.getItem(checkedKey) || "{}");
        const toggleDay = (n) => {
          const next = { ...checked, [n]: !checked[n] };
          localStorage.setItem(checkedKey, JSON.stringify(next));
          // force re-render via state hack
          setProgram((p) => ({ ...p }));
        };
        const doneCount = Object.values(checked).filter(Boolean).length;
        if (days.length === 0) {
          return (
            <div className="ml-card mt-6 p-7 bg-white" data-testid="programme-content">
              <div className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-brick" /><h2 className="text-xl font-black">Votre semaine Lingala</h2></div>
              <div className="mt-5 whitespace-pre-wrap leading-relaxed text-foreground/90">{program.content}</div>
            </div>
          );
        }
        return (
          <div className="mt-6" data-testid="programme-content">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="text-xl font-black inline-flex items-center gap-2"><Wand2 className="w-5 h-5 text-brick" /> Votre semaine Lingala</h2>
              <div className="text-sm font-bold text-leaf">{doneCount}/{days.length} jours faits ✓</div>
            </div>
            <div className="h-2 bg-sand-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-leaf transition-all" style={{ width: `${(doneCount / days.length) * 100}%` }} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {days.map((d) => {
                const isDone = !!checked[d.number];
                return (
                  <div key={d.number} className={`ml-card p-5 transition-all ${isDone ? "bg-leaf-50" : "bg-white"}`} data-testid={`day-${d.number}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-xs font-bold text-brick uppercase tracking-wider">Jour {d.number}</div>
                        <div className="text-lg font-black mt-0.5">{d.title || `Jour ${d.number}`}</div>
                      </div>
                      <button
                        onClick={() => toggleDay(d.number)}
                        data-testid={`day-${d.number}-check`}
                        className={`w-10 h-10 rounded-full font-black flex items-center justify-center transition-all shrink-0 ${isDone ? "bg-leaf text-white" : "bg-sand-100 text-foreground/40 hover:bg-leaf-50"}`}
                        aria-label={isDone ? "Jour fait" : "Marquer comme fait"}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>

                    {(d.word.ln || d.word.fr) && (
                      <div className="bg-sand-100 rounded-2xl p-3 mb-2 flex items-center gap-3">
                        <button
                          onClick={() => speakLingala(d.word.ln)}
                          data-testid={`day-${d.number}-word-audio`}
                          className="w-10 h-10 rounded-full bg-sun-300 hover:bg-sun-500 shrink-0 flex items-center justify-center"
                          aria-label="Écouter le mot"
                        >
                          <Volume2 className="w-5 h-5 text-foreground" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground/60 uppercase">Mot du jour</div>
                          <div className="font-black text-leaf">{d.word.ln}</div>
                          {d.word.fr && <div className="text-sm text-foreground/70">{d.word.fr}</div>}
                        </div>
                      </div>
                    )}

                    {(d.phrase.ln || d.phrase.fr) && (
                      <div className="bg-leaf-50 rounded-2xl p-3 mb-2 flex items-center gap-3">
                        <button
                          onClick={() => speakLingala(d.phrase.ln)}
                          data-testid={`day-${d.number}-phrase-audio`}
                          className="w-10 h-10 rounded-full bg-leaf hover:bg-leaf-700 text-white shrink-0 flex items-center justify-center"
                          aria-label="Écouter la phrase"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground/60 uppercase">Phrase</div>
                          <div className="font-black">{d.phrase.ln}</div>
                          {d.phrase.fr && <div className="text-sm text-foreground/70 italic">{d.phrase.fr}</div>}
                        </div>
                      </div>
                    )}

                    {d.activity && (
                      <div className="text-sm mt-2">
                        <span className="font-black text-brick">Activité : </span>
                        <span className="text-foreground/80">{d.activity}</span>
                      </div>
                    )}
                    {d.tip && (
                      <div className="text-sm mt-2 text-foreground/70 italic border-l-2 border-leaf pl-3">
                        💡 {d.tip}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {!program?.content && !busy && (
        <div className="ml-card mt-6 p-8 bg-white text-center" data-testid="programme-empty">
          <Calendar className="w-12 h-12 mx-auto text-foreground/30" />
          <p className="mt-3 text-foreground/70">
            Aucun programme actif. Choisissez vos préférences ci-dessus puis générez votre première semaine Lingala.
          </p>
        </div>
      )}
    </div>
  );
}
