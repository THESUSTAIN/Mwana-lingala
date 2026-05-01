import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Repeat, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { speakLingala } from "@/components/AudioButton";

const THEME_TABS = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
];

export default function ModeBebe() {
  const { user } = useAuth();
  const [theme, setTheme] = useState("famille");
  const [words, setWords] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const include = user?.christian_mode ? true : false;
    api.get(`/words?theme=${theme}&include_christian=${include}`).then((r) => {
      setWords(r.data);
      setIdx(0);
    });
  }, [theme, user?.christian_mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const current = words[idx];

  const playOne = () => {
    if (!current) return;
    speakLingala(current.lingala);
  };

  const startAutoplay = () => {
    setPlaying(true);
    playOne();
    timerRef.current = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % Math.max(words.length, 1);
        const w = words[next];
        if (w) speakLingala(w.lingala);
        return next;
      });
    }, 4500);
  };

  const stopAutoplay = () => {
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    window.speechSynthesis?.cancel();
  };

  const togglePlay = () => (playing ? stopAutoplay() : startAutoplay());

  const next = () => {
    setIdx((i) => (i + 1) % Math.max(words.length, 1));
    setTimeout(() => words[(idx + 1) % words.length] && speakLingala(words[(idx + 1) % words.length].lingala), 50);
  };
  const prev = () => {
    setIdx((i) => (i - 1 + words.length) % Math.max(words.length, 1));
    setTimeout(() => words[(idx - 1 + words.length) % words.length] && speakLingala(words[(idx - 1 + words.length) % words.length].lingala), 50);
  };

  const themeColors = {
    famille: { bg: "from-sun-100 via-white to-sand-100", accent: "bg-orange-400", text: "text-orange-600" },
    nourriture: { bg: "from-blue-50 via-white to-sand-100", accent: "bg-blue-400", text: "text-blue-600" },
    emotions: { bg: "from-pink-50 via-white to-sand-100", accent: "bg-pink-400", text: "text-pink-600" },
  };
  const colors = themeColors[theme] || themeColors.famille;

  if (locked) {
    return (
      <div className="fixed inset-0 bg-foreground flex items-center justify-center p-6 z-50" onClick={() => setLocked(false)} data-testid="baby-locked-screen">
        <div className="text-center text-white/70">
          <Lock className="w-16 h-16 mx-auto mb-4" />
          <div className="text-2xl font-black">Écran verrouillé</div>
          <div className="text-sm mt-2">Touchez pour déverrouiller</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-gradient-to-br ${colors.bg} px-4 sm:px-6 py-8 lg:py-10`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black">Mode Bébé</h1>
          <p className="text-foreground/70 mt-2">Audio doux. Laissez bébé écouter, répétez avec lui.</p>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 justify-center">
          {THEME_TABS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setTheme(t.slug)}
              data-testid={`baby-theme-${t.slug}`}
              className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all border-2 ${theme === t.slug ? "bg-brick text-white border-brick" : "bg-white text-foreground/70 border-sand-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* GIANT player card */}
        <div className="ml-card mt-8 p-8 sm:p-12 bg-white text-center shadow-xl">
          <div className={`text-sm font-black uppercase tracking-widest ${colors.text}`}>Mot en Lingala</div>
          <div className="text-6xl sm:text-8xl font-black mt-4 text-brick" data-testid="baby-current-word">{current?.lingala || "—"}</div>
          <div className="text-2xl sm:text-3xl mt-3 text-foreground/70">{current?.french}</div>

          {/* Animated rings around play button when playing */}
          <div className="mt-10 mx-auto w-56 h-56 sm:w-64 sm:h-64 relative flex items-center justify-center">
            {playing && (
              <>
                <div className={`absolute inset-0 rounded-full ${colors.accent} opacity-20 animate-ping`}></div>
                <div className={`absolute inset-4 rounded-full ${colors.accent} opacity-30 animate-pulse-soft`}></div>
              </>
            )}
            <button
              onClick={togglePlay}
              data-testid="baby-play-btn"
              className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition-all ${playing ? "bg-leaf" : "bg-brick hover:bg-brick-600"}`}
              aria-label={playing ? "Pause" : "Lecture"}
            >
              {playing ? <Pause className="w-24 h-24" /> : <Play className="w-24 h-24 ml-2" />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <button onClick={prev} data-testid="baby-prev" aria-label="Précédent" className="w-16 h-16 rounded-full bg-sand-100 hover:bg-sand-200 active:scale-95 transition-transform flex items-center justify-center">
              <SkipBack className="w-7 h-7" />
            </button>
            <button onClick={playOne} data-testid="baby-repeat" aria-label="Répéter" className={`w-16 h-16 rounded-full ${colors.accent} text-white active:scale-95 transition-transform flex items-center justify-center`}>
              <Repeat className="w-7 h-7" />
            </button>
            <button onClick={next} data-testid="baby-next" aria-label="Suivant" className="w-16 h-16 rounded-full bg-sand-100 hover:bg-sand-200 active:scale-95 transition-transform flex items-center justify-center">
              <SkipForward className="w-7 h-7" />
            </button>
          </div>

          {/* progress dots */}
          <div className="mt-8 flex justify-center gap-1.5">
            {words.slice(0, 12).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === idx ? `${colors.accent} w-6` : "bg-sand-200"}`} />
            ))}
            {words.length > 12 && <div className="text-xs text-foreground/50 ml-2">+{words.length - 12}</div>}
          </div>

          <div className="mt-3 text-sm text-foreground/60 font-bold">
            {words.length > 0 ? `${idx + 1} / ${words.length} mots` : "Chargement..."}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => { stopAutoplay(); setLocked(true); }}
            data-testid="baby-lock-screen"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border-2 border-foreground/10 font-bold text-foreground/70 active:scale-95"
          >
            <Lock className="w-4 h-4" /> Verrouiller l'écran
          </button>
        </div>
      </div>
    </div>
  );
}
