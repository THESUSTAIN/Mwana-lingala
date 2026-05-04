import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Baby, Smile, Users, BookOpenText, Home, Gift, Coins, Wand2,
  Calendar, Star, Gamepad2, ChevronLeft, ChevronRight,
  Settings, LogOut, ShieldCheck, GraduationCap, Plane,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ParentalGate from "@/components/ParentalGate";
import NotificationsBell from "@/components/NotificationsBell";

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
  { to: "/app/parametres", label: "Paramètres", icon: Settings, testid: "nav-parametres" },
];

// Adult-learner nav (no child modes — focus on solo learning)
const ADULT_NAV = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/test-niveau", label: "Test niveau", icon: GraduationCap, testid: "nav-leveltest" },
  { to: "/app/enfant", label: "Vocabulaire", icon: BookOpenText, testid: "nav-words" },
  { to: "/phrases-voyage", label: "Voyage", icon: Plane, testid: "nav-travel" },
  { to: "/app/assistant", label: "Coach IA", icon: Wand2, testid: "nav-assistant" },
  { to: "/app/programme", label: "Programme", icon: Calendar, testid: "nav-programme" },
  { to: "/app/mission", label: "Mission", icon: Gift, testid: "nav-mission" },
  { to: "/app/parametres", label: "Paramètres", icon: Settings, testid: "nav-parametres" },
];

// Simplified nav for child role
const CHILD_NAV = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Apprendre", icon: Smile, end: true, testid: "nav-enfant" },
  { to: "/app/enfant/jouer", label: "Jouer", icon: Gamepad2, testid: "nav-jouer" },
  { to: "/app/mission", label: "Mes étoiles", icon: Star, testid: "nav-etoiles" },
];

const PARENT_MOBILE = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Enfant", icon: Smile, testid: "nav-enfant" },
  { to: "/app/assistant", label: "IA", icon: Wand2, testid: "nav-assistant" },
  { to: "/app/mission", label: "Mission", icon: Gift, testid: "nav-mission" },
  { to: "/app/parent", label: "Parent", icon: Users, testid: "nav-parent" },
];

const ADULT_MOBILE = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/test-niveau", label: "Niveau", icon: GraduationCap, testid: "nav-leveltest" },
  { to: "/phrases-voyage", label: "Voyage", icon: Plane, testid: "nav-travel" },
  { to: "/app/assistant", label: "Coach", icon: Wand2, testid: "nav-assistant" },
  { to: "/app/parametres", label: "Réglages", icon: Settings, testid: "nav-parametres" },
];

const CHILD_MOBILE = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/enfant", label: "Apprendre", icon: Smile, end: true, testid: "nav-enfant" },
  { to: "/app/enfant/jouer", label: "Jouer", icon: Gamepad2, testid: "nav-jouer" },
  { to: "/app/mission", label: "Étoiles", icon: Star, testid: "nav-etoiles" },
];

export default function AppLayout() {
  const { user, logout, childProfiles, activeChild, setActiveChild } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [profileMode, setProfileMode] = useState(() => localStorage.getItem("profile_mode") || "parent");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "1");
  const [codePromptOpen, setCodePromptOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("profile_mode", profileMode);
  }, [profileMode]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Build nav based on profile mode
  const isChild = profileMode === "child";
  const isAdultLearner = !isChild && (user?.learner_type === "adult" || user?.motivation === "apprendre");
  let baseNav;
  if (isChild) {
    baseNav = [...CHILD_NAV];
  } else if (isAdultLearner) {
    baseNav = [...ADULT_NAV];
  } else {
    baseNav = [...PARENT_NAV];
  }
  if (isChild && user?.christian_mode) {
    baseNav = [...baseNav, { to: "/app/chretien", label: "Chrétien", icon: BookOpenText, testid: "nav-chretien" }];
  }
  const NAV = !isChild && user?.role === "admin"
    ? [...baseNav, { to: "/app/admin", label: "Modération", icon: ShieldCheck, testid: "nav-admin" }]
    : baseNav;

  const MOBILE_NAV = isChild ? CHILD_MOBILE : (isAdultLearner ? ADULT_MOBILE : PARENT_MOBILE);

  const isActive = (to, end) => (end ? pathname === to : pathname.startsWith(to));

  const switchTo = (mode, childProfile) => {
    if (profileMode === "child" && mode === "parent") {
      setCodePromptOpen(true);
      return;
    }
    if (mode === "child" && childProfile) setActiveChild(childProfile);
    setProfileMode(mode);
    const childAllowed = ["/app", "/app/enfant", "/app/enfant/quiz", "/app/enfant/jouer", "/app/mission", "/app/chretien"];
    if (mode === "child" && !childAllowed.some((p) => p === pathname || pathname.startsWith(p + "/"))) {
      navigate("/app", { replace: true });
    }
  };

  const profileLabel = isChild ? (activeChild?.name ? `Mode ${activeChild.name}` : "Mode enfant") : "Profil parent";
  const profileEmoji = isChild ? "🧒" : "👨‍👩‍👧";
  const creditsLabel = isChild ? "étoiles" : "crédits";

  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-sand-200 bg-white transition-all duration-200 sticky top-0 h-screen overflow-y-auto ${collapsed ? "w-20" : "w-64"}`}>
        <div className={`p-6 ${collapsed ? "flex-col gap-3" : "flex items-center justify-between gap-2"} flex`}>
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
          <div className="flex items-center gap-1 shrink-0">
            {!isChild && <NotificationsBell />}
            <button
              onClick={() => setCollapsed((c) => !c)}
              data-testid="sidebar-toggle"
              aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
              title={collapsed ? "Déplier" : "Replier"}
              className="p-1.5 rounded-full hover:bg-sand-100 text-foreground/60"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
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
              {!isChild && (
                <>
                  <Link to="/app/mission" className="text-xs text-leaf font-bold hover:underline" data-testid="sidebar-earn-credits">Gagner</Link>
                  <Link to="/tarifs" className="text-xs text-brick font-black hover:underline" data-testid="sidebar-buy-credits">Acheter</Link>
                </>
              )}
            </div>
          )}

          {/* Profile switcher — extracted component */}
          <ProfileSwitcher
            collapsed={collapsed}
            isChild={isChild}
            profileMode={profileMode}
            switchTo={switchTo}
            creditsLabel={creditsLabel}
          />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sand-200">
          <div className="px-4 flex items-center justify-between h-16 gap-2">
            <Link to="/app" className="font-black text-xl shrink-0">
              <span className="text-leaf">Mwana</span> <span className="text-brick">Lingala</span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              {/* Credits indicator + buy button — visible to parents */}
              {!isChild && (
                <Link
                  to="/tarifs"
                  data-testid="mobile-credits-buy"
                  aria-label="Acheter des crédits"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sun-100 hover:bg-sun-200 active:scale-95 transition-all"
                >
                  <Coins className="w-4 h-4 text-brick" />
                  <span className="text-sm font-black">{user?.credits || 0}</span>
                  <span className="w-5 h-5 rounded-full bg-brick text-white flex items-center justify-center text-sm font-black leading-none">+</span>
                </Link>
              )}
              <button
                onClick={() => switchTo(isChild ? "parent" : "child")}
                data-testid="mobile-switch-profile"
                className={`p-2 rounded-full font-bold text-xs ${isChild ? "bg-brick-50 text-brick" : "bg-leaf-50 text-leaf"}`}
                aria-label="Changer de profil"
              >
                {isChild ? "🧒" : "👨‍👩‍👧"}
              </button>
              {!isChild && <NotificationsBell />}
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
          <Outlet context={{ profileMode, isChild, activeChild }} />
        </main>

        {!isChild && <FeedbackWidget />}

        {/* Parental code gate — extracted component */}
        <ParentalGate
          open={codePromptOpen}
          onClose={() => setCodePromptOpen(false)}
          onSuccess={() => { setCodePromptOpen(false); setProfileMode("parent"); }}
        />

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand-200 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">          <div className={`grid h-16 ${MOBILE_NAV.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
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
