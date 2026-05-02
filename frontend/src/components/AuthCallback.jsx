import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
// This component handles Google's OAuth redirect at `${origin}/auth/google?code=…&state=…`.
// We also de-dup the code using sessionStorage to survive React re-mounts and guarantee
// the code is exchanged exactly once (Google invalidates it after first use).
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    // Persistent de-dup: prevent re-using a code already consumed by a previous
    // mount/refresh of this route.
    const storageKey = "ml_oauth_code_used";
    let lastUsed = null;
    try { lastUsed = sessionStorage.getItem(storageKey); } catch (_) { /* ignore */ }
    if (lastUsed === code) {
      navigate("/login?error=auth_failed&reason=code_used", { replace: true });
      return;
    }
    try { sessionStorage.setItem(storageKey, code); } catch (_) { /* ignore */ }

    (async () => {
      try {
        const redirectUri = window.location.origin + "/auth/google";
        const res = await api.post("/auth/google/exchange", { code, redirect_uri: redirectUri });
        setUser(res.data.user);
        // Clean URL
        window.history.replaceState(null, "", "/");
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
