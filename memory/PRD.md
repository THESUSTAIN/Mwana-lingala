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
- **P1** : Refactoring `server.py` 1790 lignes → routers/ (auth, words, srs, ai, admin, billing, badges).
- **P1** : Vrai mini-jeu mémoire (cartes Lingala/français à apparier) au lieu de redirection vers Quiz.
- **P2** : Ultralearning : Défi 30 jours pour parents motivés.
- **P2** : Validation experte des traductions par linguistes.
- **P2** : Multilingue (français/anglais/néerlandais).
- **P2** : Export PDF de progression.
- **P3** : App mobile native React Native.

## Testing
- Backend : 5/5 tests passent — Itération 16 (`/app/test_reports/iteration_16.json`)
- Frontend : 100% flows critiques validés (Admin Dictionary 87/87 images Nano Banana, enregistrement voix admin, Mémoire des Pairs, Palais Mental, SRS reset)
- Test credentials : voir `/app/memory/test_credentials.md`
