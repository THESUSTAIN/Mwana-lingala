import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
// This component handles Google's OAuth redirect at `${origin}/auth/google?code=…&state=…`.
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
        navigate("/login?error=auth_failed", { replace: true });
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
