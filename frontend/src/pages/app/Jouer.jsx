import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Trophy, Volume2, Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = [
  { slug: "all", label: "Tous", emoji: "▪️" },
  { slug: "animals", label: "Animaux", emoji: "🦁" },
  { slug: "fruits", label: "Fruits", emoji: "🍌" },
  { slug: "famille", label: "Famille", emoji: "👪" },
  { slug: "objects", label: "Objets", emoji: "⚪" },
  { slug: "colors", label: "Couleurs", emoji: "🌈" },
  { slug: "numbers", label: "Nombres", emoji: "🔢" },
];

const GAMES = [
  { key: "quiz-image", title: "Écoute et trouve", desc: "Écoute le mot et trouve la bonne image.", level: 1, color: "from-leaf-50 to-white", btn: "bg-leaf", emoji: "🦁", to: "/app/enfant/quiz" },
  { key: "letters", title: "Remets les lettres", desc: "Remets les lettres dans le bon ordre.", level: 2, color: "from-blue-50 to-white", btn: "bg-blue-500", emoji: "🔤", to: "/app/enfant/quiz" },
  { key: "mcq", title: "Choisis la bonne réponse", desc: "Lis ou écoute et choisis la bonne réponse.", level: 1, color: "from-sun-100 to-white", btn: "bg-orange-500", emoji: "🍌", to: "/app/enfant/quiz" },
  { key: "memory", title: "Jeu de mémoire", desc: "Retourne les cartes et trouve les paires.", level: 2, color: "from-purple-50 to-white", btn: "bg-purple-600", emoji: "🧠", to: "/app/enfant/quiz" },
  { key: "color", title: "Colorie et apprends", desc: "Colorie l'image et écoute le mot en Lingala.", level: 1, color: "from-pink-50 to-white", btn: "bg-pink-500", emoji: "🎨", to: "/app/enfant/quiz" },
  { key: "repeat", title: "Répète le mot", desc: "Écoute et répète le mot pour gagner des étoiles.", level: 2, color: "from-leaf-50 to-white", btn: "bg-leaf", emoji: "🗣️", to: "/app/enfant/quiz" },
  { key: "fish", title: "Attrape le mot", desc: "Attrape le bon poisson qui correspond au mot.", level: 3, color: "from-blue-50 to-white", btn: "bg-blue-500", emoji: "🎣", to: "/app/enfant/quiz" },
  { key: "puzzle", title: "Puzzle", desc: "Assemble le puzzle et découvre l'image.", level: 2, color: "from-orange-50 to-white", btn: "bg-orange-500", emoji: "🧩", to: "/app/enfant/quiz" },
];

export default function Jouer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cat, setCat] = useState("all");
  const stars = user?.credits || 0;
  const level = stars >= 250 ? 3 : stars >= 50 ? 2 : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            data-testid="jouer-back"
            className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center hover:bg-sand-100 active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black inline-flex items-center gap-2">
              <span>🎮</span> Jouer
            </h1>
            <p className="text-foreground/70 mt-1">Apprends en t'amusant avec des jeux interactifs en Lingala !</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200" data-testid="jouer-level">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Star className="w-5 h-5 text-purple-600 fill-purple-600" /></div>
          <div>
            <div className="text-xs font-bold text-purple-600">Niveau {level}</div>
            <div className="text-sm font-black">{stars} / 250 points</div>
          </div>
          <Trophy className="w-5 h-5 text-sun-500 ml-1" />
        </div>
      </div>

      {/* Categories tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCat(c.slug)}
            data-testid={`jouer-cat-${c.slug}`}
            className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap inline-flex items-center gap-2 border-2 transition-all ${cat === c.slug ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-sand-200 text-foreground/70 hover:border-purple-200"}`}
          >
            <span className="text-lg">{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Games grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {GAMES.map((g) => (
          <Link
            key={g.key}
            to={g.to}
            data-testid={`game-${g.key}`}
            className={`ml-card overflow-hidden bg-gradient-to-br ${g.color} group hover:shadow-lg transition-all`}
          >
            <div className="aspect-square bg-white/40 flex items-center justify-center text-7xl">
              {g.emoji}
            </div>
            <div className="p-4 text-center">
              <div className="font-black text-base leading-tight">{g.title}</div>
              <p className="text-xs text-foreground/60 mt-1 line-clamp-2">{g.desc}</p>
              <div className="text-xs font-bold mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60">
                <Star className="w-3 h-3 fill-current" /> Niveau {g.level}
              </div>
              <button className={`mt-3 w-full py-2.5 rounded-full text-white font-black text-sm ${g.btn} active:scale-95 inline-flex items-center justify-center gap-1`}>
                Jouer ▶
              </button>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 ml-card p-5 bg-gradient-to-br from-sun-100 to-white flex items-center gap-3">
        <span className="text-3xl">💡</span>
        <div className="flex-1">
          <div className="font-black">Apprendre en jouant, c'est rester pour toujours !</div>
          <div className="text-sm text-foreground/70">Plus tu joues, plus tu gagnes des étoiles et tu progresses.</div>
        </div>
        <span className="text-3xl">⭐</span>
      </div>
    </div>
  );
}
