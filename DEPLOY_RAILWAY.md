# 🚂 Déploiement Railway — Backend Mwana Lingala

## ⚠️ Sécurité d'abord
Les vraies valeurs des variables d'environnement ne doivent **JAMAIS** être dans Git.
Elles sont dans ton fichier local `/app/backend/.env` uniquement.
Ton agent Emergent a préparé un bloc prêt-à-coller dans `/tmp/railway_vars.txt` (hors repo Git).

## Étape 1 — Créer le projet Railway
1. https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Sélectionne le repo `THESUSTAIN/Mwana-lingala`
3. Root directory : **`backend/`**
4. Railway détecte Python via `Procfile` + `railway.json` + `nixpacks.toml` déjà en place.

## Étape 2 — Ajouter MongoDB managée
1. Dans le projet Railway → **+ New** → **Database** → **Add MongoDB**
2. Railway crée une instance Mongo gratuite (512 Mo)
3. La variable `MONGO_URL` est auto-injectée dans ton service backend.

## Étape 3 — Coller les variables d'environnement
1. Ouvre ton service backend Railway → onglet **Variables**
2. Clique **Raw Editor** (ou "+ New Variable" → bouton "Import from .env")
3. Ouvre le fichier `/tmp/railway_vars.txt` fourni par ton agent
4. Copie tout le contenu
5. Colle dans Railway Raw Editor → **Update Variables**

⚠️ **Ne colle PAS** `MONGO_URL` (déjà injecté par Railway) ni `EMERGENT_AUTH_URL` (supprimé du code).

## Étape 4 — Générer l'URL publique
1. Service backend → **Settings** → **Networking** → **Generate Domain**
2. Railway te donne : `https://hostinger-mwana-lingala.up.railway.app` (déjà configuré)
3. Vérifie dans un navigateur : `https://hostinger-mwana-lingala.up.railway.app/api/` doit renvoyer `{"app":"Mwana Lingala","status":"ok"}`

## Étape 5 — Frontend pointe déjà vers Railway
Le fichier `/app/frontend/.env.production` contient déjà :
```
REACT_APP_BACKEND_URL=https://hostinger-mwana-lingala.up.railway.app
```
Push sur GitHub → Hostinger rebuild → le frontend appelle Railway.

## Étape 6 — Google Console
Ajoute dans https://console.cloud.google.com → Credentials → OAuth Client :

**Authorized redirect URIs :**
- `https://mwana-lingala.com/auth/google` (login user — déjà fait)
- `https://hostinger-mwana-lingala.up.railway.app/api/oauth/drive/callback` (callback Drive)

**Authorized JavaScript origins :**
- `https://mwana-lingala.com`

## Étape 7 — Mollie webhook
Mollie Dashboard → Developers → Webhooks :
- URL : `https://hostinger-mwana-lingala.up.railway.app/api/billing/webhook`

## Vérification finale
- [ ] `https://hostinger-mwana-lingala.up.railway.app/api/` → JSON OK
- [ ] `https://mwana-lingala.com/` charge sans 404 `/undefined/api/`
- [ ] `/login` permet OTP + Google
- [ ] Dis-moi « teste la prod » → je lance un E2E complet

## Dépannage fréquent
- **Build fail** : vérifier que le Root Directory Railway est bien `backend/`
- **CORS errors** : `CORS_ORIGINS=https://mwana-lingala.com,https://www.mwana-lingala.com` (pas de slash final, pas d'espaces)
- **MongoDB connect fail** : vérifier que le plugin MongoDB et le service backend sont dans le MÊME projet Railway
- **Cookies / login cassé** : déjà géré côté code (`SameSite=None; Secure` + `withCredentials`), rien à faire
