import React from "react";
import { Link } from "react-router-dom";
import { Baby, Smile, Users, Heart, Volume2, Sparkles, ArrowRight } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const MODES = [
  {
    to: "/app/bebe",
    icon: Baby,
    title: "Mode Bébé",
    age: "0 – 3 ans",
    desc: "Audio-first, sans écran actif. Playlists de mots doux à écouter avec bébé.",
    color: "bg-sand-100 border-sand-200",
    testid: "mode-card-bebe",
  },
  {
    to: "/app/enfant",
    icon: Smile,
    title: "Mode Enfant",
    age: "4 – 10 ans",
    desc: "Cartes, images, quiz courts. Récompenses douces, sessions de 2-5 minutes.",
    color: "bg-white border-leaf-100",
    testid: "mode-card-enfant",
  },
  {
    to: "/app/parent",
    icon: Users,
    title: "Mode Parent",
    age: "Pour vous",
    desc: "Créer le profil enfant, choisir les thèmes, voir la progression.",
    color: "bg-white border-brick-100",
    testid: "mode-card-parent",
  },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pattern-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sun-100 text-leaf-700 font-bold text-sm border border-sun-200">
              <Sparkles className="w-4 h-4" /> MVP ouvert • 20 mots, 4 thèmes
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Transmettre le <span className="text-brick">Lingala</span><br />
              à son enfant, <span className="text-leaf">en douceur</span>.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/75 max-w-xl leading-relaxed">
              Une app chaleureuse pour les familles. Trois modes (Bébé, Enfant, Parent),
              des audios, des quiz courts et un mode chrétien optionnel — sans écran excessif.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" data-testid="hero-cta-start" className="ml-btn-primary inline-flex items-center gap-2">
                Commencer gratuitement <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/comment-ca-marche" data-testid="hero-cta-how" className="ml-btn-outline">
                Comment ça marche
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-foreground/70">
              <span className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-brick" /> Audio lent, pensé pour enfants</span>
              <span className="flex items-center gap-2"><Heart className="w-4 h-4 text-leaf" /> Gratuit pour démarrer</span>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl rotate-1">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/ada3b609-2b21-4042-a584-c9391c03b112/images/39941f6c6a01154c47c26ac6654e3d61ea7031a9c58959646e9b99206aa9185b.png"
                alt="Maman africaine et son bébé"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-3xl shadow-xl p-5 border border-black/5 hidden sm:block">
              <div className="text-xs font-bold text-leaf">Mot du jour</div>
              <div className="text-3xl font-black mt-1">Mama</div>
              <div className="text-sm text-foreground/60">Maman</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mode cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-black">Choisissez votre mode</h2>
          <p className="mt-3 text-foreground/70">
            Adapté à l’âge de l’enfant, et au quotidien du parent.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {MODES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              data-testid={m.testid}
              className={`ml-card p-8 sm:p-10 ${m.color} border-2 block group`}
            >
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <m.icon className="w-8 h-8 text-brick" strokeWidth={2.25} />
              </div>
              <div className="mt-5 text-sm font-bold text-leaf">{m.age}</div>
              <div className="mt-1 text-2xl font-black">{m.title}</div>
              <p className="mt-3 text-foreground/70 leading-relaxed">{m.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-brick font-bold group-hover:gap-3 transition-all">
                Explorer <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Comparison / value */}
      <section className="bg-sand-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-8">
          {[
            { title: "Simple comme Duolingo", desc: "Grandes cartes, quiz courts, récompenses douces." },
            { title: "Doux comme Headspace", desc: "Couleurs chaleureuses, audio lent, zéro pression." },
            { title: "Pensé pour la famille", desc: "Parent + enfant ensemble — pas de tablette-babysitter." },
          ].map((b) => (
            <div key={b.title} className="ml-card p-8 bg-white border border-sand-200">
              <div className="text-xl font-black">{b.title}</div>
              <p className="mt-2 text-foreground/70">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Christian mode teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="ml-card p-8 sm:p-12 bg-white border border-sand-200 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <div className="text-sm font-bold text-leaf">Optionnel</div>
            <h3 className="mt-1 text-3xl sm:text-4xl font-black">Mode Chrétien</h3>
            <p className="mt-4 text-foreground/75 text-lg leading-relaxed">
              Transmettez des valeurs chrétiennes simples en Lingala : mots
              (<em>Nzambe, Bolingo, Bondimi, Matondi</em>), phrases courtes, prières et
              mini-histoires audio. Activable uniquement par le parent.
            </p>
            <Link to="/login" data-testid="christian-cta" className="mt-6 ml-btn-secondary inline-block">
              Activer le mode chrétien
            </Link>
          </div>
          <img
            src="https://static.prod-images.emergentagent.com/jobs/ada3b609-2b21-4042-a584-c9391c03b112/images/3432e611b413f134a383c6ccf935912406c628b74f40c860b8032a70bd3a4204.png"
            alt="Colombe et livre ouvert"
            className="rounded-3xl w-full h-full object-cover"
          />
        </div>
      </section>
    </PublicLayout>
  );
}
