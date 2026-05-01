import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Baby, Smile, Users, BookOpenText, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({ count: 0, total: 20, percent: 0 });

  useEffect(() => {
    api.get("/progress").then((r) => setProgress(r.data)).catch(() => {});
  }, []);

  const cards = [
    {
      to: "/app/bebe",
      icon: Baby,
      title: "Mode Bébé",
      age: "0 – 3 ans",
      desc: "Audio doux, sans écran actif.",
      bg: "bg-sand-100",
      testid: "dash-mode-bebe",
    },
    {
      to: "/app/enfant",
      icon: Smile,
      title: "Mode Enfant",
      age: "4 – 10 ans",
      desc: "Cartes, images, quiz courts.",
      bg: "bg-leaf-50",
      testid: "dash-mode-enfant",
    },
    {
      to: "/app/parent",
      icon: Users,
      title: "Mode Parent",
      age: "Pour vous",
      desc: "Profils, progression, réglages.",
      bg: "bg-brick-50",
      testid: "dash-mode-parent",
    },
    {
      to: "/app/chretien",
      icon: BookOpenText,
      title: "Mode Chrétien",
      age: "Optionnel",
      desc: "Mots bibliques et prières courtes.",
      bg: "bg-sun-100",
      testid: "dash-mode-chretien",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Bonjour, {user?.name?.split(" ")[0] || "parent"} 👋</h1>
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
