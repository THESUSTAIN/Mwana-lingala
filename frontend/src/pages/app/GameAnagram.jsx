import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trophy, Volume2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

function shuffleString(s) {
  const chars = [...s];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const res = chars.join("");
  return res === s && s.length > 1 ? shuffleString(s) : res;
}

export default function GameAnagram() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const theme = sp.get("theme") || "famille";
  const [words, setWords] = useState([]);
  const [idx, setIdx] = useState(0);
  const [scrambled, setScrambled] = useState([]); // chars with unique keys
  const [answer, setAnswer] = useState([]); // placed chars in order
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadWords = () => {
    api.get(`/words?theme=${theme}&include_christian=false`).then((r) => {
      const pool = (r.data || []).filter((w) => !w.locked && w.lingala.length <= 8).slice(0, 5);
      setWords(pool);
      setIdx(0);
      setScore(0);
      setDone(false);
      setAnswer([]);
      setFeedback("");
      if (pool[0]) prepareWord(pool[0]);
    });
  };
  useEffect(() => { loadWords(); /* eslint-disable-next-line */ }, [theme]);

  const prepareWord = (w) => {
    const s = shuffleString(w.lingala.toLowerCase());
    setScrambled([...s].map((c, i) => ({ c, k: `${i}-${c}` })));
    setAnswer([]);
    setFeedback("");
  };

  const pickLetter = (item, i) => {
    if (feedback) return;
    setAnswer((a) => [...a, item]);
    setScrambled((s) => s.filter((_, j) => j !== i));
  };
  const popAnswer = (i) => {
    if (feedback) return;
    const item = answer[i];
    setAnswer((a) => a.filter((_, j) => j !== i));
    setScrambled((s) => [...s, item]);
  };

  const check = () => {
    const w = words[idx];
    const user = answer.map((a) => a.c).join("").toLowerCase();
    const target = w.lingala.toLowerCase();
    const ok = user === target;
    setFeedback(ok ? "good" : "bad");
    if (ok) {
      setScore((s) => s + 1);
      api.post("/progress", { word_id: w.word_id, learned: true }).catch(() => {});
    }
    setTimeout(() => {
      if (idx + 1 >= words.length) setDone(true);
      else { setIdx((i) => i + 1); prepareWord(words[idx + 1]); }
    }, 1500);
  };

  const w = words[idx];
  const canCheck = w && answer.length === w.lingala.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center" data-testid="anagram-back"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">🔤 Remets les lettres</h1>
          <p className="text-foreground/70 mt-1">Forme le mot Lingala dans le bon ordre.</p>
        </div>
      </div>

      {done ? (
        <div className="ml-card p-10 text-center bg-gradient-to-br from-blue-50 to-white">
          <Trophy className="w-20 h-20 text-sun-500 mx-auto mb-3" />
          <div className="text-3xl font-black">Bravo !</div>
          <div className="text-foreground/70 mt-1">{score} / {words.length} mots trouvés</div>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button onClick={loadWords} data-testid="anagram-replay" className="ml-btn-primary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Rejouer</button>
            <Link to="/app/enfant/jouer" className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold">Autres jeux</Link>
          </div>
        </div>
      ) : !w ? (
        <div className="text-center py-10 text-foreground/60">Chargement…</div>
      ) : (
        <div className="ml-card p-6 sm:p-10 bg-white">
          <div className="text-center text-sm text-foreground/60 mb-2">Mot {idx + 1} / {words.length} · Score: <strong className="text-leaf">{score}</strong></div>

          {w.image && <img src={w.image} alt="" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto rounded-3xl object-cover" />}
          <div className="mt-4 text-center">
            <div className="text-2xl font-black text-brick">{w.french}</div>
            <button onClick={() => playWord(w)} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sun-200" data-testid="anagram-audio">
              <Volume2 className="w-4 h-4" /> Écouter
            </button>
          </div>

          {/* Answer slots */}
          <div className="mt-8 flex justify-center gap-2 min-h-[4rem]" data-testid="anagram-answer">
            {answer.map((item, i) => (
              <button key={item.k + "a"} onClick={() => popAnswer(i)} className={`w-12 h-14 rounded-2xl font-black text-2xl uppercase border-2 ${feedback === "good" ? "bg-leaf text-white border-leaf" : feedback === "bad" ? "bg-brick text-white border-brick" : "bg-leaf-50 text-leaf border-leaf"}`}>
                {item.c}
              </button>
            ))}
            {Array.from({ length: Math.max(0, w.lingala.length - answer.length) }).map((_, i) => (
              <div key={"empty-" + i} className="w-12 h-14 rounded-2xl border-2 border-dashed border-sand-200" />
            ))}
          </div>

          {/* Scrambled letters */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {scrambled.map((item, i) => (
              <button key={item.k} onClick={() => pickLetter(item, i)} data-testid={`anagram-letter-${item.c}-${i}`} className="w-12 h-14 rounded-2xl font-black text-2xl uppercase bg-white border-2 border-sand-200 hover:border-blue-400 active:scale-95">
                {item.c}
              </button>
            ))}
          </div>

          <button onClick={check} disabled={!canCheck || !!feedback} data-testid="anagram-check" className="mt-8 w-full ml-btn-primary disabled:opacity-40">
            Vérifier
          </button>
          {feedback && (
            <div className={`mt-4 p-3 rounded-xl font-bold text-center ${feedback === "good" ? "bg-leaf-50 text-leaf-700" : "bg-brick-50 text-brick-700"}`}>
              {feedback === "good" ? <><Check className="w-5 h-5 inline" /> Parfait ! {w.lingala}</> : <><X className="w-5 h-5 inline" /> C'était : {w.lingala}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
