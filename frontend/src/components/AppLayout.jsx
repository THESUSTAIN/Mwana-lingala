import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, LogOut, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { to: "/app", label: "Accueil", icon: Home, end: true },
  { to: "/app/bebe", label: "Bébé", icon: Baby },
  { to: "/app/enfant", label: "Enfant", icon: Smile },
  { to: "/app/parent", label: "Parent", icon: Users },
  { to: "/app/chretien", label: "Chrétien", icon: BookOpenText },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (to, end) => (end ? pathname === to : pathname.startsWith(to));

  return (
    <div className="min-h-screen flex flex-col bg-sand-200">
      <header className="sticky top-0 z-30 bg-sand-200/90 backdrop-blur border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/app" className="font-black text-xl">
            <span className="text-leaf">Mwana</span> <span className="text-brick">Lingala</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && <span className="hidden sm:inline text-foreground/70 font-bold">Bonjour {user.name?.split(" ")[0]}</span>}
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="p-2 rounded-full hover:bg-white"
              aria-label="Se déconnecter"
              data-testid="app-logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white/80 backdrop-blur border-b border-black/5 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = isActive(t.to, t.end);
            return (
              <Link
                key={t.to}
                to={t.to}
                data-testid={`tab-${t.label.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${active ? "border-brick text-brick" : "border-transparent text-foreground/60 hover:text-foreground"}`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
