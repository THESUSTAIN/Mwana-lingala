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
- [DONE] Fix Node 20 Railway — `providers = ["python"]` désactive l'auto-détection Node 18
- [DONE] Bouton "Partager à un proche" (WhatsApp bilingue + Copy + Web Share API + Email)
- [DONE] **Login page hardening (2026-02)** :
  - Retrait du badge "Mollie PCI-DSS" (spécifique au paiement, hors-sujet au login)
  - Trust badge focalisé login : "Connexion chiffrée (HTTPS) · Aucun mot de passe stocké · RGPD-compliant"
  - Consentement CGU/RGPD mémorisé en `localStorage` → l'utilisateur ne réaccepte pas à chaque visite
  - Message d'erreur Google détaillé (`code_used`, `redirect_mismatch`, `invalid_client`) pour self-diagnose
  - Frontend AuthCallback : dédup du code via `sessionStorage` pour éviter le double exchange (invalid_grant)
  - Backend `/auth/google/exchange` : mapping exception Google → `detail_code` lisible + log incluant `redirect_uri`

## P0 - À vérifier par l'utilisateur
- Push GitHub → Railway rebuild → tester Google OAuth sur `https://www.mwana-lingala.com/login`
- Vérifier dans **Google Cloud Console** que ces URIs sont dans "Authorized redirect URIs":
  - `https://www.mwana-lingala.com/auth/google`
  - `https://mwana-lingala.com/auth/google` (quand DNS apex sera configuré)
- Vérifier que `GOOGLE_CLIENT_SECRET` est bien défini dans Railway env vars

## P1 - Backlog
- Configurer DNS Amen.fr (A record apex `mwana-lingala.com` vers Railway — actuellement seul `www` fonctionne)
- Whisper : user veut PAS Emergent LLM → fournir clé OpenAI directe pour réactivation
- Rotation clé Brevo exposée dans historique git
- Redirection automatique `www.mwana-lingala.com` ↔ `mwana-lingala.com` (à faire au niveau DNS/Railway)

## P2 - Backlog
- Refactor `server.py` (2600+ lignes) → `/backend/routers/`
- Nettoyage images seed (Spider-Man Ndeko, doublons Mawa/Bolingo)
- Commit `frontend/yarn.lock` dans git (actuellement absent → build non déterministe)
- UTM tracking sur bouton partage WhatsApp

## Historique
**2026-02** : Node 20 fix + Bouton partage + Login security hardening + Google auth error handling.
