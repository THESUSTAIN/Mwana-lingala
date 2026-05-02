import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { ArrowLeftRight, Copy, Volume2, Sparkles, BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

function useSeo() {
  useEffect(() => {
    const title = "Traduction Français ↔ Lingala — Gratuit & Instantané | Mwana Lingala";
    const description =
      "Traducteur Lingala gratuit : traduisez instantanément du français au lingala (et inverse). Dictionnaire de 87 mots, prononciation audio, traduction IA pour vos phrases. Sans inscription.";
    const keywords =
      "traduction francais lingala, traducteur lingala, dictionnaire lingala francais, lingala traduction gratuite, apprendre lingala, je t'aime en lingala, bonjour en lingala";
    document.title = title;
    const setMeta = (sel, attr, name, content) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="keywords"]', "name", "keywords", keywords);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", "https://mwana-lingala.com/traduction-lingala");
    // Canonical
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", "https://mwana-lingala.com/traduction-lingala");
    // JSON-LD
    const ldId = "ld-traduction";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Traducteur Français ↔ Lingala",
      applicationCategory: "TranslationApplication",
      operatingSystem: "Web",
      inLanguage: ["fr-FR", "ln"],
      url: "https://mwana-lingala.com/traduction-lingala",
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      publisher: { "@type": "Organization", name: "Mwana Lingala", url: "https://mwana-lingala.com" },
    });
    document.head.appendChild(ld);
  }, []);
}

const QUICK_EXAMPLES = [
  { fr: "Bonjour", help: "Salutation" },
  { fr: "Je t'aime", help: "Amour" },
  { fr: "Merci", help: "Politesse" },
  { fr: "Comment vas-tu ?", help: "Politesse" },
  { fr: "Maman, je t'aime", help: "Famille" },
  { fr: "Bonne nuit mon enfant", help: "Soirée" },
];

function speakFr(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function TraductionLingala() {
  useSeo();
  const [direction, setDirection] = useState("fr-lg"); // "fr-lg" | "lg-fr"
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [samples, setSamples] = useState([]);

  useEffect(() => {
    api.get("/translate/sample-words").then((r) => setSamples(r.data || [])).catch(() => {});
  }, []);

  const labels = useMemo(() => {
    return direction === "fr-lg"
      ? { inLabel: "Français", outLabel: "Lingala", placeholder: "Tape une phrase en français…" }
      : { inLabel: "Lingala", outLabel: "Français", placeholder: "Koma maloba na Lingala…" };
  }, [direction]);

  async function translate(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    setInput(text);
    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const r = await api.post("/translate/public", { text, direction });
      setResult(r.data);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Impossible de traduire. Réessaye dans un instant.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setDirection((d) => (d === "fr-lg" ? "lg-fr" : "fr-lg"));
    if (result) {
      setInput(result.target || "");
      setResult(null);
    }
  }

  async function copyOut() {
    if (!result?.target) return;
    try {
      await navigator.clipboard.writeText(result.target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function speakResult() {
    if (!result?.target) return;
    // If the target is French, use fr-FR. Lingala has no widely supported voice in speechSynthesis
    // so we use fr-FR as the closest fallback (Lingala shares many Bantu-French phonetics).
    speakFr(result.target);
  }

  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-sand-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sand-200 px-3 py-1 text-xs font-bold text-leaf-700" data-testid="translate-badge">
            <Sparkles className="w-3.5 h-3.5" /> Traducteur Lingala — Gratuit & sans inscription
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight" style={{ fontFamily: "Georgia,serif" }}>
            Traduction <span className="text-brick">Français</span> ↔ <span className="text-leaf-700">Lingala</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-foreground/75 max-w-3xl">
            Traduis instantanément entre le <strong>français</strong> et le <strong>lingala</strong> (RDC / Congo-Brazzaville).
            Dictionnaire de 87 mots avec prononciation, et IA Claude pour tes phrases complètes.
          </p>
        </div>

        {/* Translator card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
          <div className="ml-card bg-white p-0 overflow-hidden" data-testid="translator-card">
            <div className="flex items-center justify-between bg-sand-50 border-b border-sand-100 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className={`px-3 py-1 rounded-full ${direction === "fr-lg" ? "bg-brick text-white" : "bg-white border border-sand-200"}`} data-testid="dir-fr">
                  {labels.inLabel}
                </span>
                <button
                  type="button"
                  onClick={swap}
                  className="p-2 rounded-full bg-white border border-sand-200 hover:bg-sand-100 active:scale-95 transition"
                  aria-label="Inverser la direction"
                  data-testid="swap-direction"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <span className={`px-3 py-1 rounded-full ${direction === "lg-fr" ? "bg-leaf-700 text-white" : "bg-white border border-sand-200"}`} data-testid="dir-lg">
                  {labels.outLabel}
                </span>
              </div>
              <span className="text-xs text-foreground/60 hidden sm:block">300 caractères max · 20 trad. / heure</span>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-sand-100">
              {/* Input */}
              <div className="p-5">
                <label className="text-xs font-black uppercase text-foreground/50">{labels.inLabel}</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 300))}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) || (e.key === "Enter" && !e.shiftKey && input.length < 60)) {
                      e.preventDefault();
                      translate();
                    }
                  }}
                  placeholder={labels.placeholder}
                  className="mt-1 w-full min-h-[140px] text-lg font-medium bg-transparent border-0 outline-none resize-none placeholder:text-foreground/40"
                  data-testid="translate-input"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-foreground/50">{input.length}/300</span>
                  <button
                    type="button"
                    onClick={() => translate()}
                    disabled={loading || !input.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brick text-white font-bold active:scale-95 transition disabled:opacity-50"
                    data-testid="translate-submit"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Traduction…" : "Traduire"}
                  </button>
                </div>
              </div>

              {/* Output */}
              <div className="p-5 bg-sand-50/60 min-h-[220px] flex flex-col">
                <label className="text-xs font-black uppercase text-foreground/50">{labels.outLabel}</label>
                {error && (
                  <div className="mt-2 p-3 rounded-xl bg-brick-50 text-brick-700 border border-brick-100 text-sm" data-testid="translate-error">
                    {error}
                  </div>
                )}
                {!result && !error && !loading && (
                  <p className="mt-4 text-foreground/40 italic">La traduction apparaîtra ici.</p>
                )}
                {loading && (
                  <div className="flex items-center gap-2 mt-4 text-foreground/60">
                    <Loader2 className="w-4 h-4 animate-spin" /> Claude réfléchit…
                  </div>
                )}
                {result && (
                  <>
                    <p
                      className="mt-2 text-2xl sm:text-3xl font-black leading-snug text-leaf-700 break-words"
                      style={{ fontFamily: "Georgia,serif" }}
                      data-testid="translate-output"
                    >
                      {result.target}
                    </p>
                    {result.image && (
                      <img
                        src={result.image}
                        alt={result.target}
                        className="mt-4 w-28 h-28 object-cover rounded-2xl border border-sand-200"
                        data-testid="translate-image"
                      />
                    )}
                    <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={speakResult}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-sand-200 font-bold text-sm active:scale-95 transition"
                        data-testid="translate-speak"
                      >
                        <Volume2 className="w-4 h-4" /> Écouter
                      </button>
                      <button
                        type="button"
                        onClick={copyOut}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-sand-200 font-bold text-sm active:scale-95 transition"
                        data-testid="translate-copy"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-leaf-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copié" : "Copier"}
                      </button>
                      <span className="ml-auto text-xs text-foreground/50">
                        {result.method === "dictionary" ? "Dictionnaire vérifié" : result.method === "ai-cached" ? "IA (cache)" : "Claude Sonnet"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick examples */}
          <div className="mt-6">
            <div className="text-xs font-black uppercase text-foreground/50 mb-2">Essaye ces phrases</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_EXAMPLES.map((q) => (
                <button
                  key={q.fr}
                  type="button"
                  onClick={() => { setDirection("fr-lg"); translate(q.fr); }}
                  className="px-4 py-2 rounded-full bg-white border border-sand-200 hover:bg-sand-100 text-sm font-bold active:scale-95 transition"
                  data-testid={`example-${q.fr.replace(/\W/g, "-").toLowerCase()}`}
                >
                  {q.fr}
                  <span className="ml-2 text-xs text-foreground/50 font-normal">· {q.help}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sample dictionary */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-leaf-700" />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ fontFamily: "Georgia,serif" }}>Dictionnaire Lingala — 20 mots essentiels</h2>
          </div>
          <p className="text-foreground/70 mb-5">
            Les bases pour démarrer. L’app complète propose 87 mots illustrés, prononciation enregistrée, et des quiz pour enfants.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="sample-grid">
            {samples.map((w) => (
              <div key={w.lingala} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-sand-100">
                {w.image ? (
                  <img src={w.image} alt={w.lingala} className="w-12 h-12 object-cover rounded-xl" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-sand-100" />
                )}
                <div className="min-w-0">
                  <div className="font-black text-leaf-700 truncate" style={{ fontFamily: "Georgia,serif" }}>{w.lingala}</div>
                  <div className="text-xs text-foreground/60 truncate">{w.french}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 ml-card bg-gradient-to-br from-brick to-brick-600 text-white p-8 sm:p-10 text-center">
            <h3 className="text-2xl sm:text-3xl font-black" style={{ fontFamily: "Georgia,serif" }}>
              Va plus loin : apprends le Lingala avec ton enfant
            </h3>
            <p className="mt-2 text-white/90 max-w-2xl mx-auto">
              87 mots illustrés, quiz ludiques, mini-jeux, Mode Bébé audio, Assistant IA et programme hebdo.
              <strong> Gratuit pour commencer.</strong>
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <Link to="/login" className="inline-block px-7 py-3 rounded-full bg-white text-brick font-black active:scale-95 transition" data-testid="cta-signup">
                Commencer gratuitement
              </Link>
              <Link to="/blog/traduction-francais-lingala-guide" className="inline-block px-7 py-3 rounded-full bg-white/10 border border-white/30 font-bold active:scale-95 transition" data-testid="cta-guide">
                Guide complet de traduction
              </Link>
            </div>
          </div>

          {/* SEO-friendly info block */}
          <article className="mt-12 prose max-w-none" style={{ fontFamily: "Georgia,serif" }}>
            <h2 className="text-2xl sm:text-3xl font-black mt-8 mb-3">Pourquoi ce traducteur Lingala ?</h2>
            <p className="my-3 leading-relaxed text-foreground/80">
              Le <strong>lingala</strong> est une langue bantoue parlée par plus de 25 millions de personnes en République démocratique du Congo et
              au Congo-Brazzaville. Notre outil combine un dictionnaire vérifié de 87 mots courants et un moteur IA
              (Claude Sonnet via Mammouth API) pour traduire les phrases. Les mots du dictionnaire sont prononcés par des locuteurs
              et illustrés par des images douces pour faciliter la mémorisation.
            </p>
            <h3 className="text-xl font-black mt-6 mb-2">Limites à connaître</h3>
            <ul className="my-3 space-y-1">
              <li className="ml-5 list-disc">Le lingala a plusieurs dialectes (Kinshasa, Brazzaville, Mbandaka). Nos traductions visent le <em>lingala standard</em>.</li>
              <li className="ml-5 list-disc">Le lingala utilise des <strong>tons</strong> (haut / bas) qui peuvent changer le sens ; nos audios les respectent.</li>
              <li className="ml-5 list-disc">Pour garder l’outil gratuit, 20 traductions par heure sont offertes sans compte — créez un compte pour en débloquer plus.</li>
            </ul>
            <h3 className="text-xl font-black mt-6 mb-2">Quelques mots incontournables</h3>
            <p className="my-3 leading-relaxed text-foreground/80">
              « <strong>Mbote</strong> » (bonjour), « <strong>Nalingi yo</strong> » (je t’aime), « <strong>Matondi</strong> » (merci),
              « <strong>Mama</strong> » (maman), « <strong>Tata</strong> » (papa), « <strong>Mwana</strong> » (enfant).
              Retrouve-les tous dans l’app avec audio et images.
            </p>
          </article>
        </div>
      </div>
    </PublicLayout>
  );
}
