# 🚀 ACTIONS OBLIGATOIRES AVANT PRODUCTION

**Projet**: BIZZ'ART Monastir  
**Status actuel**: GO WITH REQUIRED ACTIONS  
**Date**: 20 août 2026

---

## ⚠️ RÉSUMÉ

Le projet est **techniquement prêt** mais nécessite **3 actions obligatoires** avant déploiement production:

| # | Action | Priorité | Bloquant |
|---|--------|----------|----------|
| 1 | Changer JWT_SECRET | 🔴 CRITIQUE | ✅ OUI |
| 2 | Définir NODE_ENV=production | 🟡 REQUIS | ❌ Non |
| 3 | Configurer ALLOWED_ORIGINS | 🟡 REQUIS | ❌ Non |

---

## 🔴 ACTION 1: GÉNÉRER JWT_SECRET FORT (CRITIQUE)

### Pourquoi c'est critique ?
Le JWT_SECRET actuel contient "change-in-production" et est faible. Cela compromet toute la sécurité d'authentification.

### Comment faire ?

#### Sur Windows (PowerShell):
```powershell
# Générer un secret fort (64 caractères random)
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
Write-Host $secret
```

#### Sur Linux/Mac:
```bash
openssl rand -base64 64
```

#### Alternative en ligne:
Utiliser un générateur de mots de passe fort et générer 64+ caractères aléatoires.

### Où l'utiliser ?

**Option A: Fichier .env.production (VPS/PM2)**
```bash
# Copier le template
cp backend/.env.production.template backend/.env.production

# Éditer et remplacer
JWT_SECRET=<votre_secret_généré_ici>
```

**Option B: Plateforme de déploiement (Heroku/Railway/Render)**
```bash
# Heroku
heroku config:set JWT_SECRET=<votre_secret>

# Railway: Via dashboard > Variables
# Render: Via dashboard > Environment
```

⚠️ **IMPORTANT**: Ne committez JAMAIS .env.production dans Git !

---

## 🟡 ACTION 2: DÉFINIR NODE_ENV=production (REQUIS)

### Pourquoi ?
NODE_ENV contrôle le mode de fonctionnement d'Express (gestion erreurs, logs, performance).

### Comment faire ?

**Option A: Via plateforme de déploiement**
```bash
# Heroku
heroku config:set NODE_ENV=production

# Railway/Render: Via dashboard
NODE_ENV=production
```

**Option B: Fichier .env.production (VPS)**
```bash
NODE_ENV=production
```

**Option C: PM2 ecosystem file**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bizzart-backend',
    script: './dist/server.js',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

---

## 🟡 ACTION 3: CONFIGURER ALLOWED_ORIGINS (REQUIS)

### Pourquoi ?
CORS bloquera les requêtes du frontend si l'origine n'est pas autorisée.

### Comment faire ?

Définir la variable avec votre(vos) domaine(s) production:

```bash
ALLOWED_ORIGINS=https://bizzart-monastir.com,https://www.bizzart-monastir.com
```

**Via Heroku:**
```bash
heroku config:set ALLOWED_ORIGINS=https://bizzart-monastir.com,https://www.bizzart-monastir.com
```

**Via fichier .env.production:**
```bash
ALLOWED_ORIGINS=https://bizzart-monastir.com,https://www.bizzart-monastir.com
```

⚠️ **Ne pas inclure http://localhost:4200 en production** (sauf si nécessaire pour tests)

---

## 🟢 ACTIONS RECOMMANDÉES

### 4. Configurer MongoDB Production

**Si vous utilisez MongoDB Atlas:**
1. Créer un cluster production (ou utiliser existant)
2. Créer un utilisateur dédié production
3. Configurer IP Whitelist
4. Obtenir connection string

```bash
MONGODB_URI=mongodb+srv://prod_user:strong_password@cluster.mongodb.net/bizzart
```

**Si vous utilisez MongoDB local/VPS:**
```bash
MONGODB_URI=mongodb://host:27017/bizzart
```

### 5. Configurer Frontend URL

```bash
FRONTEND_URL=https://bizzart-monastir.com
```

### 6. Mettre à jour Admin Password

```bash
ADMIN_PASSWORD=<mot_de_passe_fort_production>
```

---

## ✅ VÉRIFICATION FINALE

Avant de déployer, vérifier que toutes les variables sont définies:

```bash
# Variables CRITIQUES (bloquantes)
✅ JWT_SECRET = secret fort 64+ caractères

# Variables REQUISES
✅ NODE_ENV = production
✅ ALLOWED_ORIGINS = vos domaines production

# Variables IMPORTANTES
✅ MONGODB_URI = URI production
✅ FRONTEND_URL = URL frontend production
✅ CLOUDINARY_* = déjà configurées ✅
```

---

## 🚀 APRÈS CONFIGURATION

Une fois les 3 actions obligatoires complétées:

### Déployer Backend

**VPS/PM2:**
```bash
cd backend
npm ci --production
pm2 start dist/server.js --name bizzart-backend --env production
pm2 save
```

**Heroku:**
```bash
git push heroku main
```

**Railway/Render:**
Push to Git, déploiement automatique

### Déployer Frontend

Déployer le dossier: `frontend/dist/frontend/browser/`

**Netlify/Vercel:**
- Build command: `npm run build`
- Publish directory: `dist/frontend/browser`

**Nginx (VPS):**
```bash
cp -r frontend/dist/frontend/browser/* /var/www/bizzart/
```

### Tester

```bash
# Backend health
curl https://api.votre-domaine.com/health

# Menu API
curl https://api.votre-domaine.com/api/menu/items

# Frontend
# Ouvrir https://votre-domaine.com dans navigateur
```

---

## 📋 CHECKLIST COMPLÈTE

Avant de dire "C'EST DÉPLOYÉ":

- [ ] JWT_SECRET généré et configuré (64+ caractères)
- [ ] NODE_ENV=production défini
- [ ] ALLOWED_ORIGINS défini avec domaines production
- [ ] MONGODB_URI pointe vers base production
- [ ] FRONTEND_URL défini
- [ ] Backend déployé et démarré
- [ ] Frontend déployé
- [ ] API health check: PASS
- [ ] API menu: retourne 114 plats
- [ ] Frontend charge correctement
- [ ] Photos Cloudinary s'affichent
- [ ] Réservation fonctionne
- [ ] Admin peut se connecter

---

## ⚠️ SÉCURITÉ

**NE JAMAIS:**
- ❌ Committer .env.production dans Git
- ❌ Partager JWT_SECRET publiquement
- ❌ Utiliser JWT_SECRET faible/par défaut
- ❌ Exposer MONGODB_URI publiquement
- ❌ Laisser NODE_ENV=development en production

**TOUJOURS:**
- ✅ Utiliser HTTPS en production
- ✅ Générer secrets forts aléatoires
- ✅ Configurer variables via plateforme ou .env.production (non commité)
- ✅ Vérifier .gitignore contient .env*
- ✅ Backuper MongoDB régulièrement

---

## 📞 SUPPORT

**Documentation complète:**
- `FINAL-GO-NOGO-AUDIT.md` - Audit complet
- `QUICK-START-PRODUCTION.md` - Guide déploiement
- `backend/.env.production.template` - Template variables

**Contact:**
Email: bizzart.monastir@gmail.com

---

**Date**: 20 août 2026  
**Verdict audit**: GO WITH REQUIRED ACTIONS  
**Status**: ⏳ En attente des 3 actions obligatoires
