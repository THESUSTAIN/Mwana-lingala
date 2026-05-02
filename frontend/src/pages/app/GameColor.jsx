import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Volume2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

// Colorie et apprends — on affiche un mot couleur Lingala (Motane=Rouge, Pondu=Vert, etc.)
// avec une forme SVG (cercle/étoile/cœur). L'enfant clique sur la bonne palette → on remplit.

const PALETTE = [
  { slug: "motane", label: "Rouge", hex: "#dc2626" },
  { slug: "pondu", label: "Vert", hex: "#16a34a" },
  { slug: "bule", label: "Bleu", hex: "#2563eb" },
  { slug: "mwindo", label: "Noir", hex: "#111827" },
  { slug: "pembe", label: "Blanc", hex: "#f9fafb" },
  { slug: "yellow", label: "Jaune", hex: "#f59e0b" },
];
const SHAPES = ["circle", "star", "heart"];

function Shape({ type, fill, stroke = "#78350f" }) {
  if (type === "star") return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polygon points="50,5 61,38 96,38 68,59 79,92 50,72 21,92 32,59 4,38 39,38" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
  if (type === "heart") return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <path d="M50 85 C 30 70, 5 55, 5 35 A 20 20 0 0 1 50 25 A 20 20 0 0 1 95 35 C 95 55, 70 70, 50 85 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="3" />
    </svg>
  );
}

export default function GameColor() {
  const navigate = useNavigate();
  const [colors, setColors] = useState([]);
  const [target, setTarget] = useState(null);
  const [shape, setShape] = useState("circle");
  const [filled, setFilled] = useState("#f3f4f6");
  const [found, setFound] = useState(0);
  const [feedback, setFeedback] = useState("");

  const loadWords = () => {
    api.get(`/words?theme=couleurs&include_christian=false`).then((r) => {
      const ws = (r.data || []).filter((w) => !w.locked);
      setColors(ws);
      if (ws.length) pickTarget(ws);
    });
  };
  useEffect(() => { loadWords(); }, []);

  const pickTarget = (pool) => {
    const t = pool[Math.floor(Math.random() * pool.length)];
    setTarget(t);
    setShape(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    setFilled("#f3f4f6");
    setFeedback("");
  };

  const clickPaint = (p) => {
    if (!target) return;
    const tSlug = target.lingala.toLowerCase();
    const good = p.slug.toLowerCase() === tSlug || p.label.toLowerCase() === target.french.toLowerCase();
    setFilled(p.hex);
    if (good) {
      setFeedback("good");
      setFound((n) => n + 1);
      api.post("/progress", { word_id: target.word_id, learned: true }).catch(() => {});
      setTimeout(() => pickTarget(colors), 1800);
    } else {
      setFeedback("bad");
      setTimeout(() => setFeedback(""), 1200);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center" data-testid="color-back"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">🎨 Colorie et apprends</h1>
          <p className="text-foreground/70 mt-1">Remplis la forme avec la bonne couleur Lingala.</p>
        </div>
      </div>

      {!target ? (
        <div className="text-center py-10 text-foreground/60">Chargement…</div>
      ) : (
        <div className="ml-card p-6 sm:p-10 bg-white">
          <div className="text-center mb-4">
            <div className="text-sm text-foreground/60">Trouvés : <strong className="text-leaf">{found}</strong></div>
            <div className="mt-1 text-4xl sm:text-5xl font-black text-brick" data-testid="color-target">{target.lingala}</div>
            <button onClick={() => playWord(target)} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sun-200 text-sm font-bold">
              <Volume2 className="w-4 h-4" /> Écouter
            </button>
          </div>
          <div className={`w-64 h-64 sm:w-80 sm:h-80 mx-auto transition-all ${feedback === "good" ? "scale-110" : feedback === "bad" ? "animate-pulse" : ""}`} data-testid="color-shape">
            <Shape type={shape} fill={filled} />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {PALETTE.map((p) => (
              <button
                key={p.slug}
                onClick={() => clickPaint(p)}
                data-testid={`color-paint-${p.slug}`}
                className="p-3 rounded-2xl bg-white border-2 border-sand-200 hover:border-brick font-bold active:scale-95"
              >
                <div className="w-full h-12 rounded-xl" style={{ background: p.hex, border: "1px solid rgba(0,0,0,.1)" }} />
                <div className="text-sm mt-2">{p.label}</div>
              </button>
            ))}
          </div>
          {feedback === "good" && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold text-center"><Check className="w-5 h-5 inline" /> Bravo !</div>}
          {feedback === "bad" && <div className="mt-4 p-3 rounded-xl bg-brick-50 text-brick-700 font-bold text-center">Essaie encore…</div>}

          <div className="mt-6 text-center">
            <button onClick={() => pickTarget(colors)} data-testid="color-skip" className="px-4 py-2 rounded-full bg-sand-100 font-bold inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Autre couleur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
