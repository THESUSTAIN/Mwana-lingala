import React from "react";
import { useNavigate } from "react-router-dom";
import { Coins, X, Sparkles } from "lucide-react";

/**
 * Modal shown when the user attempts an action but has insufficient credits.
 * CTA redirects to /tarifs (or /app/mission for free credits).
 */
export default function LowCreditsModal({ open, onClose, required = 0, current = 0, action = "" }) {
  const navigate = useNavigate();
  if (!open) return null;
  const missing = Math.max(required - current, 1);

  return (
    <div
      className="fixed inset-0 z-[120] bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-credits-title"
      data-testid="low-credits-modal"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 sm:p-8 relative animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-sand-100 text-foreground/60"
          data-testid="low-credits-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-sun-100 flex items-center justify-center mb-4">
          <Coins className="w-9 h-9 text-brick" strokeWidth={2.25} />
        </div>

        <h2 id="low-credits-title" className="text-2xl sm:text-3xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
          Plus de crédits, plus de Lingala ✨
        </h2>
        <p className="mt-3 text-foreground/80 leading-relaxed">
          {action ? <>L'action <span className="font-black">{action}</span> nécessite <span className="font-black text-brick">{required} crédits</span>.</> : <>Cette action nécessite <span className="font-black text-brick">{required} crédits</span>.</>}
          {" "}Vous avez actuellement <span className="font-black">{current}</span> crédit{current > 1 ? "s" : ""} — il vous en manque <span className="font-black text-brick">{missing}</span>.
        </p>

        <div className="mt-5 ml-card p-4 bg-leaf-50 border border-leaf-100">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-leaf shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-black text-leaf-700">Pack 5 € = 500 crédits</div>
              <div className="text-foreground/70 mt-0.5">≈ 100 traductions, 60 phrases ou 60 histoires IA pour votre enfant.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { onClose?.(); navigate("/tarifs"); }}
            className="flex-1 px-6 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform"
            data-testid="low-credits-buy"
          >
            Acheter des crédits
          </button>
          <button
            onClick={() => { onClose?.(); navigate("/app/mission"); }}
            className="flex-1 px-6 py-3.5 rounded-full bg-sun-100 text-foreground font-black hover:bg-sun-200 active:scale-95 transition-transform"
            data-testid="low-credits-earn"
          >
            Gagner gratuitement
          </button>
        </div>

        <p className="text-xs text-foreground/50 mt-4 text-center">
          Paiements sécurisés · SEPA, carte, iDEAL, PayPal
        </p>
      </div>
    </div>
  );
}
