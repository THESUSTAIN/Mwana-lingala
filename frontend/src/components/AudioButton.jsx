import React from "react";
import { Volume2 } from "lucide-react";

/**
 * Plays the Lingala word using the browser's speechSynthesis.
 * Lingala has no native TTS voice in browsers yet; we use French (fr-FR) as the
 * closest phonetic approximation for MVP. Slow rate helps parent + child repeat.
 */
export function speakLingala(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.72;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("speechSynthesis failed", e);
  }
}

export default function AudioButton({ text, size = "md", testId, label = "Écouter" }) {
  const sizes = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
    hero: "w-40 h-40 sm:w-48 sm:h-48",
  };
  return (
    <button
      onClick={() => speakLingala(text)}
      data-testid={testId || "audio-btn"}
      aria-label={`${label}: ${text}`}
      className={`${sizes[size]} rounded-full bg-brick text-white shadow-xl hover:bg-brick-600 active:scale-95 transition-all flex items-center justify-center`}
    >
      <Volume2 className={size === "hero" ? "w-16 h-16" : size === "xl" ? "w-12 h-12" : "w-6 h-6"} strokeWidth={2.5} />
    </button>
  );
}
