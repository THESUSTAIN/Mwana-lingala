import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, LogOut, Home, Trophy, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/app", label: "Accueil", icon: Home, end: true, testid: "nav-accueil" },
  { to: "/app/bebe", label: "Bébé", icon: Baby, testid: "nav-bebe" },
  { to: "/app/enfant", label: "Enfant", icon: Smile, testid: "nav-enfant" },
  { to: "/app/parent", label: "Parent", icon: Users, testid: "nav-parent" },
  { to: "/app/chretien", label: "Chrétien", icon: BookOpenText, testid: "nav-chretien" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (to, end) => (end ? pathname === to : pathname.startsWith(to));

  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sand-200 bg-white">
        <div className="p-6">
          <Link to="/app" className="block" data-testid="sidebar-logo">
            <div className="text-2xl font-black leading-tight">
              <div className="text-leaf">Mwana</div>
              <div className="text-brick">Lingala</div>
            </div>
          </Link>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((t) => {
            const active = isActive(t.to, t.end);
            return (
              <Link
                key={t.to}
                to={t.to}
                data-testid={t.testid}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${active ? (t.label === "Enfant" ? "bg-brick-50 text-brick" : "bg-leaf-50 text-leaf") : "text-foreground/60 hover:bg-sand-100 hover:text-foreground"}`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sand-200">
          <div className="text-xs text-foreground/60 mb-2">Connecté</div>
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-leaf-50 text-leaf font-black flex items-center justify-center">
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user?.name}</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="p-2 rounded-full hover:bg-sand-100"
              aria-label="Se déconnecter"
              data-testid="sidebar-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
              <button className="p-2 rounded-full hover:bg-sand-100" aria-label="Notifications" data-testid="mobile-bell">
                <Bell className="w-5 h-5" />
              </button>
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
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand-200 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-5 h-16">
            {NAV.map((t) => {
              const active = isActive(t.to, t.end);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  data-testid={`bottom-${t.testid}`}
                  className={`flex flex-col items-center justify-center gap-0.5 font-bold text-[11px] ${active ? "text-brick" : "text-foreground/60"}`}
                >
                  <t.icon className={`w-5 h-5 ${active ? "" : ""}`} />
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
