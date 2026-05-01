import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, Trophy, Star, Gamepad2, Headphones, Mic, Puzzle, Lock, Play } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PARENT_CARDS = [
  { to: "/app/bebe", icon: Baby, title: "Mode Bébé", age: "0 – 3 ans", desc: "Audio doux, sans écran actif.", bg: "bg-sand-100", testid: "dash-mode-bebe" },
  { to: "/app/enfant", icon: Smile, title: "Mode Enfant", age: "4 – 10 ans", desc: "Cartes, images, quiz courts.", bg: "bg-leaf-50", testid: "dash-mode-enfant" },
  { to: "/app/parent", icon: Users, title: "Mode Parent", age: "Pour vous", desc: "Profils, progression, réglages.", bg: "bg-brick-50", testid: "dash-mode-parent" },
  { to: "/app/chretien", icon: BookOpenText, title: "Mode Chrétien", age: "Optionnel", desc: "Mots bibliques et prières courtes.", bg: "bg-sun-100", testid: "dash-mode-chretien" },
];

const CATEGORIES = [
  { theme: "famille", label: "Famille", img: "/images/cat-famille.png", color: "from-sun-100 to-sand-100", textColor: "text-orange-600", barColor: "bg-orange-400" },
  { theme: "nourriture", label: "Nourriture", img: "/images/cat-nourriture.png", color: "from-blue-50 to-sand-100", textColor: "text-blue-600", barColor: "bg-blue-400" },
  { theme: "emotions", label: "Émotions", img: "/images/cat-emotions.png", color: "from-pink-50 to-sand-100", textColor: "text-pink-600", barColor: "bg-pink-400" },
  { theme: "animaux", label: "Animaux", img: "/images/cat-jouets.png", color: "from-leaf-50 to-sand-100", textColor: "text-leaf", barColor: "bg-leaf" },
];

const TRAIN_BUTTONS = [
  { to: "/app/enfant", icon: Headphones, label: "Écouter", desc: "Écoute le mot", bg: "bg-purple-50", iconColor: "text-purple-600" },
  { to: "/app/enfant", icon: Mic, label: "Répéter", desc: "Dis le mot", bg: "bg-leaf-50", iconColor: "text-leaf" },
  { to: "/app/enfant/jouer", icon: Puzzle, label: "Jouer", desc: "Mini-jeu amusant", bg: "bg-sun-100", iconColor: "text-orange-600" },
  { to: "/app/enfant/quiz", icon: Star, label: "Quiz", desc: "Teste-toi !", bg: "bg-blue-50", iconColor: "text-blue-600" },
];

const STAR_MILESTONES = [5, 10, 20];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const isChild = !!ctx.isChild;
  const [progress, setProgress] = useState({ count: 0, total: 20, percent: 0, learned_word_ids: [] });

  useEffect(() => {
    if (!isChild) {
      api.get("/onboarding/status").then((r) => {
        if (r.data.needs_onboarding) navigate("/onboarding", { replace: true });
      }).catch(() => {});
    }
    api.get("/progress").then((r) => setProgress(r.data)).catch(() => {});
  }, [navigate, isChild]);

  const firstName = user?.name?.split(" ")[0] || (isChild ? "champion" : "parent");
  const stars = user?.credits || 0;

  if (isChild) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black">Salut, {firstName} ! 👋</h1>
            <p className="text-foreground/70 mt-2 text-base">Prêt à apprendre de nouveaux mots en Lingala aujourd'hui ?</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border-2 border-sun-200 shadow-sm" data-testid="child-stars-chip">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-xs font-bold text-foreground/60">Mes étoiles</div>
              <div className="text-2xl font-black" data-testid="progress-count">{stars}</div>
            </div>
          </div>
        </div>

        {/* HERO Défi du jour - inspired by mockup with mascot */}
        <Link
          to="/app/enfant"
          data-testid="child-daily-cta"
          className="block mt-7 rounded-[2rem] overflow-hidden bg-gradient-to-br from-purple-100 via-purple-50 to-sand-100 group hover:shadow-xl transition-all"
        >
          <div className="grid sm:grid-cols-[1.2fr_1fr] items-center">
            <div className="p-8 sm:p-10">
              <div className="text-xs font-black text-purple-600 uppercase tracking-widest">Défi du jour</div>
              <div className="text-2xl sm:text-3xl font-black mt-2 leading-tight">Apprends 3 mots sur la famille !</div>
              <p className="text-foreground/70 mt-2">Écoute, répète et joue pour gagner des étoiles.</p>
              <div className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 text-white font-black shadow-lg group-hover:scale-105 transition-transform">
                Commencer <Play className="w-5 h-5 fill-white" />
              </div>
            </div>
            <div className="hidden sm:block relative h-64 lg:h-72">
              <img
                src="/images/child-mascot.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          </div>
        </Link>

        {/* Categories */}
        <h2 className="text-xl sm:text-2xl font-black mt-10 mb-4">Catégories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map((c, i) => {
            const pct = Math.min(100, ((i + 1) * 30) % 100); // visual placeholder progress
            return (
              <Link
                key={c.theme}
                to={`/app/enfant?theme=${c.theme}`}
                data-testid={`child-cat-${c.theme}`}
                className={`ml-card p-4 bg-gradient-to-br ${c.color} group hover:shadow-lg transition-all`}
              >
                <div className="aspect-square rounded-2xl bg-white/50 overflow-hidden mb-3">
                  <img
                    src={c.img}
                    alt={c.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => { e.target.style.opacity = "0"; }}
                  />
                </div>
                <div className={`text-lg font-black text-center ${c.textColor}`}>{c.label}</div>
                <div className="text-xs text-foreground/60 text-center mt-0.5">{progress.count} mots</div>
                <div className="h-1.5 bg-white/70 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${c.barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Continue à t'entraîner */}
        <h2 className="text-xl sm:text-2xl font-black mt-10 mb-4">Continue à t'entraîner</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TRAIN_BUTTONS.map((b, i) => (
            <Link
              key={i}
              to={b.to}
              data-testid={`child-train-${b.label.toLowerCase()}`}
              className={`ml-card p-4 ${b.bg} group hover:shadow-md transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 ${b.iconColor}`}>
                  <b.icon className="w-6 h-6" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black">{b.label}</div>
                  <div className="text-xs text-foreground/60">{b.desc}</div>
                </div>
                <div className="text-foreground/40 group-hover:text-foreground transition-colors">→</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Gagne des étoiles - milestones bar */}
        <div className="mt-10 ml-card p-6 bg-gradient-to-br from-sun-100 to-sand-100" data-testid="child-stars-bar">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="text-5xl">🏆</div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black">Gagne des étoiles !</div>
              <p className="text-sm text-foreground/70 mt-1">Plus tu apprends, plus tu débloques des récompenses.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-4 items-center">
            {STAR_MILESTONES.map((m, idx) => {
              const reached = stars >= m;
              const bgColors = ["bg-sun-300", "bg-blue-300", "bg-purple-300"];
              return (
                <div key={m} className="flex flex-col items-center" data-testid={`milestone-${m}`}>
                  <div className={`relative w-14 h-14 rounded-full flex items-center justify-center font-black text-lg shadow-md ${reached ? bgColors[idx] : "bg-white text-foreground/40"}`}>
                    <span className="text-2xl absolute -top-1 -left-1">⭐</span>
                    <span>{m}</span>
                    {!reached && (
                      <Lock className="w-4 h-4 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 text-foreground/50" />
                    )}
                  </div>
                  {reached && <div className="text-xs font-bold text-leaf mt-1">✓</div>}
                </div>
              );
            })}
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md ${stars >= 50 ? "bg-yellow-300" : "bg-white"}`}>
                🎁
              </div>
              {stars < 50 && <Lock className="w-4 h-4 text-foreground/40 mt-1" />}
            </div>
          </div>
          {/* dotted progress line */}
          <div className="mt-3 px-7">
            <div className="border-t-2 border-dashed border-sun-300/60"></div>
          </div>
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
        {PARENT_CARDS.map((c) => (
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
