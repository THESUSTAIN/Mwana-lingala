import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import PublicHero from "@/components/PublicHero";
import { CheckCircle2, Globe2, Brain, Baby, Smile, Users, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";

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
    { icon: Brain, title: "Suivez la progression", desc: "Mots appris, suggestions du jour, signalement d'erreur." },
  ];
  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Comment ça marche"
        title={<>De l'inscription à <span className="text-leaf">la première session</span> en 5 minutes</>}
        description="Mwana Lingala est conçu pour s'intégrer naturellement à vos moments simples avec votre enfant — sans pression, sans installation compliquée."
        imageSrc="/images/hero-comment-ca-marche.png"
        imageAlt="Père congolais et ses deux enfants apprenant le lingala ensemble sur un tapis panafricain — illustration aquarelle pastel"
      >
        <Link to="/login" className="ml-btn-primary inline-flex items-center gap-2" data-testid="hero-cta-cmm">
          Commencer maintenant <ArrowRight className="w-5 h-5" />
        </Link>
      </PublicHero>
      <Section title="Les 4 étapes" id="how">
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
    "Transmettre une langue maternelle renforce l'identité, la confiance et la mémoire des enfants.",
    "Les neurosciences montrent qu'un enfant bilingue développe une meilleure flexibilité cognitive (cf. A Mind for Numbers, How We Learn).",
    "Le parent reste central : Mwana Lingala est pensé comme un outil parent + enfant, pas comme une tablette-babysitter.",
  ];
  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Pourquoi le Lingala"
        title={<>Une langue, <span className="text-leaf">trois générations</span>, mille souvenirs.</>}
        description="Transmettre le Lingala, c'est offrir à son enfant un trésor qui grandit avec lui : son identité, sa famille élargie, ses racines."
        imageSrc="/images/hero-pourquoi-lingala.png"
        imageAlt="Trois générations d'une famille congolaise — grand-mère, parents, enfant — partageant une transmission orale du lingala"
      >
        <Link to="/login" className="ml-btn-primary inline-flex items-center gap-2" data-testid="hero-cta-pourquoi">
          Commencer gratuitement <ArrowRight className="w-5 h-5" />
        </Link>
        <Link to="/blog" className="ml-btn-outline inline-flex items-center">Lire le blog</Link>
      </PublicHero>
      <Section title="Pourquoi le Lingala" id="why">
        <ul className="space-y-4">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-leaf shrink-0 mt-1" /><span>{b}</span></li>
          ))}
        </ul>
        <div className="ml-card p-8 mt-8 bg-white grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <Globe2 className="w-14 h-14 text-brick" />
          <p className="text-lg">Une application faite avec amour pour que votre enfant garde un lien vivant avec le Lingala, où qu'il grandisse.</p>
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
  const [guestModal, setGuestModal] = useState({ open: false, type: "subscription", packId: null, title: "" });

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data || [])).catch(() => {});
  }, []);

  const startCheckout = async (type, pack_id) => {
    if (!user) {
      // Open inline modal asking only for an email (guest checkout, no login required)
      setErr("");
      setGuestModal({
        open: true,
        type,
        packId: pack_id || null,
        title: type === "subscription" ? "Activer Premium 12,99 €/mois" : "Acheter ce pack de crédits",
      });
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
        <p>Un prix clair — moins cher qu'une sortie familiale, pour transmettre chaque mois une langue et une culture à votre enfant.</p>
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
      <GuestCheckoutModal
        open={guestModal.open}
        onClose={() => setGuestModal((g) => ({ ...g, open: false }))}
        type={guestModal.type}
        packId={guestModal.packId}
        title={guestModal.title}
      />
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
      <PublicHero
        eyebrow="Assistant IA parental"
        title={<>Une IA <span className="text-leaf">éducative</span>, pas un gadget.</>}
        description="Histoire + audio + quiz + activité parent-enfant : tout ce dont vous avez besoin pour 5 minutes de Lingala par jour, en un clic."
        imageSrc="/images/hero-assistant-ia.png"
        imageAlt="Mère congolaise et son enfant émerveillés par un livre magique aux particules dorées — Assistant IA Mwana Lingala"
      >
        <Link to="/login" className="ml-btn-primary inline-flex items-center gap-2" data-testid="hero-cta-ia">
          Essayer l'Assistant <ArrowRight className="w-5 h-5" />
        </Link>
        <Link to="/tarifs" className="ml-btn-outline inline-flex items-center">Voir les tarifs</Link>
      </PublicHero>
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
  // Inline SEO meta tags so this page has its own H1, description, canonical, og:image
  React.useEffect(() => {
    const PROD = "https://mwana-lingala.com";
    document.title = "Contact — Mwana Lingala | Apprendre le Lingala en famille";
    const set = (name, content, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const desc = "Une question, un partenariat, une idée ? Écrivez à l'équipe Mwana Lingala — l'application qui apprend le lingala aux enfants de la diaspora congolaise. Réponse sous 24 h.";
    set("description", desc);
    set("keywords", "contact mwana lingala, support apprendre lingala, partenariat éducation lingala, association diaspora congolaise");
    set("og:title", "Contact — Mwana Lingala", "property");
    set("og:description", desc, "property");
    set("og:type", "website", "property");
    set("og:url", `${PROD}/contact`, "property");
    set("og:image", `${PROD}/images/hero-contact.png`, "property");
    set("twitter:image", `${PROD}/images/hero-contact.png`);
    let can = document.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
    can.setAttribute("href", `${PROD}/contact`);
  }, []);

  return (
    <PublicLayout>
      <PublicHero
        eyebrow="Contact"
        title={<>On est <span className="text-leaf">là pour vous</span>.</>}
        description="Une question sur l'application ? Une idée de mot à ajouter ? Un partenariat école / association ? Notre équipe répond sous 24 h, en français ou en lingala."
        imageSrc="/images/hero-contact.png"
        imageAlt="Maman congolaise souriante avec son téléphone, prête à recevoir un message — équipe support Mwana Lingala accessible et chaleureuse"
      >
        <a href="mailto:contact@mwana-lingala.com" className="ml-btn-primary inline-flex items-center gap-2" data-testid="contact-mail-cta">
          Nous écrire <ArrowRight className="w-5 h-5" />
        </a>
      </PublicHero>
      <Section title="Comment vous aider ?">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="ml-card p-7 bg-white" data-testid="contact-card-support">
            <div className="text-xs font-black text-leaf uppercase tracking-widest">Support utilisateur</div>
            <h3 className="mt-2 text-xl font-black">Un bug, une question, un retour ?</h3>
            <p className="mt-2 text-foreground/70">
              On lit chaque message et on répond personnellement — pas de bot, pas de file d'attente.
            </p>
            <a href="mailto:contact@mwana-lingala.com" className="mt-4 inline-block font-bold text-brick hover:underline" data-testid="contact-mail">
              contact@mwana-lingala.com
            </a>
          </div>
          <div className="ml-card p-7 bg-white" data-testid="contact-card-partner">
            <div className="text-xs font-black text-brick uppercase tracking-widest">Écoles & associations</div>
            <h3 className="mt-2 text-xl font-black">Vous transmettez le lingala ?</h3>
            <p className="mt-2 text-foreground/70">
              Tarifs spéciaux, déploiement classe, contenu sur mesure — parlons-en.
            </p>
            <a href="mailto:contact@mwana-lingala.com?subject=Partenariat%20Mwana%20Lingala" className="mt-4 inline-block font-bold text-leaf hover:underline">
              Demander un devis
            </a>
          </div>
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
          <p><strong>Éditeur du site :</strong> Entreprise individuelle — SIREN 952 309 839.</p>
          <p><strong>Hébergement :</strong> Emergent (déploiement Kubernetes) — infrastructure cloud sécurisée.</p>
          <p><strong>Nom de domaine :</strong> enregistré chez Amen.fr.</p>
          <p><strong>Contact :</strong> contact@mwana-lingala.com</p>
          <p><strong>Propriété intellectuelle :</strong> l’ensemble des contenus (textes, illustrations, audios) est la propriété de l’éditeur ou de ses ayants droit.</p>
          <p><strong>Données personnelles :</strong> voir notre <Link to="/rgpd" className="text-brick underline font-bold">politique de confidentialité RGPD</Link>. Contact DPO : contact@mwana-lingala.com.</p>
          <p><strong>Conditions d'utilisation :</strong> voir <Link to="/cgu" className="text-brick underline font-bold">CGU</Link>.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function CGU() {
  return (
    <PublicLayout>
      <Section title="Conditions générales d'utilisation">
        <div className="ml-card p-8 bg-white space-y-4 text-base leading-relaxed">
          <p className="text-sm text-foreground/60">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
          <h3 className="text-xl font-black mt-4">1. Objet</h3>
          <p>Mwana Lingala est un service en ligne qui permet aux parents de transmettre la langue lingala à leurs enfants via dictionnaire, quiz, mini-jeux, assistant IA et modes audio-first.</p>
          <h3 className="text-xl font-black mt-4">2. Accès au service</h3>
          <p>Le service est accessible gratuitement dans sa version de base (20 mots gratuits). Un abonnement Premium (12,99 €/mois) débloque 87 mots illustrés, l'Assistant IA, le programme hebdomadaire et l'ensemble des mini-jeux. L'inscription nécessite une adresse email valide ou un compte Google.</p>
          <h3 className="text-xl font-black mt-4">3. Compte utilisateur</h3>
          <p>Vous êtes responsable de la confidentialité de vos identifiants. Le code parental à 4-8 chiffres protège le passage Enfant → Parent : gardez-le secret. Vous pouvez créer jusqu'à 5 profils enfants par compte.</p>
          <h3 className="text-xl font-black mt-4">4. Abonnement et facturation</h3>
          <p>Les paiements sont traités par <strong>Mollie B.V.</strong> (Amsterdam, Pays-Bas). Les factures sont émises automatiquement par Mollie après chaque paiement et envoyées à l'adresse email du compte. L'abonnement Premium est mensuel, sans engagement, résiliable à tout moment depuis votre espace.</p>
          <h3 className="text-xl font-black mt-4">5. Contenus IA</h3>
          <p>Les contenus générés par l'Assistant IA (phrases, histoires, prières, traductions) sont fournis à titre indicatif. Malgré notre vigilance, des erreurs linguistiques peuvent survenir. Chaque mot du dictionnaire dispose d'un bouton <em>Signaler une erreur</em>.</p>
          <h3 className="text-xl font-black mt-4">6. Utilisation par des mineurs</h3>
          <p>Le service est conçu pour accompagner des enfants de 0 à 10 ans, <strong>sous la supervision d'un parent ou tuteur légal</strong>. Aucune donnée d'enfant n'est collectée directement — seul le parent titulaire du compte est référencé.</p>
          <h3 className="text-xl font-black mt-4">7. Propriété intellectuelle</h3>
          <p>L'ensemble des contenus (illustrations, textes, audios, code) sont protégés. Reproduction interdite sans accord écrit, hors citation courte avec attribution <em>« Source : Mwana Lingala »</em>.</p>
          <h3 className="text-xl font-black mt-4">8. Responsabilité</h3>
          <p>Le service est fourni « en l'état ». L'éditeur ne saurait être tenu responsable d'une interruption de service, d'une perte de données, ou d'un usage pédagogique inadapté. Le lingala enseigné vise le standard urbain Kinshasa / Brazzaville.</p>
          <h3 className="text-xl font-black mt-4">9. Résiliation</h3>
          <p>Vous pouvez supprimer votre compte à tout moment via <Link to="/contact" className="underline text-brick">contact@mwana-lingala.com</Link>. Toutes vos données seront effacées sous 30 jours (sauf obligations légales de conservation facturation : 10 ans).</p>
          <h3 className="text-xl font-black mt-4">10. Droit applicable</h3>
          <p>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les juridictions compétentes du lieu du siège de l'éditeur.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}

export function RGPD() {
  return (
    <PublicLayout>
      <Section title="Politique de confidentialité (RGPD)">
        <div className="ml-card p-8 bg-white space-y-4 text-base leading-relaxed">
          <p className="text-sm text-foreground/60">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
          <h3 className="text-xl font-black mt-4">Engagement</h3>
          <p>Nous respectons le Règlement Général sur la Protection des Données (UE 2016/679). Cette politique décrit quelles données nous collectons, pourquoi, combien de temps, et vos droits.</p>
          <h3 className="text-xl font-black mt-4">Données collectées</h3>
          <ul className="space-y-1 list-disc ml-5">
            <li><strong>Compte</strong> : email, nom, photo de profil (Google OAuth), mot de passe hashé bcrypt (pour OTP).</li>
            <li><strong>Profils enfants</strong> : prénom, âge, thèmes préférés, mode chrétien on/off. Aucune photo d'enfant n'est collectée.</li>
            <li><strong>Progression</strong> : mots appris, scores de quiz, historique SRS, messages parent→enfant.</li>
            <li><strong>Facturation</strong> : montant, date, ID de transaction Mollie (pas de numéro de carte stocké — Mollie PCI-DSS).</li>
            <li><strong>Logs techniques</strong> : adresse IP, user-agent, timestamp — conservation 90 jours pour sécurité.</li>
          </ul>
          <h3 className="text-xl font-black mt-4">Base légale</h3>
          <ul className="space-y-1 list-disc ml-5">
            <li>Exécution du contrat (compte, abonnement).</li>
            <li>Intérêt légitime (sécurité, anti-fraude, prévention abus).</li>
            <li>Consentement explicite pour Google Drive et notifications push (révocable à tout moment).</li>
          </ul>
          <h3 className="text-xl font-black mt-4">Durée de conservation</h3>
          <ul className="space-y-1 list-disc ml-5">
            <li>Compte actif : jusqu'à suppression demandée.</li>
            <li>Compte inactif > 3 ans : anonymisation automatique.</li>
            <li>Factures : 10 ans (obligation fiscale).</li>
            <li>Logs : 90 jours.</li>
          </ul>
          <h3 className="text-xl font-black mt-4">Sous-traitants</h3>
          <ul className="space-y-1 list-disc ml-5">
            <li><strong>Mollie B.V.</strong> (Pays-Bas, PCI-DSS niv. 1) — paiements.</li>
            <li><strong>Amen.fr / Gandi</strong> (France) — SMTP transactionnel (OTP).</li>
            <li><strong>Google LLC</strong> — OAuth login, Drive optionnel, TTS/Nano Banana via Mammouth API.</li>
            <li><strong>Anthropic / OpenAI</strong> via Mammouth API (France) — génération IA. Les contenus IA ne sont PAS stockés durablement chez nous.</li>
            <li><strong>Emergent</strong> (hébergement cloud).</li>
          </ul>
          <h3 className="text-xl font-black mt-4">Vos droits</h3>
          <p>Vous pouvez à tout moment : accéder à vos données, les rectifier, les supprimer, demander la portabilité, limiter le traitement, retirer votre consentement. Écrivez à <strong>contact@mwana-lingala.com</strong> — réponse sous 30 jours.</p>
          <p>En cas de litige non résolu, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="text-brick underline font-bold">CNIL</a>.</p>
          <h3 className="text-xl font-black mt-4">Cookies</h3>
          <p>Nous utilisons un unique cookie <code className="bg-sand-100 px-1.5 py-0.5 rounded text-xs">session_token</code> (httpOnly, SameSite, 7 jours) pour maintenir votre session. Pas de cookies publicitaires ni de tracking tiers.</p>
          <h3 className="text-xl font-black mt-4">Sécurité</h3>
          <p>Mots de passe hashés bcrypt, tokens OAuth Drive <strong>chiffrés at-rest</strong> (Fernet AES-128), TLS 1.3 sur tout le trafic, rate-limiting sur endpoints sensibles, logs de sécurité.</p>
        </div>
      </Section>
    </PublicLayout>
  );
}
