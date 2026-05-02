import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * MaintenanceGate — when /api/maintenance/status returns enabled=true,
 * render a dedicated maintenance page for everyone except admins
 * and except for these always-allowed paths: /login, /auth/google, /api/*, /app/admin, /admin
 *
 * Optimized:
 *  - Single fetch on mount + revalidate every 60s only when active
 *  - Cached check via sessionStorage for instant first render after navigation
 *  - Admin bypass (role==='admin') so admins can keep working/disabling maintenance
 */

const ALWAYS_ALLOWED_PREFIXES = [
  "/login",
  "/auth/google",
  "/app/admin",
  "/widget/", // keep external widgets working during maintenance
];

const CACHE_KEY = "ml_maintenance_v1";

export default function MaintenanceGate({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (_) { /* noop */ }
    return { enabled: false, message: "" };
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await api.get("/maintenance/status");
        if (cancelled) return;
        const next = { enabled: !!r.data.enabled, message: r.data.message || "" };
        setState(next);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch (_) { /* noop */ }
      } catch (_) { /* network failure → keep last cached state */ }
    };
    check();
    const id = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Bypass logic
  const isAdmin = user?.role === "admin";
  const path = location.pathname || "/";
  const isAlwaysAllowed = ALWAYS_ALLOWED_PREFIXES.some((p) => path.startsWith(p));

  if (state.enabled && !isAdmin && !isAlwaysAllowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sand-100 via-white to-leaf-50 flex items-center justify-center px-6 py-16" data-testid="maintenance-page">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brick text-white shadow-lg mb-6">
            <Wrench className="w-10 h-10" strokeWidth={2.25} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight">
            <span className="text-brick">Mwana Lingala</span> revient bientôt
          </h1>
          <p className="mt-4 text-lg text-foreground/75 leading-relaxed">
            {state.message ||
              "Nous améliorons l'application pour mieux transmettre le Lingala à votre enfant. Merci de votre patience — nous revenons dans quelques minutes."}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-foreground/60">
            <span className="w-2 h-2 rounded-full bg-leaf animate-pulse" />
            Maintenance en cours
          </div>
          <div className="mt-10 text-xs text-foreground/50">
            Une question urgente ? <a href="mailto:contact@mwana-lingala.com" className="underline font-bold text-brick">contact@mwana-lingala.com</a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
