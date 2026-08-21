# 🔓 CONFIGURATION WHITELIST MONGODB ATLAS

## Votre IP publique actuelle
```
196.225.77.167
```

## Étapes de configuration

### 1. Ouvrir MongoDB Atlas
URL: https://cloud.mongodb.com

### 2. Connexion
Utilisez vos identifiants MongoDB Atlas

### 3. Sélectionner le cluster
- Cluster: `cluster0.fhtq6yf.mongodb.net`
- Database: `bizzart`

### 4. Menu Security
- Cliquer sur `Security` dans le menu de gauche
- Sélectionner `Network Access`

### 5. Ajouter votre IP
- Cliquer sur le bouton `+ ADD IP ADDRESS`

### 6. Configuration

**Option A (Recommandée - Production-safe):**
```
IP Address: 196.225.77.167/32
Comment: IP locale développement - audit forensique
```

**Option B (Développement - Moins sécurisée):**
```
IP Address: 0.0.0.0/0
Comment: Allow access from anywhere (DEV ONLY)
```

⚠️ **Note**: L'option B (0.0.0.0/0) autorise l'accès depuis n'importe quelle IP. 
À utiliser uniquement en environnement de développement.

### 7. Confirmer
- Cliquer sur `Confirm`
- Attendre 1-2 minutes que la whitelist soit active

### 8. Vérification
La whitelist devrait apparaître dans la liste avec le statut `Active`

---

## Après configuration

Une fois la whitelist active:
1. Retourner dans le terminal
2. Appuyer sur ENTRÉE
3. L'audit forensique des index se lancera automatiquement

---

## Troubleshooting

### Si l'audit échoue encore après whitelist:
- Vérifier que le statut est bien `Active` (pas `Pending`)
- Attendre 2-3 minutes supplémentaires
- Vérifier que l'IP entrée est exactement: `196.225.77.167`
- Si votre IP change (réseau mobile, VPN), re-détecter avec: `https://api.ipify.org`

### Commande pour re-détecter votre IP:
```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

### Commande pour relancer l'audit manuellement:
```powershell
npm run audit:indexes
```

---

**Dernière mise à jour:** 2026-08-21
**Cluster:** cluster0.fhtq6yf.mongodb.net
**Database:** bizzart
