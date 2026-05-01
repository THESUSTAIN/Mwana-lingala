import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Baby, Smile, ArrowRight, Sparkles } from "lucide-react";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
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
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  const toggleTheme = (slug) =>
    setThemes((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  const submit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError("");
    try {
      await api.post("/child-profiles", { name, age: Number(age), themes, christian_mode: christian });
      if (christian) {
        await api.patch("/auth/settings", { christian_mode: true });
      }
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
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-xl font-black">
            <span className="text-leaf">Mwana</span> <span className="text-brick">Lingala</span>
          </div>
          <div className="text-sm text-foreground/60">Bienvenue, {user?.name?.split(" ")[0]}</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-2 rounded-full transition-all ${n <= step ? "bg-brick w-10" : "bg-sand-200 w-6"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="ml-card p-8 sm:p-10 bg-white" data-testid="onboarding-step-1">
              <div className="flex items-center gap-2 text-leaf font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Étape 1 / 2
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mt-2">Prénom de votre enfant ?</h1>
              <p className="text-foreground/70 mt-2">Pour personnaliser l'expérience.</p>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Zayado"
                className="mt-6 w-full border-2 rounded-2xl px-5 py-4 bg-sand-100 outline-none focus:border-brick text-2xl font-black"
                data-testid="onboarding-name"
              />
              <button
                onClick={() => name.trim() && setStep(2)}
                disabled={!name.trim()}
                data-testid="onboarding-next-1"
                className="mt-6 w-full ml-btn-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                Continuer <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="ml-card p-8 sm:p-10 bg-white" data-testid="onboarding-step-2">
              <div className="flex items-center gap-2 text-leaf font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Étape 2 / 2
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mt-2">Quel âge a {name} ?</h1>
              <p className="text-foreground/70 mt-2">
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
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Retour</button>
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
