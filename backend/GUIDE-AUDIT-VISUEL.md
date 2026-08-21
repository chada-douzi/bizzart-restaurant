# 🔍 GUIDE D'UTILISATION — AUDIT VISUEL DES PHOTOS BIZZ'ART

**Date** : 18 août 2026  
**Mode** : STRICTEMENT LECTURE SEULE  
**Objectif** : Déterminer visuellement quelles photos correspondent réellement aux plats  

---

## ✅ AUDIT TERMINÉ

L'audit technique est **TERMINÉ** avec succès :

| Élément | Résultat |
|---------|----------|
| **Plats analysés** | 98 |
| **Photos téléchargées** | 35/35 ✅ |
| **Doublons détectés** | 29 |
| **MongoDB** | ✅ Aucune modification |
| **Cloudinary** | ✅ Aucune modification |

---

## 📋 FICHIERS GÉNÉRÉS

### 1. Rapport HTML Interactif
**Chemin** : `backend/AUDIT-VISUEL-98-PLATS.html`

C'est le **fichier principal** pour l'audit visuel. Il contient :
- Interface web interactive
- Les 98 plats avec leurs photos
- Formulaires de classification
- Filtres par catégorie
- Analyse des doublons
- Sauvegarde automatique de la progression
- Export des résultats

### 2. Photos téléchargées
**Dossier** : `backend/audit-photos/`

35 photos uniques téléchargées depuis Cloudinary, prêtes pour analyse visuelle.

### 3. Rapport JSON
**Chemin** : `backend/AUDIT-VISUEL-98-PLATS.json`

Données brutes pour analyse programmatique.

---

## 🚀 COMMENT UTILISER LE RAPPORT HTML

### ÉTAPE 1 : Ouvrir le rapport

1. Aller dans le dossier :  
   `C:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant\backend\`

2. Double-cliquer sur :  
   **`AUDIT-VISUEL-98-PLATS.html`**

3. Le rapport s'ouvre dans votre navigateur par défaut

---

### ÉTAPE 2 : Comprendre l'interface

#### Onglet "📋 Liste des Plats"

**Tableau des 98 plats** avec :
- Numéro
- Nom du plat (FR, AR, EN)
- Catégorie
- **Photo** (cliquer pour agrandir)
- **Classification** (menu déroulant)
- **Confiance** (élevée, moyenne, faible)
- **Notes** (commentaires libres)

#### Filtres disponibles
- **Par catégorie** : Pâtes, Pizzas, Volailles, etc.
- **Par classification** : Non classifié, Match réel, Stock/Générique, etc.
- **Recherche** : Rechercher un plat par nom

#### Onglet "🔁 Doublons"

Liste des **29 URLs utilisées plusieurs fois** avec :
- Photo concernée
- Nombre d'utilisations
- Liste des plats partageant cette photo
- Verdict automatique (Critique, Suspect, Acceptable)

#### Onglet "💾 Export"

Exporter les résultats en JSON ou CSV une fois la classification terminée.

---

### ÉTAPE 3 : Classifier chaque plat

Pour **chaque plat**, examiner visuellement la photo et choisir **une classification** :

#### ✅ MATCH RÉEL BIZZ'ART
La photo correspond visuellement au plat **ET** semble être une vraie photo du restaurant.

**Exemple** :
- Pizza Margherita → photo claire d'une Margherita
- Pâtes Bolognaise → photo de pâtes avec sauce rouge

**Confiance** : Élevée

---

#### 🟢 MATCH PROBABLE
La photo semble correspondre au plat, mais **l'origine BIZZ'ART n'est pas certaine**.

**Exemple** :
- Photo de qualité professionnelle, plat reconnaissable, mais impossible de confirmer si c'est le restaurant

**Confiance** : Moyenne ou Élevée

---

#### ⚠️ RÉEL BIZZ'ART MAUVAIS PLAT
La photo semble être une vraie photo du restaurant, **mais associée au mauvais plat**.

**Exemple** :
- Photo de poulet attribuée à une pizza
- Photo de salade attribuée à un plat de viande

**Confiance** : Élevée  
**Action requise** : Réassigner la photo au bon plat

---

#### 🔴 STOCK/GÉNÉRIQUE
La photo est clairement une **image générique** ou provient d'Internet (pas du restaurant).

**Indices** :
- Qualité trop professionnelle (photo de magazine)
- Arrière-plan neutre/blanc
- Présentation trop stylisée
- Plat identique dans plusieurs photos

**Confiance** : Élevée  
**Action requise** : Remplacer par une vraie photo BIZZ'ART

---

#### ❌ PHOTO MANQUANTE
Pas de photo exploitable pour ce plat.

**Action requise** : Photographier le plat

---

#### 🟠 DOUBLON SUSPECT
Photo utilisée par **plusieurs plats** et la correspondance est **douteuse**.

**Exemple** :
- Même photo pour "Escalope à la crème" ET "Eau Gazeuse" → suspect
- Même photo pour 3 salades différentes → acceptable si visuellement crédible

**Confiance** : Variable

---

#### ❓ INCERTAIN
**Impossible de déterminer** avec suffisamment de confiance.

**Raisons possibles** :
- Photo floue/sombre
- Plat non identifiable
- Angle de prise de vue problématique

**Action requise** : Photographier à nouveau

---

### ÉTAPE 4 : Sauvegarder la progression

**Sauvegarde automatique** toutes les 30 secondes dans le **localStorage** du navigateur.

**Sauvegarde manuelle** :
- Cliquer sur **"💾 Sauvegarder Progression"**
- Une alerte confirme la sauvegarde

**Votre progression est conservée** même si vous fermez et rouvrez le navigateur.

---

### ÉTAPE 5 : Utiliser les filtres

#### Afficher uniquement les plats non classifiés
1. Filtrer par : **"⚪ Non classifié"**
2. Classifier un par un

#### Afficher une catégorie spécifique
1. Sélectionner : **"Les Pizzas"**
2. Examiner toutes les pizzas ensemble

#### Rechercher un plat
1. Taper dans la barre de recherche : **"margherita"**
2. Le tableau filtre en direct

---

### ÉTAPE 6 : Exporter les résultats

Une fois **tous les plats classifiés** :

1. Aller dans l'onglet **"💾 Export"**
2. Cliquer sur **"📄 Exporter en JSON"**
3. Un fichier est téléchargé : `audit-visuel-bizzart-XXXXXXXXX.json`
4. **Envoyer ce fichier** pour analyse finale

Optionnel : **"📊 Exporter en CSV"** pour Excel/Google Sheets

---

## 📊 ANALYSE DES DOUBLONS

### Types de doublons détectés

#### 🔴 DOUBLONS CRITIQUES (5-6 plats)
**29 URLs partagées** dont 5 utilisées par **5-6 plats différents**.

**Exemple** :
- URL `IMG_9699_g5ubkl.jpg` utilisée par :
  - Escalope à la crème (Volailles)
  - Eau Gazeuse (Soda)
  - Soda (Soda)
  - Citronnade (Soda)
  - Côte à L'os Grillée (Viandes)
  - Pizza Fruit de mer (Pizzas)

**Verdict** : **SUSPECT** → Catégories incompatibles, probablement incorrectes

#### ⚠️ DOUBLONS SUSPECTS (3-4 plats)
**Plusieurs plats de catégories différentes** partagent la même photo.

**Action recommandée** : Vérifier visuellement si chaque plat correspond

#### ✅ DOUBLONS ACCEPTABLES (2 plats)
**Même catégorie** ou plats similaires.

**Exemple** :
- 2 pizzas partageant la même photo → acceptable si même type
- 3 salades partageant la même photo → acceptable

---

## 🎯 CLASSIFICATIONS ATTENDUES

### Statistiques idéales

| Classification | Cible | Description |
|----------------|-------|-------------|
| ✅ MATCH RÉEL BIZZ'ART | **60-80%** | Vraies photos du restaurant, correspondance confirmée |
| 🟢 MATCH PROBABLE | **10-20%** | Correspondance probable, origine incertaine |
| ⚠️ RÉEL BIZZ'ART MAUVAIS PLAT | **0-5%** | À réassigner |
| 🔴 STOCK/GÉNÉRIQUE | **5-15%** | À remplacer |
| ❌ PHOTO MANQUANTE | **0-5%** | À photographier |
| 🟠 DOUBLON SUSPECT | **5-10%** | Doublons problématiques |
| ❓ INCERTAIN | **0-5%** | Photos floues/non identifiables |

**Total plats** : 98

---

## 📝 CONSEILS POUR L'AUDIT

### 1. Ne pas deviner
**RÈGLE D'OR** : En cas de doute, choisir **"❓ INCERTAIN"** ou **"🟢 MATCH PROBABLE"**.

Ne **jamais affirmer** qu'une photo est "réelle BIZZ'ART" uniquement parce qu'elle est sur Cloudinary.

### 2. Examiner attentivement
Pour chaque photo :
- ✅ Le plat est-il reconnaissable ?
- ✅ La photo correspond-elle au nom ?
- ✅ La qualité suggère-t-elle une photo réelle du restaurant ?
- ✅ L'arrière-plan/présentation sont-ils crédibles ?

### 3. Comparer les doublons
Si plusieurs plats partagent la même photo :
- Est-ce cohérent ? (ex: 3 salades similaires)
- Ou suspect ? (ex: poulet + soda + pizza)

### 4. Priorités
**Classifier en priorité** :
1. Les plats **Featured** (mis en avant)
2. Les plats **populaires** (Pizzas, Pâtes, Grillades)
3. Les **doublons critiques** (5-6 utilisations)

### 5. Notes utiles
Dans le champ "Notes", indiquer :
- **"Photo floue"**
- **"Arrière-plan suspect"**
- **"Plat non identifiable"**
- **"Même photo que [autre plat]"**
- **"À rephotographier en priorité"**

---

## 🛑 MODE LECTURE SEULE MAINTENU

### ✅ Garanties

- **Aucune modification MongoDB** effectuée
- **Aucune modification Cloudinary** effectuée
- **Aucun MenuItem modifié**
- **Aucune image supprimée**
- **Aucune migration lancée**

### ⚠️ APRÈS L'AUDIT

Une fois la classification terminée :

1. **Exporter les résultats** (JSON ou CSV)
2. **Analyser le rapport** final
3. **Identifier les plats à photographier**
4. **Planifier la session photo** pour les plats sans photo réelle
5. **Valider** manuellement avant toute migration

---

## 📞 PROCHAINES ÉTAPES

### Après classification complète

1. **Exporter** le JSON final
2. **Compter** :
   - Plats avec photos BIZZ'ART confirmées
   - Plats avec photos génériques
   - Plats nécessitant une nouvelle photo
3. **Décider** :
   - Quels plats photographier en priorité
   - Quelles photos remplacer
   - Quels doublons corriger

### Session photo recommandée

**Plats prioritaires** :
- Tous les plats classifiés **🔴 STOCK/GÉNÉRIQUE**
- Tous les plats classifiés **❌ PHOTO MANQUANTE**
- Plats classifiés **❓ INCERTAIN** avec photos floues
- Doublons suspects nécessitant des photos uniques

---

## 📄 FICHIERS IMPORTANTS

| Fichier | Chemin | Utilité |
|---------|--------|---------|
| **Rapport HTML** | `backend/AUDIT-VISUEL-98-PLATS.html` | Interface d'audit principale |
| **Photos** | `backend/audit-photos/` | 35 photos téléchargées |
| **JSON brut** | `backend/AUDIT-VISUEL-98-PLATS.json` | Données techniques |
| **Export classification** | `Downloads/audit-visuel-bizzart-XXXXX.json` | Résultats de votre audit |

---

## 🎯 OBJECTIF FINAL

**Menu public professionnel** où chaque plat possède :
- ✅ Une **vraie photo** du restaurant BIZZ'ART
- ✅ Une photo **correspondant visuellement** au plat
- ✅ Une photo **unique** (sauf cas acceptables)
- ✅ Une photo de **qualité professionnelle**

---

**AUCUNE MIGRATION NE SERA EFFECTUÉE SANS VALIDATION MANUELLE COMPLÈTE**

---

**Date du guide** : 18 août 2026  
**Statut** : ✅ PRÊT POUR AUDIT VISUEL HUMAIN  
**Mode** : 🔒 LECTURE SEULE STRICTE  

---

**FIN DU GUIDE**
