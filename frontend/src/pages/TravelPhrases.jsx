import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import PublicHero from "@/components/PublicHero";
import { Plane, Search, Volume2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

const TITLE = "50 phrases de lingala pour voyager à Kinshasa / Brazzaville | Mwana Lingala";
const DESC = "50 phrases utiles en lingala pour voyager au Congo : aéroport, hôtel, marché, taxi, restaurant, urgences. Avec audio natif et traduction française. Gratuit.";

function useMeta() {
  useEffect(() => {
    document.title = TITLE;
    const set = (n, c, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${n}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, n); document.head.appendChild(el); }
      el.setAttribute("content", c);
    };
    set("description", DESC);
    set("keywords", "phrases lingala voyage, lingala kinshasa, lingala brazzaville, expressions lingala touriste, voyage congo lingala");
    set("og:title", TITLE, "property");
    set("og:description", DESC, "property");
    set("og:image", "https://mwana-lingala.com/og-default.jpg", "property");
    let can = document.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
    can.setAttribute("href", "https://mwana-lingala.com/phrases-voyage");
  }, []);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch (_e) { /* noop */ }
}

export default function TravelPhrases() {
  useMeta();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("Toutes");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/travel-phrases")
      .then((r) => {
        setItems(r.data.items || []);
        setCategories(r.data.categories || []);
      })
      .catch(() => { /* noop */ });
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((p) => {
      if (activeCat !== "Toutes" && p.category !== activeCat) return false;
      if (!s) return true;
      return (
        p.fr.toLowerCase().includes(s) ||
        p.ln.toLowerCase().includes(s) ||
        (p.context || "").toLowerCase().includes(s)
      );
    });
  }, [items, activeCat, search]);

  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Voyage · Diaspora"
        title={<>50 phrases <span className="text-leaf">lingala</span> pour voyager au Congo</>}
        description="Aéroport, marché, hôtel, restaurant, urgences : tout ce qu'il faut savoir pour passer un séjour serein à Kinshasa ou Brazzaville. Avec écoute audio."
        imageSrc="/images/hero-tarifs.png"
        imageAlt="Famille congolaise partageant un repas — voyage au pays et phrases utiles en lingala"
      >
        <Link to="/test-niveau" className="ml-btn-primary inline-flex items-center gap-2" data-testid="travel-cta-leveltest">
          Tester mon niveau lingala <ArrowRight className="w-5 h-5" />
        </Link>
      </PublicHero>

      <section className="py-10 lg:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Search + categories */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une phrase…"
                className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-sand-200 bg-white outline-none focus:border-brick"
                data-testid="travel-search"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["Toutes", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  data-testid={`travel-cat-${c}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${activeCat === c ? "bg-brick text-white border-brick" : "bg-white border-sand-200 hover:border-brick"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="text-sm text-foreground/60">{filtered.length} phrase{filtered.length > 1 ? "s" : ""}</div>
          </div>

          {/* Phrases list */}
          <div className="grid sm:grid-cols-2 gap-4" data-testid="travel-phrases-list">
            {filtered.map((p, i) => (
              <div key={i} className="ml-card p-5 bg-white border border-sand-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-black text-brick uppercase tracking-widest">{p.category}</div>
                  <button
                    onClick={() => speak(p.ln)}
                    aria-label={`Écouter ${p.ln}`}
                    className="w-9 h-9 rounded-full bg-leaf-50 hover:bg-leaf-100 text-leaf flex items-center justify-center active:scale-95 shrink-0"
                    data-testid={`travel-speak-${i}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 text-lg font-black text-foreground" style={{ fontFamily: "Georgia, serif" }}>
                  {p.ln}
                </div>
                <div className="text-sm text-foreground/80 mt-1">{p.fr}</div>
                {p.context && <div className="text-xs text-foreground/50 mt-2 italic">Contexte : {p.context}</div>}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-foreground/60">
              Aucune phrase trouvée. Essayez un autre mot-clé.
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 ml-card p-8 bg-gradient-to-br from-sun-100 to-white border-2 border-sun-200 text-center">
            <Plane className="w-10 h-10 mx-auto text-brick" />
            <h3 className="mt-4 text-2xl font-black">Préparez votre voyage en profondeur</h3>
            <p className="mt-2 text-foreground/70 max-w-xl mx-auto">
              Avec un compte Mwana Lingala, vous accédez à un programme adapté à votre niveau, à l'audio natif et à un coach IA pour vos questions.
            </p>
            <Link to="/login" className="mt-5 ml-btn-primary inline-flex items-center gap-2" data-testid="travel-cta-signup">
              Créer mon compte gratuit <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
