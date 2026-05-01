import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <Gift className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0 text-sm sm:text-base font-bold">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> OFFRE DE LANCEMENT :</span>{" "}
          les <span className="text-yellow-200 font-black">{status.remaining}</span> derniers parents reçoivent l'accès Premium <strong>gratuit pendant {status.trial_days} jours</strong> + 100 crédits IA.
        </div>
        <button
          onClick={claim}
          disabled={busy}
          data-testid="earlybird-claim"
          className="px-5 py-2 rounded-full bg-white text-brick font-black hover:bg-yellow-100 active:scale-95 disabled:opacity-60"
        >
          {busy ? "..." : "Je réserve ma place"}
        </button>
        <button onClick={dismiss} aria-label="Fermer" className="p-1 hover:bg-white/20 rounded-full" data-testid="earlybird-dismiss"><X className="w-4 h-4" /></button>
      </div>
      {msg && <div className="bg-white/95 text-foreground text-sm font-bold px-4 py-2 text-center" data-testid="earlybird-msg">{msg}</div>}
    </div>
  );
}
