# Mwana Lingala - PRD

## Original Problem
Application web "Mwana Lingala" pour transmettre le Lingala aux enfants (0-10 ans) de la diaspora congolaise.

## Modes
- **Bébé** : audio-first
- **Enfant** : quiz/jeux interactifs
- **Parent** : suivi/gestion/programme hebdo
- **Chrétien** : optionnel

## Stack technique
- Frontend: React 19 + TailwindCSS + Shadcn (Node 20 requis)
- Backend: FastAPI + MongoDB + PyJWT + Fernet
- Déploiement: Railway (unified repo via Nixpacks)
- Intégrations: Google OAuth direct, Google Drive, Mollie, Mammouth, Brevo HTTP, OpenAI TTS

## Completed (Feb 2026)
- Architecture unifiée Railway, Node 20 fix
- Page SEO `/traduction-lingala`, Direct Google OAuth, Fernet, CGU/RGPD
- Widget Mot du Jour, Trust badge, GA4 (`G-C6B5K4VKLB`)
- Bouton "Partager à un proche" (WhatsApp/Copy/Native/Email)
- Login security hardening (consentement persistant, retrait Mollie)
- AuthCallback dédup code via sessionStorage
- Backend Google exchange : `detail_code` lisible
- **Banner "Offre de lancement" responsive mobile** (stack vertical, bouton pleine largeur)
- **Consentement CGU/RGPD masqué après acceptation** (plus jamais visible une fois accepté)
- **🔥 EMAIL OTP : Brevo HTTP API en envoi principal** (résout l'erreur 500 sur Railway)
  - Avant : SMTP Amen.fr direct → Railway peut bloquer/retry échoue → 500
  - Maintenant : Brevo HTTP /v3/smtp/email → fallback SMTP → fallback dev-mode log
  - Testé en local : Brevo retourne 201 Created, OTP envoyé ✅

## Completed (May 2026 — SEO & Branding final)
- **Sitemap dynamique** (`/sitemap.xml`) : généré à la volée par FastAPI à partir de `blog_data.ARTICLES + blog_data_batch1.ARTICLES`. Plus aucune dépendance au fichier statique copié dans `build/`. Fix le bug Search Console "Votre sitemap semble correspondre à une page HTML" (qui se produisait quand le SPA catch-all retournait `index.html` faute de fichier sitemap.xml en build/).
- **Favicon, Apple Touch Icon, PWA icons** générés depuis le logo officiel (PIL) :
  - `/favicon.ico` (multi-tailles : 16/32/48 px)
  - `/favicon-32.png`
  - `/apple-touch-icon.png` (180×180)
  - `/icon-192.png`, `/icon-512.png` (PWA, marqués `purpose: any maskable`)
  - `/og-default.jpg` (1200×630, JPEG optimisé) pour OG Facebook/WhatsApp/iMessage et Twitter
- **`index.html` mis à jour** avec tous les `<link>` et meta `og:image` / `twitter:image` pointant sur les nouveaux assets.
- **`manifest.webmanifest` mis à jour** (3 icônes, `purpose: any maskable` pour adaptation iOS/Android).

## Completed (May 2026 — Onboarding & Branding)
- **Nouveau logo officiel** Mwana Lingala remplacé partout (Navbar + Footer + Onboarding header)
  - Alt SEO: "Mwana Lingala — Apprendre le lingala en s'amusant, chaque jour | Application éducative pour enfants de la diaspora congolaise"
- **Bug fix login → page enfant** : après login (OTP ou Google), on force `localStorage.profile_mode = "parent"`. Si l'utilisateur n'a pas terminé l'onboarding, il est redirigé vers `/onboarding` (au lieu de `/app` qui ouvrait Mode Enfant si la session précédente y était restée).
- **Onboarding refondu en 3 étapes** :
  1. **Pourquoi utilisez-vous Mwana Lingala ?** — 7 options (Transmettre, Apprendre, Famille au pays, Racines, Voyage, Scolarité, Autre+texte libre) avec icônes + descriptions
  2. Prénom enfant
  3. Âge + thèmes + mode chrétien
  - Reprise au bon step si motivation déjà enregistrée mais pas le profil enfant.
- **Backend onboarding** :
  - `POST /api/onboarding/motivation` enregistre la motivation (clé + label + autre)
  - `GET /api/onboarding/status` détecte motivation manquante OU pas de profil enfant
  - `onboarding_completed_at` posé automatiquement à la création du 1er profil
  - `GET /api/admin/onboarding-stats` : agrégation Mongo avec funnel (users_total, with_motivation, onboarding_completed) + buckets (count + pct par motivation) + free_text_answers (50 plus récents pour "autre")
- **Admin > Onboarding** : nouvel onglet avec
  - 3 cartes KPI funnel
  - Bar chart "Pourquoi nos utilisateurs viennent-ils ?" (animation `transition-[width]`)
  - Liste des réponses libres "Autre"

## Completed (May 2026 — Conversion & UX)
- **Guest checkout V2 — Login-style modal** (Google + Email OTP) :
  - Sur Tarifs, le clic sur "Devenir Premium" ou un pack ouvre un modal "Connectez-vous puis payez".
  - Bouton "Continuer avec Google" → OAuth → AuthCallback détecte `pending_checkout` en sessionStorage et déclenche `/api/billing/checkout` automatiquement → Mollie (l'utilisateur ne passe pas par /app).
  - OU formulaire OTP email (request → verify dans le modal) → checkout Mollie.
  - Mollie collecte lui-même la méthode de paiement (carte, iDEAL, SEPA, PayPal).
  - **Note Mollie 422** : message d'erreur clarifié — "Le compte Mollie doit activer au moins une méthode de paiement dans son tableau de bord". À résoudre côté Mollie merchant.
- **Credits indicator mobile** : pastille `Coins | N | +` en header mobile (Acheter → /tarifs)
- **Sidebar desktop** : 2 boutons crédits — "Gagner" (Mission) + "Acheter" (Tarifs)
- **LowCreditsModal** : popup quand l'utilisateur clique une action IA sans crédits suffisants (Acheter / Gagner).
- **Blog "À lire ensuite"** : section d'articles liés (même catégorie en priorité, 3 max). Reading progress bar sticky. Auto scroll-to-top sur changement de slug.
- **Page publique `/mission` & `/contribuer`** (SEO) :
  - Hero panafricain + 4 missions de contribution (voix, validations, propositions, signalements)
  - Récompenses en crédits IA (+5 / +1 / +10 / +3)
  - JSON-LD WebPage + ItemList pour rich-results
  - Ajoutée au sitemap.xml
- **Blog images Nano Banana** :
  - 9 images générées en local via `scripts/generate_blog_images.py` (Mammouth API, gemini-3.1-flash-image-preview)
  - Style identique à la home (illustration enfantine pastel panafricaine)
  - Servies en relatif (`/images/blog/*.png`) — fonctionne preview + prod
  - OG/Schema.org absolutisés vers `mwana-lingala.com`
- **Logo Mwana Lingala** (créé par le fondateur, mascotte enfant + casque) ajouté au Footer
- **Hero Assistant IA responsive** : titre + chip crédits stack vertical sur mobile (sm:flex-row)

## P0 - À pousser sur Railway
1. Push GitHub → Railway rebuild
2. Vérifier que `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` sont dans Railway env vars
3. Tester login email sur https://www.mwana-lingala.com/

## Test prod (2026-02 — testing executé)
- ✅ `/api/` répond 200
- ✅ `/api/auth/google/start` répond 200 avec auth_url valide
- ❌ `/api/auth/request-otp` retournait **500** → corrigé via Brevo
- ✅ Frontend charge correctement, formulaire visible

## P1 - Backlog
- Configurer DNS Amen.fr apex (actuellement seul `www` fonctionne)
- Whisper : clé OpenAI directe (user ne veut pas Emergent)
- Rotation clé Brevo exposée
- Notifications push : ajouter `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` Railway

## P2
- Refactor `server.py` 2600+ lignes
- Commit `yarn.lock`
- Bandeau "Installer l'app" PWA mobile
