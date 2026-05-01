import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, Check, X, Clock, Mic, Play, Pause, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

function WordsTab() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/admin/submissions?status_filter=pending").then((r) => setItems(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const act = async (id, action) => {
    setBusy(id + action);
    try {
      await api.post(`/admin/submissions/${id}/${action}`);
      setMsg(action === "approve" ? "✓ Approuvé" : "✕ Rejeté");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}
      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucune contribution en attente.</div>
        )}
        {items.map((s) => (
          <div key={s.submission_id} className="ml-card p-5 bg-white" data-testid={`admin-${s.submission_id}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <Clock className="w-3 h-3" /> Proposé par {s.user_name} · {s.theme}
                </div>
                <div className="text-2xl font-black text-leaf mt-1">{s.lingala}</div>
                <div className="text-foreground/80">{s.french}</div>
                {s.example_ln && (
                  <div className="text-sm italic text-foreground/70 mt-2">« {s.example_ln} » — {s.example_fr}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => act(s.submission_id, "approve")}
                  disabled={busy === s.submission_id + "approve"}
                  data-testid={`approve-${s.submission_id}`}
                  className="px-4 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approuver
                </button>
                <button
                  onClick={() => act(s.submission_id, "reject")}
                  disabled={busy === s.submission_id + "reject"}
                  data-testid={`reject-${s.submission_id}`}
                  className="px-4 py-2.5 rounded-full bg-brick-50 text-brick-700 font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Rejeter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AudioTab() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");
  const [playingId, setPlayingId] = useState("");
  const audioRef = useRef(null);

  const load = () => {
    api.get("/admin/audio-submissions?status_filter=pending").then((r) => setItems(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const act = async (id, action) => {
    setBusy(id + action);
    try {
      await api.post(`/admin/audio-submissions/${id}/${action}`);
      setMsg(action === "approve" ? "✓ Audio approuvé" : "✕ Audio rejeté");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const play = (s) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingId === s.submission_id) {
      setPlayingId("");
      return;
    }
    const a = new Audio(s.audio_data);
    audioRef.current = a;
    a.onended = () => setPlayingId("");
    a.play().then(() => setPlayingId(s.submission_id)).catch(() => setPlayingId(""));
  };

  return (
    <>
      {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}
      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucun enregistrement audio en attente.</div>
        )}
        {items.map((s) => {
          const isPlaying = playingId === s.submission_id;
          return (
            <div key={s.submission_id} className="ml-card p-5 bg-white" data-testid={`admin-audio-${s.submission_id}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <Clock className="w-3 h-3" /> Proposé par {s.user_name}
                  </div>
                  <div className="text-2xl font-black text-brick mt-1">{s.word_lingala}</div>
                  <div className="text-foreground/60 text-xs">word_id: {s.word_id}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => play(s)}
                    data-testid={`play-audio-${s.submission_id}`}
                    className="px-4 py-2.5 rounded-full bg-sun-200 text-foreground font-bold active:scale-95 inline-flex items-center gap-2"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? "Pause" : "Écouter"}
                  </button>
                  <button
                    onClick={() => act(s.submission_id, "approve")}
                    disabled={busy === s.submission_id + "approve"}
                    data-testid={`approve-audio-${s.submission_id}`}
                    className="px-4 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Approuver
                  </button>
                  <button
                    onClick={() => act(s.submission_id, "reject")}
                    disabled={busy === s.submission_id + "reject"}
                    data-testid={`reject-audio-${s.submission_id}`}
                    className="px-4 py-2.5 rounded-full bg-brick-50 text-brick-700 font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("words");

  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/app" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-brick" />
        <h1 className="text-3xl sm:text-4xl font-black">Modération</h1>
      </div>
      <p className="text-foreground/70 mt-2">Validez ou rejetez les contributions en attente. Une fois approuvées, elles sont publiées dans le dictionnaire.</p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("words")}
          data-testid="admin-tab-words"
          className={`px-5 py-2.5 rounded-full font-bold border-2 inline-flex items-center gap-2 ${tab === "words" ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200"}`}
        >
          <FileText className="w-4 h-4" /> Mots
        </button>
        <button
          onClick={() => setTab("audio")}
          data-testid="admin-tab-audio"
          className={`px-5 py-2.5 rounded-full font-bold border-2 inline-flex items-center gap-2 ${tab === "audio" ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200"}`}
        >
          <Mic className="w-4 h-4" /> Audios
        </button>
      </div>

      {tab === "words" ? <WordsTab /> : <AudioTab />}
    </div>
  );
}
