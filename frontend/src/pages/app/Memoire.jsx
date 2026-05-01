import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trophy, Volume2, Timer as TimerIcon, Check } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

// Memory pair game — flip 12 cards (6 pairs). Each pair matches the Lingala word
// card (with image) to the French card. Celebrates matches with audio cue.

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "animaux", label: "Animaux" },
  { slug: "couleurs", label: "Couleurs" },
  { slug: "salutations", label: "Salutations" },
  { slug: "maison", label: "Maison" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Memoire() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState(searchParams.get("theme") || "famille");
  const [deck, setDeck] = useState([]); // [{card_id, word_id, face:'ln'|'fr', ...word}]
  const [flipped, setFlipped] = useState([]); // up to 2 card_ids currently shown
  const [matched, setMatched] = useState([]); // word_ids solved
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const loadDeck = () => {
    api.get(`/words?theme=${theme}&include_christian=false`).then((r) => {
      const pool = (r.data || []).filter((w) => !w.locked);
      const picked = shuffle(pool).slice(0, 6);
      const cards = [];
      picked.forEach((w, i) => {
        cards.push({ card_id: `ln-${i}`, word_id: w.word_id, face: "ln", ...w });
        cards.push({ card_id: `fr-${i}`, word_id: w.word_id, face: "fr", ...w });
      });
      setDeck(shuffle(cards));
      setFlipped([]);
      setMatched([]);
      setMoves(0);
      setStartedAt(Date.now());
      setElapsed(0);
    });
  };
  useEffect(() => { loadDeck(); /* eslint-disable-next-line */ }, [theme]);

  // Timer
  useEffect(() => {
    if (!startedAt || matched.length >= 6) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt, matched.length]);

  const done = matched.length >= 6 && deck.length > 0;

  const onFlip = (card) => {
    if (flipped.length >= 2 || flipped.includes(card.card_id) || matched.includes(card.word_id)) return;
    const nextFlipped = [...flipped, card.card_id];
    setFlipped(nextFlipped);
    if (card.face === "ln") playWord(card);
    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextFlipped.map((id) => deck.find((c) => c.card_id === id));
      if (a.word_id === b.word_id) {
        setTimeout(() => { setMatched((m) => [...m, a.word_id]); setFlipped([]); }, 600);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  const stars = useMemo(() => {
    if (!done) return 0;
    if (moves <= 8) return 3;
    if (moves <= 12) return 2;
    return 1;
  }, [done, moves]);

  const timeLabel = `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} data-testid="memoire-back" className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center hover:bg-sand-100 active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black inline-flex items-center gap-2">
              <span className="text-3xl">🧠</span> Mémoire des Pairs
            </h1>
            <p className="text-foreground/70 mt-1">Retourne les cartes et retrouve les paires Lingala ⇆ Français.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white shadow-sm inline-flex items-center gap-2 text-sm font-bold" data-testid="memoire-stats">
            <TimerIcon className="w-4 h-4 text-purple-600" /> {timeLabel}
            <span className="text-foreground/30 mx-1">|</span>
            <span>{moves} coups</span>
          </div>
          <button onClick={loadDeck} data-testid="memoire-restart" className="px-4 py-2.5 rounded-full bg-white border-2 border-sand-200 font-bold inline-flex items-center gap-2 hover:border-purple-300">
            <RefreshCw className="w-4 h-4" /> Nouvelle partie
          </button>
        </div>
      </div>

      {/* Theme picker */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
        {THEMES.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTheme(t.slug)}
            data-testid={`memoire-theme-${t.slug}`}
            className={`px-5 py-2 rounded-full font-bold whitespace-nowrap border-2 transition-all text-sm ${theme === t.slug ? "bg-purple-600 text-white border-purple-600" : "bg-white text-foreground/70 border-sand-200 hover:border-purple-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Board */}
      {!done && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
          {deck.map((c) => {
            const isFlipped = flipped.includes(c.card_id) || matched.includes(c.word_id);
            const isMatched = matched.includes(c.word_id);
            return (
              <button
                key={c.card_id}
                onClick={() => onFlip(c)}
                data-testid={`memoire-card-${c.card_id}`}
                className={`aspect-[3/4] rounded-3xl p-3 font-black text-center transition-all active:scale-95 ${isFlipped
                  ? (isMatched ? "bg-leaf text-white" : c.face === "ln" ? "bg-white text-leaf shadow-lg" : "bg-sun-100 text-foreground shadow-lg")
                  : "bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md hover:shadow-xl"}`}
              >
                {!isFlipped ? (
                  <div className="flex items-center justify-center h-full text-4xl">?</div>
                ) : c.face === "ln" ? (
                  <div className="flex flex-col items-center justify-center h-full gap-1">
                    {c.image && <img src={c.image} alt="" className="w-full aspect-square object-cover rounded-2xl mb-1" />}
                    <div className="text-base sm:text-lg leading-tight">{c.lingala}</div>
                    <Volume2 className="w-4 h-4 opacity-60" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-base sm:text-lg">{c.french}</div>
                )}
                {isMatched && (
                  <div className="absolute top-2 right-2"><Check className="w-4 h-4" /></div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {done && (
        <div className="ml-card p-10 text-center bg-gradient-to-br from-purple-50 to-white">
          <Trophy className="w-20 h-20 text-sun-500 mx-auto mb-3" />
          <div className="text-3xl font-black">Bravo ! 🎉</div>
          <div className="text-foreground/70 mt-2">
            6 paires trouvées en {moves} coups — {timeLabel}
          </div>
          <div className="mt-4 flex justify-center gap-1 text-3xl">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? "" : "opacity-20"}>⭐</span>
            ))}
          </div>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button onClick={loadDeck} data-testid="memoire-replay" className="ml-btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Rejouer
            </button>
            <Link to="/app/enfant/jouer" className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold">
              Autres jeux
            </Link>
          </div>
        </div>
      )}

      {!done && matched.length > 0 && (
        <div className="mt-5 text-sm text-center text-foreground/60">
          Paires trouvées : <strong className="text-leaf">{matched.length}</strong> / 6
        </div>
      )}
    </div>
  );
}
