import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, Check, X, Clock, Mic, Play, Pause, FileText, MessageSquareQuote, Users as UsersIcon, BarChart3, Plus, Trash2, Edit3, Coins, BookOpen, CreditCard, Search, Image as ImageIcon, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const ALL_THEMES = ["famille", "nourriture", "emotions", "bible", "animaux", "couleurs", "nombres", "corps", "salutations", "maison"];
const EMPTY_WORD = { lingala: "", french: "", theme: "famille", example_ln: "", example_fr: "", is_christian: false, tier: "free", image: "" };

function DictionaryTab() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_WORD);
  const [msg, setMsg] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileImgRef = useRef(null);
  const fileAudioRef = useRef(null);

  const load = () => api.get("/admin/words").then((r) => setItems(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const visible = items.filter((w) => !filter || w.lingala.toLowerCase().includes(filter.toLowerCase()) || w.french.toLowerCase().includes(filter.toLowerCase()) || w.theme === filter);

  const startEdit = (w) => { setEditing(w.word_id); setForm({ ...EMPTY_WORD, ...w }); };
  const startNew = () => { setEditing("new"); setForm(EMPTY_WORD); };
  const cancel = () => { setEditing(null); setForm(EMPTY_WORD); setMsg(""); };

  const save = async () => {
    try {
      if (editing === "new") await api.post("/admin/words", form);
      else await api.patch(`/admin/words/${editing}`, form);
      setMsg("✓ Enregistré"); setTimeout(() => setMsg(""), 1500);
      cancel(); load();
    } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  const del = async (id) => {
    if (!window.confirm("Supprimer ce mot ?")) return;
    try { await api.delete(`/admin/words/${id}`); load(); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  const fileToDataURL = (file, type) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const onPickImage = (word_id) => { setUploadingFor({ id: word_id, kind: "image" }); fileImgRef.current?.click(); };
  const onPickAudio = (word_id) => { setUploadingFor({ id: word_id, kind: "audio" }); fileAudioRef.current?.click(); };

  const onAssetSelected = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadingFor) return;
    try {
      const data = await fileToDataURL(file);
      if (kind === "image" && data.length > 600000) {
        setMsg("Image trop lourde (>400 Ko). Essayez une plus petite.");
        return;
      }
      if (kind === "audio" && data.length > 600000) {
        setMsg("Audio trop lourd (>400 Ko). Compresser en MP3 court (<8s).");
        return;
      }
      const body = kind === "image" ? { image_b64: data } : { audio_b64: data };
      await api.post(`/admin/words/${uploadingFor.id}/asset`, body);
      setMsg(`✓ ${kind === "image" ? "Image" : "Audio"} mis à jour`);
      setTimeout(() => setMsg(""), 1500);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Erreur upload");
    } finally { setUploadingFor(null); }
  };

  return (
    <div className="mt-6">
      <input ref={fileImgRef} type="file" accept="image/*" onChange={(e) => onAssetSelected(e, "image")} className="hidden" data-testid="dict-img-input" />
      <input ref={fileAudioRef} type="file" accept="audio/*" onChange={(e) => onAssetSelected(e, "audio")} className="hidden" data-testid="dict-audio-input" />

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-xl font-black">Dictionnaire ({items.length} mots)</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Recherche / thème" className="pl-9 pr-4 py-2 border-2 rounded-full bg-sand-100 outline-none focus:border-brick text-sm" data-testid="dict-search" />
          </div>
          <button onClick={startNew} data-testid="word-new" className="px-5 py-2 rounded-full bg-leaf text-white font-bold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter un mot</button>
        </div>
      </div>
      {msg && <div className="mb-3 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}

      {editing && (
        <div className="ml-card p-6 bg-white mb-5" data-testid="word-form">
          <div className="text-lg font-black mb-3">{editing === "new" ? "Nouveau mot" : "Modifier le mot"}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-bold">Lingala</span><input value={form.lingala} onChange={(e) => setForm({ ...form, lingala: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="word-lingala" /></label>
            <label className="block"><span className="text-sm font-bold">Français</span><input value={form.french} onChange={(e) => setForm({ ...form, french: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="word-french" /></label>
            <label className="block"><span className="text-sm font-bold">Thème</span>
              <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none font-bold" data-testid="word-theme">
                {ALL_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-sm font-bold">Forfait</span>
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none font-bold" data-testid="word-tier">
                <option value="free">Gratuit (free)</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Exemple Lingala</span><input value={form.example_ln} onChange={(e) => setForm({ ...form, example_ln: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="word-example-ln" /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Exemple français</span><input value={form.example_fr} onChange={(e) => setForm({ ...form, example_fr: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="word-example-fr" /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Image (URL)</span><input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="word-image" /></label>
            <label className="flex items-center gap-2 mt-7"><input type="checkbox" checked={!!form.is_christian} onChange={(e) => setForm({ ...form, is_christian: e.target.checked })} data-testid="word-christian" /><span className="font-bold">Mode Chrétien</span></label>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={cancel} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Annuler</button>
            <button onClick={save} data-testid="word-save" className="flex-1 ml-btn-primary">Enregistrer</button>
          </div>
        </div>
      )}

      <div className="ml-card bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sand-100 text-xs uppercase tracking-wider">
            <tr><th className="px-2 py-2"></th><th className="px-3 py-2 text-left">Lingala</th><th className="px-3 py-2 text-left">Français</th><th className="px-3 py-2 text-left">Thème</th><th className="px-3 py-2 text-left">Forfait</th><th className="px-3 py-2 text-center">Audio</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {visible.map((w) => (
              <tr key={w.word_id} className="border-t border-sand-100" data-testid={`word-row-${w.word_id}`}>
                <td className="pl-2 py-2">
                  {w.image ? (
                    <img src={w.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sand-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-foreground/30" /></div>
                  )}
                </td>
                <td className="px-3 py-2 font-black text-leaf">{w.lingala}</td>
                <td className="px-3 py-2">{w.french}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-sand-100 text-xs font-bold">{w.theme}</span></td>
                <td className="px-3 py-2">
                  {w.tier === "premium" ? <span className="px-2 py-0.5 rounded-full bg-brick-50 text-brick text-xs font-bold">PREMIUM</span> : <span className="px-2 py-0.5 rounded-full bg-leaf-50 text-leaf text-xs font-bold">FREE</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {w.audio ? <Volume2 className="w-4 h-4 text-leaf inline" /> : <span className="text-xs text-foreground/40">—</span>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => onPickImage(w.word_id)} className="p-1.5 hover:bg-sand-100 rounded-lg" title="Changer l'image" data-testid={`upload-img-${w.word_id}`}><ImageIcon className="w-4 h-4 text-brick" /></button>
                  <button onClick={() => onPickAudio(w.word_id)} className="p-1.5 hover:bg-sand-100 rounded-lg" title="Changer l'audio" data-testid={`upload-audio-${w.word_id}`}><Volume2 className="w-4 h-4 text-brick" /></button>
                  <button onClick={() => startEdit(w)} className="p-1.5 hover:bg-leaf-50 rounded-lg" data-testid={`edit-word-${w.word_id}`}><Edit3 className="w-4 h-4 text-leaf" /></button>
                  <button onClick={() => del(w.word_id)} className="p-1.5 hover:bg-brick-50 rounded-lg" data-testid={`del-word-${w.word_id}`}><Trash2 className="w-4 h-4 text-brick" /></button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-foreground/60">Aucun mot.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EMPTY_PLAN = { slug: "", name: "", price_eur: 0, period: "", tagline: "", features: [], cta_label: "S'abonner", highlight: false, active: true, order: 99 };

function PlansTab() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [msg, setMsg] = useState("");

  const load = () => api.get("/admin/plans").then((r) => setItems(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const startEdit = (p) => { setEditing(p.plan_id); setForm({ ...EMPTY_PLAN, ...p, features: p.features || [] }); };
  const startNew = () => { setEditing("new"); setForm({ ...EMPTY_PLAN, order: items.length + 1 }); };
  const cancel = () => { setEditing(null); setForm(EMPTY_PLAN); setMsg(""); };

  const save = async () => {
    try {
      const payload = { ...form, price_eur: Number(form.price_eur) || 0, features: typeof form.features === "string" ? form.features.split("\n").filter(Boolean) : form.features };
      if (editing === "new") await api.post("/admin/plans", payload);
      else await api.patch(`/admin/plans/${editing}`, payload);
      setMsg("✓ Enregistré"); setTimeout(() => setMsg(""), 1500);
      cancel(); load();
    } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  const del = async (id) => {
    if (!window.confirm("Supprimer ce forfait ?")) return;
    try { await api.delete(`/admin/plans/${id}`); load(); } catch (e) { setMsg(e?.response?.data?.detail || "Erreur"); }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black">Forfaits ({items.length})</h2>
        <button onClick={startNew} data-testid="plan-new" className="ml-btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter un forfait</button>
      </div>
      {msg && <div className="mb-3 p-3 rounded-xl bg-leaf-50 text-leaf-700 font-bold">{msg}</div>}

      {editing && (
        <div className="ml-card p-6 bg-white mb-5" data-testid="plan-form">
          <div className="text-lg font-black mb-3">{editing === "new" ? "Nouveau forfait" : "Modifier le forfait"}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-bold">Slug (id technique)</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex: family" className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-slug" /></label>
            <label className="block"><span className="text-sm font-bold">Nom affiché</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-name" /></label>
            <label className="block"><span className="text-sm font-bold">Prix (€)</span><input type="number" step="0.01" value={form.price_eur} onChange={(e) => setForm({ ...form, price_eur: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-price" /></label>
            <label className="block"><span className="text-sm font-bold">Période / sous-titre</span><input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="par mois" className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-period" /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold">Caractéristiques (1 par ligne)</span>
              <textarea value={Array.isArray(form.features) ? form.features.join("\n") : form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={5} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick font-mono text-sm" data-testid="plan-features" />
            </label>
            <label className="block"><span className="text-sm font-bold">Texte du bouton</span><input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-cta" /></label>
            <label className="block"><span className="text-sm font-bold">Ordre</span><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick" data-testid="plan-order" /></label>
            <label className="flex items-center gap-2 mt-7"><input type="checkbox" checked={!!form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.checked })} data-testid="plan-highlight" /><span className="font-bold">Mettre en avant (★ Recommandé)</span></label>
            <label className="flex items-center gap-2 mt-7"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} data-testid="plan-active" /><span className="font-bold">Visible publiquement</span></label>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={cancel} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Annuler</button>
            <button onClick={save} data-testid="plan-save" className="flex-1 ml-btn-primary">Enregistrer</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4" data-testid="plans-list">
        {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60 col-span-full">Aucun forfait.</div>}
        {items.map((p) => (
          <div key={p.plan_id} className={`ml-card p-5 bg-white ${p.highlight ? "ring-2 ring-brick" : ""}`} data-testid={`admin-plan-${p.plan_id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-leaf">{p.slug}{p.highlight && " · ★"}</div>
                <div className="text-xl font-black">{p.name}</div>
                <div className="text-3xl font-black mt-1">{p.price_eur === 0 ? "0 €" : `${p.price_eur} €`}<span className="text-sm font-normal text-foreground/60"> {p.period}</span></div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(p)} className="p-2 rounded-full bg-leaf-50 text-leaf" data-testid={`edit-plan-${p.plan_id}`}><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => del(p.plan_id)} className="p-2 rounded-full bg-brick-50 text-brick" data-testid={`del-plan-${p.plan_id}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {(p.features || []).map((f, i) => <li key={i} className="flex gap-2"><span className="text-leaf">✓</span> {f}</li>)}
            </ul>
            <div className="mt-3 text-xs text-foreground/50">{p.active ? "🟢 Visible" : "⚫ Masqué"} · ordre {p.order}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/feedback").then((r) => setItems(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="mt-6 space-y-3" data-testid="admin-feedback-list">
      {items.length === 0 && <div className="ml-card p-8 bg-white text-center text-foreground/60">Aucun avis pour l'instant.</div>}
      {items.map((f) => (
        <div key={f.feedback_id} className="ml-card p-4 bg-white" data-testid={`fb-${f.feedback_id}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{f.user_name} <span className="text-foreground/60 font-normal">{f.user_email}</span></div>
              <div className="text-xs text-foreground/50 mt-0.5">
                {new Date(f.created_at).toLocaleString("fr-FR")} · page {f.page || "?"}
                {f.early_bird && <span className="ml-2 px-2 py-0.5 rounded-full bg-sun-100 text-brick text-xs font-bold">★ Early Bird</span>}
              </div>
              <div className="mt-2 text-foreground">{f.message}</div>
            </div>
            {f.rating != null && (
              <div className="text-2xl shrink-0">{"⭐".repeat(f.rating)}{"☆".repeat(Math.max(0, 5 - f.rating))}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SubmissionsTab() {
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
  { key: "dictionary", label: "Dictionnaire", icon: BookOpen },
  { key: "plans", label: "Forfaits", icon: CreditCard },
  { key: "feedback", label: "Avis bêta", icon: MessageSquareQuote },
  { key: "testimonials", label: "Témoignages", icon: MessageSquareQuote },
  { key: "submissions", label: "Mots à valider", icon: FileText },
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
      {tab === "dictionary" && <DictionaryTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "feedback" && <FeedbackTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "submissions" && <SubmissionsTab />}
      {tab === "audio" && <AudioTab />}
    </div>
  );
}
