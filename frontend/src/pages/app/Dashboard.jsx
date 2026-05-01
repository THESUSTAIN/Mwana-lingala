import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, Trophy, Star, Gamepad2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PARENT_CARDS = [
  { to: "/app/bebe", icon: Baby, title: "Mode Bébé", age: "0 – 3 ans", desc: "Audio doux, sans écran actif.", bg: "bg-sand-100", testid: "dash-mode-bebe" },
  { to: "/app/enfant", icon: Smile, title: "Mode Enfant", age: "4 – 10 ans", desc: "Cartes, images, quiz courts.", bg: "bg-leaf-50", testid: "dash-mode-enfant" },
  { to: "/app/parent", icon: Users, title: "Mode Parent", age: "Pour vous", desc: "Profils, progression, réglages.", bg: "bg-brick-50", testid: "dash-mode-parent" },
  { to: "/app/chretien", icon: BookOpenText, title: "Mode Chrétien", age: "Optionnel", desc: "Mots bibliques et prières courtes.", bg: "bg-sun-100", testid: "dash-mode-chretien" },
];

const CHILD_CARDS = [
  { to: "/app/enfant", icon: Smile, title: "Apprendre", desc: "Découvre des mots Lingala avec des images.", bg: "bg-leaf-50", testid: "dash-child-learn" },
  { to: "/app/enfant/quiz", icon: Gamepad2, title: "Jouer", desc: "Mini-jeux et quiz amusants.", bg: "bg-sun-100", testid: "dash-child-play" },
  { to: "/app/mission", icon: Star, title: "Mes étoiles", desc: "Vois tes badges et tes étoiles gagnées.", bg: "bg-brick-50", testid: "dash-child-stars" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const isChild = !!ctx.isChild;
  const [progress, setProgress] = useState({ count: 0, total: 20, percent: 0 });

  useEffect(() => {
    if (!isChild) {
      api.get("/onboarding/status").then((r) => {
        if (r.data.needs_onboarding) navigate("/onboarding", { replace: true });
      }).catch(() => {});
    }
    api.get("/progress").then((r) => setProgress(r.data)).catch(() => {});
  }, [navigate, isChild]);

  const firstName = user?.name?.split(" ")[0] || (isChild ? "champion" : "parent");
  const cards = isChild ? CHILD_CARDS : PARENT_CARDS;

  if (isChild) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black">Salut, {firstName} ! 👋</h1>
            <p className="text-foreground/70 mt-2 text-lg">Prêt à apprendre de nouveaux mots Lingala aujourd'hui ?</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-sun-100 border border-sun-200" data-testid="child-stars-chip">
            <Star className="w-5 h-5 text-brick" />
            <div>
              <div className="text-xs font-bold text-leaf">Mes étoiles</div>
              <div className="text-base font-black" data-testid="progress-count">{user?.credits || 0}</div>
            </div>
          </div>
        </div>

        {/* Defi du jour */}
        <Link
          to="/app/enfant"
          data-testid="child-daily-cta"
          className="ml-card mt-8 p-7 bg-gradient-to-br from-brick-50 via-sun-100 to-leaf-50 flex items-start gap-4 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-7 h-7 text-brick" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-brick uppercase tracking-wider">Défi du jour</div>
            <div className="text-2xl font-black mt-1">Apprends 3 mots Lingala</div>
            <p className="text-foreground/70 mt-1">Écoute, répète et joue pour gagner des étoiles ⭐</p>
            <div className="mt-3 inline-flex items-center gap-2 text-brick font-bold group-hover:gap-3 transition-all">
              Commencer →
            </div>
          </div>
        </Link>

        <div className="grid sm:grid-cols-3 gap-5 mt-8">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              data-testid={c.testid}
              className={`ml-card p-7 ${c.bg} flex flex-col gap-4 group`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <c.icon className="w-8 h-8 text-brick" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-2xl font-black">{c.title}</div>
                <p className="text-foreground/70 mt-2">{c.desc}</p>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-brick font-bold group-hover:gap-3 transition-all">
                Ouvrir →
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // PARENT VIEW
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Bonjour, {firstName} 👋</h1>
          <p className="text-foreground/70 mt-2 text-lg">Choisissez un mode pour commencer.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-leaf-50 border border-leaf-100" data-testid="progress-chip">
          <Trophy className="w-5 h-5 text-leaf" />
          <div>
            <div className="text-xs font-bold text-leaf">Progression</div>
            <div className="text-base font-black" data-testid="progress-count">{progress.count} / {progress.total} mots</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-10">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            data-testid={c.testid}
            className={`ml-card p-8 ${c.bg} flex items-start gap-5 group`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <c.icon className="w-8 h-8 text-brick" strokeWidth={2.25} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-leaf">{c.age}</div>
              <div className="text-2xl font-black mt-0.5">{c.title}</div>
              <p className="text-foreground/70 mt-2">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-brick font-bold group-hover:gap-3 transition-all">
                Ouvrir →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
