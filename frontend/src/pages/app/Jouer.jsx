import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, Trophy, Volume2, Mic, Lock,
  Brain, Home, Image as ImageIcon, Palette, Blocks, Search,
  Ear, MessageSquareQuote,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = [
  { slug: "all", label: "Tous", emoji: "▪️" },
  { slug: "animaux", label: "Animaux", emoji: "🦁" },
  { slug: "nourriture", label: "Nourriture", emoji: "🍌" },
  { slug: "famille", label: "Famille", emoji: "👪" },
  { slug: "maison", label: "Maison & objets", emoji: "🏠" },
  { slug: "couleurs", label: "Couleurs", emoji: "🌈" },
  { slug: "nombres", label: "Nombres", emoji: "🔢" },
  { slug: "salutations", label: "Salutations", emoji: "👋" },
];

// Jeux réellement implémentés (status: "ready") vs bientôt disponibles (status: "soon").
// "to" = route spécifique au jeu ; sinon, on envoie au Quiz.
const GAMES = [
  // Ready games
  { key: "quiz-image", title: "Écoute et trouve", desc: "Écoute le mot Lingala et trouve la bonne image.", Icon: Ear, level: 1, color: "from-leaf-50 to-white", iconBg: "bg-leaf", status: "ready", themes: "all" },
  { key: "mcq", title: "Choisis la bonne réponse", desc: "Lis ou écoute et choisis la bonne réponse.", Icon: Search, level: 1, color: "from-sun-100 to-white", iconBg: "bg-orange-500", status: "ready", themes: "all" },
  { key: "memory", title: "Jeu de mémoire", desc: "Retourne les cartes et trouve les paires Lingala ⇆ Français.", Icon: Brain, level: 2, color: "from-purple-50 to-white", iconBg: "bg-purple-600", status: "ready", themes: "all", to: "/app/enfant/jouer/memoire" },
  { key: "palais", title: "Palais Mental", desc: "Place 5 mots dans des pièces et entraîne ta mémoire.", Icon: Home, level: 3, color: "from-purple-50 to-white", iconBg: "bg-purple-700", status: "ready", themes: "all", to: "/app/enfant/jouer/palais-mental" },
  { key: "letters", title: "Remets les lettres", desc: "Remets les lettres dans le bon ordre pour former le mot.", Icon: MessageSquareQuote, level: 2, color: "from-blue-50 to-white", iconBg: "bg-blue-500", status: "ready", themes: "all", to: "/app/enfant/jouer/anagram" },
  { key: "repeat", title: "Répète le mot", desc: "Écoute et répète le mot pour gagner des étoiles.", Icon: Mic, level: 2, color: "from-leaf-50 to-white", iconBg: "bg-leaf", status: "ready", themes: "all", to: "/app/enfant/jouer/repeat" },
  { key: "color", title: "Colorie et apprends", desc: "Colorie la forme avec la bonne couleur en Lingala.", Icon: Palette, level: 1, color: "from-pink-50 to-white", iconBg: "bg-pink-500", status: "ready", themes: ["couleurs"], to: "/app/enfant/jouer/color" },
  { key: "puzzle", title: "Puzzle", desc: "Assemble le puzzle et découvre l'image Lingala.", Icon: Blocks, level: 2, color: "from-orange-50 to-white", iconBg: "bg-orange-500", status: "ready", themes: "all", to: "/app/enfant/jouer/puzzle" },
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
        {GAMES
          .filter((g) => cat === "all" || g.themes === "all" || (Array.isArray(g.themes) && g.themes.includes(cat)))
          .map((g) => {
            const themeQ = cat !== "all" ? `?theme=${cat}` : "";
            const targetUrl = g.to || `/app/enfant/quiz${themeQ}`;
            const isSoon = g.status === "soon";
            const Icon = g.Icon;
            const cardContent = (
              <>
                <div className={`aspect-square flex items-center justify-center ${isSoon ? "bg-sand-100" : "bg-white/60"}`}>
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${isSoon ? "bg-foreground/10" : g.iconBg}`}>
                    {Icon && <Icon className={`w-12 h-12 ${isSoon ? "text-foreground/40" : "text-white"}`} strokeWidth={2.25} />}
                  </div>
                </div>
                <div className="p-4 text-center">
                  <div className={`font-black text-base leading-tight ${isSoon ? "text-foreground/50" : ""}`}>{g.title}</div>
                  <p className="text-xs text-foreground/60 mt-1 line-clamp-2">{g.desc}</p>
                  <div className="text-xs font-bold mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60">
                    <Star className="w-3 h-3 fill-current" /> Niveau {g.level}
                  </div>
                  {isSoon ? (
                    <div className="mt-3 w-full py-2.5 rounded-full bg-foreground/10 text-foreground/50 font-black text-sm inline-flex items-center justify-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Bientôt
                    </div>
                  ) : (
                    <div className={`mt-3 w-full py-2.5 rounded-full text-white font-black text-sm ${g.iconBg} inline-flex items-center justify-center gap-1`}>
                      Jouer ▶
                    </div>
                  )}
                </div>
              </>
            );
            return isSoon ? (
              <div
                key={g.key}
                data-testid={`game-${g.key}`}
                className={`ml-card overflow-hidden bg-gradient-to-br ${g.color} opacity-70 cursor-not-allowed`}
                aria-disabled
              >
                {cardContent}
              </div>
            ) : (
              <Link
                key={g.key}
                to={targetUrl}
                data-testid={`game-${g.key}`}
                className={`ml-card overflow-hidden bg-gradient-to-br ${g.color} group hover:shadow-lg transition-all active:scale-[0.98]`}
              >
                {cardContent}
              </Link>
            );
          })}
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
