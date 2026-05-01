import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { CheckCircle2, Globe2, Brain, Baby, Smile, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function Section({ title, children, id }) {
  return (
    <section id={id} className="py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h2>
        <div className="mt-6 text-foreground/75 text-lg leading-relaxed space-y-4">{children}</div>
      </div>
    </section>
  );
}

export function CommentCaMarche() {
  const steps = [
    { icon: Users, title: "Créez votre espace parent", desc: "Inscription en 30 secondes (Google ou email + code)." },
    { icon: Baby, title: "Ajoutez le profil enfant", desc: "Âge, thèmes préférés, activation du mode chrétien (optionnel)." },
    { icon: Smile, title: "Apprenez ensemble", desc: "Mode Bébé (audio-first) ou Mode Enfant (cartes & quiz)." },
    { icon: Brain, title: "Suivez la progression", desc: "Mots appris, suggestions du jour, signalement d’erreur." },
  ];
  return (
    <PublicLayout>
      <Section title="Comment ça marche" id="how">
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {steps.map((s, i) => (
            <div key={s.title} className="ml-card p-8 bg-white" data-testid={`step-${i}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brick text-white flex items-center justify-center font-black">{i + 1}</div>
                <s.icon className="w-7 h-7 text-leaf" />
              </div>
              <div className="mt-4 text-xl font-black">{s.title}</div>
              <p className="mt-2 text-foreground/70">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/login" className="ml-btn-primary inline-block" data-testid="start-now">Commencer maintenant</Link>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function PourquoiLingala() {
  const bullets = [
    "Le Lingala est une langue bantoue parlée par plus de 40 millions de personnes en Afrique Centrale (RDC, Congo, Angola).",
    "Transmettre une langue maternelle renforce l’identité, la confiance et la mémoire des enfants.",
    "Les neurosciences montrent qu’un enfant bilingue développe une meilleure flexibilité cognitive (cf. A Mind for Numbers, How We Learn).",
    "Le parent reste central : Mwana Lingala est pensé comme un outil parent + enfant, pas comme une tablette-babysitter.",
  ];
  return (
    <PublicLayout>
      <Section title="Pourquoi le Lingala" id="why">
        <ul className="space-y-4">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-leaf shrink-0 mt-1" /><span>{b}</span></li>
          ))}
        </ul>
        <div className="ml-card p-8 mt-8 bg-white grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <Globe2 className="w-14 h-14 text-brick" />
          <p className="text-lg">Une application faite avec amour pour que votre enfant garde un lien vivant avec le Lingala, où qu’il grandisse.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function Tarifs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data || [])).catch(() => {});
  }, []);

  const startCheckout = async (type, pack_id) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(pack_id || type);
    setErr("");
    try {
      const r = await api.post("/billing/checkout", { type, pack_id });
      sessionStorage.setItem("last_payment_id", r.data.payment_id);
      window.location.href = r.data.checkout_url;
    } catch (e) {
      setErr(e?.response?.data?.detail || "Erreur lors du paiement");
      setBusy("");
    }
  };

  const packs = [
    { id: "pack_5", price: "5 €", credits: "500 crédits IA" },
    { id: "pack_10", price: "10 €", credits: "1200 crédits IA" },
    { id: "pack_20", price: "20 €", credits: "3000 crédits IA" },
  ];
  return (
    <PublicLayout>
      <Section title="Tarifs simples">
        <p>Un prix clair — moins cher qu’une sortie familiale, pour transmettre chaque mois une langue et une culture à votre enfant.</p>
        {err && <div className="mt-3 p-3 rounded-xl bg-brick-50 text-brick-700 text-sm font-bold">{err}</div>}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {plans.map((p) => {
            const isPremium = p.highlight || p.slug === "premium";
            const priceDisplay = p.price_eur === 0 ? "0 €" : `${String(p.price_eur).replace(".", ",")} €`;
            return (
            <div
              key={p.plan_id || p.slug}
              className={`relative ml-card p-8 bg-white ${isPremium ? "ring-2 ring-brick" : ""}`}
              data-testid={`plan-${p.slug || p.name.toLowerCase()}`}
            >
              {isPremium && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-brick text-white text-xs font-black tracking-wide uppercase shadow-md">
                  ★ Recommandé
                </div>
              )}
              <div className={`text-sm font-bold ${isPremium ? "text-brick" : "text-leaf"}`}>{p.name}</div>
              <div className="text-5xl font-black mt-2 text-foreground">{priceDisplay}</div>
              <div className="mt-1 text-foreground/60">{p.period || p.tagline}</div>
              <ul className="mt-6 space-y-2">
                {(p.features || []).map((f) => (
                  <li key={f} className="flex gap-2 text-foreground">
                    <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${isPremium ? "text-brick" : "text-leaf"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              {isPremium ? (
                <button
                  onClick={() => startCheckout("subscription")}
                  disabled={busy === "subscription"}
                  data-testid="checkout-subscription"
                  className="mt-8 w-full text-center rounded-full font-bold px-8 py-4 active:scale-95 transition-transform bg-brick text-white hover:bg-brick-600 disabled:opacity-60"
                >
                  {busy === "subscription" ? "Redirection..." : (p.cta_label || "Devenir Premium")}
                </button>
              ) : (
                <Link
                  to={user ? "/app" : "/login"}
                  className="mt-8 inline-block w-full text-center rounded-full font-bold px-8 py-4 active:scale-95 transition-transform bg-leaf text-white hover:bg-leaf-600"
                >
                  {p.cta_label || "Commencer gratuitement"}
                </Link>
              )}
            </div>
            );
          })}
        </div>
        <div className="ml-card p-8 mt-8 bg-white">
          <div className="text-xl font-black">Packs crédits Assistant IA</div>
          <p className="text-foreground/70 mt-1">Ajoutez de la puissance à vos contenus.</p>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            {packs.map((p) => (
              <button
                key={p.id}
                onClick={() => startCheckout("pack", p.id)}
                disabled={busy === p.id}
                data-testid={`checkout-${p.id}`}
                className="p-6 rounded-2xl bg-sun-100 text-center hover:bg-sun-200 transition-colors active:scale-95 disabled:opacity-60"
              >
                <div className="text-3xl font-black">{p.price}</div>
                <div className="text-foreground/80 font-bold">{p.credits}</div>
                <div className="text-xs text-brick font-bold mt-2">{busy === p.id ? "…" : "Acheter"}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-foreground/60 mt-4">Paiements sécurisés par Mollie · SEPA · Carte · iDEAL · PayPal.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function AssistantIA() {
  const features = [
    {
      title: "Histoire + Apprentissage",
      desc: "Pas juste une histoire jetable : chaque mini-histoire en Lingala introduit 3 mots du jour, avec audio, répétition et quiz de compréhension à la fin.",
      badge: "Produit éducatif",
    },
    {
      title: "Adaptée à l'âge",
      desc: "Le niveau, le vocabulaire et la durée s'ajustent selon l'âge de votre enfant (0-3, 4-6, 7-10 ans).",
      badge: "Pédagogique",
    },
    {
      title: "Centrée parent + enfant",
      desc: "L'assistant propose aussi une activité concrète à faire ensemble dans la vraie vie : montrer un objet, répéter un mot, cuisiner un plat.",
      badge: "Sans écran passif",
    },
  ];
  const btns = [
    { title: "Mini-histoire apprenante", desc: "Histoire courte avec 3 mots clés + quiz à la fin" },
    { title: "Phrases du jour", desc: "3 phrases adaptées à l'âge de votre enfant" },
    { title: "Prière simple (optionnel)", desc: "Prière courte en Lingala si mode chrétien actif" },
    { title: "Activité parent-enfant", desc: "Une action concrète à faire ensemble aujourd'hui" },
    { title: "Traduire une phrase", desc: "Votre phrase en français → Lingala avec explication" },
  ];
  return (
    <PublicLayout>
      <Section title="Assistant IA parental">
        <p className="text-lg">
          <strong>Ce n'est pas un générateur d'histoires IA générique.</strong> C'est un assistant éducatif
          qui combine histoire, audio, répétition, quiz et activité parentale autour du Lingala.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {features.map((f) => (
            <div key={f.title} className="ml-card p-6 bg-sun-100">
              <div className="inline-block text-xs font-black px-3 py-1 rounded-full bg-white text-leaf-700 border border-sun-300">{f.badge}</div>
              <div className="mt-3 text-lg font-black">{f.title}</div>
              <p className="mt-2 text-foreground/80">{f.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-black mt-12">Les actions guidées (boutons, pas de chat vide)</h3>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {btns.map((b, i) => (
            <div
              key={b.title}
              data-testid={`ai-btn-${i}`}
              className="ml-card p-6 bg-white"
            >
              <div className="text-lg font-black text-brick">{b.title}</div>
              <div className="text-sm text-foreground/70 mt-1">{b.desc}</div>
              <div className="text-xs text-leaf font-bold mt-3">Bientôt disponible</div>
            </div>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}

export function Faq() {
  const qas = [
    { q: "À partir de quel âge ?", a: "Dès 0 an en Mode Bébé (audio-first), jusqu’à 10 ans en Mode Enfant." },
    { q: "Dois-je parler Lingala ?", a: "Non. Les traductions françaises et l’audio vous accompagnent pas à pas." },
    { q: "Le mode chrétien est-il imposé ?", a: "Non, il est totalement optionnel et activable uniquement par le parent." },
    { q: "Et si je trouve une erreur de traduction ?", a: "Chaque mot dispose d’un bouton Signaler une erreur pour proposer une correction." },
    { q: "Comment sont générées les voix ?", a: "Pour le MVP, la voix du navigateur lit lentement chaque mot. Les audios communautaires arriveront en Phase 2." },
  ];
  return (
    <PublicLayout>
      <Section title="FAQ">
        <div className="space-y-4">
          {qas.map((x, i) => (
            <details key={i} className="ml-card p-6 bg-white" data-testid={`faq-${i}`}>
              <summary className="cursor-pointer font-black text-lg">{x.q}</summary>
              <p className="mt-3 text-foreground/75">{x.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}

export function Contact() {
  return (
    <PublicLayout>
      <Section title="Contact">
        <div className="ml-card p-8 bg-white">
          <p className="text-lg">Une question, un partenariat, une idée de thème ? Écrivez-nous :</p>
          <a href="mailto:contact@mwana-lingala.com" className="mt-4 inline-block ml-btn-primary" data-testid="contact-mail">
            contact@mwana-lingala.com
          </a>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function MentionsLegales() {
  return (
    <PublicLayout>
      <Section title="Mentions légales">
        <div className="ml-card p-8 bg-white space-y-3 text-base">
          <p><strong>Éditeur du site :</strong> MBENGA CINDY</p>
          <p><strong>SIREN :</strong> 952 309 839 — Entreprise individuelle</p>
          <p><strong>Hébergement :</strong> Hostinger — https://www.hostinger.fr</p>
          <p><strong>Contact :</strong> contact@mwana-lingala.com</p>
          <p><strong>Propriété intellectuelle :</strong> l’ensemble des contenus (textes, illustrations, audios) est la propriété de l’éditrice ou de ses ayants droit.</p>
          <p><strong>Données personnelles (RGPD) :</strong> aucune donnée d’enfant n’est collectée sans consentement parental. Contact DPO : contact@mwana-lingala.com.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}
