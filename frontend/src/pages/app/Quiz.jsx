import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, ArrowRight, Check, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { speakLingala } from "@/components/AudioButton";

export default function Quiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const include = user?.christian_mode ? true : false;
    api
      .get(`/quiz?count=5&include_christian=${include}`)
      .then((r) => {
        setQuestions(r.data.questions || []);
        setCurrent(0);
        setSelected(null);
        setCorrectCount(0);
        setDone(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const q = questions[current];

  const handlePick = (opt) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt.word_id === q.word_id;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      api.post("/progress", { word_id: q.word_id, learned: true }).catch(() => {});
    }
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setDone(true);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 1200);
  };

  if (loading) {
    return <div className="p-10 text-center">Chargement du quiz...</div>;
  }

  if (done) {
    const stars = Math.max(1, Math.round((correctCount / questions.length) * 3));
    return (
      <div className="max-w-xl mx-auto px-4 py-14 text-center" data-testid="quiz-done">
        <Trophy className="w-20 h-20 mx-auto text-brick" />
        <h1 className="text-4xl font-black mt-4">Bravo !</h1>
        <p className="text-xl mt-2">{correctCount} / {questions.length} bonnes réponses</p>
        <div className="mt-4 text-4xl">
          {"★".repeat(stars)}{"☆".repeat(3 - stars)}
        </div>
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={load} className="ml-btn-primary inline-flex items-center gap-2" data-testid="quiz-restart">
            <RefreshCw className="w-4 h-4" /> Rejouer
          </button>
          <button onClick={() => navigate("/app/enfant")} className="ml-btn-outline" data-testid="quiz-back">
            Retour aux mots
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return <div className="p-10 text-center">Pas de question disponible.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between text-sm font-bold text-foreground/60">
        <span>Question {current + 1} / {questions.length}</span>
        <span>Bonnes : {correctCount}</span>
      </div>
      <div className="h-2 bg-sand-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-leaf transition-all" style={{ width: `${((current) / questions.length) * 100}%` }} />
      </div>

      <div className="ml-card mt-6 p-8 bg-white text-center">
        <div className="text-sm font-bold text-leaf">Écoute puis choisis</div>
        <div className="text-5xl font-black text-brick mt-3" data-testid="quiz-word">{q.lingala}</div>
        <button
          onClick={() => speakLingala(q.lingala)}
          className="mt-4 px-6 py-3 rounded-full bg-brick text-white font-bold active:scale-95"
          data-testid="quiz-audio"
        >
          🔊 Écouter
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {q.options.map((opt) => {
          const isSelected = selected?.word_id === opt.word_id;
          const isCorrect = selected && opt.word_id === q.word_id;
          const isWrong = selected && isSelected && opt.word_id !== q.word_id;
          return (
            <button
              key={opt.word_id}
              onClick={() => handlePick(opt)}
              disabled={!!selected}
              data-testid={`quiz-option-${opt.french}`}
              className={`ml-card p-4 bg-white text-left transition-all ${
                isCorrect ? "ring-4 ring-leaf bg-leaf-50" : isWrong ? "ring-4 ring-brick bg-brick-50" : "hover:-translate-y-1"
              }`}
            >
              {opt.image && <img src={opt.image} alt={opt.french} className="w-full aspect-square object-cover rounded-2xl" />}
              <div className="mt-2 font-black text-lg flex items-center justify-between">
                {opt.french}
                {isCorrect && <Check className="w-5 h-5 text-leaf" />}
                {isWrong && <X className="w-5 h-5 text-brick" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link to="/app/enfant" className="text-sm text-foreground/60 underline">Quitter le quiz</Link>
      </div>
    </div>
  );
}
