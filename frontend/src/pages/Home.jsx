import React from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  Smile,
  Users,
  Volume2,
  Repeat2,
  Gamepad2,
  Heart,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Home as HomeIcon,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import Testimonials from "@/components/Testimonials";
import ShareBlock from "@/components/ShareBlock";

const HOW_STEPS = [
  {
    icon: Volume2,
    title: "Écouter",
    desc: "Votre enfant découvre les mots en Lingala, avec une voix lente et claire.",
    color: "bg-sand-100",
  },
  {
    icon: Repeat2,
    title: "Répéter",
    desc: "Vous répétez ensemble, dans la vraie vie. Un mot → un moment.",
    color: "bg-leaf-50",
  },
  {
    icon: Gamepad2,
    title: "Jouer",
    desc: "Il retient avec des mini-jeux et quiz courts — 5 minutes suffisent.",
    color: "bg-sun-100",
  },
];

const DIFFERENCE = [
  {
    icon: Baby,
    title: "Sans écran pour bébé",
    desc: "Mode Bébé 100% audio : votre enfant entend, vous racontez. L’écran reste posé.",
  },
  {
    icon: Users,
    title: "Parent + enfant ensemble",
    desc: "Conçu pour la transmission humaine — pas pour remplacer le parent par une IA.",
  },
  {
    icon: Heart,
    title: "Culture & famille",
    desc: "Chaque mot porte une histoire de famille, de cuisine, de foi, de souvenirs.",
  },
];

const PARENT_BENEFITS = [
  { icon: Clock, label: "5 minutes par jour" },
  { icon: ShieldCheck, label: "Sans pression, sans pub" },
  { icon: CheckCircle2, label: "Guidé, pas à pas" },
];

const MODES = [
  {
    to: "/app/bebe",
    icon: Baby,
    title: "Mode Bébé",
    age: "0 – 3 ans",
    desc: "Audio doux, écoute continue, pour bercer et familiariser.",
    bg: "bg-sand-100",
    testid: "mode-card-bebe",
  },
  {
    to: "/app/enfant",
    icon: Smile,
    title: "Mode Enfant",
    age: "4 – 10 ans",
    desc: "Cartes-mots avec photos, quiz et récompenses douces.",
    bg: "bg-leaf-50",
    testid: "mode-card-enfant",
  },
  {
    to: "/app/parent",
    icon: Users,
    title: "Mode Parent",
    age: "Pour vous",
    desc: "Profils, progression, thèmes, suggestions du jour.",
    bg: "bg-brick-50",
    testid: "mode-card-parent",
  },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-black text-leaf uppercase tracking-widest mb-3" data-testid="home-eyebrow">
              Apprendre le Lingala — application famille
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Apprendre ou transmettre<br />
              le <span className="text-brick">Lingala</span><br />
              à votre enfant, <span className="text-leaf">facilement</span>.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/75 max-w-xl leading-relaxed">
              5 minutes par jour. Sans pression. Avec vous. La méthode douce pour apprendre le lingala — pour vous comme pour votre enfant : 87 mots avec audio natif, mode bébé/enfant/adulte.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" data-testid="hero-cta-start" className="ml-btn-primary inline-flex items-center gap-2">
                Commencer gratuitement <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/traduction-lingala" data-testid="hero-cta-translate" className="ml-btn-outline">
                Traduire Français ↔ Lingala
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              {PARENT_BENEFITS.map((b) => (
                <div key={b.label} className="flex flex-col items-start gap-2">
                  <div className="w-10 h-10 rounded-full bg-sun-100 flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-leaf-700" strokeWidth={2.25} />
                  </div>
                  <div className="text-xs font-bold text-foreground/80 leading-tight">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl rotate-1">
              <img
                src="/images/famille-couple-bebe.png"
                alt="Un couple congolais avec leur bébé, transmettant le Lingala en famille"
                className="w-full h-full object-cover"
                data-testid="hero-image"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-3xl shadow-xl p-5 border border-sand-200 hidden sm:block">
              <div className="text-xs font-bold text-leaf">Mot du jour</div>
              <div className="text-3xl font-black mt-1">Mama</div>
              <div className="text-sm text-foreground/60">Maman</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 0.5 — Pour qui ? Deux chemins clairs */}
      <section className="bg-white py-16 lg:py-20 border-t border-sand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-brick uppercase tracking-widest">Pour qui ?</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Vous apprenez pour qui aujourd'hui ?</h2>
            <p className="mt-3 text-foreground/70">Mwana Lingala s'adapte à votre projet — famille ou personnel.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            <Link
              to="/login"
              data-testid="audience-card-family"
              className="group ml-card p-8 bg-gradient-to-br from-sun-100 to-sand-100 border-2 border-transparent hover:border-brick transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-8 h-8 text-brick" strokeWidth={2.25} />
                <div className="text-xs font-black text-brick uppercase tracking-widest">Famille · 0-10 ans</div>
              </div>
              <div className="text-2xl font-black leading-tight">J'apprends pour mes enfants</div>
              <p className="mt-3 text-foreground/75 leading-relaxed">
                Transmettez le lingala à vos enfants, 5 minutes par jour, en famille — Mode Bébé (audio), Mode Enfant (jeux), suivi parent.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-brick font-black group-hover:gap-3 transition-all">
                Démarrer la transmission <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
            <Link
              to="/apprendre-le-lingala"
              data-testid="audience-card-adult"
              className="group ml-card p-8 bg-gradient-to-br from-leaf-50 to-white border-2 border-transparent hover:border-leaf transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Smile className="w-8 h-8 text-leaf" strokeWidth={2.25} />
                <div className="text-xs font-black text-leaf uppercase tracking-widest">Adulte · Solo</div>
              </div>
              <div className="text-2xl font-black leading-tight">J'apprends pour moi</div>
              <p className="mt-3 text-foreground/75 leading-relaxed">
                Test de niveau gratuit (A1 → B2), phrases de voyage, dialogues, coach IA. Pour la diaspora, les voyageurs, les passionnés.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-leaf font-black group-hover:gap-3 transition-all">
                Découvrir le mode adulte <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Comment ça marche */}
      <section className="bg-sand-100 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-leaf uppercase tracking-widest">La méthode</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Comment ça marche</h2>
            <p className="mt-3 text-foreground/70">Trois étapes simples, chaque jour, pour transmettre avec douceur.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {HOW_STEPS.map((s, i) => (
              <div key={s.title} className={`ml-card p-8 ${s.color}`} data-testid={`how-step-${i}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <s.icon className="w-6 h-6 text-brick" strokeWidth={2.25} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-brick text-white font-black flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <div className="mt-5 text-2xl font-black">{s.title}</div>
                <p className="mt-2 text-foreground/75">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Pourquoi c'est différent */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-brick uppercase tracking-widest">Notre différence</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Pourquoi Mwana Lingala ?</h2>
            <p className="mt-3 text-foreground/70">
              Pas une énième app IA. Un outil pensé autour du parent, de l’enfant et de la culture.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {DIFFERENCE.map((d) => (
              <div key={d.title} className="ml-card p-8 bg-white">
                <div className="w-12 h-12 rounded-2xl bg-sun-100 flex items-center justify-center">
                  <d.icon className="w-6 h-6 text-leaf-700" strokeWidth={2.25} />
                </div>
                <div className="mt-5 text-xl font-black">{d.title}</div>
                <p className="mt-2 text-foreground/75 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — Aperçu des modes */}
      <section className="bg-sand-100 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-sm font-bold text-leaf uppercase tracking-widest">Aperçu</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Trois modes, une seule famille</h2>
            <p className="mt-3 text-foreground/70">Chaque âge a son expérience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {MODES.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                data-testid={m.testid}
                className={`ml-card p-8 ${m.bg} block group`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <m.icon className="w-7 h-7 text-brick" strokeWidth={2.25} />
                </div>
                <div className="mt-5 text-xs font-bold text-leaf">{m.age}</div>
                <div className="text-2xl font-black mt-0.5">{m.title}</div>
                <p className="mt-2 text-foreground/75">{m.desc}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-brick font-bold group-hover:gap-3 transition-all">
                  Découvrir <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Pour les parents */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="ml-card p-8 sm:p-12 bg-white grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div>
              <div className="text-sm font-bold text-brick uppercase tracking-widest">Pour les parents</div>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black">Simple, rapide, guidé.</h2>
              <p className="mt-4 text-foreground/75 text-lg leading-relaxed">
                Pas besoin de parler Lingala. Pas besoin d’écran. L’app vous souffle 3 mots par jour,
                à partager dans la voiture, au bain, à table. Et vous voyez ce que votre enfant a appris.
              </p>
              <ul className="mt-5 space-y-2 text-foreground">
                {[
                  "Suggestions quotidiennes prêtes à l’emploi",
                  "Mode chrétien optionnel — activé par le parent",
                  "Signalement facile si une traduction semble fausse",
                ].map((b) => (
                  <li key={b} className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-leaf shrink-0 mt-0.5" />{b}</li>
                ))}
              </ul>
              <Link to="/login" data-testid="parent-cta" className="mt-7 ml-btn-primary inline-flex items-center gap-2">
                Créer mon espace parent <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <img
              src="https://static.prod-images.emergentagent.com/jobs/ada3b609-2b21-4042-a584-c9391c03b112/images/3432e611b413f134a383c6ccf935912406c628b74f40c860b8032a70bd3a4204.png"
              alt="Livre ouvert et colombe — transmission familiale"
              className="rounded-3xl w-full h-full object-cover hidden md:block"
            />
          </div>
        </div>
      </section>

      {/* SECTION 4.5 — Vraies familles (émotion) */}
      <section className="py-16 lg:py-20 bg-sand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-sm font-bold text-brick uppercase tracking-widest">Des familles, des souvenirs</div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Transmettre, c'est vivre ensemble.</h2>
            <p className="mt-3 text-foreground/70">
              Mwana Lingala s'intègre à vos moments simples : le bain, le repas, les câlins du soir.
            </p>
          </div>
          <Testimonials />
        </div>
      </section>

      {/* SECTION 5 — Prix */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-sm font-bold text-leaf uppercase tracking-widest">Prix simples</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black">Commencez gratuitement</h2>
          <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
            20 mots offerts pour démarrer. Le Premium à 12,99€/mois pour aller plus loin — moins cher qu’une sortie.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-10 text-left">
            <div className="ml-card p-8 bg-white">
              <div className="text-sm font-bold text-leaf">Gratuit</div>
              <div className="text-5xl font-black mt-2">0 €</div>
              <p className="mt-2 text-foreground/60">Pour découvrir sans engagement.</p>
              <Link to="/login" className="mt-5 inline-block w-full text-center py-4 rounded-full bg-leaf text-white font-bold active:scale-95">
                Commencer
              </Link>
            </div>
            <div className="relative ml-card p-8 bg-white ring-2 ring-brick">
              <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-brick text-white text-xs font-black tracking-wide uppercase shadow-md">
                ★ Recommandé
              </div>
              <div className="text-sm font-bold text-brick">Premium</div>
              <div className="text-5xl font-black mt-2">12,99 €<span className="text-base text-foreground/60">/mois</span></div>
              <p className="mt-2 text-foreground/60">Tout l’app + crédits IA pour l’assistant.</p>
              <Link to="/tarifs" className="mt-5 inline-block w-full text-center py-4 rounded-full bg-brick text-white font-bold active:scale-95">
                Voir les détails
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SHARE — Partager à un proche */}
      <ShareBlock />

      {/* FINAL CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <HomeIcon className="w-10 h-10 mx-auto text-brick" />
          <h2 className="mt-4 text-3xl sm:text-4xl font-black">Donnez à votre enfant la langue de son cœur.</h2>
          <p className="mt-3 text-foreground/70 text-lg">Quelques minutes par jour suffisent. Commencez aujourd’hui.</p>
          <Link to="/login" data-testid="final-cta" className="mt-6 ml-btn-primary inline-flex items-center gap-2">
            Créer mon compte gratuit <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
