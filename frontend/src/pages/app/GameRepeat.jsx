import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mic, Square, Play, Pause, Volume2, Trophy, RefreshCw, Check } from "lucide-react";
import { api } from "@/lib/api";
import { playWord } from "@/components/AudioButton";

// Simple "Répète le mot" — écoute, enregistre, on affiche ton enregistrement.
// Pas de vraie reco vocale (ça demande un service) : l'enfant s'auto-évalue + gagne étoiles en complétant.

export default function GameRepeat() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const theme = sp.get("theme") || "famille";
  const [words, setWords] = useState([]);
  const [idx, setIdx] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [recordedB64, setRecordedB64] = useState("");

  const load = () => {
    api.get(`/words?theme=${theme}&include_christian=false`).then((r) => {
      const pool = (r.data || []).filter((w) => !w.locked).slice(0, 5);
      setWords(pool);
      setIdx(0);
      setScore(0);
      setDone(false);
      setRecordedUrl("");
    });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [theme]);

  const cleanup = () => {
    if (recRef.current && recRef.current.state !== "inactive") { try { recRef.current.stop(); } catch (_e) {} }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };
  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setRecordedUrl("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : undefined);
      recRef.current = rec;
      const chunks = [];
      rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setRecordedUrl(URL.createObjectURL(blob));
        // Convert to base64 for Whisper
        const fr = new FileReader();
        fr.onload = () => setRecordedB64(fr.result);
        fr.readAsDataURL(blob);
        cleanup();
      };
      rec.start();
      setRecording(true);
      setTimeout(() => { if (rec.state !== "inactive") { rec.stop(); setRecording(false); } }, 5000);
    } catch (_e) {}
  };
  const stop = () => {
    if (recRef.current?.state !== "inactive") recRef.current?.stop();
    setRecording(false);
  };
  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.currentTime = 0; a.play(); setPlaying(true); }
  };

  const checkPronunciation = async () => {
    if (!recordedB64 || !w) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const r = await api.post("/ai/transcribe", {
        audio_b64: recordedB64,
        expected: w.lingala,
      });
      setCheckResult(r.data);
      if (r.data.ok) {
        setScore((s) => s + 1);
        api.post("/progress", { word_id: w.word_id, learned: true }).catch(() => {});
      }
    } catch (_e) {
      setCheckResult({ text: "", ok: false, error: true });
    } finally {
      setChecking(false);
    }
  };

  const nextWord = () => {
    if (idx + 1 >= words.length) setDone(true);
    else { setIdx((i) => i + 1); setRecordedUrl(""); setRecordedB64(""); setCheckResult(null); }
  };

  const validate = () => {
    const w = words[idx];
    setScore((s) => s + 1);
    api.post("/progress", { word_id: w.word_id, learned: true }).catch(() => {});
    nextWord();
  };

  const w = words[idx];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center" data-testid="repeat-back"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">🗣️ Répète le mot</h1>
          <p className="text-foreground/70 mt-1">Écoute, répète et écoute-toi !</p>
        </div>
      </div>

      {done ? (
        <div className="ml-card p-10 text-center bg-gradient-to-br from-leaf-50 to-white">
          <Trophy className="w-20 h-20 text-sun-500 mx-auto mb-3" />
          <div className="text-3xl font-black">Bien parlé !</div>
          <div className="text-foreground/70 mt-1">{score} mots répétés 👏</div>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button onClick={load} data-testid="repeat-replay" className="ml-btn-primary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Rejouer</button>
            <Link to="/app/enfant/jouer" className="px-5 py-3 rounded-full bg-white border-2 border-sand-200 font-bold">Autres jeux</Link>
          </div>
        </div>
      ) : !w ? (
        <div className="text-center py-10 text-foreground/60">Chargement…</div>
      ) : (
        <div className="ml-card p-6 sm:p-10 bg-white text-center">
          <div className="text-sm text-foreground/60">Mot {idx + 1} / {words.length}</div>
          {w.image && <img src={w.image} alt="" className="w-48 h-48 mx-auto rounded-3xl object-cover my-4" />}
          <div className="text-5xl sm:text-6xl font-black text-leaf">{w.lingala}</div>
          <div className="text-foreground/60 mt-1">{w.french}</div>
          <button onClick={() => playWord(w)} className="mt-4 w-20 h-20 rounded-full bg-sun-300 shadow-xl flex items-center justify-center mx-auto active:scale-95" data-testid="repeat-listen">
            <Volume2 className="w-9 h-9" strokeWidth={2.5} />
          </button>

          <div className="mt-8 p-5 rounded-3xl bg-brick-50">
            {!recording && !recordedUrl && (
              <button onClick={start} data-testid="repeat-mic" className="w-24 h-24 mx-auto rounded-full bg-brick text-white flex items-center justify-center shadow-lg active:scale-95">
                <Mic className="w-10 h-10" />
              </button>
            )}
            {recording && (
              <button onClick={stop} data-testid="repeat-stop" className="w-24 h-24 mx-auto rounded-full bg-brick text-white flex items-center justify-center shadow-lg animate-pulse">
                <Square className="w-9 h-9" />
              </button>
            )}
            {recordedUrl && (
              <div className="space-y-3">
                <button onClick={togglePlay} data-testid="repeat-play" className="w-16 h-16 mx-auto rounded-full bg-leaf text-white flex items-center justify-center shadow-lg">
                  {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </button>
                <audio ref={audioRef} src={recordedUrl} onEnded={() => setPlaying(false)} className="hidden" />

                {checkResult ? (
                  checkResult.ok ? (
                    <div className="p-4 rounded-2xl bg-leaf-50 border-2 border-leaf-200" data-testid="repeat-result-ok">
                      <div className="font-black text-leaf-700"><Check className="w-5 h-5 inline" /> Excellente prononciation !</div>
                      <div className="text-sm text-foreground/70 mt-1">L'IA a entendu : « {checkResult.text} » ({Math.round((checkResult.match_score || 0) * 100)}% de correspondance)</div>
                      <button onClick={nextWord} data-testid="repeat-next" className="mt-3 w-full ml-btn-primary">Mot suivant →</button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-sun-100 border-2 border-sun-200" data-testid="repeat-result-bad">
                      <div className="font-black text-brick">🎤 Essaie encore !</div>
                      <div className="text-sm text-foreground/70 mt-1">
                        {checkResult.error ? "Je n'ai pas bien entendu, parle plus fort." : `L'IA a entendu : « ${checkResult.text} ». Réécoute puis réessaie.`}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => { setRecordedUrl(""); setRecordedB64(""); setCheckResult(null); }} data-testid="repeat-redo" className="py-3 rounded-full bg-white border-2 border-sand-200 font-bold">Refaire</button>
                        <button onClick={validate} data-testid="repeat-skip" className="py-3 rounded-full bg-sand-100 font-bold text-sm">Passer</button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={checkPronunciation} disabled={checking} data-testid="repeat-check" className="py-3 rounded-full bg-leaf text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                      {checking ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyse…</> : <><Check className="w-4 h-4" /> Vérifier ma voix</>}
                    </button>
                    <button onClick={() => { setRecordedUrl(""); setRecordedB64(""); }} data-testid="repeat-redo-pre" className="py-3 rounded-full bg-sand-100 font-bold">Refaire</button>
                  </div>
                )}
              </div>
            )}
            {!recordedUrl && !recording && <div className="text-sm text-foreground/60 mt-3">Appuie et prononce le mot</div>}
          </div>
        </div>
      )}
    </div>
  );
}
