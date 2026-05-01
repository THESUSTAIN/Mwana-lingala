import React from "react";
import { Volume2 } from "lucide-react";

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

/** Prefer community audio when provided (as data URL), else browser TTS. */
export function playWord(word) {
  if (word?.audio && typeof Audio !== "undefined") {
    try {
      const a = new Audio(word.audio);
      a.play();
      return;
    } catch (_e) {}
  }
  speakLingala(word?.lingala || "");
}

export default function AudioButton({ text, word, size = "md", testId, label = "Écouter" }) {
  const sizes = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-20 h-20", xl: "w-32 h-32", hero: "w-40 h-40 sm:w-48 sm:h-48" };
  const onClick = () => (word ? playWord(word) : speakLingala(text));
  return (
    <button
      onClick={onClick}
      data-testid={testId || "audio-btn"}
      aria-label={`${label}: ${text || word?.lingala}`}
      className={`${sizes[size]} rounded-full bg-brick text-white shadow-xl hover:bg-brick-600 active:scale-95 transition-all flex items-center justify-center`}
    >
      <Volume2 className={size === "hero" ? "w-16 h-16" : size === "xl" ? "w-12 h-12" : "w-6 h-6"} strokeWidth={2.5} />
    </button>
  );
}
