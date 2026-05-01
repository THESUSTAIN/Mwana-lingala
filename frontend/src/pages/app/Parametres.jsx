import React, { useEffect, useState } from "react";
import { Settings, Lock, Check, X, BookOpenText, LogOut, Trash2, UserCog, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Parametres() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [codeConfigured, setCodeConfigured] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [christianMode, setChristianMode] = useState(!!user?.christian_mode);
  const [settingsMsg, setSettingsMsg] = useState("");

  const refreshCodeStatus = () => {
    api.get("/auth/parental-code/status").then((r) => setCodeConfigured(!!r.data.configured)).catch(() => {});
  };
  useEffect(() => { refreshCodeStatus(); }, []);

  const saveCode = async (e) => {
    e.preventDefault();
    setCodeMsg(""); setCodeErr("");
    if (!/^\d{4,8}$/.test(newCode)) { setCodeErr("Le code doit contenir 4 à 8 chiffres."); return; }
    if (newCode !== confirmCode) { setCodeErr("Les deux codes ne correspondent pas."); return; }
    try {
      await api.post("/auth/parental-code", { code: newCode });
      setCodeMsg("✓ Code enregistré");
      setNewCode(""); setConfirmCode("");
      refreshCodeStatus();
      setTimeout(() => setCodeMsg(""), 2500);
    } catch (err) {
      setCodeErr(err?.response?.data?.detail || "Erreur");
    }
  };

  const removeCode = async () => {
    if (!window.confirm("Supprimer le code parental ? Tout le monde pourra switcher en mode parent.")) return;
    try {
      await api.delete("/auth/parental-code");
      setCodeMsg("Code supprimé");
      refreshCodeStatus();
      setTimeout(() => setCodeMsg(""), 2500);
    } catch (err) {
      setCodeErr(err?.response?.data?.detail || "Erreur");
    }
  };

  const toggleChristian = async () => {
    const next = !christianMode;
    setChristianMode(next);
    try {
      await api.patch("/auth/settings", { christian_mode: next });
      setUser({ ...user, christian_mode: next });
      setSettingsMsg("✓ Préférence enregistrée");
      setTimeout(() => setSettingsMsg(""), 2000);
    } catch (_e) {
      setChristianMode(!next);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10 space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-leaf-50 flex items-center justify-center shrink-0">
          <Settings className="w-7 h-7 text-leaf" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Paramètres</h1>
          <p className="text-foreground/70 mt-1">Gérez votre compte, votre code parental et vos préférences.</p>
        </div>
      </div>

      {/* Compte */}
      <section className="ml-card p-6 bg-white border-2 border-sand-200" data-testid="account-card">
        <div className="flex items-center gap-3 mb-3">
          <UserCog className="w-5 h-5 text-leaf" />
          <div className="text-lg font-black">Votre compte</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-foreground/60 font-bold">Nom</div>
            <div className="font-bold">{user?.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-bold">Email</div>
            <div className="font-bold">{user?.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-bold">Crédits IA</div>
            <div className="font-bold text-leaf">{user?.credits || 0}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-bold">Abonnement</div>
            <div className="font-bold">{user?.is_premium ? "Premium ✨" : "Gratuit"}</div>
          </div>
        </div>
      </section>

      {/* Code parental */}
      <section className="ml-card p-6 bg-white border-2 border-sand-200" data-testid="parental-code-card">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-5 h-5 text-brick" />
          <div className="text-lg font-black">Code parental</div>
          <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${codeConfigured ? "bg-leaf-50 text-leaf" : "bg-sand-100 text-foreground/60"}`}>
            {codeConfigured ? "Configuré" : "Non configuré"}
          </span>
        </div>
        <p className="text-sm text-foreground/70">
          Ce code à 4-8 chiffres verrouille l'accès au mode Parent. Si votre enfant essaie de quitter le mode Enfant, il devra saisir ce code.
        </p>
        <form onSubmit={saveCode} className="mt-4 grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold">Nouveau code (4 à 8 chiffres)</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              maxLength={8}
              data-testid="new-parental-code"
              className="mt-1 w-full border-2 rounded-2xl px-4 py-3 bg-sand-100 outline-none focus:border-brick text-center tracking-widest font-black text-xl"
              placeholder="••••"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Confirmer le code</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              maxLength={8}
              data-testid="confirm-parental-code"
              className="mt-1 w-full border-2 rounded-2xl px-4 py-3 bg-sand-100 outline-none focus:border-brick text-center tracking-widest font-black text-xl"
              placeholder="••••"
            />
          </label>
          <div className="sm:col-span-2 flex gap-3 flex-wrap">
            <button
              type="submit"
              data-testid="save-parental-code"
              className="ml-btn-primary inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {codeConfigured ? "Mettre à jour le code" : "Créer le code"}
            </button>
            {codeConfigured && (
              <button
                type="button"
                onClick={removeCode}
                data-testid="remove-parental-code"
                className="px-4 py-3 rounded-full bg-brick-50 text-brick-700 font-bold inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            )}
          </div>
          {codeMsg && <div className="sm:col-span-2 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold text-sm">{codeMsg}</div>}
          {codeErr && <div className="sm:col-span-2 p-3 rounded-xl bg-brick-50 text-brick-700 font-bold text-sm">{codeErr}</div>}
        </form>
      </section>

      {/* Préférences */}
      <section className="ml-card p-6 bg-white border-2 border-sand-200" data-testid="preferences-card">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-sun-500" />
          <div className="text-lg font-black">Préférences de contenu</div>
        </div>
        <label className="flex items-start gap-3 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={christianMode}
            onChange={toggleChristian}
            data-testid="toggle-christian-mode"
            className="mt-1 w-5 h-5 accent-leaf"
          />
          <div>
            <div className="font-bold inline-flex items-center gap-2">
              <BookOpenText className="w-4 h-4 text-leaf" /> Mode chrétien (optionnel)
            </div>
            <p className="text-sm text-foreground/70">
              Active les contenus bibliques doux (versets, prières, mots de foi) en plus des thèmes classiques.
            </p>
          </div>
        </label>
        {settingsMsg && <div className="mt-3 p-2 rounded-xl bg-leaf-50 text-leaf-700 font-bold text-sm">{settingsMsg}</div>}
      </section>

      {/* Déconnexion */}
      <section className="ml-card p-6 bg-white border-2 border-sand-200">
        <button
          onClick={() => { logout(); navigate("/"); }}
          data-testid="settings-logout"
          className="w-full px-5 py-3 rounded-full bg-brick-50 text-brick-700 font-bold inline-flex items-center justify-center gap-2 hover:bg-brick-100"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </section>
    </div>
  );
}
