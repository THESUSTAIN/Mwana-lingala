import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Mic, BookOpen, Heart, Award, Users, Sparkles, ArrowRight, CheckCircle2, Coins, Globe2 } from "lucide-react";

const PAGE_TITLE = "Contribuez au Lingala — Aidez la diaspora et gagnez des crédits | Mwana Lingala";
const PAGE_DESCRIPTION = "Aidez à enrichir l'application Mwana Lingala : prêtez votre voix native, validez les traductions, signalez les erreurs ou proposez de nouveaux mots. Chaque contribution rapporte des crédits IA gratuits.";
const KEYWORDS = [
  "contribuer lingala",
  "aider apprendre lingala",
  "voix lingala native",
  "diaspora congolaise",
  "transmission lingala",
  "vocabulaire lingala",
  "traduction lingala communauté",
  "préserver lingala",
];

function useMetaTags() {
  useEffect(() => {
    document.title = PAGE_TITLE;
    const set = (name, content, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    set("description", PAGE_DESCRIPTION);
    set("keywords", KEYWORDS.join(", "));
    set("og:title", PAGE_TITLE, "property");
    set("og:description", PAGE_DESCRIPTION, "property");
    set("og:type", "website", "property");
    if (typeof window !== "undefined") {
      set("og:url", window.location.href, "property");
      let can = document.querySelector('link[rel="canonical"]');
      if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
      can.setAttribute("href", window.location.href);
    }
    set("og:image", "https://mwana-lingala.com/images/famille-couple-bebe.png", "property");

    // JSON-LD: WebPage + ItemList of contribution missions for SEO rich-results
    const ld = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": PAGE_TITLE,
      "description": PAGE_DESCRIPTION,
      "inLanguage": "fr-FR",
      "isPartOf": { "@type": "WebSite", "name": "Mwana Lingala", "url": "https://mwana-lingala.com" },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Prêter sa voix native en lingala" },
          { "@type": "ListItem", "position": 2, "name": "Valider les traductions de la communauté" },
          { "@type": "ListItem", "position": 3, "name": "Signaler une erreur dans le dictionnaire" },
          { "@type": "ListItem", "position": 4, "name": "Proposer un nouveau mot lingala" },
        ],
      },
    };
    document.querySelector("#mission-ld")?.remove();
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "mission-ld";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
    return () => { document.querySelector("#mission-ld")?.remove(); };
  }, []);
}

const MISSIONS = [
  {
    icon: Mic,
    title: "Prêtez votre voix native",
    desc: "Vous parlez lingala couramment ? Enregistrez la prononciation des mots du dictionnaire (mama, tata, mbote…). Chaque mot validé enrichit l'audio de tous les enfants apprenants.",
    reward: "+5 crédits IA par audio validé",
    color: "brick",
  },
  {
    icon: CheckCircle2,
    title: "Validez les traductions",
    desc: "Vérifiez les traductions proposées par la communauté. Un simple « ✓ correct » ou « ✗ à revoir » nous aide à maintenir la qualité.",
    reward: "+1 crédit par validation",
    color: "leaf",
  },
  {
    icon: BookOpen,
    title: "Proposez de nouveaux mots",
    desc: "Il manque un mot essentiel ? Proposez-le avec sa traduction française et un exemple. Notre équipe linguistique le vérifie sous 48 h.",
    reward: "+10 crédits IA par mot accepté",
    color: "sun",
  },
  {
    icon: Heart,
    title: "Signalez une erreur",
    desc: "Une faute, une mauvaise traduction, une image inappropriée ? Aidez-nous à corriger en 1 clic. Aucun mot ne reste faux longtemps grâce à vous.",
    reward: "+3 crédits par erreur confirmée",
    color: "leaf",
  },
];

export default function Mission() {
  useMetaTags();

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-leaf-50 via-white to-sun-50 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brick-50 text-brick text-xs font-black uppercase tracking-widest" data-testid="mission-eyebrow">
                <Sparkles className="w-3.5 h-3.5" /> Communauté Mwana Lingala
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05]" style={{ fontFamily: "Georgia,serif" }}>
                Aidez-nous à transmettre <span className="text-leaf">le Lingala</span> à toute une génération.
              </h1>
              <p className="mt-5 text-lg text-foreground/75 leading-relaxed">
                Prêtez votre voix, validez des mots, proposez du contenu. Chaque contribution préserve une langue, et vous gagnez des <span className="font-black text-brick">crédits IA gratuits</span> pour votre propre apprentissage.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform" data-testid="mission-cta-start">
                  Commencer à contribuer <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/blog" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-leaf-200 bg-white text-leaf-700 font-black hover:bg-leaf-50 active:scale-95 transition-transform">
                  Lire le blog
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-foreground/60">
                <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> 200+ contributeurs</span>
                <span className="inline-flex items-center gap-1.5"><Globe2 className="w-4 h-4" /> 12 pays</span>
                <span className="inline-flex items-center gap-1.5"><Award className="w-4 h-4" /> 100 % gratuit</span>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/mission-hero.png"
                alt="Communauté de la diaspora congolaise contribuant au lingala — voix native, validations, transmission entre générations"
                loading="eager"
                fetchpriority="high"
                className="w-full rounded-3xl shadow-2xl object-cover aspect-[4/3]"
                data-testid="mission-hero-image"
              />
              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 max-w-[260px]">
                <div className="w-12 h-12 rounded-xl bg-sun-100 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-brick" />
                </div>
                <div>
                  <div className="text-xs text-foreground/60 font-bold">Récompense moyenne</div>
                  <div className="text-lg font-black text-leaf">+25 crédits / heure</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 4 missions */}
      <section className="py-16 sm:py-20" id="missions">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-black text-leaf uppercase tracking-widest">4 façons d'aider</div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black" style={{ fontFamily: "Georgia,serif" }}>
              Vous parlez lingala ? Vous l'apprenez ?<br /> Toutes les contributions comptent.
            </h2>
            <p className="mt-4 text-foreground/70">
              Pas besoin d'être linguiste. 5 minutes par semaine suffisent pour faire vivre l'application et la diaspora congolaise.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {MISSIONS.map((m) => {
              const Icon = m.icon;
              return (
                <article
                  key={m.title}
                  className={`ml-card p-7 bg-white border-2 border-${m.color}-100 hover:border-${m.color}-300 transition-all`}
                  data-testid={`mission-card-${m.title.split(" ")[0].toLowerCase()}`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-${m.color}-50 flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 text-${m.color}`} strokeWidth={2.25} />
                  </div>
                  <h3 className="text-xl font-black leading-tight">{m.title}</h3>
                  <p className="mt-2 text-foreground/70 leading-relaxed">{m.desc}</p>
                  <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${m.color}-50 text-${m.color} text-xs font-black`}>
                    <Coins className="w-3.5 h-3.5" /> {m.reward}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY — emotional */}
      <section className="py-16 sm:py-20 bg-leaf-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-black text-sun-200 uppercase tracking-widest">Pourquoi ?</div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
              Sans la diaspora, le lingala s'éteint dans 2 générations.
            </h2>
            <p className="mt-5 text-sand-100/90 text-lg leading-relaxed">
              80 % des enfants congolais nés en France ne parlent pas le lingala. Chaque contribution vocale, chaque mot ajouté, chaque correction est <strong className="text-white">une pierre dans l'édifice culturel</strong> que nous laissons à nos enfants.
            </p>
            <p className="mt-3 text-sand-100/70">
              Et oui — vous gagnez aussi des crédits gratuits pour utiliser l'Assistant IA, créer des histoires personnalisées, et continuer à apprendre.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              { num: "87", label: "mots déjà disponibles avec audio natif" },
              { num: "200+", label: "contributeurs actifs dans la communauté" },
              { num: "5 min", label: "suffisent pour votre première contribution" },
              { num: "100 %", label: "gratuit — vos crédits sont offerts en remerciement" },
            ].map((stat) => (
              <li key={stat.label} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-3xl font-black text-sun-200 min-w-[60px]">{stat.num}</div>
                <div className="text-sm text-sand-100/90">{stat.label}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
            Prêt(e) à laisser votre empreinte sur le lingala ?
          </h2>
          <p className="mt-4 text-foreground/70 text-lg">
            Créez votre compte gratuit. Faites votre première contribution en moins de 5 minutes.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brick text-white font-black text-lg hover:bg-brick-600 active:scale-95 transition-transform shadow-xl shadow-brick-200"
            data-testid="mission-cta-final"
          >
            Commencer maintenant — c'est gratuit <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-3 text-xs text-foreground/50">Pas de carte bancaire. Désinscription en 1 clic.</p>
        </div>
      </section>
    </PublicLayout>
  );
}
