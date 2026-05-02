import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trophy, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

// Puzzle — découpe une image Nano Banana en 3x3 pièces mélangées. L'enfant replace.
// Simple : on affiche 9 tuiles numérotées (bg-position CSS), on swap par clic.

const GRID = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GamePuzzle() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const theme = sp.get("theme") || "animaux";
  const [word, setWord] = useState(null);
  const [tiles, setTiles] = useState([]); // array of current index (0..8) showing where piece N is
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);

  const pickWord = () => {
    api.get(`/words?theme=${theme}&include_christian=false`).then((r) => {
      const pool = (r.data || []).filter((w) => !w.locked && w.image);
      if (!pool.length) return;
      const w = pool[Math.floor(Math.random() * pool.length)];
      setWord(w);
      setTiles(shuffle([...Array(GRID * GRID).keys()]));
      setSelected(null);
      setSolved(false);
    });
  };
  useEffect(() => { pickWord(); /* eslint-disable-next-line */ }, [theme]);

  const onTileClick = (i) => {
    if (solved) return;
    if (selected === null) { setSelected(i); return; }
    if (selected === i) { setSelected(null); return; }
    const next = [...tiles];
    [next[selected], next[i]] = [next[i], next[selected]];
    setTiles(next);
    setSelected(null);
    if (next.every((v, idx) => v === idx)) {
      setSolved(true);
      if (word) api.post("/progress", { word_id: word.word_id, learned: true }).catch(() => {});
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center" data-testid="puzzle-back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-black">🧩 Puzzle</h1>
          <p className="text-foreground/70 mt-1">Replace les pièces pour découvrir l'image.</p>
        </div>
        <button onClick={pickWord} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center hover:bg-orange-50" data-testid="puzzle-restart" aria-label="Nouvelle image">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {!word ? (
        <div className="text-center py-10 text-foreground/60">Chargement…</div>
      ) : solved ? (
        <div className="ml-card p-6 sm:p-10 text-center bg-gradient-to-br from-orange-50 to-white">
          <Trophy className="w-16 h-16 text-sun-500 mx-auto mb-3" />
          <img src={word.image} alt={word.french} className="w-64 h-64 mx-auto rounded-3xl object-cover" />
          <div className="text-3xl font-black text-leaf mt-4">{word.lingala}</div>
          <div className="text-foreground/70">{word.french}</div>
          <button onClick={() => playWord(word)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sun-200 font-bold" data-testid="puzzle-audio-solved">
            <Volume2 className="w-4 h-4" /> Écouter
          </button>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button onClick={pickWord} data-testid="puzzle-replay" className="ml-btn-primary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Nouveau puzzle</button>
            <Link to="/app/enfant/jouer" className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold">Autres jeux</Link>
          </div>
        </div>
      ) : (
        <div className="ml-card p-6 sm:p-8 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <img src={word.image} alt="" className="w-14 h-14 rounded-xl object-cover opacity-80" />
            <div>
              <div className="text-xs font-bold text-foreground/60">Mot à deviner</div>
              <div className="text-2xl font-black text-leaf">{word.lingala}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 aspect-square max-w-md mx-auto rounded-2xl overflow-hidden bg-sand-100 p-1.5" data-testid="puzzle-grid">
            {tiles.map((pieceNum, pos) => {
              const row = Math.floor(pieceNum / GRID);
              const col = pieceNum % GRID;
              const bgX = -col * 100;
              const bgY = -row * 100;
              return (
                <button
                  key={pos}
                  onClick={() => onTileClick(pos)}
                  data-testid={`puzzle-tile-${pos}`}
                  className={`aspect-square rounded-xl overflow-hidden active:scale-95 transition-all ${selected === pos ? "ring-4 ring-orange-500 scale-95" : ""}`}
                  style={{
                    backgroundImage: `url(${word.image})`,
                    backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                    backgroundPosition: `${bgX}% ${bgY}%`,
                  }}
                />
              );
            })}
          </div>
          <p className="mt-4 text-center text-sm text-foreground/60">
            Clique sur une pièce puis sur une autre pour les échanger.
          </p>
        </div>
      )}
    </div>
  );
}
