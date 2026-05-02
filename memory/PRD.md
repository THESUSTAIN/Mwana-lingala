# Mwana Lingala — PRD

## Problem Statement (original)
Application **Mwana Lingala** — application web pour permettre aux parents de transmettre le Lingala
(langue bantoue d'Afrique Centrale, RDC/Congo) à leurs enfants de 0-10 ans. Accessible via mwana-lingala.com.
Positionnement : « transmettre le Lingala et des valeurs (dont chrétiennes en option) à son enfant, sans écran excessif. »
UX attendue : « simple comme Duolingo, douce comme Headspace ».

## User personas
1. **Parent (5-45 ans)** — congolais de la diaspora, veut transmettre sa langue à ses enfants.
2. **Enfant (0-3 ans)** — Mode Bébé audio-first, aucune interaction écran active.
3. **Enfant (4-10 ans)** — Mode Enfant, interaction ludique, quiz courts 2-5 min.

## Roadmap
- **MVP** ✅ : 20 mots / 4 thèmes, 3 modes + chrétien, quiz, signalement, auth, onboarding.
- **Phase 2** ✅ : Contributions communautaires (« Mission Lingala ») + crédits.
- **Phase 3** ✅ : Assistant IA (Claude/Mammouth) + paiements Mollie + photos personnalisées.
- **Phase 4** ✅ : Audio communautaire + Rituel matin + Coach IA + Programme hebdo + Badges + Album famille.
- **Phase 5** ✅ (cette itération - 2026-02) : 87 illustrations Nano Banana 2 + SRS + Palais Mental + Mode Enfant pro.
- **Phase 6** : Production deploy + validation expert + onboarding raffiné.

## Implemented (cumulé jusqu'à 2026-02)

### Itération 24 (2026-02) — Traducteur public + Google Drive OAuth complet
- **Traducteur Lingala public** (`/traduction-lingala`) — SEO-first (mot-clé « traduction francais lingala » 2.4K/mois) :
  - Endpoint public `POST /api/translate/public` body `{text, direction: fr-lg | lg-fr | auto}`
    - Fast-path **dictionnaire** regex case-insensitive sur les 87 mots (latence ~30ms, sans crédit IA)
    - Fallback **Claude Sonnet 4.5 via Mammouth** pour les phrases longues (prompt JSON-strict, parsing regex)
    - **Cache** en Mongo (`db.translation_cache`) pour réutiliser les phrases déjà traduites
    - **Rate-limit** IP 20 req/heure (in-memory ; à migrer Redis/Mongo TTL en prod)
  - `GET /api/translate/sample-words` — 20 mots gratuits pour la grille exemple
  - Frontend : textarea bidirectionnel avec bouton swap, Copier, **Écouter** (speechSynthesis fr-FR), exemples cliquables (« Bonjour », « Je t'aime », « Merci »…), grille dictionnaire, CTA inscription, article SEO final
  - Meta tags dynamiques + JSON-LD `WebApplication` (offer price 0), **canonical** `https://mwana-lingala.com/traduction-lingala`
  - Liens dans **Navbar** + **Footer** + **Home hero CTA secondaire**
  - **Sitemap.xml** mis à jour (priority 0.95)
- **Google Drive OAuth 2.0** (scope minimal `drive.file`) pour sauvegarder les créations IA dans un dossier `Mwana Lingala` du Drive parent :
  - `GET /api/drive/auth-url` → URL consent Google (PKCE + state CSRF + prompt=consent pour refresh token)
  - `GET /api/oauth/drive/callback` → échange code→tokens, userinfo.email, stockage `db.drive_credentials`
  - `GET /api/drive/status` → `{connected, email, updated_at}`
  - `DELETE /api/drive/disconnect` → revoke token Google + delete record
  - `POST /api/drive/upload` → crée le dossier si absent, upload fichier (audio/image/text/pdf, 10MB max, mime-type allow-list stricte)
  - Auto-refresh access_token expiré via `google.auth.transport.requests.Request`
  - Frontend `Parametres.jsx` : carte « Google Drive » (connecté/non) avec bouton Connecter/Déconnecter, feedback inline, handle callback `?drive=connected|error&reason=…`
  - Frontend `Assistant.jsx` modal IA : remplace le placeholder par un vrai bouton « Sauvegarder » qui upload texte + audio + image générés dans Drive, avec indicateur connexion

### Auth & infra
- Emergent Google login + Email OTP via SMTP Amen.fr (mail.gandi.net:587)
- Sessions cookie httpOnly 7j, role admin/user, flag `banned`
- Routing avec ProtectedRoute, AppLayout (sidebar desktop + bottom nav mobile)
- Switch profil dynamique Enfant/Parent (localStorage, menu filtré)
- Sidebar collapsible + indexes Mongo + Anti-spam audio (1/jour/mot, max 20/jour)

### Contenu (Itération 14 — 2026-02)
- **87 illustrations générées via Mammouth API model `gemini-3.1-flash-image-preview` (Nano Banana 2)** — style enfant doux, panafricain, fond pastel cohérent.
- Stockage : `/app/frontend/public/images/words/<slug>.jpg` (3.1 MB total après compression PIL 512px JPEG q82).
- **Auto-mapping** : `seed_data.py` utilise un slug Lingala → image path. Migration au startup met à jour les mots existants.
- Dictionnaire enrichi : 87 mots Lingala dans 10 thèmes (Famille, Nourriture, Émotions, Bible, Animaux, Couleurs, Nombres, Corps humain, Salutations, Maison).
- Système tier : 20 free + 67 Premium (overlay « Voir les tarifs »).
- Audios TTS naturels OpenAI tts-1-hd voix `coral`.

### Mode Enfant (Itération 14)
- **Toggle « Apprendre » / « Explorer »** — Apprendre = vue flashcard (Fluent Forever style), Explorer = grille (atelier perso).
- **Toggle « Avec / Sans français »** (Image-only) — Méthode Fluent Forever, oblige à penser en Lingala.
- **3 boutons SRS** : *Encore* (reset au niveau 0), *Bien* (+1), *Facile* (+2). Intervalles : 0/1/3/7/15/30/60 jours.
- Persistance des préférences en localStorage.

### Backend SRS (Spaced Repetition System — Itération 14)
- `POST /api/progress/review` body `{word_id, profile_id?, quality 0..2}` → met à jour `srs_level` + `next_review_at`.
- `GET /api/progress/review-queue?theme=&profile_id=` → `{due, new, due_count, new_count}` avec normalisation auto des images.
- Algorithme inspiré Anki simplifié + livres « A Mind for Numbers » / « How We Learn ».

### Mini-jeu Palais Mental (Itération 14)
- `/app/enfant/jouer/palais-mental` — méthode des loci (Moonwalking with Einstein).
- 4 phases : Placer (5 mots dans 5 pièces de la maison) → Mémoriser (visualiser parcours) → Retrouver (saisir traduction) → Score.
- 5 pièces : Salon, Cuisine, Chambre, Salle de bain, Jardin.

### Quiz & Jouer (Itération 14)
- `/quiz?theme=X` — Quiz filtré par thème (lecture URL searchParams).
- Page Jouer : catégories alignées aux thèmes Lingala (8 cats, dont salutations). Filtrage des jeux + deep-link au thème.
- Bug fix : Cliquer sur catégorie « Animaux » du Dashboard ouvre vraiment Animaux dans Mode Enfant (non Famille).

### Itération 23 (2026-02) — Blog SEO ciblé mots-clés Lingala
- **5 articles SEO** ciblant les mots-clés volumeurs :
  - « Je t'aime en Lingala » (320/mois) — `/blog/je-t-aime-en-lingala`
  - « Bonjour en Lingala » (70/mois) — `/blog/bonjour-en-lingala`
  - « Traduction francais lingala » (2.4K/mois) — `/blog/traduction-francais-lingala-guide`
  - « Apprendre lingala enfant » — `/blog/apprendre-lingala-enfant`
  - « Mots lingala indispensables » (vocabulaire lingala) — `/blog/mots-lingala-indispensables`
- **Backend** : `GET /api/blog/articles` (list) + `GET /api/blog/articles/{slug}` (détail)
- **Frontend** : pages `BlogIndex` + `BlogArticle` avec markdown renderer custom (headings, tables, lists, bold, links, blockquote)
- **SEO** :
  - Meta tags dynamiques (`description`, `keywords`, `og:*`) mis à jour par page
  - JSON-LD schema.org Article (type, headline, keywords, publisher, inLanguage fr-FR)
  - Sitemap.xml mis à jour avec les 5 articles (priority 0.8-0.9)
  - Typographie serif (Georgia) pour lecture éditoriale
  - CTA final « Essayer gratuitement » + bouton cohérent
- **Navbar + Footer** : ajout du lien « Blog »

### Itération 22 (2026-02) — VAPID push + Whisper pronunciation
- **VAPID Web Push configuré** :
  - Clés VAPID générées (ECDSA NIST256p) et stockées dans `.env` (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`)
  - `GET /api/notifications/vapid-public-key` — expose la clé publique au front
  - `POST /api/notifications/test-push` — envoi de test à toutes les subscriptions de l'utilisateur
  - Helper `_send_push(sub, payload)` avec gestion auto du cleanup 410/404 (subs invalides supprimées)
  - `NotificationsBell.jsx` frontend : conversion URL-safe b64 → Uint8Array, `pushManager.subscribe({userVisibleOnly, applicationServerKey})` avec la vraie clé
  - Installation `pywebpush` + `py-vapid` dans requirements.txt
- **Whisper reco vocale** (OpenAI via Emergent LLM Key) :
  - `POST /api/ai/transcribe` body `{audio_b64, expected?}` → retourne `{text, expected, match_score, ok}`
  - Match score calculé par `difflib.SequenceMatcher`, seuil 0.6 pour valider
  - Intégré dans **GameRepeat** : bouton « Vérifier ma voix » → analyse Whisper → feedback « Excellente prononciation ! » avec % de correspondance, ou « Essaie encore » avec ce que l'IA a entendu
  - Avance auto au mot suivant sur succès, « Refaire » / « Passer » sur échec

### Itération 21 (2026-02) — Refactoring + 4 jeux + Notifications mobiles
- **Composants extraits** depuis `AppLayout.jsx` (~390 → 225 lignes) :
  - `ProfileSwitcher.jsx` — avatar + menu switch parent/enfants + add child + logout
  - `ParentalGate.jsx` — modal code parental 4-8 chiffres
- **4 jeux supplémentaires implémentés** (plus aucun "Bientôt" bloquant) :
  - **Remets les lettres** (`/jouer/anagram`) : anagrammes Lingala click-to-reorder
  - **Répète le mot** (`/jouer/repeat`) : MediaRecorder playback comparaison
  - **Colorie et apprends** (`/jouer/color`) : SVG shapes + 6 couleurs palette Lingala
  - **Puzzle** (`/jouer/puzzle`) : 3×3 grille sur image Nano Banana, click-to-swap
- **Notifications mobiles** :
  - `public/sw.js` — Service Worker PWA (install, cache images words, push handler, notification click)
  - `POST /api/notifications/push-subscription` + `DELETE` — stocke la subscription navigateur
  - `GET /api/notifications` — retourne badge count (SRS dus + messages 24h) + items cliquables
  - `NotificationsBell.jsx` — cloche cliquable avec badge rouge, panel déroulant, polling 60s, demande de permission push au clic

### Itération 20 (2026-02) — Assistant IA pro + envoi au Mode Enfant
- **Parent Messages** : les parents peuvent envoyer leurs générations IA (phrases, prière, histoire, message) au Mode Enfant avec :
  - 🎤 **Enregistrement vocal** (MediaRecorder, max 60s) joint au message
  - 🖼️ **Image IA** via Nano Banana 2 Mammouth (2 crédits) — endpoint `POST /ai/generate-image`
  - 👧 **Ciblage enfant spécifique** ou tous les enfants via `profile_id`
  - Nouveaux endpoints : `POST/GET/DELETE /api/parent-messages` (limite 50/user, scopé user_id)
- **Mode Enfant** : section « Messages de Papa/Maman » (💌) avec cards cliquables → modal lecture + audio playback voix parent.
- **Modal Assistant IA refait** : typographie serif (Georgia), guillemets décoratifs sun-200, layout article avec figure+figcaption pour image, footer d'actions (Copier / Ma voix / Image IA / Envoyer à mon enfant).
- **Placeholder Google Drive** dans le modal avec redirection `/app/parametres` (intégration Drive = futur).
- 🔒 **Privacy** : le **contenu IA généré n'est PAS stocké** dans notre DB (seul metadata billing est conservé). Les `parent_messages` sauvegardés sont scopés par user_id et inaccessibles des autres comptes.
- 🐛 **Bug fix** : `generate-image` utilisait l'URL Mammouth sans suffixe `/chat/completions` et `requests` sync dans route async → migré vers `httpx.AsyncClient` + bonne URL.

### Itération 19 (2026-02) — Profils enfants multiples + cartes Jouer
- **Profils enfants multiples** : chaque enfant a son propre « Mode {Nom} » dans le switcher parent. Sélectionner un profil :
  - Filtre les onglets de thèmes en Mode Enfant aux thèmes choisis pour cet enfant
  - Applique son `christian_mode` propre
  - Passe `profile_id` aux endpoints `/progress` et `/progress/review` (progression séparée par enfant)
- H1 Mode Enfant devient « Bonjour {Nom} ! » quand un profil est actif.
- Persistance du profil actif via localStorage `ml_active_child`.
- **Cartes Jouer** : icônes Lucide SVG concrètes colorées (finies les emojis), split ready/soon :
  - Ready (cliquable) : Écoute et trouve, Choisis la bonne réponse, Jeu de mémoire, Palais Mental.
  - Bientôt (désactivé, badge Lock) : Remets les lettres, Répète le mot, Colorie et apprends, Puzzle.

### Itération 18 (2026-02) — UX enfant + sécurité
- **Code parental à 4-8 chiffres** (bcrypt) — bloque le switch Enfant→Parent. Rate-limit 5 tentatives / 5 min. Endpoints : `POST /auth/parental-code`, `DELETE`, `POST /auth/verify-parental-code`, `GET /auth/parental-code/status`.
- **Page Paramètres** `/app/parametres` : infos compte, gestion code parental (set/update/remove), toggle mode chrétien, déconnexion.
- **FeedbackWidget masqué en mode enfant** (AppLayout rend conditionnellement).
- **Quiz Enfant** : bouton audio 🔊 à côté de chaque option française (speechSynthesis `fr-FR`) pour enfants qui ne savent pas lire.
- **Renommé toggle Mode Enfant** : "Cartes" / "Liste" (avant "Apprendre/Explorer" qui confondait avec la nav).
- **Fix nav** : "Apprendre" utilise `end:true` pour ne plus s'activer en même temps que "Jouer".
- **Journal familial** dans Mode Parent — liste chronologique des mots appris avec image Nano Banana + date ("Aujourd'hui", "Hier", ou "lundi 15 févr."). Endpoint `GET /progress/journal?limit=N`.

### Assistant IA (Itération 17 — 2026-02)
- **Résultats affichés dans un modal** (au lieu du bas de page) — en-tête dégradé sun, bouton Fermer, Copier, loader pendant génération, pied affichant les crédits restants.
- Toutes les actions (one-click, traduction, coach parental, avancé) ouvrent le modal avec le titre correspondant.

### Admin (Itération 16 — 2026-02)
- Onglets : Stats / Utilisateurs / Dictionnaire / Forfaits / Témoignages / Mots à valider / Audios / Avis (8).
- CRUD Dictionnaire complet + **upload image/audio par mot** (POST `/api/admin/words/{id}/asset`).
- **Enregistrement voix direct dans l'Admin** (composant AdminVoiceRecorder) — l'admin peut enregistrer sa voix depuis le navigateur (MediaRecorder API, audio/webm;codecs=opus, max 12s) pour remplacer le TTS automatique. Bouton micro à côté des boutons image/audio upload.
- Migration forcée au startup : 87/87 mots pointent vers `/images/words/<slug>.jpg` (asset Nano Banana 2 local).
- Whitelist thèmes étendue à 10 (`admin_approve_submission`).

### Mini-jeux (Itération 16 — 2026-02)
- **Palais Mental** (`/app/enfant/jouer/palais-mental`) — méthode des loci (Moonwalking with Einstein) : 5 pièces (Salon, Cuisine, Chambre, Salle de bain, Jardin) × 5 mots. 4 phases : Placer → Mémoriser → Retrouver → Score.
- **Mémoire des Pairs** (`/app/enfant/jouer/memoire`) — 6 paires = 12 cartes Lingala↔Français. Timer, compteur de coups, 3 étoiles selon perf (≤8 coups=3⭐, ≤12=2⭐, sinon 1⭐). 6 thèmes (Famille/Nourriture/Animaux/Couleurs/Salutations/Maison).
- Page Jouer mise à jour : clic sur « Jeu de mémoire » route bien vers /memoire (plus vers /quiz).

### Modes
- Mode Bébé (audio-first, gros bouton lecteur 200×200, anneau animé)
- Mode Enfant (flashcard + grille + image-only + SRS)
- Mode Parent (anneau SVG progression, album famille, raccourcis)
- Mode Chrétien (Verset du jour, mots bibliques, prières, Rituel matin/soir)
- Assistant IA (palette violette, badge « Powered by Claude AI »)

### IA & paiements
- Mammouth/Claude Sonnet 4.5 : sentence, daily_sentences, translate, mini_story, prayer, activity, coach (4cr), weekly_program (12cr).
- Mammouth/Nano Banana 2 (gemini-3.1-flash-image-preview) : génération d'images (Itération 14).
- Mollie : abonnement Premium 12.99€ + 3 packs crédits.

## Architecture
- FastAPI backend (~1790 lignes — à refactorer en routers), MongoDB
- Collections : users, user_sessions, otp_codes, themes, words, child_profiles, progress (avec srs_level + next_review_at), error_reports, word_submissions, audio_submissions, user_word_images, ai_generations, payments, weekly_programs
- React 19 + React Router 7 + Tailwind 3 + Nunito
- Pages app : Dashboard, ModeBebe, ModeEnfant, ModeParent, ModeChretien, Quiz, Onboarding, MissionLingala, Assistant, WeeklyProgram, **PalaisMental**, Admin

## Key endpoints
- Auth : `/auth/request-otp`, `/auth/verify-otp`, `/auth/google/session`, `/auth/me`, `/auth/logout`, `/auth/settings`
- Contenu : `/themes`, `/words?theme=&include_christian=`, `/words/{id}/custom-image`, `/words/{id}/audio-submission`
- Progression : `/progress`, **`/progress/review`** (SRS), **`/progress/review-queue`**, `/quiz?theme=`, `/report-error`
- Famille : `/child-profiles`, `/onboarding/status`, `/me/photo-gallery`
- Gamification : `/me/level`, `/me/badges`, `/contributions/missions`
- IA : `/ai/generate` (8 actions), `/weekly-program/generate`, `/weekly-program`
- Admin : `/admin/words/*`, `/admin/words/{id}/asset` (upload image/audio), `/admin/submissions/*`, `/admin/audio-submissions/*`, `/admin/users`, `/admin/stats`, `/admin/feedback`, `/admin/testimonials`, `/admin/plans`
- Billing : `/billing/checkout`, `/billing/verify/{id}`, `/billing/webhook`

## Backlog
- **P0** : Production deployment (custom domain mwana-lingala.com, prod env, DKIM/SPF DNS Amen.fr).
- **P1** : Refactoring `server.py` 2500+ lignes → routers/ (auth, words, translate, drive, srs, ai, admin, billing, notifications).
- **P1** : Production hardening pour Drive & traduction (persist `_drive_states` + `_translate_rl` → Mongo TTL / Redis ; encrypter `drive_credentials.refresh_token` avec Fernet).
- **P2** : Ultralearning : Défi 30 jours pour parents motivés.
- **P2** : Validation experte des traductions par linguistes (signaler une traduction IA douteuse pour révision admin).
- **P2** : Multilingue (français/anglais/néerlandais).
- **P2** : Export PDF de progression.
- **P3** : App mobile native React Native.

## Testing
- Backend : 5/5 tests passent — Itération 16 (`/app/test_reports/iteration_16.json`)
- Frontend : 100% flows critiques validés (Admin Dictionary 87/87 images Nano Banana, enregistrement voix admin, Mémoire des Pairs, Palais Mental, SRS reset)
- Test credentials : voir `/app/memory/test_credentials.md`
