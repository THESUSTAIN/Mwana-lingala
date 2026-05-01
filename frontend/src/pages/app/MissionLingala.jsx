import React, { useEffect, useState } from "react";
import { Sparkles, Plus, Check, Trophy, Users as UsersIcon, Gift, Flag, Award, Sprout, Star, Feather, Mic, Image as ImageIcon, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const THEMES = [
  { slug: "famille", label: "Famille" },
  { slug: "nourriture", label: "Nourriture" },
  { slug: "emotions", label: "Émotions" },
  { slug: "bible", label: "Bible / Valeurs" },
  { slug: "objets", label: "Maisons & objets" },
  { slug: "autre", label: "Autre" },
];

const BADGE_ICONS = {
  sprout: Sprout, star: Star, trophy: Trophy, plus: Plus, feather: Feather,
  mic: Mic, image: ImageIcon, users: UsersIcon, shield: Shield, flag: Flag,
};

function MissionItem({ m }) {
  return (
    <div
      className={`ml-card p-5 flex items-center gap-4 ${m.done ? "bg-leaf-50" : "bg-white"}`}
      data-testid={`mission-${m.key}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.done ? "bg-leaf text-white" : "bg-sun-200 text-foreground"}`}>
        {m.done ? <Check className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black">{m.label}</div>
        <div className="text-xs text-foreground/60">
          {m.progress}/{m.target} · +{m.reward} crédits
        </div>
      </div>
    </div>
  );
}

export default function MissionLingala() {
  const { user, setUser } = useAuth();
  const [levelData, setLevelData] = useState({ credits: user?.credits || 0, level: { name: "Explorer Lingala", min: 0, max: 20, next: "Aide-parent", next_at: 21 } });
  const [missions, setMissions] = useState([]);
  const [mine, setMine] = useState([]);
  const [community, setCommunity] = useState([]);
  const [badges, setBadges] = useState({ badges: [], earned_count: 0, total: 0 });
  const [form, setForm] = useState({ french: "", lingala: "", theme: "famille", example_ln: "", example_fr: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const [lv, ms, c, com, bd] = await Promise.all([
        api.get("/me/level"),
        api.get("/contributions/missions"),
        api.get("/contributions/words"),
        api.get("/contributions/community"),
        api.get("/me/badges"),
      ]);
      setLevelData(lv.data);
      setMissions(ms.data.missions || []);
      setMine(c.data || []);
      setCommunity(com.data || []);
      setBadges(bd.data || { badges: [], earned_count: 0, total: 0 });
    } catch (_e) {}
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      const res = await api.post("/contributions/words", form);
      setMsg(`🎉 +${res.data.credits_earned} crédits ! Votre mot est en attente de validation.`);
      setForm({ french: "", lingala: "", theme: form.theme, example_ln: "", example_fr: "" });
      setUser({ ...user, credits: res.data.credits_total });
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const validateOne = async (submission_id) => {
    try {
      const res = await api.post(`/contributions/validate/${submission_id}`);
      setUser({ ...user, credits: (user.credits || 0) + (res.data.credits_earned || 0) });
      await load();
    } catch (err) {
      // silent on already validated
    }
  };

  const progressPct = levelData.level.next_at
    ? Math.min(100, Math.round(((levelData.credits - levelData.level.min) / (levelData.level.next_at - levelData.level.min)) * 100))
    : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black inline-block relative">
            Mission Lingala
            <span className="absolute -bottom-2 left-0 w-16 h-1.5 bg-leaf rounded-full"></span>
          </h1>
          <p className="text-foreground/70 mt-5 max-w-2xl">
            Enrichissez le dictionnaire communautaire. Chaque mot validé vous fait gagner des crédits, utilisables pour l'Assistant IA.
          </p>
        </div>

        {/* Level card */}
        <div className="ml-card p-5 bg-gradient-to-br from-sun-100 to-white min-w-[280px]" data-testid="level-card">
          <div className="flex items-center gap-2 text-xs font-bold text-leaf">
            <Trophy className="w-4 h-4" /> Niveau
          </div>
          <div className="text-xl font-black mt-1">{levelData.level.name}</div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-brick transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-2 text-xs text-foreground/70 flex justify-between">
            <span className="font-bold">{levelData.credits} crédits</span>
            {levelData.level.next && <span>→ {levelData.level.next} ({levelData.level.next_at})</span>}
          </div>
        </div>
      </div>

      {/* Missions du jour */}
      <section className="mt-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brick" />
          <h2 className="text-xl font-black">Missions du jour</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {missions.map((m) => <MissionItem key={m.key} m={m} />)}
        </div>
      </section>

      {/* Badges */}
      <section className="mt-10" data-testid="badges-section">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-brick" />
          <h2 className="text-xl font-black">Badges</h2>
          <span className="ml-2 text-sm font-bold text-foreground/60">{badges.earned_count}/{badges.total} obtenus</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          {badges.badges.map((b) => {
            const Icon = BADGE_ICONS[b.icon] || Award;
            return (
              <div
                key={b.key}
                title={b.desc}
                data-testid={`badge-${b.key}`}
                className={`ml-card p-4 text-center transition-all ${b.earned ? "bg-gradient-to-br from-sun-100 to-white" : "bg-sand-100 opacity-60 grayscale"}`}
              >
                <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center ${b.earned ? "bg-brick text-white" : "bg-white text-foreground/40"}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-black mt-2 leading-tight">{b.label}</div>
                <div className="text-[10px] text-foreground/60 mt-1 line-clamp-2">{b.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contribution form */}
      <section className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <form onSubmit={submit} className="ml-card p-7 bg-white" data-testid="contribution-form">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-leaf" />
            <h2 className="text-xl font-black">Ajouter un mot</h2>
          </div>
          <p className="text-sm text-foreground/60 mt-1">+5 crédits · +3 bonus si vous ajoutez une phrase d'exemple.</p>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <label className="block">
              <span className="text-sm font-bold">Français</span>
              <input
                required
                value={form.french}
                onChange={(e) => setForm({ ...form, french: e.target.value })}
                placeholder="Ex : maison"
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
                data-testid="contrib-french"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Lingala</span>
              <input
                required
                value={form.lingala}
                onChange={(e) => setForm({ ...form, lingala: e.target.value })}
                placeholder="Ex : ndaku"
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
                data-testid="contrib-lingala"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold">Thème</span>
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick font-bold"
                data-testid="contrib-theme"
              >
                {THEMES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold">Phrase d'exemple (Lingala)</span>
              <input
                value={form.example_ln}
                onChange={(e) => setForm({ ...form, example_ln: e.target.value })}
                placeholder="Ex : ndaku na ngai"
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
                data-testid="contrib-example-ln"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Traduction française</span>
              <input
                value={form.example_fr}
                onChange={(e) => setForm({ ...form, example_fr: e.target.value })}
                placeholder="Ex : ma maison"
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 bg-sand-100 outline-none focus:border-brick"
                data-testid="contrib-example-fr"
              />
            </label>
          </div>

          {msg && <div className="mt-4 p-3 rounded-xl bg-leaf-50 text-leaf-700 text-sm font-bold" data-testid="contrib-msg">{msg}</div>}

          <button type="submit" disabled={submitting} className="mt-5 ml-btn-primary disabled:opacity-60 inline-flex items-center gap-2" data-testid="contrib-submit">
            <Plus className="w-5 h-5" /> {submitting ? "Envoi..." : "Envoyer la proposition"}
          </button>
        </form>

        {/* My contributions */}
        <div className="ml-card p-7 bg-white" data-testid="my-contributions">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-brick" />
            <h2 className="text-xl font-black">Mes contributions</h2>
          </div>
          {mine.length === 0 && <p className="text-sm text-foreground/60 mt-3">Aucune pour l'instant. Proposez votre premier mot !</p>}
          <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {mine.map((s) => (
              <li key={s.submission_id} className="p-3 rounded-xl bg-sand-100 flex items-center justify-between">
                <div>
                  <div className="font-bold">{s.lingala} <span className="text-foreground/60 font-normal">— {s.french}</span></div>
                  <div className="text-xs text-foreground/60">
                    {s.status === "approved" ? "✓ Validé" : s.status === "rejected" ? "Refusé" : "En attente"}
                    {" · "}+{s.credits_awarded} crédits
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Community validation */}
      <section className="mt-10">
        <h2 className="text-xl font-black">Valider la communauté <span className="text-sm font-normal text-foreground/60">(+2 crédits par validation)</span></h2>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {community.filter((c) => c.status === "pending").slice(0, 10).map((c) => (
            <div key={c.submission_id} className="ml-card p-4 bg-white flex items-center justify-between gap-3" data-testid={`community-${c.submission_id}`}>
              <div className="min-w-0">
                <div className="font-black text-leaf truncate">{c.lingala}</div>
                <div className="text-sm text-foreground/70 truncate">{c.french}</div>
                <div className="text-xs text-foreground/50 mt-1">Proposé par {c.user_name} · {c.theme}</div>
              </div>
              <button
                onClick={() => validateOne(c.submission_id)}
                className="px-4 py-2 rounded-full bg-leaf text-white font-bold text-sm active:scale-95"
                data-testid={`validate-${c.submission_id}`}
              >
                ✓ Valider
              </button>
            </div>
          ))}
          {community.filter((c) => c.status === "pending").length === 0 && (
            <div className="ml-card p-6 bg-white text-foreground/60 md:col-span-2 text-center">
              Aucune contribution en attente pour le moment.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
