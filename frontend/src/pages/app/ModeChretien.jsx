import React, { useEffect, useState } from "react";
import { BookOpenText, Heart, Moon, Play, Sun } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AudioButton, { speakLingala } from "@/components/AudioButton";

const PRAYERS = [
  {
    title: "Merci Nzambe (matin)",
    lines: [
      { ln: "Matondi Nzambe", fr: "Merci Dieu" },
      { ln: "Mpo na bomoi", fr: "pour la vie" },
      { ln: "Mpo na libota na ngai", fr: "pour ma famille" },
      { ln: "Amen", fr: "Amen" },
    ],
  },
  {
    title: "Prière du soir (enfant)",
    lines: [
      { ln: "Nzambe alingi yo", fr: "Dieu t'aime" },
      { ln: "Lala malamu", fr: "Dors bien" },
      { ln: "Amen", fr: "Amen" },
    ],
  },
];

const MORNING_SEQUENCE = [
  "Mbote mwana na ngai",
  "Lelo ezali mokolo ya kitoko",
  "Matondi Nzambe mpo na bomoi",
  "Tokende na nzela ya bolingo",
  "Amen",
];

const EVENING_SEQUENCE = [
  "Matondi Nzambe",
  "Mpo na bomoi",
  "Mpo na libota na ngai",
  "Nzambe alingi yo",
  "Lala malamu, mwana na ngai",
  "Amen",
];

export default function ModeChretien() {
  const { user, setUser } = useAuth();
  const [words, setWords] = useState([]);
  const [playing, setPlaying] = useState(""); // "" | "morning" | "evening"

  useEffect(() => {
    api.get("/words?theme=bible&include_christian=true").then((r) => setWords(r.data));
  }, []);

  const enable = async () => {
    await api.patch("/auth/settings", { christian_mode: true });
    setUser({ ...user, christian_mode: true });
  };

  const playSequence = (key, sequence) => {
    setPlaying(key);
    sequence.forEach((text, i) => {
      setTimeout(() => {
        speakLingala(text);
        if (i === sequence.length - 1) setTimeout(() => setPlaying(""), 3000);
      }, i * 2800);
    });
  };

  if (!user?.christian_mode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <BookOpenText className="w-16 h-16 mx-auto text-leaf" />
        <h1 className="mt-5 text-3xl font-black">Mode Chrétien</h1>
        <p className="mt-3 text-foreground/70">
          Activez ce mode pour accéder aux mots bibliques, petites phrases et prières courtes en Lingala.
          Optionnel, modifiable à tout moment.
        </p>
        <button onClick={enable} className="ml-btn-secondary mt-6" data-testid="enable-christian">
          Activer le mode chrétien
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-4xl font-black">Mode Chrétien</h1>
      <p className="text-foreground/70 mt-1">Transmettre la foi et la gratitude, en douceur.</p>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        {/* Rituel du matin */}
        <div className="ml-card p-7 bg-gradient-to-br from-sun-100 to-sand-100" data-testid="rituel-matin-card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <Sun className="w-7 h-7 text-brick" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black">Rituel du matin</div>
              <p className="text-foreground/75 mt-1">
                Salutation, gratitude et bénédiction pour bien commencer la journée avec votre enfant.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-foreground/80">
            {MORNING_SEQUENCE.map((l, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brick inline-block shrink-0" />
                <span className="font-bold">{l}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => playSequence("morning", MORNING_SEQUENCE)}
            disabled={!!playing}
            data-testid="rituel-matin-play"
            className="mt-5 ml-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Play className="w-5 h-5" /> {playing === "morning" ? "En cours..." : "Lancer le rituel du matin"}
          </button>
        </div>

        {/* Rituel du soir */}
        <div className="ml-card p-7 bg-gradient-to-br from-leaf-50 to-sand-100" data-testid="rituel-soir-card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <Moon className="w-7 h-7 text-brick" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black">Rituel du soir</div>
              <p className="text-foreground/75 mt-1">
                Gratitude, amour et paix pour endormir votre enfant en douceur.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-foreground/80">
            {EVENING_SEQUENCE.map((l, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-leaf inline-block shrink-0" />
                <span className="font-bold">{l}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => playSequence("evening", EVENING_SEQUENCE)}
            disabled={!!playing}
            data-testid="rituel-play"
            className="mt-5 ml-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Play className="w-5 h-5" /> {playing === "evening" ? "En cours..." : "Lancer le rituel du soir"}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-black mt-12">Mots bibliques</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {words.map((w) => (
          <div key={w.word_id} className="ml-card p-6 bg-white" data-testid={`christian-word-${w.lingala}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-brick">{w.lingala}</div>
                <div className="text-foreground/70">{w.french}</div>
              </div>
              <AudioButton text={w.lingala} word={w} size="md" testId={`christian-audio-${w.lingala}`} />
            </div>
            <p className="text-sm text-foreground/70 mt-3 italic">« {w.example_ln} » — {w.example_fr}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-black mt-12">Prières courtes</h2>
      <div className="grid md:grid-cols-2 gap-5 mt-4">
        {PRAYERS.map((p, i) => (
          <div key={i} className="ml-card p-7 bg-white" data-testid={`prayer-${i}`}>
            <div className="flex items-center gap-2 text-leaf font-bold text-sm"><Heart className="w-4 h-4" /> Prière</div>
            <div className="text-xl font-black mt-1">{p.title}</div>
            <ul className="mt-3 space-y-2">
              {p.lines.map((l, j) => (
                <li key={j} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold">{l.ln}</div>
                    <div className="text-sm text-foreground/60">{l.fr}</div>
                  </div>
                  <button
                    onClick={() => speakLingala(l.ln)}
                    className="text-brick text-sm underline"
                    data-testid={`prayer-${i}-line-${j}`}
                  >
                    écouter
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => p.lines.forEach((l, idx) => setTimeout(() => speakLingala(l.ln), idx * 2200))}
              className="mt-5 w-full ml-btn-primary"
              data-testid={`prayer-play-${i}`}
            >
              Écouter en entier
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
