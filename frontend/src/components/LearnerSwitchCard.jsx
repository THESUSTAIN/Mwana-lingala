import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Users, ArrowRight, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * LearnerSwitchCard — quick visual switcher between Parent (family) and Adult (solo) modes.
 *
 * Rendered at the top of the dashboard so users always see they have the option.
 * - For PARENT users: shows a card "Vous apprenez aussi pour vous ? → Activer le mode adulte"
 * - For ADULT users: shows a card "Apprendre pour vos enfants aussi ? → Revenir au mode famille"
 *
 * Persists dismissal locally (per session) — but only the dismiss button hides it,
 * the toggle itself remains in /app/parametres.
 */
export default function LearnerSwitchCard() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem("ml_hide_learner_switch") === "1"; }
    catch (_) { return false; }
  });
  const isAdult = user?.learner_type === "adult" || user?.motivation === "apprendre";
  const next = isAdult ? "parent" : "adult";

  if (hidden || !user) return null;

  const switchTo = async () => {
    setBusy(true);
    try {
      await api.patch("/auth/learner-type", { learner_type: next });
      setUser({ ...user, learner_type: next });
    } catch (_e) { /* noop */ }
    finally { setBusy(false); }
  };

  const dismiss = () => {
    try { sessionStorage.setItem("ml_hide_learner_switch", "1"); } catch (_) { /* noop */ }
    setHidden(true);
  };

  if (!isAdult) {
    // Parent → suggest adult solo mode
    return (
      <div
        className="ml-card relative p-5 sm:p-6 bg-gradient-to-br from-leaf-50 to-white border-2 border-leaf-100"
        data-testid="learner-switch-card"
      >
        <button
          onClick={dismiss}
          aria-label="Masquer"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/60 hover:bg-white text-foreground/60 flex items-center justify-center"
          data-testid="learner-switch-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-leaf text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-leaf uppercase tracking-widest">Vous apprenez aussi pour vous ?</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">Activez le mode adulte (solo)</div>
            <p className="text-sm text-foreground/70 mt-1">
              Test de niveau gratuit, phrases voyage, coach IA dédié — sans toucher à votre profil famille.
            </p>
          </div>
          <button
            onClick={switchTo}
            disabled={busy}
            data-testid="learner-switch-to-adult"
            className="ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? "…" : (<>Activer <ArrowRight className="w-4 h-4" /></>)}
          </button>
        </div>
        <div className="mt-3 text-xs text-foreground/50">
          Astuce : vous pouvez aussi basculer à tout moment depuis <Link to="/app/parametres" className="font-bold underline hover:text-brick">Paramètres</Link>.
        </div>
      </div>
    );
  }

  // Adult → suggest going back to family mode
  return (
    <div
      className="ml-card relative p-5 sm:p-6 bg-gradient-to-br from-brick-50 to-white border-2 border-brick-100"
      data-testid="learner-switch-card"
    >
      <button
        onClick={dismiss}
        aria-label="Masquer"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/60 hover:bg-white text-foreground/60 flex items-center justify-center"
        data-testid="learner-switch-dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brick text-white flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-brick uppercase tracking-widest">Apprendre aussi avec vos enfants ?</div>
          <div className="text-lg sm:text-xl font-black mt-0.5">Activez le mode famille</div>
          <p className="text-sm text-foreground/70 mt-1">
            Modes Bébé / Enfant, profil enfant, suivi parent. Vous gardez votre progression actuelle.
          </p>
        </div>
        <button
          onClick={switchTo}
          disabled={busy}
          data-testid="learner-switch-to-parent"
          className="ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? "…" : (<>Activer <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </div>
    </div>
  );
}
