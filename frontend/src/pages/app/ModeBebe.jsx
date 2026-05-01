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

  if (locked) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center p-6" onClick={() => setLocked(false)} data-testid="baby-locked-screen">
        <div className="text-center text-foreground/60">
          <Lock className="w-10 h-10 mx-auto mb-3" />
          <div className="text-xl font-black">Écran verrouillé</div>
          <div className="text-sm mt-1">Touchez pour déverrouiller</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-black">Mode Bébé</h1>
        <p className="text-foreground/70 mt-2">Audio-first. Laissez bébé écouter, répétez avec lui.</p>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {THEME_TABS.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTheme(t.slug)}
            data-testid={`baby-theme-${t.slug}`}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${theme === t.slug ? "bg-brick text-white" : "bg-white text-foreground/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ml-card mt-8 p-10 sm:p-14 bg-white text-center">
        <div className="text-sm font-bold text-leaf uppercase tracking-widest">Mot en Lingala</div>
        <div className="text-5xl sm:text-7xl font-black mt-4 text-brick" data-testid="baby-current-word">{current?.lingala || "—"}</div>
        <div className="text-xl sm:text-2xl mt-2 text-foreground/70">{current?.french}</div>

        <button
          onClick={togglePlay}
          data-testid="baby-play-btn"
          className={`mt-10 mx-auto w-40 h-40 sm:w-48 sm:h-48 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition-all ${playing ? "bg-leaf animate-pulse-soft" : "bg-brick hover:bg-brick-600"}`}
        >
          {playing ? <Pause className="w-20 h-20" /> : <Play className="w-20 h-20 ml-2" />}
        </button>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={prev} data-testid="baby-prev" className="w-14 h-14 rounded-full bg-sand-100 active:scale-95 transition-transform flex items-center justify-center">
            <SkipBack className="w-6 h-6" />
          </button>
          <button onClick={playOne} data-testid="baby-repeat" className="w-14 h-14 rounded-full bg-sand-100 active:scale-95 transition-transform flex items-center justify-center">
            <Repeat className="w-6 h-6" />
          </button>
          <button onClick={next} data-testid="baby-next" className="w-14 h-14 rounded-full bg-sand-100 active:scale-95 transition-transform flex items-center justify-center">
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-6 text-sm text-foreground/60">
          {words.length > 0 ? `${idx + 1} / ${words.length} mots` : "Chargement..."}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => { stopAutoplay(); setLocked(true); }}
          data-testid="baby-lock-screen"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border-2 border-foreground/10 font-bold text-foreground/70 active:scale-95"
        >
          <Lock className="w-4 h-4" /> Verrouiller l’écran
        </button>
      </div>
    </div>
  );
}
