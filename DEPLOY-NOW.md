# 🚀 BIZZ'ART — DEPLOY NOW

**Status**: ✅ **GO FOR PRODUCTION**  
**Date**: 20 août 2026, 10:30

---

## ✅ PRÊT À DÉPLOYER

Le projet BIZZ'ART a passé avec succès le **PRODUCTION GATE**.

### Ce qui est prêt ✅
- Backend compilé (0 erreur)
- Frontend compilé (clean)
- JWT_SECRET fort généré
- NODE_ENV=production configuré
- CORS production configuré
- 114 plats, 98 photos validées
- Cloudinary configuré
- Sécurité implémentée

---

## 🎯 DÉPLOIEMENT EN 3 ÉTAPES

### Étape 1: Configurer MongoDB Production

#### Option A: MongoDB Atlas (Recommandé - Gratuit jusqu'à 512MB)

1. Aller sur [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un compte gratuit
3. Créer un cluster (M0 Free)
4. Créer un utilisateur database
5. Whitelister votre IP (ou 0.0.0.0/0 pour tous)
6. Obtenir la connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/bizzart
   ```

#### Option B: MongoDB Local/VPS

Si vous déployez sur un VPS avec MongoDB installé:
```bash
mongodb://your-server-ip:27017/bizzart
```

**⚠️ IMPORTANT**: 
- Votre base locale actuelle contient déjà les 114 plats validés
- Vous devez soit:
  - Exporter votre base locale et l'importer sur Atlas
  - Ou utiliser votre base locale si déploiement VPS

#### Exporter/Importer la base (si Atlas)

```bash
# Export local
mongodump --uri="mongodb://localhost:27017/bizzart" --out=./bizzart-backup

# Import sur Atlas
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/bizzart" ./bizzart-backup/bizzart
```

---

### Étape 2: Déployer Backend

#### Option A: Railway (Recommandé - Simple)

```bash
# 1. Créer compte sur railway.app
# 2. New Project > Deploy from GitHub
# 3. Connecter votre repo
# 4. Root directory: backend
# 5. Configurer variables:

NODE_ENV=production
JWT_SECRET=<copier depuis backend/.env.production>
MONGODB_URI=<votre_uri_mongodb>
CLOUDINARY_CLOUD_NAME=gmpztbom
CLOUDINARY_API_KEY=435256423488726
CLOUDINARY_API_SECRET=<set-in-environment>
ALLOWED_ORIGINS=<votre_domaine_frontend>
FRONTEND_URL=<votre_domaine_frontend>

# 6. Deploy automatique !
```

**Railway vous donnera une URL**: `https://votre-app.railway.app`

#### Option B: Render (Alternative Gratuite)

```bash
# 1. Créer compte sur render.com
# 2. New > Web Service
# 3. Connect repository
# 4. Root directory: backend
# 5. Build command: npm install && npm run build
# 6. Start command: node dist/server.js
# 7. Configurer les mêmes variables d'environnement
```

#### Option C: VPS avec PM2

```bash
# Sur votre serveur:
cd backend
npm ci --production
npm run build

# Copier .env.production et modifier MONGODB_URI
# Puis:
pm2 start dist/server.js --name bizzart-backend
pm2 save
pm2 startup
```

---

### Étape 3: Déployer Frontend

#### Option A: Netlify (Recommandé - Gratuit)

```bash
# 1. Créer compte sur netlify.com
# 2. New site from Git
# 3. Connect repo
# 4. Build settings:
#    - Base directory: frontend
#    - Build command: npm run build
#    - Publish directory: dist/frontend/browser
# 5. Deploy!
```

**Important**: Après déploiement, Netlify vous donne un domaine (ex: `bizzart-monastir.netlify.app`)

**Mettre à jour le backend**:
```bash
# Sur Railway/Render, mettre à jour:
ALLOWED_ORIGINS=https://bizzart-monastir.netlify.app
FRONTEND_URL=https://bizzart-monastir.netlify.app
```

#### Option B: Vercel (Alternative)

```bash
# 1. Installer Vercel CLI:
npm i -g vercel

# 2. Dans le dossier frontend:
cd frontend
vercel

# Suivre les instructions
# Build directory: dist/frontend/browser
```

#### Option C: Nginx (VPS)

```bash
# Copier le build:
scp -r frontend/dist/frontend/browser/* user@server:/var/www/bizzart/

# Config Nginx:
server {
    listen 80;
    server_name bizzart-monastir.com;
    root /var/www/bizzart;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# SSL avec Let's Encrypt:
certbot --nginx -d bizzart-monastir.com
```

---

## 🔐 CONFIGURATION FINALE

Après avoir déployé frontend ET backend:

### 1. Mettre à jour les URLs

Dans votre plateforme backend (Railway/Render):
```bash
ALLOWED_ORIGINS=https://votre-frontend.netlify.app
FRONTEND_URL=https://votre-frontend.netlify.app
```

### 2. Vérifier le Frontend

Éditer `frontend/src/environments/environment.prod.ts` (si nécessaire):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://votre-backend.railway.app/api',
  apiBaseUrl: 'https://votre-backend.railway.app',
};
```

Puis rebuild et redeploy le frontend.

---

## ✅ VÉRIFICATION POST-DÉPLOIEMENT

### Backend

```bash
# Health check
curl https://votre-backend.railway.app/health

# Menu
curl https://votre-backend.railway.app/api/menu/items
# Doit retourner 114 plats
```

### Frontend

Ouvrir dans un navigateur:
```
https://votre-frontend.netlify.app
```

Vérifier:
- ✅ Homepage charge
- ✅ Menu affiche 114 plats
- ✅ Photos Cloudinary s'affichent
- ✅ Pas d'erreur CORS dans la console
- ✅ Réservation fonctionne
- ✅ Admin peut se connecter

---

## 🚨 TROUBLESHOOTING

### Erreur CORS

**Symptôme**: Erreur dans console "blocked by CORS"

**Solution**:
```bash
# Sur backend (Railway/Render), vérifier:
ALLOWED_ORIGINS=https://votre-exact-domaine.netlify.app
# Pas de / à la fin !
# Redéployer le backend
```

### Photos ne chargent pas

**Vérifier**:
1. URLs Cloudinary dans MongoDB sont correctes
2. CLOUDINARY_* variables configurées sur backend
3. Ouvrir une URL image directement dans navigateur

### Backend ne démarre pas

**Vérifier logs** (Railway/Render dashboard):
- MongoDB URI valide ?
- Toutes les variables d'environnement configurées ?
- Build successful ?

### 404 sur routes Angular

**Configurer SPA fallback**:

**Netlify**: Créer `frontend/public/_redirects`:
```
/*    /index.html   200
```

**Vercel**: Créer `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 RÉCAPITULATIF DÉPLOIEMENT

### Ce que vous devez avoir

1. ✅ Compte MongoDB Atlas (ou base locale accessible)
2. ✅ Compte Railway ou Render (backend)
3. ✅ Compte Netlify ou Vercel (frontend)
4. ✅ Variables d'environnement configurées
5. ✅ Les 114 plats importés dans MongoDB production

### URLs finales

```
Backend:  https://bizzart-backend.railway.app
Frontend: https://bizzart-monastir.netlify.app
MongoDB:  mongodb+srv://cluster.mongodb.net/bizzart
```

---

## 🎉 C'EST PARTI !

Le projet est **techniquement prêt**. Il ne reste plus qu'à:

1. Choisir vos plateformes de déploiement
2. Configurer MongoDB production
3. Déployer backend
4. Déployer frontend
5. Connecter les deux
6. Tester !

**Temps estimé**: 30-45 minutes si première fois, 15 minutes si expérimenté.

---

## 📞 RESSOURCES

**Documentation**:
- Railway: https://docs.railway.app/
- Render: https://render.com/docs
- Netlify: https://docs.netlify.com/
- MongoDB Atlas: https://docs.atlas.mongodb.com/

**Support**:
- Email: bizzart.monastir@gmail.com

---

**Date**: 20 août 2026  
**Verdict**: ✅ GO FOR PRODUCTION  
**Next**: Choisir vos plateformes et déployer ! 🚀
