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

## Roadmap (defined with user)
- **MVP (now)**: 20 mots / 4 thèmes, 3 modes + chrétien optionnel, quiz, signalement d'erreur.
- **Phase 2**: Contributions communautaires ("Mission Lingala") + crédits gagnés.
- **Phase 3**: Assistant IA (Claude via Mammouth) + achat de crédits (Mollie).
- **Phase 4**: Validation experte des traductions.

## Implemented (2026-05)
- ✅ Auth: Emergent Google login + Email OTP (Brevo)
- ✅ Backend FastAPI + MongoDB, 20 mots seed + 4 thèmes
- ✅ Endpoints: /auth/*, /themes, /words, /quiz, /progress, /child-profiles, /report-error, /auth/settings
- ✅ Frontend React + Tailwind (palette africaine #C62828 / #2E7D32 / #F5E6C8, police Nunito)
- ✅ Pages publiques: Accueil, Comment ça marche, Pourquoi le Lingala, Tarifs, Assistant IA (teaser), FAQ, Contact, Mentions légales
- ✅ Pages app: Dashboard, Mode Bébé (audio-first + verrou écran), Mode Enfant (cartes + quiz), Mode Parent (profils, progression, toggle chrétien, signalement), Mode Chrétien (mots + prières)
- ✅ Google Analytics conditionnel (prod uniquement G-C6B5K4VKLB)
- ✅ Retrait du badge Emergent via HTML

## Mocked / not implemented yet
- 🟡 **Audio** : utilise le Web Speech API du navigateur (voix fr-FR lente) — en attendant les audios communautaires en Phase 2.
- 🟡 **Assistant IA** : page teaser, pas encore branché à Mammouth (Phase 3).
- 🟡 **Paiements Mollie** : clé stockée mais flux non activé (Phase 3).
- 🟡 **Emails Brevo** : clé configurée. Le domaine expéditeur `noreply@mwana-lingala.com` doit être validé côté Brevo pour une délivrabilité optimale.

## Backlog (P0 / P1 / P2)
- **P0** : Valider le domaine Brevo pour envoi OTP sans spam.
- **P0** : Intégrer le flux paiement Mollie (abonnement + packs crédits).
- **P1** : Brancher l'Assistant IA (Mammouth → Claude Sonnet) avec les 5 boutons (phrases, histoire, prière, activité, traduction).
- **P1** : Système de crédits (consommation IA, gain par contribution).
- **P1** : Module "Mission Lingala" (contribuer au dictionnaire).
- **P2** : Playlists audio par thème en Mode Bébé.
- **P2** : Audio communautaire (enregistrement, validation modérateur).
- **P2** : Export de progression (PDF).
- **P2** : Multilingue (français / anglais) pour la diaspora.

## Architecture
- FastAPI backend, MongoDB (collections: users, user_sessions, otp_codes, themes, words, child_profiles, progress, error_reports).
- React 19 + React Router 7 + Tailwind 3 + Nunito.
- Auth : session_token stocké en cookie httpOnly (7 jours).
