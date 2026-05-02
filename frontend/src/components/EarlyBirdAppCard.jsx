import React, { useEffect, useState } from "react";
import { Gift, Sparkles, Check, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * In-app Early Bird card — shown on the authenticated dashboard for non-Premium users.
 * - Live counter "2 parents sur 10 ont réservé — Il reste X places !"
 * - Hides itself when the user has already claimed (user.is_premium + early_bird).
 * - Graceful fallback when the offer is no longer active.
 */
export default function EarlyBirdAppCard() {
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    api.get("/early-bird/status").then((r) => setStatus(r.data)).catch(() => {});
  }, []);

  // Never show to users that already benefit
  if (!user || user?.early_bird || user?.is_premium) return null;
  if (!status || !status.active) return null;

  const percentClaimed = Math.min(100, Math.round((status.claimed / Math.max(1, status.limit)) * 100));

  const claim = async () => {
    setBusy(true);
    setInfo("");
    try {
      const r = await api.post("/early-bird/claim");
      setInfo(`Premium activé jusqu'au ${new Date(r.data.premium_until).toLocaleDateString("fr-FR")} ! +100 crédits IA.`);
      // refresh user context
      try {
        const me = await api.get("/auth/me");
        setUser(me.data);
      } catch (_) { /* noop */ }
    } catch (err) {
      setInfo(err?.response?.data?.detail || "Erreur. Réessayez.");
    } finally { setBusy(false); }
  };

  return (
    <div
      className="ml-card p-5 sm:p-6 bg-gradient-to-br from-brick via-orange-500 to-sun-500 text-white relative overflow-hidden"
      data-testid="early-bird-app-card"
    >
      {/* Decorative gift icon */}
      <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
        <Gift className="w-32 h-32" strokeWidth={1} />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Offre de lancement</span>
        </div>

        <h3 className="mt-2 text-xl sm:text-2xl font-black leading-tight">
          Premium gratuit <span className="underline decoration-yellow-200 decoration-2 underline-offset-2">{status.trial_days} jours</span> + 100 crédits IA
        </h3>

        {/* Live counter + progress bar */}
        <div className="mt-4 text-sm font-bold flex items-center gap-2" data-testid="early-bird-counter">
          <Users className="w-4 h-4" />
          <span>
            <strong className="text-yellow-200">{status.claimed}</strong> {status.claimed <= 1 ? "parent" : "parents"} sur <strong>{status.limit}</strong> en bénéficient déjà.
            {status.remaining > 0 && (
              <> Il reste <strong className="text-yellow-200">{status.remaining}</strong> {status.remaining === 1 ? "place" : "places"}&nbsp;!</>
            )}
          </span>
        </div>
        <div className="mt-2 w-full h-2 bg-white/25 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-yellow-200 transition-all duration-500"
            style={{ width: `${percentClaimed}%` }}
          />
        </div>

        <button
          type="button"
          onClick={claim}
          disabled={busy || status.remaining === 0}
          data-testid="early-bird-app-claim"
          className="mt-5 px-6 py-3 rounded-full bg-white text-brick font-black hover:bg-yellow-100 active:scale-95 shadow-md disabled:opacity-60 inline-flex items-center gap-2"
        >
          {busy ? "…" : status.remaining === 0 ? "Offre épuisée" : (<><Check className="w-4 h-4" /> Je réserve ma place</>)}
        </button>

        {info && (
          <div className="mt-3 text-sm bg-white/95 text-foreground rounded-xl px-3 py-2 font-bold" data-testid="early-bird-app-info">
            {info}
          </div>
        )}
      </div>
    </div>
  );
}
