import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProfileSwitcher({ collapsed, isChild, profileMode, switchTo, creditsLabel }) {
  const { user, logout, childProfiles, activeChild } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const profileLabel = isChild ? (activeChild?.name ? `Mode ${activeChild.name}` : "Mode enfant") : "Profil parent";
  const profileEmoji = isChild ? "🧒" : "👨‍👩‍👧";

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
          <div className={`w-9 h-9 rounded-full font-black flex items-center justify-center ${isChild ? "bg-sun-200 text-foreground" : "bg-leaf-50 text-leaf"}`}>
            {isChild ? (activeChild?.name?.[0]?.toUpperCase() || "🧒") : (user?.name?.[0]?.toUpperCase() || "?")}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-bold truncate">{isChild ? (activeChild?.name || "Enfant") : user?.name}</div>
              <div className="text-xs text-foreground/60 inline-flex items-center gap-1">
                <span>{profileEmoji}</span> {profileLabel}
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-foreground/60" /> : <ChevronDown className="w-4 h-4 text-foreground/60" />}
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-sand-200 rounded-2xl shadow-xl p-2 z-30 max-h-[70vh] overflow-y-auto" data-testid="profile-switcher-menu">
          <button
            onClick={() => { switchTo("parent"); setOpen(false); }}
            data-testid="switch-parent"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold ${!isChild ? "bg-leaf-50 text-leaf" : "hover:bg-sand-100"}`}
          >
            <span className="text-lg">👨‍👩‍👧</span>
            <div className="flex-1 text-sm">
              <div>Mode parent</div>
              <div className="text-xs font-normal text-foreground/60">Tout voir, gérer, IA</div>
            </div>
          </button>

          {childProfiles.length > 0 ? (
            <>
              <div className="mt-2 mb-1 px-3 text-[10px] font-black text-foreground/50 uppercase tracking-widest">Enfants</div>
              {childProfiles.map((p) => {
                const isThisActive = isChild && activeChild?.profile_id === p.profile_id;
                return (
                  <button
                    key={p.profile_id}
                    onClick={() => { switchTo("child", p); setOpen(false); }}
                    data-testid={`switch-child-${p.profile_id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold ${isThisActive ? "bg-brick-50 text-brick" : "hover:bg-sand-100"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-sun-200 text-foreground flex items-center justify-center font-black">
                      {(p.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-sm min-w-0">
                      <div className="truncate">Mode {p.name}</div>
                      <div className="text-xs font-normal text-foreground/60">
                        {p.age} ans · {(p.themes || []).slice(0, 2).join(", ") || "tous thèmes"}
                      </div>
                    </div>
                    {isThisActive && <span className="text-brick text-xs">●</span>}
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
          ) : (
            <Link
              to="/app/parent"
              onClick={() => setOpen(false)}
              data-testid="switch-create-child"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold hover:bg-sand-100"
            >
              <span className="text-lg">🧒</span>
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
