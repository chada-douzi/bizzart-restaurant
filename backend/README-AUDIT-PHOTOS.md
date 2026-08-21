# 📸 AUDIT VISUEL DES PHOTOS MENU BIZZ'ART

## 🎯 MISSION

Établir un inventaire fiable des photos des 98 plats du menu et identifier les plats nécessitant de nouvelles photos.

---

## 📊 SITUATION ACTUELLE

### Base de données

- ✅ **98 plats** (MenuItems) dans MongoDB
- ✅ **11 catégories** (MenuCategories)
- ✅ **56 médias** (Media) dans Cloudinary
- ✅ **Backup complet** effectué : `backup-before-menu-photo-migration-2026-08-18T21-39-09`

### Photos

- 🔵 **35 photos uniques** utilisées par les 98 plats
- 🔴 **29 photos** utilisées par plusieurs plats (doublons)
- ⚠️ Certaines photos utilisées par **jusqu'à 6 plats différents**

---

## 📁 FICHIERS DISPONIBLES

### Interface de validation

```
backend/AUDIT-VISUEL-98-PLATS.html
```

**Interface HTML interactive** pour valider les 35 photos uniques.

**Mode principal** : Validation par photos (pas par plats).

### Données brutes

```
backend/AUDIT-VISUEL-98-PLATS.json
```

Données JSON des 98 plats avec leurs photos actuelles.

### Photos téléchargées

```
backend/audit-photos/
```

Les 35 photos uniques téléchargées depuis Cloudinary.

Nommées : `photo_1_*.jpg` à `photo_35_*.jpg`

### Guide complet

```
backend/GUIDE-VALIDATION-PHOTOS.md
```

Guide détaillé pas-à-pas pour effectuer la validation.

### Export des validations

```
backend/validation-exports/
```

Dossier où exporter les validations depuis l'interface HTML.

---

## 🚀 PROCESSUS COMPLET

### ÉTAPE 1 : Validation visuelle (VOUS)

```powershell
# Ouvrir l'interface
start backend/AUDIT-VISUEL-98-PLATS.html

# Pour chaque photo (35 total) :
# 1. Identifier le type de plat
# 2. Déterminer l'origine (vraie photo Bizz'Art ou pas)
# 3. Cocher les plats correspondant réellement
# 4. Valider

# Exporter le JSON final
# Sauvegarder dans : validation-exports/bizzart-photo-validation-YYYY-MM-DD.json
```

### ÉTAPE 2 : Génération des rapports (AUTOMATIQUE)

```powershell
cd backend
npm run audit:final-reports
```

**Génère automatiquement** :

1. `AUDIT-VISUEL-FINAL-BIZZART-[timestamp].json`
   - Rapport complet JSON

2. `INVENTAIRE-PHOTOS-MANQUANTES-BIZZART-[timestamp].csv`
   - **Liste CSV des plats à photographier**

3. `RAPPORT-DOUBLONS-BIZZART-[timestamp].json`
   - Analyse des doublons

4. `RAPPORT-AUDIT-BIZZART-[timestamp].md`
   - Rapport Markdown lisible

### ÉTAPE 3 : Validation finale (VOUS)

1. Consulter les rapports générés
2. Vérifier l'inventaire CSV
3. Prendre les nouvelles photos nécessaires
4. **NE PAS lancer la migration encore**

### ÉTAPE 4 : Migration (PLUS TARD)

⚠️ **UNIQUEMENT après votre validation explicite**

```powershell
# Analyser le mapping final
npm run analyze:mapping

# Vérifier le backup
ls backups/

# Lancer la migration
npm run migrate:menu-photos

# Vérifier post-migration
npm run verify:post-migration
```

---

## 🔒 SÉCURITÉ

### ✅ Audit en lecture seule

L'audit **NE MODIFIE PAS** :
- MongoDB
- Cloudinary
- MenuItems
- Media

### ✅ Backup effectué

Un backup complet a été effectué **AVANT** l'audit :

```
backend/backups/backup-before-menu-photo-migration-2026-08-18T21-39-09/
```

Contient :
- 98 MenuItems
- 11 MenuCategories
- 56 Media

---

## 📋 FORMAT DE VALIDATION

L'interface HTML génère un JSON au format :

```json
{
  "photo_1": {
    "photoType": "Pizza",
    "origin": "Vraie photo Bizz'Art",
    "matchingPlats": ["6a845a7a2876405dd5375d1f", "6a845a7a2876405dd5375d22"],
    "validated": true,
    "validatedAt": "2026-08-18T22:00:00.000Z",
    "comment": "Photo réelle - Pizza Margherita"
  },
  "photo_2": {
    ...
  }
}
```

**Champs obligatoires** :
- `photoType` : type de plat
- `origin` : origine de la photo
- `matchingPlats` : IDs des plats correspondant réellement
- `validated` : booléen
- `validatedAt` : timestamp ISO8601

**Champs facultatifs** :
- `comment` : commentaires additionnels

---

## 📊 CLASSIFICATION FINALE DES PLATS

Chaque plat sera classifié dans **l'une de ces 5 catégories** :

### 1. ✅ PHOTO_REELLE_BIZZART_CORRECTE

Photo validée comme vraie photo Bizz'Art ET correspondant au plat.

**Action** : Aucune - photo correcte

### 2. ⚠️ PHOTO_REELLE_BIZZART_MAUVAIS_PLAT

Photo validée comme vraie photo Bizz'Art MAIS associée au mauvais plat.

**Action** : Réassigner la photo au bon plat

### 3. 📦 PHOTO_STOCK_GENERIQUE

Photo générique ou stock (pas du restaurant).

**Action** : Photographier le plat réel

### 4. ❓ PHOTO_INCERTAINE

Origine de la photo incertaine.

**Action** : Photographier le plat pour avoir une photo certaine

### 5. ❌ PHOTO_MANQUANTE

Aucune photo validée pour ce plat.

**Action** : Photographier le plat

---

## 🎯 OBJECTIF FINAL

À la fin du processus, vous aurez :

✅ Un **inventaire complet** des plats à photographier  
✅ Une **classification fiable** des 98 plats  
✅ Une **analyse des doublons** problématiques  
✅ Des **rapports professionnels** pour la migration  
✅ La certitude qu'**aucune modification** n'a été faite en production  

---

## 📞 COMMANDES DISPONIBLES

```bash
# Génération de l'audit initial (déjà fait)
npm run audit:visual

# Génération des rapports finaux (après validation)
npm run audit:final-reports

# Analyse du mapping (avant migration)
npm run analyze:mapping

# Backup MongoDB (déjà fait)
npm run backup:mongodb

# Migration (UNIQUEMENT après validation finale)
npm run migrate:menu-photos

# Vérification post-migration
npm run verify:post-migration
```

---

## ⚠️ RÈGLES ABSOLUES

### ✅ À FAIRE

- Être honnête sur l'origine des photos
- Cocher UNIQUEMENT les plats qui correspondent réellement
- Valider les 35 photos avant de générer les rapports
- Consulter tous les rapports avant la migration

### ❌ NE JAMAIS FAIRE

- Déclarer "Vraie photo Bizz'Art" sans certitude
- Cocher tous les plats par défaut
- Lancer la migration sans validation finale
- Modifier manuellement MongoDB ou Cloudinary pendant l'audit

---

## 📅 STATUT ACTUEL

- [x] Backup MongoDB effectué
- [x] Audit technique généré
- [x] 35 photos téléchargées
- [x] Interface HTML créée
- [x] Script de rapports finaux créé
- [ ] **VALIDATION VISUELLE (EN COURS)**
- [ ] Rapports finaux générés
- [ ] Nouvelles photos prises
- [ ] Migration effectuée

---

**Date de dernière mise à jour** : 2026-08-18  
**Version** : 2.0  
**Statut** : ⏳ En attente de validation visuelle humaine
