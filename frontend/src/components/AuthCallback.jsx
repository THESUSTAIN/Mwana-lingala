import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(res.data.user);
        // Clean the hash
        window.history.replaceState(null, "", window.location.pathname);
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
        <p className="mt-6 text-lg text-leaf font-bold">Connexion en cours…</p>
      </div>
    </div>
  );
}
