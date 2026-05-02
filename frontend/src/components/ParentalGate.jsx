import React, { useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";

export default function ParentalGate({ open, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr("");
    try {
      await api.post("/auth/verify-parental-code", { code });
      setCode("");
      onSuccess?.();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Code incorrect");
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
        <p className="text-sm text-foreground/70 mt-2">
          Entrez votre code parental à 4 chiffres. Si vous n'en avez pas encore, laissez vide et cliquez sur Valider.
        </p>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="• • • •"
          maxLength={8}
          data-testid="parental-code-input"
          className="mt-4 w-full text-center text-3xl tracking-widest font-black border-2 rounded-2xl px-4 py-4 bg-sand-100 outline-none focus:border-leaf"
        />
        {err && <div className="mt-3 p-2 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{err}</div>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">
            Annuler
          </button>
          <button type="submit" data-testid="parental-code-submit" className="flex-1 py-3 rounded-full bg-leaf text-white font-black active:scale-95">
            Valider
          </button>
        </div>
        <p className="mt-4 text-xs text-foreground/60 text-center">
          Pas encore de code ? Définissez-le dans <strong>Paramètres</strong>.
        </p>
      </form>
    </div>
  );
}
