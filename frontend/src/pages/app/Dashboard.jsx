import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({ count: 0, total: 20, percent: 0 });
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    api.get("/progress").then((r) => setProgress(r.data)).catch(() => {});
    api.get("/child-profiles").then((r) => setProfiles(r.data)).catch(() => {});
  }, []);

  const cards = [
    { to: "/app/bebe", icon: Baby, title: "Mode Bébé", desc: "Audio doux, 0-3 ans", color: "bg-sand-100" },
    { to: "/app/enfant", icon: Smile, title: "Mode Enfant", desc: "Cartes & quiz, 4-10 ans", color: "bg-leaf-50" },
    { to: "/app/parent", icon: Users, title: "Mode Parent", desc: "Profils, progression", color: "bg-brick-50" },
    { to: "/app/chretien", icon: BookOpenText, title: "Mode Chrétien", desc: "Optionnel", color: "bg-sun-100" },
  ];

  const tip = user?.christian_mode
    ? "Aujourd’hui : apprendre le mot Matondi (merci) et le répéter 3 fois."
    : "Aujourd’hui : apprendre 3 mots sur la famille — Mama, Tata, Ndeko.";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Bonjour, {user?.name?.split(" ")[0] || "parent"} 👋</h1>
          <p className="text-foreground/70 mt-2">Choisissez un mode et commencez une session de 2-5 minutes avec votre enfant.</p>
        </div>
        <div className="ml-card p-5 bg-white flex items-center gap-4 min-w-[260px]">
          <div className="w-14 h-14 rounded-full bg-leaf-50 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-leaf" />
          </div>
          <div>
            <div className="text-xs font-bold text-leaf">Progression</div>
            <div className="text-2xl font-black" data-testid="progress-count">{progress.count} / {progress.total}</div>
            <div className="text-xs text-foreground/60">mots appris</div>
          </div>
        </div>
      </div>

      <div className="ml-card mt-8 p-6 bg-gradient-to-br from-leaf-50 to-sand-100 flex items-start gap-4" data-testid="daily-tip">
        <Sparkles className="w-7 h-7 text-brick shrink-0" />
        <div>
          <div className="font-black">Suggestion du jour</div>
          <p className="text-foreground/75">{tip}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            data-testid={`dash-${c.title.toLowerCase().replace(/\s/g, "-")}`}
            className={`ml-card p-7 ${c.color} block hover:-translate-y-1 transition-transform`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <c.icon className="w-7 h-7 text-brick" strokeWidth={2.25} />
            </div>
            <div className="text-xl font-black mt-4">{c.title}</div>
            <div className="text-sm text-foreground/70 mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="ml-card mt-8 p-8 bg-white text-center">
          <div className="text-lg font-black">Créez le profil de votre enfant</div>
          <p className="text-foreground/70 mt-2">Pour personnaliser l’expérience (âge, thèmes, mode chrétien).</p>
          <Link to="/app/parent" className="mt-4 inline-block ml-btn-primary" data-testid="create-child-profile-cta">Aller au Mode Parent</Link>
        </div>
      )}
    </div>
  );
}
