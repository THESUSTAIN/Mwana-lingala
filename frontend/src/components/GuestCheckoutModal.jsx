import React, { useState } from "react";
import { Mail, X, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Modal asking for an email to start a guest checkout (no login required).
 * After the modal submits, parent receives the Mollie checkout URL and redirects.
 *
 * Props:
 * - open
 * - onClose
 * - type: "subscription" | "pack"
 * - packId?: string
 * - title?: string
 */
export default function GuestCheckoutModal({ open, onClose, type, packId, title }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const submit = async (e) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post("/billing/checkout-guest", {
        type,
        pack_id: packId,
        email: email.trim(),
        name: name.trim() || undefined,
      });
      try {
        sessionStorage.setItem("last_payment_id", r.data.payment_id);
        sessionStorage.setItem("guest_claim_token", r.data.claim_token);
        sessionStorage.setItem("guest_email", email.trim());
      } catch (_) { /* noop */ }
      window.location.href = r.data.checkout_url;
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Erreur lors du paiement");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      data-testid="guest-checkout-modal"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-sand-100 text-foreground/60 disabled:opacity-50"
          data-testid="guest-checkout-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-leaf-50 flex items-center justify-center mb-4">
          <Mail className="w-7 h-7 text-leaf" strokeWidth={2.25} />
        </div>

        <h2 className="text-2xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
          {title || "Continuer vers le paiement"}
        </h2>
        <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
          Entrez votre email pour finaliser. Votre compte sera créé automatiquement et vous serez connecté(e) après paiement — pas de mot de passe à retenir.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-black text-foreground/70 uppercase tracking-wider">Email *</span>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="mt-1 w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
              data-testid="guest-checkout-email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-foreground/70 uppercase tracking-wider">Prénom (optionnel)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marie"
              className="mt-1 w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
              data-testid="guest-checkout-name"
            />
          </label>

          {err && <div className="p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{err}</div>}

          <button
            type="submit"
            disabled={!valid || busy}
            className="w-full px-6 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform disabled:opacity-50 inline-flex items-center justify-center gap-2"
            data-testid="guest-checkout-submit"
          >
            {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Redirection…</>) : "Payer en sécurité →"}
          </button>

          <div className="flex items-center gap-2 text-xs text-foreground/50 justify-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Paiement sécurisé Mollie · SEPA · Carte · iDEAL · PayPal
          </div>
        </form>
      </div>
    </div>
  );
}
