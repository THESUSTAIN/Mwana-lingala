import React, { useState } from "react";
import { MessageCircle, Send, X, Star, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

export default function FeedbackWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = message.trim();
    if (trimmed.length < 4) {
      setError("Votre message est trop court (4 caractères minimum).");
      return;
    }
    setBusy(true);
    try {
      await api.post("/feedback", { message: trimmed, rating: rating || null, page: pathname });
      setSent(true);
      setMessage(""); setRating(0);
      setTimeout(() => { setSent(false); setOpen(false); }, 2500);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Vérifiez votre connexion et réessayez.");
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="feedback-fab"
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[60] px-4 py-3 rounded-full bg-leaf text-white shadow-2xl hover:bg-leaf-700 active:scale-95 flex items-center gap-2 font-bold text-sm"
          aria-label="Donner mon avis"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Vos retours</span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[60] w-[min(92vw,380px)] bg-white rounded-3xl shadow-2xl border border-sand-200 overflow-hidden"
          data-testid="feedback-panel"
        >
          <div className="bg-leaf text-white px-5 py-3 flex items-center justify-between">
            <div className="font-black inline-flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Vos retours
            </div>
            <button onClick={() => { setOpen(false); setError(""); }} className="p-1 hover:bg-white/20 rounded-full" data-testid="feedback-close" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="p-6 text-center" data-testid="feedback-thanks">
              <CheckCircle2 className="w-14 h-14 text-leaf mx-auto" />
              <div className="font-black mt-2 text-lg">Merci !</div>
              <div className="text-sm text-foreground/70 mt-1">Votre retour nous aide à améliorer Mwana Lingala.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-5">
              <div className="text-sm text-foreground/70 mb-2">Quel est votre ressenti ?</div>
              <div className="flex gap-1 mb-3" role="radiogroup" aria-label="Note">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    data-testid={`fb-star-${n}`}
                    aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                    className="p-1 active:scale-90 transition-transform"
                  >
                    <Star className={`w-7 h-7 ${rating >= n ? "fill-sun-300 text-sun-500" : "text-foreground/20"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); if (error) setError(""); }}
                placeholder="Ce que vous aimez, ce qui pourrait être mieux…"
                rows={4}
                data-testid="fb-message"
                className="w-full border-2 rounded-2xl px-4 py-3 bg-sand-100 outline-none focus:border-leaf text-sm"
                minLength={4}
                maxLength={2000}
              />
              <div className="text-xs text-foreground/50 mt-1 text-right">{message.length}/2000</div>

              {error && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm" data-testid="fb-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || message.trim().length < 4}
                data-testid="fb-submit"
                className="mt-3 w-full ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" /> {busy ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
