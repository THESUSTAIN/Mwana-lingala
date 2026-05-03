import React, { useEffect, useState } from "react";
import { Mail, X, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CONSENT_STORAGE_KEY = "ml_consent_v1";

/**
 * Login-style modal that the user sees when starting a checkout while logged-out.
 *
 * Flow:
 *  - Google OAuth button — stores `pending_checkout` in sessionStorage, redirects to Google.
 *    The AuthCallback detects pending_checkout after Google callback and triggers /billing/checkout
 *    automatically — the user lands directly on the Mollie page.
 *  - Email OTP form — request OTP → verify in-modal → POST /billing/checkout → redirect to Mollie.
 *
 * No email is collected before payment when using Google (Mollie collects/validates it).
 */
export default function GuestCheckoutModal({ open, onClose, type, packId, title }) {
  const { setUser } = useAuth();
  const [stage, setStage] = useState("choose"); // "choose" | "otp"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(CONSENT_STORAGE_KEY) === "1") setConsent(true); } catch (_) { /* noop */ }
  }, []);

  useEffect(() => {
    if (open) {
      setStage("choose"); setErr(""); setInfo(""); setCode("");
    }
  }, [open]);

  if (!open) return null;

  const updateConsent = (checked) => {
    setConsent(checked);
    try {
      if (checked) localStorage.setItem(CONSENT_STORAGE_KEY, "1");
      else localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch (_) { /* noop */ }
  };

  const persistPending = () => {
    try {
      sessionStorage.setItem("pending_checkout", JSON.stringify({ type, pack_id: packId, ts: Date.now() }));
    } catch (_) { /* noop */ }
  };

  const startMollie = async () => {
    // After successful auth, kick off the real checkout
    const r = await api.post("/billing/checkout", { type, pack_id: packId });
    try {
      sessionStorage.setItem("last_payment_id", r.data.payment_id);
      sessionStorage.removeItem("pending_checkout");
    } catch (_) { /* noop */ }
    window.location.href = r.data.checkout_url;
  };

  const onGoogle = async () => {
    if (!consent) { setErr("Merci d'accepter les CGU et la politique RGPD avant de continuer."); return; }
    setErr("");
    persistPending();
    const redirectUri = window.location.origin + "/auth/google";
    try {
      const r = await api.get("/auth/google/start", { params: { redirect_uri: redirectUri } });
      if (r.data?.auth_url) { window.location.href = r.data.auth_url; return; }
      setErr("Connexion Google indisponible. Réessayez plus tard.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Connexion Google indisponible.");
    }
  };

  const onRequestOtp = async (e) => {
    e?.preventDefault();
    if (!consent) { setErr("Merci d'accepter les CGU et la politique RGPD avant de continuer."); return; }
    if (busy) return;
    setBusy(true); setErr(""); setInfo("");
    try {
      await api.post("/auth/request-otp", { email: email.trim() });
      setStage("otp");
      setInfo("Un code à 6 chiffres vient d'être envoyé à votre email.");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Erreur. Vérifiez votre adresse email.");
    } finally { setBusy(false); }
  };

  const onVerifyOtp = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const res = await api.post("/auth/verify-otp", { email: email.trim(), code: code.trim() });
      setUser(res.data.user);
      setInfo("Connexion réussie ! Redirection vers le paiement…");
      await startMollie();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Code invalide.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto"
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      data-testid="guest-checkout-modal"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 my-4 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-sand-100 text-foreground/60 disabled:opacity-50"
          data-testid="guest-checkout-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl sm:text-3xl font-black leading-tight pr-8" style={{ fontFamily: "Georgia,serif" }}>
          {title || "Continuer vers le paiement"}
        </h2>
        <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
          Connectez-vous en 1 clic — votre compte sera prêt avant le paiement.
        </p>

        {/* Consent checkbox (hidden after acceptance) */}
        <label className={`mt-4 flex items-start gap-3 cursor-pointer select-none ${consent ? "hidden" : ""}`}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => updateConsent(e.target.checked)}
            className="mt-1 w-5 h-5 accent-leaf shrink-0"
            data-testid="guest-checkout-consent"
          />
          <span className="text-xs text-foreground/70 leading-relaxed">
            J'accepte les{" "}
            <a href="/cgu" target="_blank" rel="noreferrer" className="font-bold text-leaf hover:underline">CGU</a>{" "}et la{" "}
            <a href="/rgpd" target="_blank" rel="noreferrer" className="font-bold text-leaf hover:underline">politique de confidentialité (RGPD)</a>.
          </span>
        </label>

        {err && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold" data-testid="guest-checkout-error">{err}</div>}
        {info && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 text-sm font-bold" data-testid="guest-checkout-info">{info}</div>}

        {stage === "choose" && (
          <>
            {/* Google */}
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="mt-5 w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full border-2 border-sand-200 bg-white hover:bg-sand-50 active:scale-[0.98] transition-all font-black text-foreground disabled:opacity-50"
              data-testid="guest-checkout-google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.85 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.67-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              Continuer avec Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-foreground/50">
              <div className="flex-1 h-px bg-sand-200" /> ou par email <div className="flex-1 h-px bg-sand-200" />
            </div>

            {/* Email OTP */}
            <form onSubmit={onRequestOtp} className="space-y-3">
              <label className="block">
                <span className="text-xs font-black text-foreground/70 uppercase tracking-wider">Votre email</span>
                <div className="mt-1 relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full border-2 rounded-2xl pl-11 pr-4 py-3 bg-sand-50 outline-none focus:border-brick"
                    data-testid="guest-checkout-email"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={busy || !email}
                className="w-full px-6 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform disabled:opacity-50 inline-flex items-center justify-center gap-2"
                data-testid="guest-checkout-otp-request"
              >
                {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Envoi du code…</>) : (<>Recevoir un code <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          </>
        )}

        {stage === "otp" && (
          <form onSubmit={onVerifyOtp} className="mt-5 space-y-3">
            <p className="text-sm text-foreground/70">Code envoyé à <span className="font-black">{email}</span>. Vérifiez vos spams si nécessaire.</p>
            <label className="block">
              <span className="text-xs font-black text-foreground/70 uppercase tracking-wider">Code à 6 chiffres</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-1 w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick text-center text-2xl font-black tracking-[0.5em]"
                data-testid="guest-checkout-otp-code"
              />
            </label>
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full px-6 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="guest-checkout-otp-verify"
            >
              {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>) : (<>Valider et payer <ArrowRight className="w-4 h-4" /></>)}
            </button>
            <button
              type="button"
              onClick={() => { setStage("choose"); setCode(""); setErr(""); setInfo(""); }}
              className="w-full text-center text-sm font-bold text-foreground/60 hover:text-foreground py-2"
              data-testid="guest-checkout-otp-back"
            >
              ← Changer d'email
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 text-xs text-foreground/50 justify-center mt-5 pt-4 border-t border-sand-100">
          <ShieldCheck className="w-3.5 h-3.5" /> Paiement sécurisé Mollie · SEPA · Carte · iDEAL · PayPal
        </div>
      </div>
    </div>
  );
}
