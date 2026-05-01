# Mwana Lingala — PRD

## Problem Statement (original)
Application **Mwana Lingala** — application web pour permettre aux parents de transmettre le Lingala
(langue bantoue d'Afrique Centrale, RDC/Congo) à leurs enfants de 0-10 ans. Accessible via mwana-lingala.com.
Positionnement : "transmettre le Lingala et des valeurs (dont chrétiennes en option) à son enfant, sans écran excessif."
UX attendue : "simple comme Duolingo, douce comme Headspace".

## User personas
1. **Parent (5-45 ans)** — congolais de la diaspora, veut transmettre sa langue à ses enfants.
2. **Enfant (0-3 ans)** — Mode Bébé audio-first, aucune interaction écran active.
3. **Enfant (4-10 ans)** — Mode Enfant, interaction ludique, quiz courts 2-5 min.

## Roadmap
- **MVP** ✅ : 20 mots / 4 thèmes, 3 modes + chrétien, quiz, signalement, auth, onboarding.
- **Phase 2** ✅ : Contributions communautaires ("Mission Lingala") + crédits.
- **Phase 3** ✅ : Assistant IA (Claude/Mammouth) + paiements Mollie + photos personnalisées.
- **Phase 4** ✅ (cette itération) : Audio communautaire + Rituel matin + Coach IA + Programme hebdo + Badges + Album famille.
- **Phase 5** : Production + validation expert + onboarding raffiné.

## Implemented (cumulé jusqu'à 2026-02)
### Auth & infra
- Emergent Google login + Email OTP (Brevo)
- Sessions cookie httpOnly 7j, role admin/user
- Routing avec ProtectedRoute, AppLayout (sidebar desktop + bottom nav mobile)
- **Switch profil dynamique Enfant/Parent** (localStorage, menu filtré)
### Contenu
- 20 mots / 4 thèmes seed, endpoints CRUD complets
- Custom photos par mot (uploadée par utilisateur, max 400 Ko)
- Audio communautaire : enregistrement micro navigateur (MediaRecorder, 8s max), modération admin, lecture prioritaire
### Modes
- Mode Bébé (audio-first, verrou écran)
- Mode Enfant (cartes, photos perso, micro, quiz, rapports d'erreur)
- Mode Parent (profils, progression, toggle chrétien, **album famille mosaïque photos**)
- Mode Chrétien (mots bibliques, prières, **Rituel du matin** + Rituel du soir)
- **Vue Dashboard simplifiée pour profil enfant** ("Salut champion !", 3 cartes : Apprendre / Jouer / Mes étoiles)
### Page d'accueil publique
- **Illustration hero couple congolais + bébé** (Nano Banana, sans boucles d'oreilles)
### IA & paiements
- Mammouth/Claude Sonnet 4.5 : sentence, daily_sentences, translate, mini_story, prayer, activity, **coach (4 cr)**, **weekly_program (12 cr)**
- Mollie : abonnement Premium 12.99€ + 3 packs crédits (5/10/20€)
- Webhook Mollie idempotent, BillingReturn page
### Mission Lingala
- Soumission de mots + crédits (5+3 bonus exemple)
- Validation communautaire (+2 cr)
- Missions du jour (ajouter 1 mot, valider 3)
- Niveaux : Explorer / Aide-parent / Gardien / Ambassadeur / Expert
- **10 badges** : Premier mot, 10 mots, 20 mots, Premier contributeur, Plume Lingala (5), Voix de la communauté, Album famille, Aide-parent, Gardien des mots, Ambassadeur

## Architecture
- FastAPI backend (1200 lignes — à refactorer en routers), MongoDB
- Collections : users, user_sessions, otp_codes, themes, words, child_profiles, progress, error_reports, word_submissions, audio_submissions, user_word_images, ai_generations, payments, weekly_programs
- React 19 + React Router 7 + Tailwind 3 + Nunito
- Pages app : Dashboard, ModeBebe, ModeEnfant, ModeParent, ModeChretien, Quiz, Onboarding, MissionLingala, Assistant, **WeeklyProgram**, Admin

## Key endpoints
- Auth : `/auth/request-otp`, `/auth/verify-otp`, `/auth/google/session`, `/auth/me`, `/auth/logout`, `/auth/settings`
- Contenu : `/themes`, `/words`, `/words/{id}/custom-image`, `/words/{id}/audio-submission`
- Progression : `/progress`, `/quiz`, `/report-error`
- Famille : `/child-profiles`, `/onboarding/status`, `/me/photo-gallery`
- Gamification : `/me/level`, `/me/badges`, `/contributions/missions`
- Contributions : `/contributions/words`, `/contributions/community`, `/contributions/validate/{id}`
- IA : `/ai/generate` (8 actions), `/weekly-program/generate`, `/weekly-program`
- Admin : `/admin/submissions/*`, `/admin/audio-submissions/*`
- Billing : `/billing/checkout`, `/billing/verify/{id}`, `/billing/webhook`

## Backlog
- **P0** : Refactoring `server.py` 1200 lignes → routers/ (audio, words, ai, admin, billing, badges).
- **P0** : Production deployment (custom domain mwana-lingala.com, prod env, Brevo domain validation).
- **P1** : Ajouter index Mongo + anti-spam sur `audio_submissions`.
- **P1** : Programme hebdo : parser le contenu IA en jours interactifs (cocher la case du jour, audio inline).
- **P2** : Validation experte des traductions (système modéré par linguistes).
- **P2** : Multilingue (français/anglais).
- **P2** : Export PDF de progression.
- **P2** : Playlists audio par thème en Mode Bébé.
- **P3** : App mobile native React Native.

## Testing
- Backend : 81/81 tests passent (`/app/backend/tests/test_*.py`)
- Frontend : 9/9 flows critiques validés (iteration_5.json)
- Test credentials : voir `/app/memory/test_credentials.md`
