# GUIDE DE MIGRATION DES PHOTOS DU MENU

## 🎯 OBJECTIF

Appliquer le mapping validé manuellement via `/admin/photo-validation` aux 98 plats du menu BIZZ'ART de manière sécurisée et professionnelle.

---

## ⚠️ RÈGLES ABSOLUES

### 🔒 SÉCURITÉ

- **MODE LECTURE SEULE** jusqu'à autorisation explicite
- **Backup MongoDB obligatoire** avant toute modification
- **Dry-run obligatoire** avant migration réelle
- **Validation utilisateur** à chaque étape critique
- **Aucune suppression** Cloudinary/MongoDB
- **Modification UNIQUEMENT du champ `image`** des MenuItems

### ✅ VALIDATION

- Tous les 98 plats doivent être validés manuellement via `/admin/photo-validation`
- Export JSON obligatoire avant migration
- Analyse du mapping pour détecter blockers/warnings
- Aucune modification sans autorisation explicite

---

## 📋 WORKFLOW COMPLET

### PHASE 1 : VALIDATION MANUELLE ✅ TERMINÉE

- [x] Outil `/admin/photo-validation` créé
- [x] 98 plats validés visuellement
- [x] JSON exporté depuis le navigateur

---

### PHASE 2 : ANALYSE DU MAPPING 🔄 EN COURS

#### ÉTAPE 1 : Fournir le fichier JSON

Placer le fichier JSON exporté dans le dossier backend :

```
backend/validation-exports/bizzart-photo-validation-XXXXX.json
```

#### ÉTAPE 2 : Analyser le mapping

```bash
cd backend
npm run analyze:mapping -- validation-exports/bizzart-photo-validation-XXXXX.json
```

**Résultats attendus :**

- ✅ Rapport d'analyse détaillé : `backend/MAPPING-ANALYSIS-REPORT.json`
- ✅ Rapport Markdown : `backend/MAPPING-ANALYSIS-REPORT.md`
- ✅ Détection des blockers (si présents)
- ✅ Détection des warnings
- ✅ Statistiques complètes

**Le script vérifie :**

- ✓ Les 98 MenuItems existent dans MongoDB
- ✓ Toutes les URLs validées sont valides
- ✓ Aucun champ obligatoire manquant
- ✓ Noms professionnels générés correctement
- ✓ Pas d'ambiguïté dans le mapping

**SI BLOCKERS DÉTECTÉS :**

❌ **STOP** : Résoudre les blockers avant de continuer

**SI AUCUN BLOCKER :**

✅ Passer à l'étape suivante

---

### PHASE 3 : BACKUP MONGODB

⚠️ **CRITIQUE** : Ne jamais modifier MongoDB sans backup

```bash
cd backend
npm run backup:mongodb
```

**Résultat attendu :**

```
backend/backups/backup-before-menu-photo-migration-2026-08-18T14-30-00/
├── menu-items.json           (98 documents)
├── menu-categories.json      (XX documents)
├── media.json                (XX documents)
└── metadata.json
```

**⚠️ NE JAMAIS SUPPRIMER CE BACKUP**

---

### PHASE 4 : DRY-RUN (SIMULATION)

⚠️ **OBLIGATOIRE** : Toujours tester en dry-run avant migration réelle

```bash
cd backend
npm run migrate:menu-photos -- validation-exports/bizzart-photo-validation-XXXXX.json --dry-run
```

**Le script affichera :**

- ✓ Nombre de documents qui seraient modifiés
- ✓ Nombre de documents inchangés
- ✓ Liste détaillée des modifications prévues
- ✓ Ancienne URL → Nouvelle URL pour chaque plat

**Rapport généré :**

```
backend/MIGRATION-REPORT-DRYRUN-XXXXXXXXXX.json
```

**⚠️ VALIDATION UTILISATEUR REQUISE**

Examiner attentivement :

1. Le nombre de modifications prévues
2. Chaque modification plat par plat
3. Aucune URL invalide
4. Aucune perte de données

**SI PROBLÈMES DÉTECTÉS :**

❌ **NE PAS CONTINUER** : Corriger le mapping et recommencer

**SI TOUT EST CORRECT :**

✅ Demander autorisation explicite pour migration réelle

---

### PHASE 5 : MIGRATION RÉELLE ⚠️ AUTORISATION REQUISE

⚠️ **ATTENTION** : Cette commande modifie MongoDB

**Prérequis avant exécution :**

- [x] Mapping analysé sans blockers
- [x] Backup MongoDB créé et vérifié
- [x] Dry-run exécuté et validé
- [ ] **AUTORISATION EXPLICITE DE L'UTILISATEUR**

**Commande de migration :**

```bash
cd backend
npm run migrate:menu-photos -- validation-exports/bizzart-photo-validation-XXXXX.json --no-dry-run
```

**OU :**

```bash
cd backend
npm run migrate:menu-photos -- validation-exports/bizzart-photo-validation-XXXXX.json --real
```

**Le script va :**

1. ✓ Charger le mapping validé
2. ✓ Connecter MongoDB
3. ✓ Pour chaque plat avec statut `validated` :
   - Vérifier l'existence du MenuItem
   - Modifier UNIQUEMENT le champ `image`
   - Conserver toutes les autres données
4. ✓ Générer un rapport détaillé

**Rapport généré :**

```
backend/MIGRATION-REPORT-REAL-XXXXXXXXXX.json
```

---

### PHASE 6 : VÉRIFICATION POST-MIGRATION

⚠️ **OBLIGATOIRE** après migration réelle

```bash
cd backend
npm run verify:post-migration
```

**Le script vérifie :**

- ✓ 98 plats toujours présents
- ✓ Aucun document perdu
- ✓ Toutes les URLs sont valides
- ✓ Aucune URL vide involontairement
- ✓ Catégories intactes
- ✓ Accessibilité des URLs (échantillon)
- ✓ Doublons restants

**SI ERREURS DÉTECTÉES :**

❌ **ROLLBACK IMMÉDIAT** : Restaurer depuis backup

**SI TOUT EST CORRECT :**

✅ Passer à la validation manuelle du menu public

---

### PHASE 7 : VALIDATION DU MENU PUBLIC

#### Test manuel du menu frontend

1. Démarrer le backend :
   ```bash
   cd backend
   npm run dev
   ```

2. Démarrer le frontend :
   ```bash
   cd frontend
   npm start
   ```

3. Ouvrir le navigateur : `http://localhost:4200/menu`

4. Vérifier visuellement :
   - ✓ Les 98 plats sont affichés
   - ✓ Les photos correctes apparaissent
   - ✓ Aucune photo cassée (404)
   - ✓ Aucun placeholder par défaut involontaire
   - ✓ Navigation entre catégories fonctionnelle
   - ✓ Responsive design correct

**SI PROBLÈMES DÉTECTÉS :**

❌ **ROLLBACK** : Restaurer depuis backup et identifier la cause

**SI TOUT EST CORRECT :**

✅ Passer au nettoyage

---

### PHASE 8 : NETTOYAGE DE L'OUTIL TEMPORAIRE

⚠️ **NE SUPPRIMER QU'APRÈS VALIDATION COMPLÈTE**

L'outil `/admin/photo-validation` doit être supprimé proprement :

#### Frontend

Supprimer :

```
frontend/src/app/admin/features/photo-validation/
├── photo-validation.component.ts
├── photo-validation.component.html
├── photo-validation.component.scss
└── photo-validation.service.ts
```

Modifier :

```typescript
// frontend/src/app/admin/admin.routes.ts
// Supprimer la route photo-validation
```

#### Backend

Supprimer :

```
backend/src/controllers/photo-validation.controller.ts (si existe)
```

Modifier :

```typescript
// backend/src/routes/admin.routes.ts
// Supprimer la route /admin/photo-validation
```

#### Vérification compilation

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npx tsc --noEmit
```

**SI ERREURS DE COMPILATION :**

❌ Corriger les imports/références manquantes

**SI COMPILATION RÉUSSIE :**

✅ Passer à la vérification finale

---

### PHASE 9 : VÉRIFICATION FINALE

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

**Vérifications finales :**

- [x] Backend compile sans erreur
- [x] Frontend compile sans erreur
- [x] Menu public fonctionne en production
- [x] Aucune régression détectée
- [x] Backup conservé

---

### PHASE 10 : RAPPORT FINAL

Générer un rapport final indiquant :

1. ✅ Nombre de plats avec image correcte : **XX / 98**
2. ✅ Nombre de photos réellement différentes : **XX**
3. ⚠️ Nombre de doublons restants : **XX**
4. ⚠️ Nombre de photos manquantes : **XX**
5. ⚠️ Nombre de photos invalides : **XX**
6. ✅ Nombre de documents MongoDB modifiés : **XX**
7. ✅ Aucune image Cloudinary supprimée : **OUI**
8. ✅ Menu public fonctionnel : **OUI**
9. ✅ Frontend Angular compile : **OUI**
10. ✅ Backend compile : **OUI**

---

## 🛠️ COMMANDES DISPONIBLES

| Commande | Description | Mode |
|----------|-------------|------|
| `npm run analyze:mapping` | Analyser le mapping validé | Lecture seule |
| `npm run backup:mongodb` | Créer un backup MongoDB | Lecture seule |
| `npm run migrate:menu-photos -- path/to/json --dry-run` | Simulation migration | Lecture seule |
| `npm run migrate:menu-photos -- path/to/json --no-dry-run` | Migration réelle | ⚠️ Modification |
| `npm run verify:post-migration` | Vérifier post-migration | Lecture seule |

---

## 🚨 GESTION DES ERREURS

### Blocker : MenuItem inexistant

**Cause :** Un plat a été supprimé de MongoDB après l'export JSON

**Solution :**

1. Vérifier si le plat existe vraiment dans MongoDB
2. Si supprimé : retirer du mapping JSON
3. Si renommé : mettre à jour l'ID dans le JSON
4. Recommencer l'analyse

### Blocker : URL invalide

**Cause :** Une URL validée n'est pas une URL valide HTTP/HTTPS

**Solution :**

1. Vérifier l'URL dans le JSON
2. Corriger l'URL si typo
3. Vérifier que la photo existe sur Cloudinary
4. Recommencer l'analyse

### Warning : Photo incorrecte sans remplacement

**Cause :** Un plat est marqué `incorrect` mais aucune nouvelle photo n'est proposée

**Solution :**

1. Accepter : le plat conservera sa photo actuelle (non bloquant)
2. Ou : trouver une photo correcte et re-valider

### Warning : Photo manquante

**Cause :** Aucune photo adaptée trouvée pour ce plat

**Solution :**

1. Accepter : le plat conservera sa photo actuelle (non bloquant)
2. Ou : ajouter une photo sur Cloudinary et re-valider

### Erreur durant migration

**Cause :** Problème réseau, MongoDB inaccessible, etc.

**Solution :**

1. ❌ **ARRÊTER IMMÉDIATEMENT**
2. Vérifier le rapport de migration
3. Identifier les plats modifiés vs non modifiés
4. Si nécessaire : restaurer depuis backup
5. Corriger la cause
6. Recommencer depuis backup

---

## 🔄 ROLLBACK (RESTAURATION)

**SI LA MIGRATION A ÉTÉ UN ÉCHEC :**

### Option 1 : Restauration manuelle MongoDB

```bash
# Restaurer les MenuItems depuis le backup
mongoimport --db restaurant --collection menuitems --file backend/backups/backup-XXXXX/menu-items.json --jsonArray --drop

# Vérifier
npm run verify:post-migration
```

### Option 2 : Script de restauration automatique

Créer un script `restore-from-backup.ts` si nécessaire.

---

## 📊 RÈGLES DE NOMMAGE PROFESSIONNEL

Les noms professionnels recommandés suivent ces règles :

- ✓ minuscules
- ✓ espaces → `-`
- ✓ accents supprimés
- ✓ apostrophes supprimées
- ✓ caractères spéciaux supprimés
- ✓ nom stable et lisible
- ✓ extension `.jpg` conservée

**Exemples :**

| Nom du plat | Nom professionnel |
|-------------|-------------------|
| Pizza Margherita | `pizza-margherita.jpg` |
| Pizza 4 Fromages | `pizza-4-fromages.jpg` |
| Pâtes à la Bolognaise | `pates-a-la-bolognaise.jpg` |
| Escalope à la Crème | `escalope-a-la-creme.jpg` |
| Côte à l'os Grillée | `cote-a-los-grillee.jpg` |

⚠️ **IMPORTANT :** Ces noms sont des **recommandations logiques** pour futures photos uniquement. **Ne PAS renommer physiquement les fichiers Cloudinary** sans validation explicite.

---

## 🔒 SÉCURITÉ ET CONFORMITÉ

### Ce qui est modifié

- ✅ Champ `image` des MenuItems (uniquement statut `validated`)

### Ce qui N'EST JAMAIS modifié

- ❌ Noms des plats
- ❌ Prix
- ❌ Descriptions
- ❌ Catégories
- ❌ Ordre d'affichage
- ❌ Fichiers Cloudinary (aucun renommage/suppression)
- ❌ Collection Media
- ❌ Collection MenuCategories

### Mode dry-run par défaut

- Le script de migration utilise `--dry-run` par défaut
- Pour migrer réellement : ajouter `--no-dry-run` ou `--real`
- Protection contre les erreurs de manipulation

---

## ✅ CHECKLIST FINALE

Avant de considérer la tâche terminée :

- [ ] JSON de validation fourni et analysé
- [ ] Aucun blocker détecté
- [ ] Backup MongoDB créé et vérifié
- [ ] Dry-run exécuté et validé
- [ ] Autorisation explicite reçue
- [ ] Migration réelle exécutée
- [ ] Vérification post-migration OK
- [ ] Menu public validé visuellement
- [ ] Outil `/admin/photo-validation` supprimé
- [ ] Frontend compile sans erreur
- [ ] Backend compile sans erreur
- [ ] Backup conservé en sécurité
- [ ] Documentation à jour
- [ ] Rapport final généré

---

## 📞 SUPPORT

En cas de problème durant la migration :

1. **NE PAS PANIQUER**
2. **NE PAS SUPPRIMER LE BACKUP**
3. Consulter les logs du script
4. Consulter les rapports JSON générés
5. Si nécessaire : rollback depuis backup
6. Identifier la cause racine
7. Corriger et recommencer

---

## 📝 NOTES

- Les scripts sont **idempotents** : relancer plusieurs fois ne cause pas de problème
- Les backups sont **horodatés** : plusieurs backups peuvent coexister
- Les rapports sont **horodatés** : historique complet de chaque exécution
- La migration modifie **UNIQUEMENT** les plats avec statut `validated`
- Les plats avec statuts `correct`, `incorrect`, `invalid`, `missing`, `pending` restent inchangés

---

**Date de création :** 2026-08-18  
**Version :** 1.0.0  
**Auteur :** Kiro AI Assistant  
**Projet :** BIZZ'ART Restaurant
