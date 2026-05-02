import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

export default function ParentalGate({ open, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setErr("");
      setNeedsSetup(false);
      return;
    }
    // On open: check if a code is configured
    api.get("/auth/parental-code/status")
      .then((r) => setNeedsSetup(!r.data?.configured))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr("");
    if (!code || !code.trim()) {
      setErr("Veuillez saisir votre code parental");
      return;
    }
    if (!/^\d{4,8}$/.test(code)) {
      setErr("Le code doit contenir 4 à 8 chiffres");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/verify-parental-code", { code });
      setCode("");
      onSuccess?.();
    } catch (ex) {
      const status = ex?.response?.status;
      if (status === 412) {
        setNeedsSetup(true);
        setErr("");
      } else {
        setErr(ex?.response?.data?.detail || "Code incorrect");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="parental-gate"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-leaf-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-leaf" />
          </div>
          <div>
            <div className="text-xs font-black text-leaf uppercase tracking-widest">Zone parent</div>
            <div className="text-lg font-black">Code parental</div>
          </div>
        </div>

        {needsSetup ? (
          <div className="mt-4 p-4 rounded-2xl bg-sun-100 border-2 border-sun-300" data-testid="parental-needs-setup">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-brick" />
              <div className="text-sm">
                <div className="font-black text-foreground">Aucun code parental défini</div>
                <p className="mt-1 text-foreground/75">
                  Pour protéger l'accès à l'espace parent, vous devez d'abord créer un code à 4 chiffres.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">
                Plus tard
              </button>
              <Link
                to="/app/parametres"
                onClick={onClose}
                data-testid="parental-go-setup"
                className="flex-1 py-3 rounded-full bg-leaf text-white font-black active:scale-95 text-center"
              >
                Créer le code
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground/70 mt-2">
              Entrez votre code parental à 4 chiffres pour accéder à la zone parent.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              maxLength={8}
              data-testid="parental-code-input"
              className="mt-4 w-full text-center text-3xl tracking-widest font-black border-2 rounded-2xl px-4 py-4 bg-sand-100 outline-none focus:border-leaf"
            />
            {err && <div className="mt-3 p-2 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold" data-testid="parental-error">{err}</div>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !code}
                data-testid="parental-code-submit"
                className="flex-1 py-3 rounded-full bg-leaf text-white font-black active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "..." : "Valider"}
              </button>
            </div>
            <p className="mt-4 text-xs text-foreground/60 text-center">
              Pas encore de code ? <Link to="/app/parametres" onClick={onClose} className="underline font-bold">Définissez-le dans Paramètres</Link>.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
