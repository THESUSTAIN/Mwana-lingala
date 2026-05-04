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

const TITLE = "Apprendre le lingala — cours facile pour adultes (A1, A2, B1, B2) | Mwana Lingala";
const DESC = "Apprendre le lingala : cours facile pour adultes débutants. Test de niveau gratuit, leçons à votre rythme, phrases de voyage, coach IA. La méthode douce de Mwana Lingala — pour la diaspora ET tous les passionnés. 100 % en ligne.";

function useMeta() {
  useEffect(() => {
    document.title = TITLE;
    const set = (n, c, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${n}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, n); document.head.appendChild(el); }
      el.setAttribute("content", c);
    };
    set("description", DESC);
    set("keywords", "apprendre le lingala, cours lingala facile, cours de lingala en ligne, apprendre lingala adulte, méthode lingala débutant, lingala A1 A2 B1, apprendre lingala gratuit, parler lingala");
    set("og:title", TITLE, "property");
    set("og:description", DESC, "property");
    set("og:image", "https://mwana-lingala.com/images/hero-apprendre-pour-soi.png", "property");
    set("og:type", "website", "property");
    set("og:url", "https://mwana-lingala.com/apprendre-le-lingala", "property");
    set("twitter:card", "summary_large_image");
    set("twitter:title", TITLE);
    set("twitter:description", DESC);
    set("twitter:image", "https://mwana-lingala.com/images/hero-apprendre-pour-soi.png");
    let can = document.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
    can.setAttribute("href", "https://mwana-lingala.com/apprendre-le-lingala");

    // JSON-LD: Course schema for SEO rich-results (Google "Cours" carousel)
    let ld = document.getElementById("ld-adult-course");
    if (!ld) {
      ld = document.createElement("script");
      ld.id = "ld-adult-course";
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Apprendre le lingala — cours facile pour adultes",
      "description": DESC,
      "provider": {
        "@type": "Organization",
        "name": "Mwana Lingala",
        "sameAs": "https://mwana-lingala.com",
      },
      "inLanguage": "fr",
      "audience": { "@type": "EducationalAudience", "educationalRole": "adult learner" },
      "educationalLevel": ["A1", "A2", "B1", "B2"],
      "image": "https://mwana-lingala.com/images/hero-apprendre-pour-soi.png",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "category": "free" },
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "online",
        "inLanguage": "fr",
      },
    });

    return () => { if (ld?.parentNode) ld.parentNode.removeChild(ld); };
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
    title: "Parler avec ma belle-famille / mon conjoint",
    desc: "Vous êtes en couple avec une personne congolaise ? Apprenez les bases pour partager sa culture.",
    cta: "Commencer maintenant",
    to: "/login",
  },
  {
    icon: Globe2,
    title: "Renouer avec mes racines (diaspora)",
    desc: "Pour les enfants de la diaspora qui n'ont jamais appris la langue de leurs parents.",
    cta: "Test de niveau gratuit",
    to: "/test-niveau",
  },
  {
    icon: GraduationCap,
    title: "Curieux des langues bantoues",
    desc: "Étudiants, chercheurs, voyageurs ou passionnés : aucune origine requise, juste l'envie d'apprendre.",
    cta: "Lire le blog",
    to: "/blog",
  },
];

const FAQS = [
  {
    q: "Faut-il être congolais pour apprendre le lingala ?",
    a: "Non, absolument pas. Le lingala est une langue magnifique parlée par plus de 40 millions de personnes — et notre méthode est conçue pour TOUS les apprenants, quelle que soit leur origine. Que vous soyez européen, américain, asiatique, conjoint d'une personne congolaise, voyageur ou simplement curieux des langues bantoues, vous êtes les bienvenus.",
  },
  {
    q: "Le cours de lingala est-il vraiment facile pour un débutant ?",
    a: "Oui. Mwana Lingala part du niveau A1 (zéro connaissance) avec des leçons courtes (5 à 10 minutes), de la mémorisation espacée et un audio natif lent et clair. Vous apprenez à votre rythme, sans pression. Notre test de niveau gratuit (2 minutes) vous oriente directement au bon point de départ.",
  },
  {
    q: "Combien de temps pour parler lingala ?",
    a: "Avec 10 minutes par jour, comptez 3 à 4 mois pour atteindre le niveau A2 (conversations simples), 6 à 8 mois pour B1 (discussions du quotidien). C'est la moyenne observée chez nos apprenants adultes.",
  },
  {
    q: "Le service est-il gratuit ?",
    a: "Oui, vous pouvez démarrer 100 % gratuitement : test de niveau, 20 mots offerts, accès à 50 phrases de voyage. Le Premium à 12,99 €/mois débloque l'ensemble des leçons, l'audio natif complet et le coach IA.",
  },
  {
    q: "Comment fonctionne le coach IA ?",
    a: "Vous posez vos questions en français (grammaire, prononciation, vocabulaire, comment dire telle phrase, etc.) et le coach IA spécialisé en lingala vous répond en français avec 1 ou 2 actions concrètes adaptées à votre niveau. Idéal pour débloquer rapidement.",
  },
];

const TESTIMONIALS = [
  { quote: "À 32 ans, je ne parlais pas un mot. En 3 mois j'ai eu ma première vraie conversation avec ma grand-mère. Inestimable.", author: "Sandrine, Paris (diaspora)" },
  { quote: "Je voyage à Kinshasa pour le travail. Les phrases de voyage m'ont sauvé la vie au marché de Matete.", author: "Olivier, Bruxelles" },
  { quote: "Mon conjoint est congolais. J'ai voulu apprendre pour surprendre sa famille. Le cours est facile et bienveillant — aucune pression.", author: "Camille, Lyon" },
];

export default function AdultLanding() {
  useMeta();
  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Cours facile · Adultes débutants"
        title={<>Apprendre le <span className="text-leaf">lingala</span><br />— cours facile, à votre rythme.</>}
        description="Tout le monde peut apprendre le lingala : diaspora congolaise, voyageurs, conjoints, étudiants, passionnés. Test de niveau gratuit, leçons progressives (A1 → B2), phrases de voyage, coach IA. Sans pression, sans jugement."
        imageSrc="/images/hero-apprendre-pour-soi.png"
        imageAlt="Cours de lingala pour adultes — apprenants de toutes origines (congolaise, européenne) apprennent ensemble autour d'une table avec cartes de vocabulaire, illustration aquarelle pastel"
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
            <p className="mt-3 text-foreground/70">
              Diaspora congolaise, voyageurs, conjoints, étudiants — <strong>aucune origine requise</strong>. Tout le monde peut apprendre.
            </p>
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

      {/* FAQ SEO */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="text-sm font-bold text-leaf uppercase tracking-widest">Questions fréquentes</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Tout savoir avant de commencer</h2>
          </div>
          <div className="space-y-3" data-testid="adult-faq-list">
            {FAQS.map((f, i) => (
              <details key={i} className="ml-card p-5 sm:p-6 bg-white border-2 border-sand-200" data-testid={`adult-faq-${i}`}>
                <summary className="cursor-pointer font-black text-lg">{f.q}</summary>
                <p className="mt-3 text-foreground/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            // FAQPage schema for Google rich-results (questions/answers carousel)
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": FAQS.map((f) => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": { "@type": "Answer", "text": f.a },
              })),
            }) }}
          />
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
