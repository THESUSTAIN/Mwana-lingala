import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Baby, Smile, Users, BookOpenText, LogOut, Home, Gift, Bell, Coins, Wand2,
  ShieldCheck, Calendar, Star, Gamepad2, Headphones, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Full nav for parent role
const PARENT_NAV = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/bebe", label: "Bébé", icon: Baby, testid: "nav-bebe" },
  { to: "/app/enfant", label: "Enfant", icon: Smile, testid: "nav-enfant" },
  { to: "/app/parent", label: "Parent", icon: Users, testid: "nav-parent" },
  { to: "/app/chretien", label: "Chrétien", icon: BookOpenText, testid: "nav-chretien" },
  { to: "/app/assistant", label: "Assistant", icon: Wand2, testid: "nav-assistant" },
  { to: "/app/programme", label: "Programme", icon: Calendar, testid: "nav-programme" },
  { to: "/app/mission", label: "Mission", icon: Gift, testid: "nav-mission" },
];

// Simplified nav for child role
const CHILD_NAV = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Apprendre", icon: Smile, testid: "nav-enfant" },
  { to: "/app/enfant/quiz", label: "Jouer", icon: Gamepad2, testid: "nav-jouer" },
  { to: "/app/mission", label: "Mes étoiles", icon: Star, testid: "nav-etoiles" },
];

const PARENT_MOBILE = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Enfant", icon: Smile, testid: "nav-enfant" },
  { to: "/app/assistant", label: "IA", icon: Wand2, testid: "nav-assistant" },
  { to: "/app/mission", label: "Mission", icon: Gift, testid: "nav-mission" },
  { to: "/app/parent", label: "Parent", icon: Users, testid: "nav-parent" },
];

const CHILD_MOBILE = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Apprendre", icon: Smile, testid: "nav-enfant" },
  { to: "/app/enfant/quiz", label: "Jouer", icon: Gamepad2, testid: "nav-jouer" },
  { to: "/app/mission", label: "Étoiles", icon: Star, testid: "nav-etoiles" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [profileMode, setProfileMode] = useState(() => localStorage.getItem("profile_mode") || "parent");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "1");

  useEffect(() => {
    localStorage.setItem("profile_mode", profileMode);
  }, [profileMode]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Build nav based on profile mode
  const isChild = profileMode === "child";
  let baseNav = isChild ? [...CHILD_NAV] : [...PARENT_NAV];
  if (isChild && user?.christian_mode) {
    baseNav = [...baseNav, { to: "/app/chretien", label: "Chrétien", icon: BookOpenText, testid: "nav-chretien" }];
  }
  const NAV = !isChild && user?.role === "admin"
    ? [...baseNav, { to: "/app/admin", label: "Modération", icon: ShieldCheck, testid: "nav-admin" }]
    : baseNav;

  const MOBILE_NAV = isChild ? CHILD_MOBILE : PARENT_MOBILE;

  const isActive = (to, end) => (end ? pathname === to : pathname.startsWith(to));

  const switchTo = (mode) => {
    setProfileMode(mode);
    setSwitcherOpen(false);
    // When switching to child mode, redirect away from parent-only pages
    const childAllowed = ["/app", "/app/enfant", "/app/enfant/quiz", "/app/mission", "/app/chretien"];
    if (mode === "child" && !childAllowed.some((p) => p === pathname || pathname.startsWith(p + "/"))) {
      navigate("/app", { replace: true });
    }
  };

  const profileLabel = isChild ? "Profil enfant" : "Profil parent";
  const profileEmoji = isChild ? "🧒" : "👨‍👩‍👧";
  const creditsLabel = isChild ? "étoiles" : "crédits";

  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-sand-200 bg-white transition-all duration-200 ${collapsed ? "w-20" : "w-64"}`}>
        <div className="p-6 flex items-center justify-between gap-2">
          <Link to="/app" className="block min-w-0" data-testid="sidebar-logo">
            {collapsed ? (
              <div className="text-xl font-black text-leaf">M<span className="text-brick">L</span></div>
            ) : (
              <div className="text-2xl font-black leading-tight">
                <div className="text-leaf">Mwana</div>
                <div className="text-brick">Lingala</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            data-testid="sidebar-toggle"
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            title={collapsed ? "Déplier" : "Replier"}
            className="p-1.5 rounded-full hover:bg-sand-100 text-foreground/60 shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((t) => {
            const active = isActive(t.to, t.end);
            return (
              <Link
                key={t.to}
                to={t.to}
                data-testid={t.testid}
                title={collapsed ? t.label : undefined}
                className={`flex items-center gap-3 ${collapsed ? "px-3 justify-center" : "px-4"} py-3 rounded-2xl font-bold transition-all ${active ? (isChild ? "bg-brick-50 text-brick" : "bg-leaf-50 text-leaf") : "text-foreground/60 hover:bg-sand-100 hover:text-foreground"}`}
              >
                <t.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{t.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sand-200">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sun-100 mb-3" data-testid="sidebar-credits">
              <Coins className="w-4 h-4 text-brick" />
              <div className="flex-1 text-sm font-bold">{user?.credits || 0} {creditsLabel}</div>
              {!isChild && <Link to="/app/mission" className="text-xs text-leaf font-bold hover:underline">Gagner +</Link>}
            </div>
          )}

          {/* Profile switcher */}
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              data-testid="profile-switcher"
              className={`w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-sand-100 transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              {user?.picture ? (
                <img src={user.picture} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-leaf-50 text-leaf font-black flex items-center justify-center">
                  {isChild ? "🧒" : (user?.name?.[0]?.toUpperCase() || "?")}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-bold truncate">{user?.name}</div>
                    <div className="text-xs text-foreground/60 inline-flex items-center gap-1">
                      <span>{profileEmoji}</span> {profileLabel}
                    </div>
                  </div>
                  {switcherOpen ? <ChevronUp className="w-4 h-4 text-foreground/60" /> : <ChevronDown className="w-4 h-4 text-foreground/60" />}
                </>
              )}
            </button>

            {switcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-sand-200 rounded-2xl shadow-xl p-2 z-30" data-testid="profile-switcher-menu">
                <button
                  onClick={() => switchTo("parent")}
                  data-testid="switch-parent"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold ${!isChild ? "bg-leaf-50 text-leaf" : "hover:bg-sand-100"}`}
                >
                  <span className="text-lg">👨‍👩‍👧</span>
                  <div className="flex-1 text-sm">
                    <div>Mode parent</div>
                    <div className="text-xs font-normal text-foreground/60">Tout voir, gérer, IA</div>
                  </div>
                </button>
                <button
                  onClick={() => switchTo("child")}
                  data-testid="switch-child"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-bold ${isChild ? "bg-brick-50 text-brick" : "hover:bg-sand-100"}`}
                >
                  <span className="text-lg">🧒</span>
                  <div className="flex-1 text-sm">
                    <div>Mode enfant</div>
                    <div className="text-xs font-normal text-foreground/60">Apprendre, jouer, étoiles</div>
                  </div>
                </button>
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
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sand-200">
          <div className="px-4 flex items-center justify-between h-16">
            <Link to="/app" className="font-black text-xl">
              <span className="text-leaf">Mwana</span> <span className="text-brick">Lingala</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => switchTo(isChild ? "parent" : "child")}
                data-testid="mobile-switch-profile"
                className={`p-2 rounded-full font-bold text-xs ${isChild ? "bg-brick-50 text-brick" : "bg-leaf-50 text-leaf"}`}
                aria-label="Changer de profil"
              >
                {isChild ? "🧒 Enfant" : "👨‍👩‍👧 Parent"}
              </button>
              {!isChild && (
                <button className="p-2 rounded-full hover:bg-sand-100" aria-label="Notifications" data-testid="mobile-bell">
                  <Bell className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="p-2 rounded-full hover:bg-sand-100"
                aria-label="Se déconnecter"
                data-testid="mobile-logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-0">
          <Outlet context={{ profileMode, isChild }} />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand-200 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
          <div className={`grid h-16 ${MOBILE_NAV.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
            {MOBILE_NAV.map((t) => {
              const active = isActive(t.to, t.end);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  data-testid={`bottom-${t.testid}`}
                  className={`flex flex-col items-center justify-center gap-0.5 font-bold text-[11px] ${active ? "text-brick" : "text-foreground/60"}`}
                >
                  <t.icon className="w-5 h-5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
