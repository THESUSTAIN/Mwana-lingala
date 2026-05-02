import React, { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { api } from "@/lib/api";

// Embeddable widget — meant to be loaded inside an iframe by 3rd-party blogs.
// Minimal chrome, no navbar/footer, explicit "Powered by" link for attribution + backlink.
export default function WidgetMotDuJour() {
  const [word, setWord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Allow embedding everywhere
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    api.get("/translate/word-of-day")
      .then((r) => setWord(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Indisponible"));
  }, []);

  const speak = () => {
    if (!word?.lingala) return;
    try {
      const u = new SpeechSynthesisUtterance(word.lingala);
      u.lang = "fr-FR";
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  if (error) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-4 text-sm text-foreground/60">
        {error}
      </div>
    );
  }
  if (!word) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-brick border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md mx-auto bg-white border-2 border-sand-200 rounded-3xl p-5 shadow-sm"
      data-testid="widget-mot-du-jour"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-brick" />
          <span className="text-xs font-black uppercase tracking-wider text-leaf-700">Mot Lingala du jour</span>
        </div>
        <span className="text-xs text-foreground/50">{new Date(word.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
      </div>

      <div className="flex items-center gap-4">
        {word.image && (
          <img
            src={word.image.startsWith("http") ? word.image : `https://mwana-lingala.com${word.image}`}
            alt={word.lingala}
            className="w-20 h-20 object-cover rounded-2xl border border-sand-100 shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-leaf-700 truncate" style={{ fontFamily: "Georgia,serif" }} data-testid="widget-lingala">
            {word.lingala}
          </div>
          <div className="text-sm text-foreground/70 truncate" data-testid="widget-french">= {word.french}</div>
          {word.theme && <div className="mt-1 text-xs inline-block px-2 py-0.5 rounded-full bg-sand-100 text-foreground/60 capitalize">{word.theme}</div>}
        </div>
        <button
          type="button"
          onClick={speak}
          className="ml-auto p-2.5 rounded-full bg-sand-50 hover:bg-sand-100 active:scale-95 transition"
          aria-label="Écouter"
          data-testid="widget-speak"
        >
          <Volume2 className="w-5 h-5 text-brick" />
        </button>
      </div>

      {(word.example_fr || word.example_ln) && (
        <div className="mt-3 p-3 rounded-2xl bg-sand-50 text-xs text-foreground/75 italic">
          {word.example_ln && <div style={{ fontFamily: "Georgia,serif" }} className="text-leaf-700">« {word.example_ln} »</div>}
          {word.example_fr && <div className="mt-0.5">{word.example_fr}</div>}
        </div>
      )}

      <a
        href="https://mwana-lingala.com/?ref=widget"
        target="_top"
        rel="noopener"
        className="mt-4 flex items-center justify-between gap-2 text-xs text-foreground/55 hover:text-brick"
        data-testid="widget-attribution"
      >
        <span>Apprends le Lingala avec ton enfant →</span>
        <span className="font-black">
          <span className="text-leaf-700">Mwana</span> <span className="text-brick">Lingala</span>
        </span>
      </a>
    </div>
  );
}
