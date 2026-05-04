import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, LogOut, GraduationCap, Users, Smile } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

/**
 * Coherent 3-way profile switcher:
 *  - "Apprendre pour moi" (adult solo learner)  → learner_type = "adult"
 *  - "Famille" (parent who teaches kids)        → learner_type = "parent" + profile_mode = "parent"
 *  - "Mode <enfant>" (1 per child profile)      → profile_mode = "child" + activeChild = X
 *
 * Switching to adult/family is API-backed (PATCH /auth/learner-type).
 * Switching to a child profile is purely local (profile_mode + activeChild).
 */
export default function ProfileSwitcher({ collapsed, isChild, switchTo }) {
  const { user, setUser, logout, childProfiles, activeChild } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const isAdult = !isChild && (user?.learner_type === "adult" || user?.motivation === "apprendre");

  // Active label + emoji
  let activeLabel, activeSubtitle, activeIcon;
  if (isChild) {
    activeLabel = activeChild?.name ? `Mode ${activeChild.name}` : "Mode enfant";
    activeSubtitle = activeChild ? `${activeChild.age} ans` : "Profil enfant";
    activeIcon = "🧒";
  } else if (isAdult) {
    activeLabel = "Apprendre pour moi";
    activeSubtitle = "Mode adulte (solo)";
    activeIcon = "🎓";
  } else {
    activeLabel = "Famille";
    activeSubtitle = "Apprendre avec mes enfants";
    activeIcon = "👨‍👩‍👧";
  }

  // Switch to adult learner mode (API-backed)
  const switchToAdult = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch("/auth/learner-type", { learner_type: "adult" });
      setUser({ ...user, learner_type: "adult" });
      switchTo("parent"); // ensure profile_mode is "parent" (not "child")
      setOpen(false);
      navigate("/app");
    } catch (_e) { /* noop */ }
    finally { setBusy(false); }
  };

  // Switch to family/parent mode (API-backed)
  const switchToFamily = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (user?.learner_type !== "parent") {
        await api.patch("/auth/learner-type", { learner_type: "parent" });
        setUser({ ...user, learner_type: "parent" });
      }
      switchTo("parent");
      setOpen(false);
      navigate("/app");
    } catch (_e) { /* noop */ }
    finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="profile-switcher"
        className={`w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-sand-100 transition-colors ${collapsed ? "justify-center" : ""}`}
      >
        {user?.picture ? (
          <img src={user.picture} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className={`w-9 h-9 rounded-full font-black flex items-center justify-center ${isChild ? "bg-sun-200 text-foreground" : (isAdult ? "bg-leaf-50 text-leaf" : "bg-brick-50 text-brick")}`}>
            {isChild ? (activeChild?.name?.[0]?.toUpperCase() || "🧒") : (user?.name?.[0]?.toUpperCase() || "?")}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-bold truncate">{isChild ? (activeChild?.name || "Enfant") : user?.name}</div>
              <div className="text-xs text-foreground/60 inline-flex items-center gap-1 truncate">
                <span>{activeIcon}</span> <span className="truncate">{activeLabel}</span>
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-foreground/60" /> : <ChevronDown className="w-4 h-4 text-foreground/60" />}
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-sand-200 rounded-2xl shadow-xl p-2 z-30 max-h-[70vh] overflow-y-auto" data-testid="profile-switcher-menu">
          <div className="px-3 pt-1.5 pb-1 text-[10px] font-black text-foreground/50 uppercase tracking-widest">
            {activeSubtitle}
          </div>

          {/* Apprendre pour moi (adult solo) */}
          <button
            onClick={switchToAdult}
            disabled={busy}
            data-testid="switch-adult"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold transition-colors ${isAdult ? "bg-leaf-50 text-leaf" : "hover:bg-sand-100"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdult ? "bg-leaf text-white" : "bg-leaf-50 text-leaf"}`}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm min-w-0">
              <div className="truncate">Apprendre pour moi</div>
              <div className="text-xs font-normal text-foreground/60 truncate">Mode adulte · solo, A1 → B2</div>
            </div>
            {isAdult && <span className="text-leaf text-xs">●</span>}
          </button>

          {/* Famille (parent) */}
          <button
            onClick={switchToFamily}
            disabled={busy}
            data-testid="switch-parent"
            className={`mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold transition-colors ${!isChild && !isAdult ? "bg-brick-50 text-brick" : "hover:bg-sand-100"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!isChild && !isAdult ? "bg-brick text-white" : "bg-brick-50 text-brick"}`}>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm min-w-0">
              <div className="truncate">Famille</div>
              <div className="text-xs font-normal text-foreground/60 truncate">Apprendre avec mes enfants</div>
            </div>
            {!isChild && !isAdult && <span className="text-brick text-xs">●</span>}
          </button>

          {/* Children profiles (only meaningful when in family mode) */}
          {childProfiles.length > 0 && (
            <>
              <div className="mt-2 mb-1 px-3 text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                Profils enfants
              </div>
              {childProfiles.map((p) => {
                const isThisActive = isChild && activeChild?.profile_id === p.profile_id;
                return (
                  <button
                    key={p.profile_id}
                    onClick={() => { switchTo("child", p); setOpen(false); }}
                    data-testid={`switch-child-${p.profile_id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold transition-colors ${isThisActive ? "bg-sun-100 text-foreground" : "hover:bg-sand-100"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-sun-200 text-foreground flex items-center justify-center font-black shrink-0">
                      {(p.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-sm min-w-0">
                      <div className="truncate">Mode {p.name}</div>
                      <div className="text-xs font-normal text-foreground/60 truncate">
                        {p.age} ans · {(p.themes || []).slice(0, 2).join(", ") || "tous thèmes"}
                      </div>
                    </div>
                    {isThisActive && <span className="text-foreground/50 text-xs">●</span>}
                  </button>
                );
              })}
              <Link
                to="/app/parent"
                onClick={() => setOpen(false)}
                data-testid="switch-add-child"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-leaf hover:bg-leaf-50"
              >
                <span className="w-8 h-8 rounded-full border-2 border-dashed border-leaf flex items-center justify-center">+</span>
                Ajouter un enfant
              </Link>
            </>
          )}
          {childProfiles.length === 0 && !isAdult && (
            <Link
              to="/app/parent"
              onClick={() => setOpen(false)}
              data-testid="switch-create-child"
              className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold hover:bg-sand-100"
            >
              <Smile className="w-5 h-5 text-sun-500" />
              <div className="flex-1 text-sm">
                <div>Créer un profil enfant</div>
                <div className="text-xs font-normal text-foreground/60">Nom, âge, thèmes préférés</div>
              </div>
            </Link>
          )}

          <div className="mt-1 border-t border-sand-200 pt-1">
            <button
              onClick={() => { logout(); navigate("/"); }}
              data-testid="sidebar-logout"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold text-foreground/60 hover:bg-sand-100"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
