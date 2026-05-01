import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, RefreshCw, Check, Volume2, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

// Palais mental — méthode des loci (inspirée de "Moonwalking with Einstein").
// On présente 5 pièces d'une maison. L'enfant glisse 5 mots Lingala dans les pièces
// pour créer une histoire mentale, puis on lui demande de retrouver chaque mot par pièce.

const ROOMS = [
  { key: "salon", label: "Salon", emoji: "🛋️", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "cuisine", label: "Cuisine", emoji: "🍳", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "chambre", label: "Chambre", emoji: "🛏️", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "salle-bain", label: "Salle de bain", emoji: "🛁", bg: "bg-cyan-50", border: "border-cyan-200" },
  { key: "jardin", label: "Jardin", emoji: "🌳", bg: "bg-leaf-50", border: "border-leaf" },
];

export default function PalaisMental() {
  const navigate = useNavigate();
  const [pool, setPool] = useState([]); // 5 mots Lingala disponibles à placer
  const [placements, setPlacements] = useState({}); // {room_key: word_id}
  const [phase, setPhase] = useState("placing"); // placing | memorize | recall | done
  const [recallAnswers, setRecallAnswers] = useState({}); // {room_key: french}
  const [score, setScore] = useState(0);

  const loadWords = () => {
    setPlacements({});
    setRecallAnswers({});
    setPhase("placing");
    setScore(0);
    api.get("/words?include_christian=false").then((r) => {
      const list = (r.data || []).filter((w) => !w.locked);
      // shuffle and take 5
      const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, 5);
      setPool(shuffled);
    });
  };
  useEffect(() => { loadWords(); }, []);

  const placeWord = (word) => {
    const emptyRoom = ROOMS.find((r) => !placements[r.key]);
    if (!emptyRoom) return;
    setPlacements((p) => ({ ...p, [emptyRoom.key]: word }));
  };

  const removeFromRoom = (roomKey) => {
    setPlacements((p) => {
      const c = { ...p };
      delete c[roomKey];
      return c;
    });
  };

  const placedIds = new Set(Object.values(placements).map((w) => w?.word_id));
  const allPlaced = Object.keys(placements).length === ROOMS.length;

  const startMemorize = () => setPhase("memorize");
  const startRecall = () => {
    setRecallAnswers({});
    setPhase("recall");
  };
  const submitRecall = () => {
    let s = 0;
    ROOMS.forEach((r) => {
      const ans = (recallAnswers[r.key] || "").trim().toLowerCase();
      const expected = (placements[r.key]?.french || "").toLowerCase();
      if (ans && expected && (expected.includes(ans) || ans.includes(expected.split(" ")[0]))) s += 1;
    });
    setScore(s);
    setPhase("done");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} data-testid="palais-back" className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center hover:bg-sand-100 active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black inline-flex items-center gap-2">
              <Home className="w-8 h-8 text-purple-600" /> Palais Mental
            </h1>
            <p className="text-foreground/70 mt-1">Place les mots dans les pièces de la maison pour les retenir longtemps !</p>
          </div>
        </div>
        <button onClick={loadWords} data-testid="palais-restart" className="px-4 py-2.5 rounded-full bg-white border-2 border-sand-200 font-bold inline-flex items-center gap-2 hover:border-purple-300">
          <RefreshCw className="w-4 h-4" /> Nouveaux mots
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-bold mb-6">
        <span className={`px-3 py-1 rounded-full ${phase === "placing" ? "bg-purple-600 text-white" : "bg-sand-100 text-foreground/50"}`}>1. Placer</span>
        <span className="text-foreground/30">→</span>
        <span className={`px-3 py-1 rounded-full ${phase === "memorize" ? "bg-purple-600 text-white" : "bg-sand-100 text-foreground/50"}`}>2. Mémoriser</span>
        <span className="text-foreground/30">→</span>
        <span className={`px-3 py-1 rounded-full ${phase === "recall" ? "bg-purple-600 text-white" : "bg-sand-100 text-foreground/50"}`}>3. Retrouver</span>
        <span className="text-foreground/30">→</span>
        <span className={`px-3 py-1 rounded-full ${phase === "done" ? "bg-leaf text-white" : "bg-sand-100 text-foreground/50"}`}>4. Score</span>
      </div>

      {/* Rooms grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {ROOMS.map((r) => {
          const w = placements[r.key];
          const isRecallAnswered = phase === "recall" && (recallAnswers[r.key] || "").trim();
          return (
            <div key={r.key} className={`ml-card p-4 ${r.bg} border-2 ${r.border} aspect-square flex flex-col items-center justify-between`} data-testid={`room-${r.key}`}>
              <div className="text-4xl">{r.emoji}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">{r.label}</div>
              {w ? (
                <>
                  {phase === "placing" && (
                    <button onClick={() => removeFromRoom(r.key)} className="px-2 py-1 text-[10px] rounded-full bg-white/80 font-bold hover:bg-white">retirer</button>
                  )}
                  {phase === "memorize" && (
                    <div className="text-center">
                      <div className="font-black text-leaf text-lg">{w.lingala}</div>
                      <div className="text-xs text-foreground/60">{w.french}</div>
                      <button onClick={() => playWord(w)} className="mt-1 w-7 h-7 rounded-full bg-sun-300 inline-flex items-center justify-center" aria-label="Écouter">
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {phase === "recall" && (
                    <div className="w-full">
                      <div className="text-center font-black text-leaf">{w.lingala}</div>
                      <input
                        value={recallAnswers[r.key] || ""}
                        onChange={(e) => setRecallAnswers((p) => ({ ...p, [r.key]: e.target.value }))}
                        placeholder="traduction..."
                        data-testid={`recall-input-${r.key}`}
                        className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg border-2 border-white bg-white/80 focus:border-purple-300 outline-none text-center"
                      />
                    </div>
                  )}
                  {phase === "done" && (
                    <div className="text-center">
                      <div className="font-black text-leaf">{w.lingala}</div>
                      <div className="text-xs text-foreground/60">{w.french}</div>
                      <div className="text-xs mt-1">
                        Vous : « {recallAnswers[r.key] || "—"} »
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-foreground/30 text-xs">vide</div>
              )}
              {isRecallAnswered && <Check className="w-4 h-4 text-leaf absolute" />}
            </div>
          );
        })}
      </div>

      {/* Action area depending on phase */}
      {phase === "placing" && (
        <>
          <div className="mb-3 text-sm font-bold text-foreground/70">Choisis 5 mots et place-les dans une pièce :</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {pool.map((w) => {
              const placed = placedIds.has(w.word_id);
              return (
                <button
                  key={w.word_id}
                  onClick={() => !placed && placeWord(w)}
                  disabled={placed}
                  data-testid={`pool-${w.lingala}`}
                  className={`ml-card p-3 bg-white text-center hover:shadow-lg active:scale-95 transition-all ${placed ? "opacity-30" : ""}`}
                >
                  {w.image && <img src={w.image} alt="" className="w-full aspect-square object-cover rounded-xl mb-2" />}
                  <div className="font-black text-leaf text-sm">{w.lingala}</div>
                  <div className="text-xs text-foreground/60">{w.french}</div>
                </button>
              );
            })}
          </div>
          {allPlaced && (
            <button onClick={startMemorize} data-testid="palais-memorize" className="mt-6 w-full ml-btn-primary py-4 text-lg">
              ✅ Tout est placé — Mémoriser !
            </button>
          )}
        </>
      )}

      {phase === "memorize" && (
        <div className="ml-card p-6 bg-purple-50 border-2 border-purple-200 text-center">
          <div className="text-lg font-black mb-1">🧠 Visualise ton parcours dans la maison.</div>
          <p className="text-sm text-foreground/70 max-w-xl mx-auto">
            Imagine-toi marcher de pièce en pièce. Dans le <strong>Salon</strong>, vois <strong>{placements.salon?.lingala}</strong>… puis dans la <strong>Cuisine</strong> vois <strong>{placements.cuisine?.lingala}</strong>… et ainsi de suite.
          </p>
          <button onClick={startRecall} data-testid="palais-recall" className="mt-5 ml-btn-primary inline-flex items-center gap-2">
            J'ai mémorisé — Tester ma mémoire
          </button>
        </div>
      )}

      {phase === "recall" && (
        <button onClick={submitRecall} data-testid="palais-submit" className="mt-2 w-full ml-btn-primary py-4 text-lg">
          Vérifier mes réponses
        </button>
      )}

      {phase === "done" && (
        <div className="ml-card p-8 text-center bg-gradient-to-br from-purple-50 to-white">
          <Trophy className="w-16 h-16 text-sun-500 mx-auto mb-3" />
          <div className="text-3xl font-black">Score : {score} / {ROOMS.length}</div>
          <p className="text-foreground/70 mt-2">
            {score === 5 ? "🎉 Parfait ! Le palais mental est très puissant." : score >= 3 ? "👏 Bien joué — recommence pour ancrer encore mieux." : "💪 Pas grave — la régularité est la clé."}
          </p>
          <div className="mt-5 flex gap-3 justify-center flex-wrap">
            <button onClick={loadWords} data-testid="palais-replay" className="ml-btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Rejouer
            </button>
            <Link to="/app/enfant/jouer" className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold">Autres jeux</Link>
          </div>
        </div>
      )}

      <div className="mt-8 ml-card p-5 bg-gradient-to-br from-sun-100 to-white">
        <div className="font-black mb-1">💡 Pourquoi ça marche ?</div>
        <p className="text-sm text-foreground/70">
          La méthode des loci, utilisée depuis l'Antiquité et popularisée par Joshua Foer dans <em>Moonwalking with Einstein</em>, transforme l'abstrait en concret en associant chaque mot à un lieu familier. Le cerveau retient bien mieux des images dans des pièces que des listes.
        </p>
      </div>
    </div>
  );
}
