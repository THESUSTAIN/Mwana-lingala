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
