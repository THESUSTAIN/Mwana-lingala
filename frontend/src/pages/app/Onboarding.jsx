import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Baby, Smile, ArrowRight, Sparkles, Heart, Plane, Users, Globe2, GraduationCap, BookHeart, MessageCircle } from "lucide-react";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
];

// Motivation options — the keys MUST match the backend MOTIVATION_OPTIONS dict
const MOTIVATIONS = [
  { key: "transmettre", label: "Transmettre la langue à mon enfant", icon: Heart, color: "brick", desc: "Que mes enfants gardent un lien fort avec leurs racines." },
  { key: "apprendre", label: "Apprendre moi-même le lingala", icon: BookHeart, color: "leaf", desc: "Pour mieux comprendre, parler, chanter en lingala." },
  { key: "famille", label: "Communiquer avec la famille au pays", icon: MessageCircle, color: "sun", desc: "Pour parler avec mes grands-parents, oncles, cousins." },
  { key: "racines", label: "Renouer avec mes racines culturelles", icon: Globe2, color: "leaf", desc: "Réapprendre la langue, la culture, l'identité congolaise." },
  { key: "voyage", label: "Préparer un voyage / retour au pays", icon: Plane, color: "brick", desc: "Pour me sentir chez moi en arrivant à Kinshasa." },
  { key: "ecole", label: "Pour la scolarité ou un projet", icon: GraduationCap, color: "sun", desc: "Mémoire, étude, recherche, projet pédagogique." },
  { key: "autre", label: "Autre raison", icon: Users, color: "sand", desc: "Décrivez-nous votre besoin en quelques mots." },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [motivation, setMotivation] = useState("");
  const [motivationOther, setMotivationOther] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState(5);
  const [themes, setThemes] = useState(["famille", "nourriture"]);
  const [christian, setChristian] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/onboarding/status")
      .then((r) => {
        if (!r.data.needs_onboarding) {
          navigate("/app", { replace: true });
        } else {
          // Resume on the right step depending on what's already done
          if (r.data.has_motivation && !r.data.has_child_profile) setStep(2);
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  const toggleTheme = (slug) =>
    setThemes((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  const saveMotivation = async () => {
    if (!motivation) return;
    setLoading(true); setError("");
    try {
      await api.post("/onboarding/motivation", {
        motivation,
        motivation_other: motivation === "autre" ? motivationOther : null,
      });
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur. Réessayez.");
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError("");
    try {
      await api.post("/child-profiles", { name, age: Number(age), themes, christian_mode: christian });
      if (christian) {
        await api.patch("/auth/settings", { christian_mode: true });
      }
      try { localStorage.setItem("profile_mode", "parent"); } catch (_) { /* noop */ }
      const destination = Number(age) <= 3 ? "/app/bebe" : "/app/enfant";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brick border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="onboarding-page">
      <header className="px-6 py-5 border-b border-sand-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/logo-mwana-lingala.png" alt="Mwana Lingala — Apprendre le lingala en s'amusant" className="w-10 h-10 object-contain" />
            <div className="text-xl font-black hidden sm:block">
              <span className="text-leaf">Mwana</span> <span className="text-brick">Lingala</span>
            </div>
          </div>
          <div className="text-sm text-foreground/60">Bienvenue, {user?.name?.split(" ")[0]}</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full">
          {/* Progress dots — 3 steps now */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-2 rounded-full transition-all ${n <= step ? "bg-brick w-10" : "bg-sand-200 w-6"}`}
              />
            ))}
          </div>

          {/* STEP 1 — Motivation */}
          {step === 1 && (
            <div className="ml-card p-6 sm:p-10 bg-white" data-testid="onboarding-step-1">
              <div className="flex items-center gap-2 text-leaf font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Étape 1 / 3
              </div>
              <h1 className="text-2xl sm:text-4xl font-black mt-2 leading-tight" style={{ fontFamily: "Georgia,serif" }}>
                Pourquoi utilisez-vous <span className="text-leaf">Mwana Lingala</span> ?
              </h1>
              <p className="text-foreground/70 mt-2 text-sm sm:text-base">
                Votre réponse nous aide à personnaliser votre expérience. Une seule réponse, modifiable plus tard.
              </p>

              <div className="mt-6 space-y-2.5">
                {MOTIVATIONS.map((m) => {
                  const Icon = m.icon;
                  const active = motivation === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setMotivation(m.key)}
                      data-testid={`onboarding-motivation-${m.key}`}
                      className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                        active
                          ? "border-brick bg-brick-50 shadow-md"
                          : "border-sand-200 bg-white hover:border-leaf-200 hover:bg-sand-50"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-brick text-white" : "bg-sand-100 text-foreground/60"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-black leading-snug ${active ? "text-brick" : ""}`}>{m.label}</div>
                        <div className="text-xs text-foreground/60 mt-0.5">{m.desc}</div>
                      </div>
                      {active && (
                        <div className="w-6 h-6 rounded-full bg-brick text-white flex items-center justify-center shrink-0 text-sm font-black">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {motivation === "autre" && (
                <input
                  autoFocus
                  value={motivationOther}
                  onChange={(e) => setMotivationOther(e.target.value)}
                  placeholder="Décrivez votre raison en quelques mots…"
                  className="mt-3 w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
                  data-testid="onboarding-motivation-other"
                  maxLength={200}
                />
              )}

              {error && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{error}</div>}

              <button
                onClick={saveMotivation}
                disabled={!motivation || loading || (motivation === "autre" && motivationOther.trim().length < 3)}
                data-testid="onboarding-next-1"
                className="mt-6 w-full ml-btn-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? "…" : (<>Continuer <ArrowRight className="w-5 h-5" /></>)}
              </button>
            </div>
          )}

          {/* STEP 2 — Child name */}
          {step === 2 && (
            <div className="ml-card p-6 sm:p-10 bg-white" data-testid="onboarding-step-2">
              <div className="flex items-center gap-2 text-leaf font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Étape 2 / 3
              </div>
              <h1 className="text-2xl sm:text-4xl font-black mt-2" style={{ fontFamily: "Georgia,serif" }}>
                Prénom de votre enfant ?
              </h1>
              <p className="text-foreground/70 mt-2">Pour personnaliser l'expérience.</p>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Zayado"
                className="mt-6 w-full border-2 rounded-2xl px-5 py-4 bg-sand-100 outline-none focus:border-brick text-2xl font-black"
                data-testid="onboarding-name"
              />
              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-full bg-sand-100 font-bold" data-testid="onboarding-back-2">Retour</button>
                <button
                  onClick={() => name.trim() && setStep(3)}
                  disabled={!name.trim()}
                  data-testid="onboarding-next-2"
                  className="flex-1 ml-btn-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  Continuer <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Child age + themes + christian */}
          {step === 3 && (
            <form onSubmit={submit} className="ml-card p-6 sm:p-10 bg-white" data-testid="onboarding-step-3">
              <div className="flex items-center gap-2 text-leaf font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Étape 3 / 3
              </div>
              <h1 className="text-2xl sm:text-4xl font-black mt-2" style={{ fontFamily: "Georgia,serif" }}>Quel âge a {name} ?</h1>
              <p className="text-foreground/70 mt-2 text-sm sm:text-base">
                On ouvrira directement le bon mode :
                {Number(age) <= 3 ? (
                  <span className="inline-flex items-center gap-1 ml-1 text-leaf font-bold">
                    <Baby className="w-4 h-4" /> Mode Bébé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 ml-1 text-leaf font-bold">
                    <Smile className="w-4 h-4" /> Mode Enfant
                  </span>
                )}
              </p>

              <div className="mt-6">
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-brick"
                  data-testid="onboarding-age-range"
                />
                <div className="text-center text-5xl font-black text-brick mt-3" data-testid="onboarding-age-display">
                  {age} <span className="text-base text-foreground/60 font-bold">ans</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-bold">Thèmes préférés</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button
                      type="button"
                      key={t.slug}
                      onClick={() => toggleTheme(t.slug)}
                      data-testid={`onboarding-theme-${t.slug}`}
                      className={`px-4 py-2 rounded-full font-bold border-2 ${themes.includes(t.slug) ? "bg-leaf text-white border-leaf" : "bg-white border-sand-200"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={christian}
                  onChange={(e) => setChristian(e.target.checked)}
                  data-testid="onboarding-christian"
                />
                <span>Activer le mode chrétien (mots bibliques, prières courtes)</span>
              </label>

              {error && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm">{error}</div>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Retour</button>
                <button type="submit" disabled={loading} className="flex-1 ml-btn-primary disabled:opacity-60" data-testid="onboarding-finish">
                  {loading ? "…" : "Commencer"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
