# Mwana Lingala - PRD

## Original Problem
Application web "Mwana Lingala" pour transmettre le Lingala aux enfants (0-10 ans) de la diaspora congolaise.

## Modes
- **Bébé** : audio-first
- **Enfant** : quiz/jeux interactifs
- **Parent** : suivi/gestion/programme hebdo
- **Chrétien** : optionnel

## Dictionnaire
87 mots (20 gratuits + 67 Premium) sur 8+ thèmes.

## Stack technique
- Frontend: React 19 + TailwindCSS + Shadcn (Node 20 requis)
- Backend: FastAPI + MongoDB + PyJWT + Fernet
- Déploiement: Railway (unified repo via Nixpacks) + Amen.fr DNS
- Intégrations: Google OAuth direct, Google Drive, Mollie, Mammouth API, OpenAI TTS

## Architecture
Unified FastAPI serving React build statiquement, déployé en single-service sur Railway.

## Completed (Feb 2026)
- [DONE] Page SEO publique `/traduction-lingala`
- [DONE] Direct Google OAuth (sans wrapper Emergent)
- [DONE] Fernet encryption refresh tokens + TTL Mongo
- [DONE] CGU/RGPD + consent checkbox
- [DONE] Widget "Mot du Jour" iframe
- [DONE] Trust badge sous login Google
- [DONE] Architecture unifiée Railway (nixpacks.toml racine)
- [DONE] GA4 (ID `G-C6B5K4VKLB`) injecté dynamiquement sur domaine prod
- [DONE] **Fix Node 20 Railway** — `providers = ["python"]` désactive l'auto-détection Node 18 qui écrasait notre `nodejs_20` (root cause: yarn bundle Node 18 du provider auto restait dans le PATH avant notre Node 20)
- [DONE] **Bouton "Partager à un proche"** — Composant `ShareBlock` avec WhatsApp (message bilingue Lingala/FR), copier lien, partage natif mobile (Web Share API) et Email. Placé avant le CTA final sur la Home.

## P0 - À vérifier par l'utilisateur
- Push GitHub → Railway rebuild → dans les logs, `node --version` = v20.6.1 ET `yarn --version` doit être >= 1.22.22 (et non plus 1.22.19)
- Tester `mwana-lingala.com` en E2E une fois le build passé
- Tester le bouton WhatsApp share en prod

## P1 - Backlog
- Whisper désactivé (user ne veut PAS utiliser Emergent LLM proxy) — fournir une clé OpenAI dédiée pour réactivation
- Configurer DNS Amen.fr (A record vers IP Railway après déploiement réussi)
- Rotation clé Brevo exposée dans historique git

## P2 - Backlog
- Refactor `server.py` (2600+ lignes) → `/backend/routers/`
- Nettoyage images seed (Spider-Man Ndeko, doublons Mawa/Bolingo)
- Backup persistance `_drive_states` et `_translate_rl`
- Commit `frontend/yarn.lock` dans git (actuellement absent → build non déterministe)

## Historique
**2026-02** : Fix Node 20 + Bouton Partage "à un proche" (WhatsApp/Copy/Email/Native Share).
