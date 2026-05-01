import React, { useEffect, useState } from "react";
import { BookOpenText, Heart } from "lucide-react";
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

export default function ModeChretien() {
  const { user, setUser } = useAuth();
  const [words, setWords] = useState([]);

  useEffect(() => {
    api.get("/words?theme=bible&include_christian=true").then((r) => setWords(r.data));
  }, []);

  const enable = async () => {
    await api.patch("/auth/settings", { christian_mode: true });
    setUser({ ...user, christian_mode: true });
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

      <h2 className="text-xl font-black mt-8">Mots bibliques</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {words.map((w) => (
          <div key={w.word_id} className="ml-card p-6 bg-white" data-testid={`christian-word-${w.lingala}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-brick">{w.lingala}</div>
                <div className="text-foreground/70">{w.french}</div>
              </div>
              <AudioButton text={w.lingala} size="md" testId={`christian-audio-${w.lingala}`} />
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
