import React, { useEffect, useState } from "react";
import { ShieldCheck, Check, X, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/admin/submissions?status_filter=pending").then((r) => setItems(r.data)).catch(() => {});
  };

  useEffect(() => { if (user?.role === "admin") load(); }, [user]);

  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/app" replace />;

  const act = async (id, action) => {
    setBusy(id + action);
    try {
      await api.post(`/admin/submissions/${id}/${action}`);
      setMsg(`${action === "approve" ? "✓ Approuvé" : "✕ Rejeté"}`);
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-brick" />
        <h1 className="text-3xl sm:text-4xl font-black">Modération</h1>
      </div>
      <p className="text-foreground/70 mt-2">Validez ou rejetez les contributions en attente. Un mot approuvé est ajouté au dictionnaire public.</p>

      {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}

      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucune contribution en attente.</div>
        )}
        {items.map((s) => (
          <div key={s.submission_id} className="ml-card p-5 bg-white" data-testid={`admin-${s.submission_id}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <Clock className="w-3 h-3" /> Proposé par {s.user_name} · {s.theme}
                </div>
                <div className="text-2xl font-black text-leaf mt-1">{s.lingala}</div>
                <div className="text-foreground/80">{s.french}</div>
                {s.example_ln && (
                  <div className="text-sm italic text-foreground/70 mt-2">« {s.example_ln} » — {s.example_fr}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => act(s.submission_id, "approve")}
                  disabled={busy === s.submission_id + "approve"}
                  data-testid={`approve-${s.submission_id}`}
                  className="px-4 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approuver
                </button>
                <button
                  onClick={() => act(s.submission_id, "reject")}
                  disabled={busy === s.submission_id + "reject"}
                  data-testid={`reject-${s.submission_id}`}
                  className="px-4 py-2.5 rounded-full bg-brick-50 text-brick-700 font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Rejeter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
