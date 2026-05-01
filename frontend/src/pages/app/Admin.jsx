import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, Check, X, Clock, Mic, Play, Pause, FileText, MessageSquareQuote, Users as UsersIcon, BarChart3, Plus, Trash2, Edit3, Coins } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

function WordsTab() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/submissions?status_filter=pending").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const act = async (id, action) => {
    setBusy(id + action);
    try {
      await api.post(`/admin/submissions/${id}/${action}`);
      setMsg(action === "approve" ? "✓ Approuvé" : "✕ Rejeté");
      setTimeout(() => setMsg(""), 2000);
      load();
    } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); } finally { setBusy(null); }
  };
  return (<>
    {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}
    <div className="mt-6 space-y-3">
      {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucune contribution en attente.</div>}
      {items.map((s) => (
        <div key={s.submission_id} className="ml-card p-5 bg-white" data-testid={`admin-${s.submission_id}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-foreground/60"><Clock className="w-3 h-3" /> Proposé par {s.user_name} · {s.theme}</div>
              <div className="text-2xl font-black text-leaf mt-1">{s.lingala}</div>
              <div className="text-foreground/80">{s.french}</div>
              {s.example_ln && <div className="text-sm italic text-foreground/70 mt-2">« {s.example_ln} » — {s.example_fr}</div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => act(s.submission_id, "approve")} disabled={busy === s.submission_id + "approve"} data-testid={`approve-${s.submission_id}`} className="px-4 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"><Check className="w-4 h-4" /> Approuver</button>
              <button onClick={() => act(s.submission_id, "reject")} disabled={busy === s.submission_id + "reject"} data-testid={`reject-${s.submission_id}`} className="px-4 py-2.5 rounded-full bg-brick-50 text-brick-700 font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"><X className="w-4 h-4" /> Rejeter</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>);
}

function AudioTab() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");
  const [playingId, setPlayingId] = useState("");
  const audioRef = useRef(null);
  const load = () => api.get("/admin/audio-submissions?status_filter=pending").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const act = async (id, action) => {
    setBusy(id + action);
    try { await api.post(`/admin/audio-submissions/${id}/${action}`); setMsg(action === "approve" ? "✓ Audio approuvé" : "✕ Audio rejeté"); setTimeout(() => setMsg(""), 2000); load(); }
    catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); } finally { setBusy(null); }
  };
  const play = (s) => {
    if (audioRef.current) audioRef.current.pause();
    if (playingId === s.submission_id) { setPlayingId(""); return; }
    const a = new Audio(s.audio_data); audioRef.current = a; a.onended = () => setPlayingId("");
    a.play().then(() => setPlayingId(s.submission_id)).catch(() => setPlayingId(""));
  };
  return (<>
    {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}
    <div className="mt-6 space-y-3">
      {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucun enregistrement audio en attente.</div>}
      {items.map((s) => {
        const isPlaying = playingId === s.submission_id;
        return (
          <div key={s.submission_id} className="ml-card p-5 bg-white" data-testid={`admin-audio-${s.submission_id}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-foreground/60"><Clock className="w-3 h-3" /> Proposé par {s.user_name}</div>
                <div className="text-2xl font-black text-brick mt-1">{s.word_lingala}</div>
                <div className="text-foreground/60 text-xs">word_id: {s.word_id}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => play(s)} data-testid={`play-audio-${s.submission_id}`} className="px-4 py-2.5 rounded-full bg-sun-200 text-foreground font-bold active:scale-95 inline-flex items-center gap-2">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{isPlaying ? "Pause" : "Écouter"}</button>
                <button onClick={() => act(s.submission_id, "approve")} disabled={busy === s.submission_id + "approve"} data-testid={`approve-audio-${s.submission_id}`} className="px-4 py-2.5 rounded-full bg-leaf text-white font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"><Check className="w-4 h-4" /> Approuver</button>
                <button onClick={() => act(s.submission_id, "reject")} disabled={busy === s.submission_id + "reject"} data-testid={`reject-audio-${s.submission_id}`} className="px-4 py-2.5 rounded-full bg-brick-50 text-brick-700 font-bold active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"><X className="w-4 h-4" /> Rejeter</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </>);
}

const EMPTY_TST = { quote: "", author_name: "", author_role: "", image: "", active: true, order: 0 };

function TestimonialsTab() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | testimonial_id
  const [form, setForm] = useState(EMPTY_TST);
  const [msg, setMsg] = useState("");

  const load = () => api.get("/admin/testimonials").then((r) => setItems(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const startEdit = (t) => { setEditing(t.testimonial_id); setForm({ ...t }); };
  const startNew = () => { setEditing("new"); setForm({ ...EMPTY_TST, order: items.length + 1 }); };
  const cancel = () => { setEditing(null); setForm(EMPTY_TST); setMsg(""); };

  const save = async () => {
    try {
      if (editing === "new") await api.post("/admin/testimonials", form);
      else await api.patch(`/admin/testimonials/${editing}`, form);
      setMsg("✓ Enregistré"); setTimeout(() => setMsg(""), 1500);
      cancel(); load();
    } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  const del = async (id) => {
    if (!window.confirm("Supprimer ce témoignage ?")) return;
    try { await api.delete(`/admin/testimonials/${id}`); load(); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black">Témoignages publics</h2>
        <button onClick={startNew} data-testid="testimonial-new" className="ml-btn-primary inline-flex items-center gap-2"><Plus className="w-5 h-5" /> Ajouter</button>
      </div>
      {msg && <div className="mb-3 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}

      {editing && (
        <div className="ml-card p-6 bg-white mb-5" data-testid="testimonial-form">
          <div className="text-lg font-black mb-3">{editing === "new" ? "Nouveau témoignage" : "Modifier le témoignage"}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Citation</span>
              <textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="tst-quote" />
            </label>
            <label className="block"><span className="text-sm font-bold">Prénom auteur</span>
              <input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="tst-name" />
            </label>
            <label className="block"><span className="text-sm font-bold">Rôle</span>
              <input value={form.author_role || ""} onChange={(e) => setForm({ ...form, author_role: e.target.value })} placeholder="Ex: Maman de Lukuna" className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="tst-role" />
            </label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Image (URL)</span>
              <input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/temoignage-x.png" className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="tst-image" />
            </label>
            <label className="block"><span className="text-sm font-bold">Ordre</span>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="tst-order" />
            </label>
            <label className="flex items-center gap-2 mt-7">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} data-testid="tst-active" />
              <span className="font-bold">Visible publiquement</span>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={cancel} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Annuler</button>
            <button onClick={save} data-testid="tst-save" className="flex-1 ml-btn-primary">Enregistrer</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3" data-testid="testimonials-list">
        {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60 col-span-full">Aucun témoignage.</div>}
        {items.map((t) => (
          <div key={t.testimonial_id} className="ml-card p-4 bg-white" data-testid={`admin-tst-${t.testimonial_id}`}>
            <div className="flex gap-3">
              {t.image && <img src={t.image} alt={t.author_name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm italic text-foreground/80 line-clamp-2">« {t.quote} »</div>
                <div className="mt-2 text-xs font-bold text-leaf">{t.author_name}{t.author_role ? ` · ${t.author_role}` : ""}</div>
                <div className="mt-1 text-xs text-foreground/50">{t.active ? "🟢 Visible" : "⚫ Masqué"} · ordre {t.order}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => startEdit(t)} data-testid={`edit-tst-${t.testimonial_id}`} className="flex-1 py-2 rounded-full bg-leaf-50 text-leaf font-bold inline-flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> Modifier</button>
              <button onClick={() => del(t.testimonial_id)} data-testid={`del-tst-${t.testimonial_id}`} className="px-4 py-2 rounded-full bg-brick-50 text-brick-700 font-bold inline-flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const load = (search = "") => api.get(`/admin/users?q=${encodeURIComponent(search)}`).then((r) => setItems(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const grant = async (uid, delta) => {
    try { await api.post(`/admin/users/${uid}/credits`, { delta }); setMsg(`+${delta} crédits accordés`); setTimeout(() => setMsg(""), 1500); load(q); }
    catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };
  const togglePremium = async (u) => {
    try { await api.patch(`/admin/users/${u.user_id}`, { is_premium: !u.is_premium }); load(q); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };
  const toggleAdmin = async (u) => {
    if (!window.confirm(`Définir ${u.email} comme ${u.role === "admin" ? "USER" : "ADMIN"} ?`)) return;
    try { await api.patch(`/admin/users/${u.user_id}`, { role: u.role === "admin" ? "user" : "admin" }); load(q); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };
  const toggleBan = async (u) => {
    try { await api.patch(`/admin/users/${u.user_id}`, { banned: !u.banned }); load(q); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="mt-6">
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(q)} placeholder="Rechercher email ou nom..." className="flex-1 border-2 rounded-full px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="users-search" />
        <button onClick={() => load(q)} className="ml-btn-primary">Rechercher</button>
      </div>
      {msg && <div className="mb-3 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}
      <div className="space-y-2" data-testid="users-list">
        {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucun utilisateur.</div>}
        {items.map((u) => (
          <div key={u.user_id} className="ml-card p-4 bg-white" data-testid={`admin-user-${u.user_id}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-black">{u.name} <span className="text-foreground/60 font-normal text-sm">{u.email}</span></div>
                <div className="text-xs text-foreground/60 mt-1">
                  {u.role === "admin" && <span className="px-2 py-0.5 rounded-full bg-brick-50 text-brick font-bold mr-1">ADMIN</span>}
                  {u.is_premium && <span className="px-2 py-0.5 rounded-full bg-leaf-50 text-leaf font-bold mr-1">PREMIUM</span>}
                  {u.banned && <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70 font-bold mr-1">BANNI</span>}
                  · {u.auth_method} · {u.credits || 0} crédits · {u.progress_count || 0} mots appris · {u.contributions_count || 0} contributions
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => grant(u.user_id, 50)} className="px-3 py-2 rounded-full bg-sun-100 font-bold text-sm inline-flex items-center gap-1" data-testid={`grant-${u.user_id}`}><Coins className="w-4 h-4" /> +50</button>
                <button onClick={() => togglePremium(u)} className="px-3 py-2 rounded-full bg-leaf-50 text-leaf-700 font-bold text-sm" data-testid={`premium-${u.user_id}`}>{u.is_premium ? "Retirer Premium" : "Premium"}</button>
                <button onClick={() => toggleAdmin(u)} className="px-3 py-2 rounded-full bg-brick-50 text-brick-700 font-bold text-sm" data-testid={`admin-${u.user_id}`}>{u.role === "admin" ? "Retirer Admin" : "Admin"}</button>
                <button onClick={() => toggleBan(u)} className="px-3 py-2 rounded-full bg-foreground/10 font-bold text-sm" data-testid={`ban-${u.user_id}`}>{u.banned ? "Réactiver" : "Bannir"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)).catch(() => {}); }, []);
  if (!s) return <div className="mt-6 ml-card p-8 bg-white text-center text-foreground/60">Chargement...</div>;
  const KPIS = [
    { label: "Utilisateurs total", value: s.total_users, color: "bg-leaf-50 text-leaf" },
    { label: "Premium actifs", value: s.premium_users, color: "bg-brick-50 text-brick" },
    { label: "Inscrits 7 j", value: s.new_users_7d, color: "bg-sun-100 text-foreground" },
    { label: "Mots dictionnaire", value: s.total_words, color: "bg-sand-100 text-foreground" },
    { label: "Audios approuvés", value: s.approved_audios, color: "bg-leaf-50 text-leaf" },
    { label: "Contributions total", value: s.total_contributions, color: "bg-sand-100 text-foreground" },
    { label: "Mots appris (cumul)", value: s.total_progress, color: "bg-leaf-50 text-leaf" },
    { label: "Mots en attente", value: s.pending_words, color: "bg-brick-50 text-brick" },
    { label: "Audios en attente", value: s.pending_audios, color: "bg-brick-50 text-brick" },
  ];
  return (
    <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-stats">
      {KPIS.map((k) => (
        <div key={k.label} className={`ml-card p-6 ${k.color}`} data-testid={`kpi-${k.label}`}>
          <div className="text-sm font-bold opacity-80">{k.label}</div>
          <div className="text-4xl font-black mt-2">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "users", label: "Utilisateurs", icon: UsersIcon },
  { key: "testimonials", label: "Témoignages", icon: MessageSquareQuote },
  { key: "words", label: "Mots", icon: FileText },
  { key: "audio", label: "Audios", icon: Mic },
];

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("stats");
  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/app" replace />;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-brick" />
        <h1 className="text-3xl sm:text-4xl font-black">Administration</h1>
      </div>
      <p className="text-foreground/70 mt-2">Gérez les utilisateurs, le contenu et les contributions.</p>

      <div className="mt-6 flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={`admin-tab-${t.key}`} className={`px-5 py-2.5 rounded-full font-bold border-2 inline-flex items-center gap-2 ${tab === t.key ? "bg-leaf text-white border-leaf" : "bg-white text-foreground/70 border-sand-200"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "words" && <WordsTab />}
      {tab === "audio" && <AudioTab />}
    </div>
  );
}
