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
- [DONE] **Fix Node 20 pour Railway build** (engines package.json + .nvmrc + NIXPACKS_NODE_VERSION + nodejs_20 nixPkgs)

## P0 - À vérifier par l'utilisateur
- Push vers GitHub → Railway rebuild → vérifier build log `node --version` affiche v20.x
- Une fois build OK, tester flow complet sur `mwana-lingala.com`

## P1 - Backlog
- Whisper désactivé (user ne veut PAS utiliser Emergent LLM proxy) — nécessite clé OpenAI dédiée fournie par user pour réactivation
- Configurer DNS Amen.fr (A record vers IP Railway après déploiement réussi)
- Rotation clé Brevo exposée dans historique git

## P2 - Backlog
- Refactor `server.py` (2600+ lignes) → `/backend/routers/`
- Nettoyage images seed (Spider-Man Ndeko, doublons Mawa/Bolingo)
- Backup persistance `_drive_states` et `_translate_rl`

## Dernière action
**2026-02** : Fix Node 20 mismatch pour déboquer Railway build.
