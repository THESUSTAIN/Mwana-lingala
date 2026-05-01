import React, { useState } from "react";
import { MessageCircle, Send, X, Star } from "lucide-react";
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

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await api.post("/feedback", { message, rating: rating || null, page: pathname });
      setSent(true);
      setMessage(""); setRating(0);
      setTimeout(() => { setSent(false); setOpen(false); }, 2200);
    } catch (_e) {
      // silent
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="feedback-fab"
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full bg-leaf text-white shadow-2xl hover:bg-leaf-700 active:scale-95 flex items-center justify-center"
          aria-label="Donner mon avis"
          title="Donner mon avis"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[min(92vw,360px)] bg-white rounded-3xl shadow-2xl border border-sand-200 overflow-hidden" data-testid="feedback-panel">
          <div className="bg-leaf text-white px-5 py-3 flex items-center justify-between">
            <div className="font-black inline-flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Vos retours</div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-full" data-testid="feedback-close" aria-label="Fermer"><X className="w-4 h-4" /></button>
          </div>
          {sent ? (
            <div className="p-6 text-center" data-testid="feedback-thanks">
              <div className="text-5xl mb-2">🙏</div>
              <div className="font-black">Merci !</div>
              <div className="text-sm text-foreground/70 mt-1">Votre retour nous aide à améliorer Mwana Lingala.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-5">
              <div className="text-sm text-foreground/70 mb-2">Quel est votre ressenti ?</div>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} data-testid={`fb-star-${n}`} className="p-1">
                    <Star className={`w-7 h-7 ${rating >= n ? "fill-sun-300 text-sun-500" : "text-foreground/20"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ce que vous aimez, ce qui pourrait être mieux..."
                rows={4}
                data-testid="fb-message"
                className="w-full border-2 rounded-2xl px-4 py-3 bg-sand-100 outline-none focus:border-leaf text-sm"
                required
              />
              <button
                type="submit"
                disabled={busy || !message.trim()}
                data-testid="fb-submit"
                className="mt-3 w-full ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {busy ? "Envoi..." : "Envoyer"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
