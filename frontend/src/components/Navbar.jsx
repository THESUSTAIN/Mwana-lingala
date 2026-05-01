import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/pourquoi-lingala", label: "Pourquoi le Lingala" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/assistant-ia", label: "Assistant IA" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-sand-200/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2" data-testid="logo">
          <span className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="text-leaf">Mwana</span>{" "}
            <span className="text-brick">Lingala</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.to.replace(/\W/g, "") || "home"}`}
              className={({ isActive }) =>
                `text-sm font-bold transition-colors ${isActive ? "text-brick" : "text-foreground/70 hover:text-brick"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => navigate("/app")}
                data-testid="go-to-app-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 transition-transform"
              >
                <UserIcon className="w-4 h-4" />
                Mon espace
              </button>
              <button
                onClick={() => { logout(); navigate("/"); }}
                data-testid="logout-btn"
                className="p-2.5 rounded-full text-foreground/70 hover:bg-white transition-colors"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              data-testid="login-cta"
              className="px-5 py-2.5 rounded-full bg-brick text-white font-bold active:scale-95 transition-transform"
            >
              Se connecter
            </Link>
          )}
        </div>

        <button
          className="lg:hidden p-2 rounded-full hover:bg-white"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          data-testid="mobile-menu-toggle"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-black/5 bg-sand-50">
          <div className="px-4 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl font-bold ${isActive ? "bg-brick text-white" : "text-foreground/80 hover:bg-white"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-3 border-t pt-3">
              {user ? (
                <>
                  <button
                    onClick={() => { setOpen(false); navigate("/app"); }}
                    className="w-full px-4 py-3 rounded-xl bg-leaf text-white font-bold"
                    data-testid="mobile-go-app"
                  >
                    Mon espace
                  </button>
                  <button
                    onClick={() => { setOpen(false); logout(); navigate("/"); }}
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white border text-foreground font-bold"
                    data-testid="mobile-logout"
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-xl bg-brick text-white font-bold"
                  data-testid="mobile-login"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
