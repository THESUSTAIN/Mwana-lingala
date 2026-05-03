import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
// This component handles Google's OAuth redirect at `${origin}/auth/google?code=…&state=…`.
// The `state` is passed back to the backend so it can retrieve the PKCE code_verifier
// stored during /auth/google/start. The state is a one-time value (deleted on read) —
// replay attempts naturally fail at the backend.
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error || !code) {
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    (async () => {
      try {
        const redirectUri = window.location.origin + "/auth/google";
        const res = await api.post("/auth/google/exchange", { code, redirect_uri: redirectUri, state });
        setUser(res.data.user);
        window.history.replaceState(null, "", "/");
        // Always start in Parent mode after a fresh login.
        try { localStorage.setItem("profile_mode", "parent"); } catch (_) { /* noop */ }

        // If the user started a checkout while logged-out, finish it now: hit /billing/checkout
        // and redirect straight to the Mollie payment page (skipping the app entirely).
        let pending = null;
        try { pending = JSON.parse(sessionStorage.getItem("pending_checkout") || "null"); } catch (_) { /* noop */ }
        if (pending && pending.type) {
          try {
            const r = await api.post("/billing/checkout", { type: pending.type, pack_id: pending.pack_id || null });
            sessionStorage.setItem("last_payment_id", r.data.payment_id);
            sessionStorage.removeItem("pending_checkout");
            window.location.href = r.data.checkout_url;
            return;
          } catch (e) {
            console.error("Pending checkout failed", e);
            // Fall through to /app — user is logged in but checkout failed.
          }
        }

        // First-time users: redirect to /onboarding so we can capture their motivation
        try {
          const status = await api.get("/onboarding/status");
          if (status.data?.needs_onboarding) {
            navigate("/onboarding", { replace: true });
            return;
          }
        } catch (_) { /* noop */ }

        navigate("/app", { replace: true });
      } catch (e) {
        console.error("Auth callback failed", e);
        const d = e?.response?.data?.detail;
        const reason = (typeof d === "object" && d?.detail_code) ? d.detail_code : "";
        navigate(`/login?error=auth_failed${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`, { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto border-4 border-brick border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 text-lg text-leaf font-bold">Connexion avec Google…</p>
      </div>
    </div>
  );
}
