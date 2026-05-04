import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import PublicHero from "@/components/PublicHero";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Plane,
  MessageCircle,
  Globe2,
  Sparkles,
  Headphones,
  Trophy,
} from "lucide-react";

const TITLE = "Apprendre le lingala pour soi (adulte) — méthode douce, niveau A1 à B2 | Mwana Lingala";
const DESC = "Vous voulez apprendre le lingala pour vous ? Test de niveau gratuit, phrases de voyage, dialogues, coach IA. La méthode adulte de Mwana Lingala — sans pression, à votre rythme.";

function useMeta() {
  useEffect(() => {
    document.title = TITLE;
    const set = (n, c, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${n}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, n); document.head.appendChild(el); }
      el.setAttribute("content", c);
    };
    set("description", DESC);
    set("keywords", "apprendre lingala adulte, cours lingala adultes, méthode lingala diaspora, lingala pour soi, niveau A1 lingala");
    set("og:title", TITLE, "property");
    set("og:description", DESC, "property");
    set("og:image", "https://mwana-lingala.com/og-default.jpg", "property");
    let can = document.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
    can.setAttribute("href", "https://mwana-lingala.com/apprendre-pour-soi");
  }, []);
}

const STEPS = [
  { icon: Trophy, title: "Test de niveau (2 min)", desc: "10 questions pour vous situer (A1 / A2 / B1 / B2). Gratuit et sans inscription." },
  { icon: Sparkles, title: "Programme personnalisé", desc: "Selon votre niveau : vocabulaire, grammaire, prononciation, à votre rythme." },
  { icon: Headphones, title: "Pratique audio quotidienne", desc: "Voix natives, phrases courtes, mémorisation espacée — 10 min par jour suffisent." },
  { icon: MessageCircle, title: "Coach IA dédié", desc: "Posez vos questions sur la grammaire, la prononciation, les expressions courantes." },
];

const USE_CASES = [
  {
    icon: Plane,
    title: "Préparer un voyage à Kinshasa / Brazzaville",
    desc: "50 phrases de voyage prêtes à l'emploi : aéroport, hôtel, marché, taxi, restaurant.",
    cta: "Voir les phrases voyage",
    to: "/phrases-voyage",
  },
  {
    icon: MessageCircle,
    title: "Parler avec ma famille au pays",
    desc: "Apprenez les salutations, présentations, expressions du quotidien — en lingala authentique.",
    cta: "Commencer maintenant",
    to: "/login",
  },
  {
    icon: Globe2,
    title: "Renouer avec mes racines",
    desc: "Pour les enfants de la diaspora qui n'ont jamais appris la langue de leurs parents.",
    cta: "Test de niveau gratuit",
    to: "/test-niveau",
  },
  {
    icon: GraduationCap,
    title: "Projet scolaire ou linguistique",
    desc: "Étudiants, chercheurs, passionnés des langues bantoues : ressources pour aller plus loin.",
    cta: "Lire le blog",
    to: "/blog",
  },
];

const TESTIMONIALS = [
  { quote: "À 32 ans, je ne parlais pas un mot. En 3 mois j'ai eu ma première vraie conversation avec ma grand-mère. Inestimable.", author: "Sandrine, Paris" },
  { quote: "Je voyage à Kinshasa pour le travail. Les phrases de voyage m'ont sauvé la vie au marché de Matete.", author: "Olivier, Bruxelles" },
  { quote: "Enfin une app qui ne me prend pas pour un enfant. Le coach IA répond à mes vraies questions de grammaire.", author: "Rachel, Montréal" },
];

export default function AdultLanding() {
  useMeta();
  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Apprendre pour soi · Adultes"
        title={<>Apprenez le <span className="text-leaf">lingala</span><br />pour vous, à votre rythme.</>}
        description="Vous n'apprenez pas seulement pour vos enfants : vous apprenez pour vous. Test de niveau gratuit, programme adulte, phrases de voyage, coach IA. Sans pression, sans jugement."
        imageSrc="/images/hero-pourquoi-lingala.png"
        imageAlt="Adulte de la diaspora congolaise apprenant le lingala — méthode douce et autonome"
      >
        <Link to="/test-niveau" className="ml-btn-primary inline-flex items-center gap-2" data-testid="adult-cta-leveltest">
          Test de niveau gratuit (2 min) <ArrowRight className="w-5 h-5" />
        </Link>
        <Link to="/login" className="ml-btn-outline inline-flex items-center" data-testid="adult-cta-signup">
          Créer mon compte
        </Link>
      </PublicHero>

      {/* Méthode 4 étapes */}
      <section className="py-16 bg-sand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-leaf uppercase tracking-widest">La méthode adulte</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Comment ça marche</h2>
            <p className="mt-3 text-foreground/70">Une progression claire, du débutant à l'avancé.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {STEPS.map((s, i) => (
              <div key={s.title} className="ml-card p-6 bg-white" data-testid={`adult-step-${i}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-brick text-white flex items-center justify-center font-black text-sm">{i + 1}</div>
                  <s.icon className="w-6 h-6 text-leaf" strokeWidth={2.25} />
                </div>
                <div className="text-lg font-black">{s.title}</div>
                <p className="text-sm text-foreground/70 mt-1.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-brick uppercase tracking-widest">Pour qui ?</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Quel est votre projet ?</h2>
            <p className="mt-3 text-foreground/70">Mwana Lingala s'adapte à votre objectif personnel.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {USE_CASES.map((u) => (
              <div key={u.title} className="ml-card p-7 bg-white border-2 border-sand-200 hover:border-leaf transition-colors" data-testid={`adult-usecase-${u.to.replace(/\W/g, "")}`}>
                <div className="w-12 h-12 rounded-2xl bg-sun-100 flex items-center justify-center">
                  <u.icon className="w-6 h-6 text-brick" strokeWidth={2.25} />
                </div>
                <div className="mt-4 text-xl font-black">{u.title}</div>
                <p className="mt-2 text-foreground/70">{u.desc}</p>
                <Link to={u.to} className="mt-4 inline-flex items-center gap-2 text-brick font-bold hover:gap-3 transition-all">
                  {u.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages adultes */}
      <section className="py-16 bg-sand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-sm font-bold text-brick uppercase tracking-widest">Vrais apprenants</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Ils apprennent le lingala pour eux</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="ml-card p-7 bg-white">
                <div className="text-3xl text-leaf font-black leading-none">"</div>
                <p className="mt-2 text-foreground/80 leading-relaxed">{t.quote}</p>
                <div className="mt-4 text-sm font-bold text-brick">— {t.author}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing reminder */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black">Commencez gratuitement aujourd'hui</h2>
          <p className="mt-3 text-foreground/70 text-lg">
            Test de niveau gratuit. 20 mots offerts. Pas de carte requise. Premium optionnel à 12,99 €/mois pour aller plus loin.
          </p>
          <ul className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            {["Test de niveau gratuit", "Sans engagement", "Voix natives", "Coach IA inclus"].map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 font-bold text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-leaf" /> {b}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/test-niveau" className="ml-btn-primary inline-flex items-center gap-2" data-testid="adult-final-cta-leveltest">
              Test de niveau (2 min) <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/tarifs" className="ml-btn-outline inline-flex items-center">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
