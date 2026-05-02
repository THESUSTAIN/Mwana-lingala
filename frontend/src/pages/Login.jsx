import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, AlertCircle } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("request"); // "request" | "verify"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const queryError = new URLSearchParams(location.search).get("error");

  const handleGoogle = async () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUri = window.location.origin + "/auth/google";
    try {
      const r = await api.get("/auth/google/start", { params: { redirect_uri: redirectUri } });
      if (r.data?.auth_url) {
        window.location.href = r.data.auth_url;
      } else {
        setError("Connexion Google indisponible. Réessayez plus tard.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Connexion Google indisponible.");
    }
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await api.post("/auth/request-otp", { email });
      setMode("verify");
      setInfo("Un code à 6 chiffres vient d'être envoyé à votre adresse.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur. Vérifiez votre adresse email.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, code });
      setUser(res.data.user);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Code invalide.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-14">
        <div className="ml-card p-8 sm:p-10 bg-white">
          <h1 className="text-3xl font-black">Bienvenue</h1>
          <p className="mt-2 text-foreground/70">Connectez-vous pour accéder à votre espace parent.</p>

          {queryError === "auth_failed" && (
            <div className="mt-4 flex items-start gap-2 p-4 rounded-2xl bg-brick-50 text-brick-700 text-sm" data-testid="auth-error">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>La connexion Google a échoué. Réessayez.</span>
            </div>
          )}

          <button
            onClick={handleGoogle}
            data-testid="google-login-btn"
            className="mt-6 w-full flex items-center justify-center gap-3 border-2 border-foreground/15 bg-white text-foreground rounded-full px-6 py-4 font-bold hover:bg-sand-100 active:scale-95 transition-all"
          >
            <svg width="22" height="22" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.3 18.9 14 24 14c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.4 0-9.7-3.5-11.3-8l-6.5 5C9.4 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.2 5.2C41 36.5 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continuer avec Google
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-foreground/50">
            <div className="h-px flex-1 bg-border" />
            ou par email
            <div className="h-px flex-1 bg-border" />
          </div>

          {mode === "request" ? (
            <form onSubmit={requestOtp} className="space-y-4" data-testid="otp-request-form">
              <label className="block">
                <span className="text-sm font-bold">Adresse email</span>
                <div className="mt-1 flex items-center gap-2 border-2 rounded-2xl px-4 py-3 bg-sand-100 focus-within:border-brick">
                  <Mail className="w-5 h-5 text-foreground/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="flex-1 bg-transparent outline-none"
                    data-testid="otp-email-input"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                data-testid="otp-request-btn"
                className="w-full ml-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? "Envoi..." : (<>Recevoir un code <ArrowRight className="w-5 h-5" /></>)}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4" data-testid="otp-verify-form">
              <div className="text-sm">Code envoyé à <strong>{email}</strong>. <button type="button" className="underline text-brick" onClick={() => setMode("request")}>changer</button></div>
              <label className="block">
                <span className="text-sm font-bold">Code à 6 chiffres</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="mt-1 w-full border-2 rounded-2xl px-4 py-4 bg-sand-100 font-black text-2xl tracking-[0.6em] text-center focus:border-brick outline-none"
                  data-testid="otp-code-input"
                />
              </label>
              <button
                type="submit"
                disabled={loading || code.length < 6}
                data-testid="otp-verify-btn"
                className="w-full ml-btn-primary disabled:opacity-60"
              >
                {loading ? "Vérification..." : "Se connecter"}
              </button>
            </form>
          )}

          {info && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 text-sm" data-testid="otp-info">{info}</div>}
          {error && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm" data-testid="otp-error">{error}</div>}

          <p className="mt-6 text-xs text-foreground/60 text-center">
            En continuant, vous acceptez nos <Link to="/mentions-legales" className="underline">mentions légales</Link>.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
