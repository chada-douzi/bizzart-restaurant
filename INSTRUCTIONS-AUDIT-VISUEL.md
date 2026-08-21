# 📋 INSTRUCTIONS — Audit Visuel Interactif Menu BIZZ'ART

## ✅ FICHIER CRÉÉ

**Chemin** : `backend/audit-visuel-interactif.html`  
**Taille** : 25.29 KB  
**Mode** : READ-ONLY STRICT (aucune modification des données)

---

## 🚀 COMMENT OUVRIR

### Option 1 : Double-clic
Naviguez vers :
```
C:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant\backend\audit-visuel-interactif.html
```
Double-cliquez sur le fichier.

### Option 2 : PowerShell
```powershell
cd C:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant
Start-Process "backend\audit-visuel-interactif.html"
```

### Option 3 : Navigateur
1. Ouvrez votre navigateur (Chrome, Edge, Firefox)
2. Glissez-déposez le fichier HTML dans le navigateur
3. Ou allez dans Fichier > Ouvrir et sélectionnez le fichier

---

## ✅ VALIDATION

### Backend requis
⚠️ **Le backend DOIT être démarré** sur `http://localhost:3000`

Vérification effectuée :
- ✅ Backend accessible
- ✅ API `/api/menu/items?limit=200` retourne **114 plats**
- ✅ API `/api/menu/categories` retourne **11 catégories**

Si le backend n'est pas démarré, le rapport affichera une erreur avec un bouton "Réessayer".

### Données chargées
- **114 plats** récupérés depuis l'API réelle
- **11 catégories** récupérées depuis MongoDB
- **Photos Cloudinary** réelles affichées

---

## 🎯 FONCTIONNALITÉS

### 1. Statistiques en temps réel
- 📊 Total de plats
- 🟢 Confirmed (validés)
- 🟡 Uncertain (incertains)
- 🔴 Wrong Dish (mauvaise photo)
- ⚫ Missing (photo manquante)
- Barre de progression : X / 114 vérifiés

### 2. Filtres et recherche
- 🔍 **Recherche** : tapez un nom de plat
- 📂 **Filtre catégorie** : sélectionnez une catégorie spécifique
- 🏷️ **Filtre statut** : affichez uniquement les plats d'un statut donné

### 3. Validation des photos
Pour chaque plat, vous pouvez sélectionner :
- 🟢 **Correct** : la photo correspond au plat
- 🟡 **Incertain** : pas sûr de la correspondance
- 🔴 **Mauvais** : la photo ne correspond PAS au plat
- ⚫ **Absent** : aucune photo exploitable

### 4. Zoom sur image
- Cliquez sur n'importe quelle photo pour l'agrandir
- Appuyez sur `Escape` ou cliquez à l'extérieur pour fermer

### 5. Sauvegarde automatique
- ✅ Vos validations sont **sauvegardées automatiquement** dans le navigateur
- ✅ Vous pouvez fermer la page et revenir plus tard
- ✅ Vos validations seront restaurées

### 6. Export JSON
- 📥 Bouton **Export JSON** génère un rapport complet
- Contient : statistiques + liste des 114 plats avec leurs statuts
- Format : `audit-menu-bizzart-YYYY-MM-DD.json`

### 7. Reset
- 🔄 Bouton **Reset** pour tout réinitialiser
- Demande confirmation avant suppression

---

## 📊 AFFICHAGE

### Carte plat (350px width)
Chaque carte affiche :
1. **Numéro** du plat (#1 à #114)
2. **Catégorie** (badge violet)
3. **Photo** Cloudinary (250px height)
4. **Nom** du plat (gros titre)
5. **Description** (si disponible)
6. **Prix** en DT (gros chiffre bleu)
7. **URL Cloudinary** complète
8. **4 boutons** de validation

### Grille responsive
- Colonnes adaptatives (min 350px)
- Gap de 20px entre les cartes
- Hover effects sur les cartes
- Bordures colorées selon le statut validé

### Couleurs des cartes
- 🟢 **Bordure verte** = Confirmed
- 🟡 **Bordure jaune** = Uncertain
- 🔴 **Bordure rouge** = Wrong Dish
- ⚫ **Bordure grise** = Missing
- ⚪ **Pas de bordure** = Non vérifié

---

## 🎬 WORKFLOW RECOMMANDÉ

### Étape 1 : Validation par catégorie
1. Sélectionnez une catégorie dans le filtre (ex: "Les Pizzas")
2. Validez les 17 plats de la catégorie
3. Passez à la catégorie suivante

### Étape 2 : Vérification des incertains
1. Filtre statut : "🟡 Uncertain"
2. Réexaminez les plats incertains
3. Changez le statut si nécessaire

### Étape 3 : Focus sur les problèmes
1. Filtre statut : "🔴 Wrong Dish"
2. Notez les plats avec mauvaises photos
3. Filtre statut : "⚫ Missing"
4. Notez les plats sans photo

### Étape 4 : Export final
1. Cliquez sur "📥 Export JSON"
2. Le fichier contient toutes vos validations
3. Partagez ce fichier pour analyse

---

## 📝 EXEMPLE D'UTILISATION

### Validation d'un plat
1. **Regardez la photo** affichée
2. **Lisez le nom** du plat
3. **Comparez** : est-ce que la photo correspond ?
4. **Cliquez** sur le bouton approprié :
   - 🟢 Si la photo correspond clairement
   - 🟡 Si vous n'êtes pas sûr
   - 🔴 Si c'est clairement un autre plat
   - ⚫ Si l'image ne charge pas ou est inutilisable

### Zoom sur une photo
1. **Cliquez** sur la photo
2. La photo s'ouvre en **grand format**
3. Inspectez les détails
4. **Fermez** avec `Escape` ou clic extérieur
5. **Validez** avec un des 4 boutons

---

## 📤 EXPORT JSON (Structure)

```json
{
  "date": "2026-08-20T04:50:00.000Z",
  "total": 114,
  "statistics": {
    "confirmed": 85,
    "uncertain": 12,
    "wrong_dish": 3,
    "missing": 2,
    "pending": 12
  },
  "dishes": [
    {
      "number": 1,
      "id": "...",
      "category": "Les Pizzas",
      "name": "Pizza Margherita",
      "price": 15.50,
      "image": "https://res.cloudinary.com/...",
      "status": "CONFIRMED"
    },
    ...
  ]
}
```

---

## ⚠️ POINTS IMPORTANTS

### 1. Backend requis
Le rapport **charge les données en temps réel** depuis l'API.  
Si le backend n'est pas démarré, vous verrez :
```
❌ Erreur de chargement
Vérifiez que le backend est démarré sur http://localhost:3000
[Bouton Réessayer]
```

### 2. Sauvegarde locale
Vos validations sont stockées dans `localStorage` du navigateur.  
**Ne videz pas le cache** avant d'avoir exporté en JSON !

### 3. Mode READ-ONLY
Ce rapport **NE MODIFIE AUCUNE DONNÉE** :
- ❌ N'écrit pas dans MongoDB
- ❌ Ne modifie pas Cloudinary
- ❌ Ne change pas les plats
- ✅ Lit seulement les données via API GET

### 4. Images Cloudinary
Si une image ne charge pas :
- Vérifiez l'URL dans la carte
- L'image s'affichera comme "Image manquante" (gris)
- Marquez le plat comme ⚫ MISSING

---

## 🐛 DÉPANNAGE

### Problème : "Chargement des données depuis l'API..." infini
**Solution** : Le backend n'est pas démarré
```powershell
cd backend
npm run dev
```
Puis actualisez la page HTML.

### Problème : Toutes les images affichent "Image manquante"
**Cause** : URLs Cloudinary invalides ou CORS bloqué  
**Solution** : Vérifiez les URLs dans MongoDB et la configuration Cloudinary

### Problème : Mes validations ont disparu
**Cause** : Cache navigateur vidé  
**Solution** : Exportez régulièrement en JSON pour ne pas perdre votre travail

### Problème : Le filtre ne fonctionne pas
**Solution** : Actualisez la page (F5)

---

## ✅ CONFIRMATION MODE READ-ONLY

### Aucune modification effectuée
- ❌ Aucun plat modifié
- ❌ Aucune image modifiée
- ❌ Aucune catégorie modifiée
- ❌ Aucun prix modifié
- ❌ Aucune donnée MongoDB touchée
- ❌ Aucune URL Cloudinary changée

### Opérations READ-ONLY uniquement
- ✅ `GET /api/menu/categories` (lecture)
- ✅ `GET /api/menu/items?limit=200` (lecture)
- ✅ Affichage des images Cloudinary (lecture)
- ✅ Sauvegarde validations en local (navigateur)

---

## 🎯 OBJECTIF

Valider **visuellement** la correspondance entre chaque plat et sa photo.

**Ne vous fiez PAS uniquement au fait qu'une URL Cloudinary existe.**  
**Vérifiez réellement que la photo correspond au nom du plat.**

Exemples :
- ❌ "Pizza Margherita" avec photo de pizza 4 fromages → 🔴 WRONG_DISH
- ✅ "Pizza Margherita" avec photo de pizza tomate/mozzarella → 🟢 CONFIRMED
- 🟡 "Poulet grillé" avec photo de poulet (pas sûr du mode de cuisson) → 🟡 UNCERTAIN

---

**Bon audit ! 🍕**

Une fois terminé, partagez le fichier JSON exporté pour analyse complète.
