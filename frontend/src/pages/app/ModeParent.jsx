import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, Check, Image as ImageIcon, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const THEME_OPTIONS = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
  { slug: "bible", label: "Bible / Valeurs" },
];

export default function ModeParent() {
  const { user, setUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [progress, setProgress] = useState({ count: 0, total: 20, percent: 0, learned_word_ids: [] });
  const [photos, setPhotos] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", age: 5, themes: ["famille"], christian_mode: false });

  const load = () => {
    api.get("/child-profiles").then((r) => setProfiles(r.data)).catch(() => {});
    api.get("/progress").then((r) => setProgress(r.data)).catch(() => {});
    api.get("/me/photo-gallery").then((r) => setPhotos(r.data?.photos || [])).catch(() => {});
  };

  useEffect(load, []);

  const toggleTheme = (slug) => {
    setForm((f) => ({
      ...f,
      themes: f.themes.includes(slug) ? f.themes.filter((t) => t !== slug) : [...f.themes, slug],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/child-profiles", form);
    setForm({ name: "", age: 5, themes: ["famille"], christian_mode: false });
    setFormOpen(false);
    load();
  };

  const deleteProfile = async (id) => {
    if (!window.confirm("Supprimer ce profil ?")) return;
    await api.delete(`/child-profiles/${id}`);
    load();
  };

  const toggleChristian = async () => {
    const next = !user.christian_mode;
    await api.patch("/auth/settings", { christian_mode: next });
    setUser({ ...user, christian_mode: next });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-4xl font-black">Mode Parent</h1>
      <p className="text-foreground/70 mt-1">Profils, progression et paramètres.</p>

      {/* Progress card avec anneau visuel */}
      <div className="ml-card mt-6 p-7 bg-gradient-to-br from-leaf-50 via-white to-sand-100 grid sm:grid-cols-[auto_1fr] gap-6 items-center" data-testid="parent-progress">
        {/* Circular progress */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="none" className="text-sand-200" />
            <circle
              cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="none"
              className="text-leaf transition-all duration-700"
              strokeDasharray={`${(progress.percent / 100) * (2 * Math.PI * 42)} ${2 * Math.PI * 42}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl sm:text-4xl font-black text-brick">{progress.percent}%</div>
            <div className="text-xs font-bold text-foreground/60">progression</div>
          </div>
        </div>
        <div>
          <div className="text-sm font-black text-leaf uppercase tracking-widest">Progression globale</div>
          <div className="text-3xl font-black mt-1">{progress.count} / {progress.total} mots</div>
          <p className="text-foreground/70 mt-2 text-sm">
            {progress.percent < 25 && "C'est le début d'une belle aventure 🌱"}
            {progress.percent >= 25 && progress.percent < 50 && "Bravo, votre enfant progresse 🌿"}
            {progress.percent >= 50 && progress.percent < 75 && "Excellent rythme ! Continuez 💚"}
            {progress.percent >= 75 && "Magnifique, presque tous les mots sont acquis 🏆"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/app/programme" className="px-4 py-2 rounded-full bg-leaf text-white font-bold text-sm inline-flex items-center gap-1" data-testid="parent-go-programme"><Calendar className="w-4 h-4" /> Programme hebdo</Link>
            <Link to="/app/mission" className="px-4 py-2 rounded-full bg-white border-2 border-leaf-100 text-leaf-700 font-bold text-sm" data-testid="parent-go-mission">Missions</Link>
          </div>
        </div>
      </div>

      {/* Christian toggle */}
      <div className="ml-card mt-6 p-6 bg-white flex items-center justify-between gap-3" data-testid="christian-toggle-row">
        <div>
          <div className="font-black">Mode Chrétien</div>
          <div className="text-sm text-foreground/70">Active les mots bibliques et prières courtes (Nzambe, Bolingo, Matondi...).</div>
        </div>
        <button
          onClick={toggleChristian}
          data-testid="christian-toggle-btn"
          className={`relative w-16 h-9 rounded-full transition-colors ${user?.christian_mode ? "bg-leaf" : "bg-foreground/20"}`}
        >
          <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white transition-transform ${user?.christian_mode ? "translate-x-7" : ""}`} />
        </button>
      </div>

      {/* Child profiles */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-black">Profils enfants</h2>
        <button onClick={() => setFormOpen((o) => !o)} className="ml-btn-primary inline-flex items-center gap-2" data-testid="add-child-btn">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </div>

      {formOpen && (
        <form onSubmit={submit} className="ml-card mt-4 p-6 bg-white grid sm:grid-cols-2 gap-4" data-testid="child-form">
          <label className="block">
            <span className="text-sm font-bold">Prénom</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
              data-testid="child-name"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Âge</span>
            <input
              type="number"
              min={0}
              max={15}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
              data-testid="child-age"
            />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-bold">Thèmes</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t.slug}
                  onClick={() => toggleTheme(t.slug)}
                  data-testid={`child-theme-${t.slug}`}
                  className={`px-4 py-2 rounded-full font-bold border-2 ${form.themes.includes(t.slug) ? "bg-leaf text-white border-leaf" : "bg-white border-foreground/10"}`}
                >
                  {form.themes.includes(t.slug) && <Check className="inline w-4 h-4 mr-1" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.christian_mode}
              onChange={(e) => setForm({ ...form, christian_mode: e.target.checked })}
              data-testid="child-christian"
            />
            <span>Inclure le mode chrétien pour cet enfant</span>
          </label>
          <div className="sm:col-span-2 flex gap-3">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-3 rounded-full bg-sand-100 font-bold">Annuler</button>
            <button type="submit" className="flex-1 ml-btn-primary" data-testid="child-submit">Enregistrer</button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {profiles.length === 0 && (
          <div className="ml-card p-8 bg-white col-span-full text-center text-foreground/60">
            Aucun profil pour l’instant.
          </div>
        )}
        {profiles.map((p) => (
          <div key={p.profile_id} className="ml-card p-6 bg-white" data-testid={`child-card-${p.profile_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-black">{p.name}</div>
                <div className="text-sm text-foreground/70">{p.age} ans</div>
              </div>
              <button onClick={() => deleteProfile(p.profile_id)} className="p-2 rounded-full text-foreground/50 hover:text-brick hover:bg-brick-50">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {p.themes.map((t) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-sand-100 font-bold">{t}</span>)}
              {p.christian_mode && <span className="text-xs px-2.5 py-1 rounded-full bg-leaf-50 text-leaf-700 font-bold">✝ Chrétien</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Photo gallery */}
      <div className="mt-12">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black inline-flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-brick" /> Album famille
            </h2>
            <p className="text-foreground/70 mt-1 text-sm">Toutes les photos personnelles que vous avez ajoutées aux mots Lingala. Visibles uniquement par vous.</p>
          </div>
          <Link to="/app/enfant" className="text-brick font-bold underline text-sm" data-testid="gallery-add-link">+ Ajouter depuis Mode Enfant</Link>
        </div>
        {photos.length === 0 ? (
          <div className="ml-card p-8 bg-white mt-4 text-center text-foreground/60" data-testid="gallery-empty">
            Aucune photo personnalisée pour l’instant.
            <div className="mt-2 text-sm">Allez dans le Mode Enfant et appuyez sur l’icône <span className="inline-block px-2 py-0.5 rounded-full bg-brick-50 text-brick text-xs font-bold">📷 Caméra</span> sur un mot pour ajouter une photo.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4" data-testid="parent-photo-gallery">
            {photos.map((p) => (
              <div key={p.word_id} className="ml-card p-2 bg-white overflow-hidden group" data-testid={`gallery-${p.lingala}`}>
                <div className="relative">
                  <img src={p.image} alt={p.french} className="w-full aspect-square object-cover rounded-2xl" />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl">
                    <div className="text-white font-black text-lg leading-tight">{p.lingala}</div>
                    <div className="text-white/80 text-xs">{p.french}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
