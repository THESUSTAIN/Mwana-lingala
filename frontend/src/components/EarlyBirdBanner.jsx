import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function EarlyBirdBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("eb_dismissed") === "1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api.get("/early-bird/status").then((r) => setStatus(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!status || !status.active || hidden) return null;

  const claim = async () => {
    if (!user) { navigate("/login?next=earlybird"); return; }
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/early-bird/claim");
      setMsg(`✓ Premium activé ! +100 crédits, valable jusqu'au ${new Date(r.data.premium_until).toLocaleDateString("fr-FR")}`);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  const dismiss = () => { setHidden(true); sessionStorage.setItem("eb_dismissed", "1"); };

  return (
    <div className="bg-gradient-to-r from-brick via-orange-500 to-sun-500 text-white relative" data-testid="earlybird-banner">
      {/* Close button — top right on mobile, absolute */}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute top-2 right-2 sm:top-1/2 sm:right-3 sm:-translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full z-10"
        data-testid="earlybird-dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-3 pr-10 sm:pr-12">
        {/* Desktop: horizontal / Mobile: stacked */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Text block */}
          <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
            <Gift className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-sm sm:text-base leading-snug">
              <div className="flex items-center gap-1.5 font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wide text-xs sm:text-sm">Offre de lancement</span>
              </div>
              <div className="mt-0.5 font-bold">
                Les <span className="text-yellow-200 font-black">{status.remaining}</span> derniers parents — Premium <strong>gratuit {status.trial_days} jours</strong> + 100 crédits IA.
              </div>
            </div>
          </div>

          {/* CTA button — full width on mobile, auto on desktop */}
          <button
            onClick={claim}
            disabled={busy}
            data-testid="earlybird-claim"
            className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-full bg-white text-brick font-black text-sm sm:text-base hover:bg-yellow-100 active:scale-95 disabled:opacity-60 shadow-sm"
          >
            {busy ? "..." : "Je réserve ma place"}
          </button>
        </div>
      </div>
      {msg && (
        <div className="bg-white/95 text-foreground text-xs sm:text-sm font-bold px-4 py-2 text-center" data-testid="earlybird-msg">
          {msg}
        </div>
      )}
    </div>
  );
}
