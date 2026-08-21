# 🚀 INSTRUCTIONS RAPIDES : MIGRATION DES PHOTOS DU MENU

## 📍 VOUS ÊTES ICI : PHASE 2

La validation manuelle des 98 plats via `/admin/photo-validation` est **terminée**.

---

## 🔄 PROCHAINES ÉTAPES

### ÉTAPE 1 : Fournir le fichier JSON exporté

1. Récupérer le fichier JSON exporté depuis l'outil `/admin/photo-validation` (localStorage navigateur)
2. Le placer dans : `backend/validation-exports/`
3. Nom du fichier : `bizzart-photo-validation-XXXXX.json`

### ÉTAPE 2 : Analyser le mapping validé

```bash
cd backend
npm run analyze:mapping -- validation-exports/bizzart-photo-validation-XXXXX.json
```

**Résultats :**

- ✅ `backend/MAPPING-ANALYSIS-REPORT.json` (rapport détaillé)
- ✅ `backend/MAPPING-ANALYSIS-REPORT.md` (rapport lisible)

**Si blockers détectés :** ❌ Résoudre avant de continuer

**Si aucun blocker :** ✅ Continuer

### ÉTAPE 3 : Créer un backup MongoDB

```bash
cd backend
npm run backup:mongodb
```

**Résultat :**

```
backend/backups/backup-before-menu-photo-migration-YYYY-MM-DDTHH-MM-SS/
├── menu-items.json
├── menu-categories.json
├── media.json
└── metadata.json
```

⚠️ **NE JAMAIS SUPPRIMER CE BACKUP**

### ÉTAPE 4 : Dry-run (simulation)

```bash
cd backend
npm run migrate:menu-photos -- validation-exports/bizzart-photo-validation-XXXXX.json --dry-run
```

**Vérifier attentivement :**

- Nombre de modifications prévues
- Chaque modification ancienne → nouvelle URL
- Aucune erreur

**Si problèmes :** ❌ Corriger et recommencer

**Si tout OK :** ✅ Demander autorisation pour migration réelle

### ÉTAPE 5 : Migration réelle ⚠️ AUTORISATION REQUISE

⚠️ **CETTE COMMANDE MODIFIE MONGODB**

```bash
cd backend
npm run migrate:menu-photos -- validation-exports/bizzart-photo-validation-XXXXX.json --no-dry-run
```

### ÉTAPE 6 : Vérifier la migration

```bash
cd backend
npm run verify:post-migration
```

**Si erreurs :** ❌ Rollback depuis backup

**Si OK :** ✅ Tester le menu public

### ÉTAPE 7 : Tester le menu public

1. Démarrer backend : `cd backend && npm run dev`
2. Démarrer frontend : `cd frontend && npm start`
3. Ouvrir : `http://localhost:4200/menu`
4. Vérifier visuellement les 98 plats

**Si problèmes :** ❌ Rollback

**Si OK :** ✅ Supprimer l'outil temporaire

### ÉTAPE 8 : Supprimer `/admin/photo-validation`

- Supprimer les composants frontend
- Supprimer les routes admin
- Vérifier compilation

### ÉTAPE 9 : Compilation finale

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### ÉTAPE 10 : Rapport final

Générer et valider le rapport final de livraison.

---

## 📚 DOCUMENTATION COMPLÈTE

Consulter : `backend/GUIDE-MIGRATION-MENU-PHOTOS.md`

---

## 🛠️ COMMANDES DISPONIBLES

| Commande | Description |
|----------|-------------|
| `npm run analyze:mapping` | Analyser le mapping validé |
| `npm run backup:mongodb` | Créer backup MongoDB |
| `npm run migrate:menu-photos -- path --dry-run` | Simulation |
| `npm run migrate:menu-photos -- path --no-dry-run` | Migration réelle |
| `npm run verify:post-migration` | Vérifier post-migration |

---

## 🔒 RÈGLES DE SÉCURITÉ

- ✅ Backup obligatoire avant migration
- ✅ Dry-run obligatoire avant migration réelle
- ✅ Mode lecture seule jusqu'à autorisation
- ✅ Modification UNIQUEMENT du champ `image`
- ❌ Aucune suppression Cloudinary
- ❌ Aucune modification catégories/prix

---

## 📍 STATUT ACTUEL

- [x] Phase 1 : Validation manuelle des 98 plats ✅ TERMINÉE
- [ ] Phase 2 : Analyse du mapping ⏳ EN ATTENTE DU JSON
- [ ] Phase 3 : Backup MongoDB
- [ ] Phase 4 : Dry-run
- [ ] Phase 5 : Migration réelle
- [ ] Phase 6 : Vérification
- [ ] Phase 7 : Test menu public
- [ ] Phase 8 : Nettoyage
- [ ] Phase 9 : Compilation finale
- [ ] Phase 10 : Rapport final

---

**Prochaine action attendue :** Fournir le fichier JSON exporté
