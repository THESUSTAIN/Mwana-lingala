# 🚂 Déploiement Railway — Backend Mwana Lingala

## Pré-requis
- Compte Railway gratuit : https://railway.app (login GitHub recommandé)
- Ton code déjà sur GitHub (sinon : push le repo `Mwana-lingala-main` sur GitHub)

## Étape 1 — Créer le projet Railway

1. Va sur https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Autorise Railway à accéder à ton repo → sélectionne le repo
3. **Important** : quand Railway te demande le dossier racine du service, indique **`/backend`** (ou `backend/` selon l'UI)
4. Railway détecte automatiquement Python via `railway.json` + `Procfile` que je t'ai créés

## Étape 2 — Ajouter MongoDB managée

1. Dans ton projet Railway → **+ New** → **Database** → **Add MongoDB**
2. Railway crée une instance Mongo gratuite (512 Mo, suffisant pour démarrer)
3. La variable `MONGO_URL` sera auto-injectée dans le service backend — vérifie dans l'onglet **Variables**

## Étape 3 — Configurer les variables d'environnement

Dans ton service backend Railway → onglet **Variables** → ajoute TOUT ce qui est dans ton `/app/backend/.env` local :

```
DB_NAME=mwana_lingala
CORS_ORIGINS=https://mwana-lingala.com,https://www.mwana-lingala.com

# Auth & admin
ADMIN_EMAILS=contact@mwana-lingala.com
SESSION_COOKIE_SECURE=true

# SMTP (Amen.fr)
SMTP_HOST=smtp-fr.securemail.pro
SMTP_PORT=465
SMTP_USER=contact@mwana-lingala.com
SMTP_PASSWORD=<depuis-ton-env-local>
SMTP_FROM_NAME=Mwana Lingala
SMTP_FROM_EMAIL=contact@mwana-lingala.com

# Google OAuth (login + Drive) — COPIE DEPUIS TON .env LOCAL
GOOGLE_CLIENT_ID=<depuis-ton-env-local>
GOOGLE_CLIENT_SECRET=<depuis-ton-env-local>
GOOGLE_DRIVE_CLIENT_ID=<depuis-ton-env-local>
GOOGLE_DRIVE_CLIENT_SECRET=<depuis-ton-env-local>
GOOGLE_DRIVE_REDIRECT_URI=https://hostinger-mwana-lingala.up.railway.app/api/oauth/drive/callback
FRONTEND_URL=https://mwana-lingala.com

# Mammouth API (Claude + Nano Banana image gen)
MAMMOTH_API_KEY=<copie depuis ton .env local>
MAMMOTH_API_URL=https://api.mammouth.ai/v1
MAMMOTH_MODEL=claude-sonnet-4-5

# Mollie paiements (LIVE)
MOLLIE_API_KEY=<copie ta clé LIVE depuis ton .env local>

# Emergent LLM Key (Whisper, TTS)
EMERGENT_LLM_KEY=<copie depuis ton .env local>

# Web Push (VAPID) — copie ces VRAIES valeurs depuis ton .env local
VAPID_PRIVATE_KEY=<depuis-ton-env-local>
VAPID_PUBLIC_KEY=<depuis-ton-env-local>
VAPID_SUBJECT=mailto:contact@mwana-lingala.com

# Chiffrement Fernet
FERNET_KEY=<depuis-ton-env-local>
```

⚠️ **Ne copie pas** `MONGO_URL` depuis ton local (Railway l'injecte tout seul depuis le plugin MongoDB).

## Étape 4 — Déployer + récupérer l'URL

1. Clique **Deploy** → attends 2-5 min (Nixpacks installe Python + pip install)
2. Dans l'onglet **Settings** → **Networking** → **Generate Domain** → Railway te donne une URL du style `https://mwana-lingala-backend-production.up.railway.app`
3. Teste dans un navigateur : `https://<ton-url>.up.railway.app/api/` doit afficher `{"app":"Mwana Lingala","status":"ok"}`

## Étape 5 — Connecter le frontend Hostinger

Édite `/app/frontend/.env.production` :

```
REACT_APP_BACKEND_URL=https://<ton-url>.up.railway.app
```

Commit + push sur GitHub → Hostinger rebuild automatiquement le frontend.

## Étape 6 — Google Console redirect URIs

Dans https://console.cloud.google.com → Credentials → ton OAuth Client → ajoute :

**Authorized redirect URIs :**
- `https://mwana-lingala.com/auth/google` ✅ (déjà fait) — login user
- `https://<ton-url>.up.railway.app/api/oauth/drive/callback` — callback Drive (doit pointer sur Railway car c'est le backend qui reçoit le code)

**Authorized JavaScript origins :**
- `https://mwana-lingala.com`
- `https://<ton-url>.up.railway.app` (optionnel, pour tester direct)

## Étape 7 — Mollie webhook URL

Dans ton Mollie Dashboard → Developers → Webhooks, mets :
`https://<ton-url>.up.railway.app/api/billing/webhook`

(Même logique que le Drive callback : le webhook est côté backend, donc pointe vers Railway.)

## Vérification finale

- [ ] `https://<ton-url>.up.railway.app/api/` → `{"app":"Mwana Lingala","status":"ok"}`
- [ ] `https://mwana-lingala.com/` charge le frontend
- [ ] Ouvre DevTools Console → pas d'erreur 404 `/undefined/api/`
- [ ] `/login` permet de demander un OTP
- [ ] Inscription complète marche
- [ ] Dis-moi « teste la prod » quand c'est en ligne, je lance un test E2E complet.

## Dépannage fréquent

**Build fail Railway** : vérifie que `requirements.txt` est minimal (je l'ai déjà nettoyé de 127 à 22 lignes).

**CORS errors** : vérifie que `CORS_ORIGINS` contient bien `https://mwana-lingala.com` (sans slash final).

**MongoDB connection fail** : vérifie que `DB_NAME=mwana_lingala` et que le plugin Mongo est bien linké au service backend (Railway le fait auto quand les deux sont dans le même projet).

**Cookies non persistés (login cassé)** : déjà géré côté code — `SameSite=None; Secure; HttpOnly` + `withCredentials: true` côté frontend. Les cookies Railway traversent bien vers `mwana-lingala.com`. ✅ Rien à faire.
