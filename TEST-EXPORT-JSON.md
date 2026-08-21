# 🧪 GUIDE DE TEST EXPORT JSON - BIZZ'ART

## 🎯 OBJECTIF

Tester l'export JSON instrumenté et identifier la cause exacte du fichier vide.

---

## ⚙️ PRÉREQUIS

### 1. Backend démarré

```bash
cd backend
npm run dev
```

**Vérifier :** `http://localhost:3000` accessible

### 2. Frontend démarré

```bash
cd frontend
npm start
```

**Vérifier :** `http://localhost:4200` accessible

---

## 🔬 TESTS À EFFECTUER

### TEST 1 : Vérifier l'API Backend

#### a) Test items

Ouvrir dans le navigateur (ou Postman) :

```
GET http://localhost:3000/api/photo-validation/items
```

**Avec authentification admin** (cookie ou JWT).

**Résultat attendu :**

```json
{
  "success": true,
  "data": [
    {
      "index": 1,
      "_id": "...",
      "name": {
        "fr": "Pizza Margherita",
        ...
      },
      "category": {...},
      "image": "https://...",
      ...
    },
    ... (97 autres)
  ],
  "message": "Items retrieved for validation"
}
```

**Vérifier :**
- ✅ `success === true`
- ✅ `data.length === 98`
- ✅ Chaque item possède `_id`, `name`, `category`, `image`

#### b) Test photos

```
GET http://localhost:3000/api/photo-validation/available-photos
```

**Résultat attendu :**

```json
{
  "success": true,
  "data": {
    "total": 56,
    "photos": [
      {
        "url": "https://...",
        "source": "menuitem | media | both",
        "usedBy": ["Pizza Margherita", ...],
        "usageCount": 2,
        "fileName": "pizza.jpg"
      },
      ...
    ]
  }
}
```

**Vérifier :**
- ✅ `success === true`
- ✅ `data.total > 0`
- ✅ `data.photos` est un array

---

### TEST 2 : Ouvrir l'outil de validation

#### Naviguer vers :

```
http://localhost:4200/admin/photo-validation
```

#### Vérifier l'interface

- ✅ Pas d'erreur dans la console (F12)
- ✅ Message "🔒 MODE : STRICTEMENT LECTURE SEULE" visible
- ✅ Section "Progression" affiche "X / 98"
- ✅ Plats chargés visibles
- ✅ Navigation fonctionne

#### Console (F12) - Logs attendus

```
✅ Connecté à MongoDB
[PHOTO-VALIDATION COMPONENT] Tentative d'export...
[PHOTO-VALIDATION COMPONENT] Items chargés: 98
[PHOTO-VALIDATION COMPONENT] Validations chargées: X
[PHOTO-VALIDATION COMPONENT] Photos chargées: X
```

**Si items chargés = 0 :**

❌ **PROBLÈME** : L'API ne retourne pas les plats.

**Solutions possibles :**
1. Vérifier l'authentification admin
2. Vérifier la connexion MongoDB
3. Vérifier que les 98 MenuItems existent dans la DB

---

### TEST 3 : Diagnostic localStorage

#### Cliquer sur le bouton "🔍 Diagnostic"

**Console (F12) - Logs attendus :**

```
[PHOTO-VALIDATION DIAGNOSTIC] ═══════════════════════════════════════════════
[PHOTO-VALIDATION DIAGNOSTIC] DIAGNOSTIC LOCALSTORAGE (READ ONLY)
[PHOTO-VALIDATION DIAGNOSTIC] ═══════════════════════════════════════════════
[PHOTO-VALIDATION DIAGNOSTIC] Clé: bizzart-photo-validation
[PHOTO-VALIDATION DIAGNOSTIC] Existe: true/false
[PHOTO-VALIDATION DIAGNOSTIC] Longueur brute: XXXX caractères
[PHOTO-VALIDATION DIAGNOSTIC] Parsing: SUCCÈS
[PHOTO-VALIDATION DIAGNOSTIC] Type: Array
[PHOTO-VALIDATION DIAGNOSTIC] Nombre de validations: X
[PHOTO-VALIDATION DIAGNOSTIC] Première validation: {...}
[PHOTO-VALIDATION DIAGNOSTIC] Statuts: { pending: X, correct: X, ... }
[PHOTO-VALIDATION DIAGNOSTIC] ═══════════════════════════════════════════════
[PHOTO-VALIDATION DIAGNOSTIC] Signals Angular actuels:
[PHOTO-VALIDATION DIAGNOSTIC]   - items(): 98
[PHOTO-VALIDATION DIAGNOSTIC]   - validations(): X
[PHOTO-VALIDATION DIAGNOSTIC]   - photos(): X
[PHOTO-VALIDATION DIAGNOSTIC] ═══════════════════════════════════════════════
```

**Cas A : localStorage existe**

- ✅ Existe: true
- ✅ Nombre de validations: X (peut être 0 à 98)
- ✅ Statuts affichés

**Cas B : localStorage vide**

- ⚠️ Existe: false
- ⚠️ localStorage VIDE - Aucune validation sauvegardée

**C'est normal si les validations n'ont pas encore été effectuées.**

---

### TEST 4 : Export JSON

#### Cliquer sur le bouton "📥 Exporter Rapport JSON"

**Console (F12) - Logs attendus :**

```
[PHOTO-VALIDATION COMPONENT] Tentative d'export...
[PHOTO-VALIDATION COMPONENT] Items chargés: 98
[PHOTO-VALIDATION COMPONENT] Validations chargées: X
[PHOTO-VALIDATION COMPONENT] Photos chargées: X
[PHOTO-VALIDATION COMPONENT] Appel du service d'export...

[PHOTO-VALIDATION EXPORT] Début de l'export
[PHOTO-VALIDATION EXPORT] items.length: 98
[PHOTO-VALIDATION EXPORT] validations.length: X
[PHOTO-VALIDATION EXPORT] photos.length: X
[PHOTO-VALIDATION EXPORT] Création du mapping de validation...
[PHOTO-VALIDATION EXPORT] Statuts comptés: {
  correct: X,
  incorrect: X,
  invalid: X,
  missing: X,
  validated: X,
  pending: X,
  duplicates: X
}
[PHOTO-VALIDATION EXPORT] Records transformés: 98
[PHOTO-VALIDATION EXPORT] Objet exportData construit: {
  version: 1,
  totalItems: 98,
  validationsCount: 98,
  summary: {...}
}
[PHOTO-VALIDATION EXPORT] Génération du JSON...
[PHOTO-VALIDATION EXPORT] JSON généré: XXXXX caractères
[PHOTO-VALIDATION EXPORT] Validation du JSON...
[PHOTO-VALIDATION EXPORT] JSON valide: OUI
[PHOTO-VALIDATION EXPORT] Validation parse: totalItems=98, validations=98
[PHOTO-VALIDATION EXPORT] Création du Blob...
[PHOTO-VALIDATION EXPORT] Blob créé: XXXXX octets
[PHOTO-VALIDATION EXPORT] Blob type: application/json;charset=utf-8
[PHOTO-VALIDATION EXPORT] Création de l'URL Blob...
[PHOTO-VALIDATION EXPORT] URL Blob créée: blob:http://localhost:4200/...
[PHOTO-VALIDATION EXPORT] Nom du fichier: bizzart-photo-validation-1724012345678.json
[PHOTO-VALIDATION EXPORT] Création du lien de téléchargement...
[PHOTO-VALIDATION EXPORT] Ajout du lien au DOM...
[PHOTO-VALIDATION EXPORT] Déclenchement du clic...
[PHOTO-VALIDATION EXPORT] Retrait du lien du DOM...
[PHOTO-VALIDATION EXPORT] Nettoyage de l'URL Blob dans 1 seconde...
[PHOTO-VALIDATION EXPORT] ✅ EXPORT TERMINÉ AVEC SUCCÈS
[PHOTO-VALIDATION EXPORT] Résumé:
[PHOTO-VALIDATION EXPORT]   - Items: 98
[PHOTO-VALIDATION EXPORT]   - Validations: X
[PHOTO-VALIDATION EXPORT]   - Photos: X
[PHOTO-VALIDATION EXPORT]   - Records exportés: 98
[PHOTO-VALIDATION EXPORT]   - JSON length: XXXXX caractères
[PHOTO-VALIDATION EXPORT]   - Blob size: XXXXX octets
[PHOTO-VALIDATION EXPORT]   - Fichier: bizzart-photo-validation-1724012345678.json
```

**Alert attendue :**

```
✅ EXPORT RÉUSSI

Fichier: bizzart-photo-validation-1724012345678.json

Données exportées:
  • Items: 98
  • Validations: X
  • Taille JSON: XXXXX caractères
  • Taille fichier: XXXXX octets

Statuts:
  ✅ Correctes: X
  🔄 Corrigées: X
  ❌ Incorrectes: X
  ⚠️ Invalides: X
  📷 Manquantes: X
  ⏳ À vérifier: X
```

**Fichier téléchargé :**

Le navigateur télécharge automatiquement :

```
bizzart-photo-validation-1724012345678.json
```

---

### TEST 5 : Vérifier le fichier téléchargé

#### Localiser le fichier

Dans le dossier de téléchargements par défaut (généralement `Downloads/`)

#### Vérifier la taille

```bash
ls -lh ~/Downloads/bizzart-photo-validation-*.json
```

**OU sur Windows PowerShell :**

```powershell
Get-ChildItem -Path $env:USERPROFILE\Downloads\bizzart-photo-validation-*.json | Select-Object Name, Length
```

**Résultat attendu :**

```
Name                                    Length
----                                    ------
bizzart-photo-validation-1724012345678.json  XXXXX bytes (NON 0)
```

**Si Length = 0 octets :**

❌ **PROBLÈME DE TÉLÉCHARGEMENT NAVIGATEUR**

**Solutions possibles :**
1. Vérifier les paramètres du navigateur (bloqueur de téléchargements)
2. Vérifier les permissions du dossier Downloads
3. Essayer un autre navigateur
4. Copier le JSON depuis la console si visible

#### Lire le contenu

```bash
cat ~/Downloads/bizzart-photo-validation-*.json | head -50
```

**OU sur Windows PowerShell :**

```powershell
Get-Content -Path $env:USERPROFILE\Downloads\bizzart-photo-validation-*.json -TotalCount 50
```

**Résultat attendu :**

```json
{
  "version": 1,
  "readonly": true,
  "validatedAt": "2026-08-18T...",
  "generatedAt": "2026-08-18T...",
  "totalItems": 98,
  "summary": {
    "correct": 0,
    "incorrect": 0,
    "invalid": 0,
    "missing": 0,
    "validated": 0,
    "pending": 98,
    "duplicates": X
  },
  "validations": [
    {
      "menuItemId": "...",
      "nameFr": "Pizza Margherita",
      "category": "Pizzas",
      "currentImage": "https://res.cloudinary.com/...",
      "validatedImage": null,
      "status": "pending",
      "professionalFilename": "pizza-margherita.jpg",
      "duplicate": false
    },
    ...
  ]
}
```

**Vérifier :**
- ✅ JSON valide (pas d'erreur de parsing)
- ✅ `totalItems: 98`
- ✅ `validations.length === 98`
- ✅ Chaque validation contient `menuItemId`, `nameFr`, `category`, `currentImage`, `status`

#### Parser et valider

```bash
cat ~/Downloads/bizzart-photo-validation-*.json | jq '.totalItems, .validations | length'
```

**OU dans la console navigateur (F12) :**

```javascript
fetch('/Downloads/bizzart-photo-validation-XXXXX.json')
  .then(r => r.json())
  .then(data => {
    console.log('totalItems:', data.totalItems);
    console.log('validations.length:', data.validations.length);
    console.log('summary:', data.summary);
  });
```

---

## 🔴 SI L'EXPORT ÉCHOUE

### Erreur : "Aucun MenuItem disponible pour export"

**Cause :** `items.length === 0`

**Solutions :**
1. Vérifier l'authentification admin
2. Vérifier que le backend retourne les 98 plats
3. Recharger la page

### Erreur : "JSON généré vide"

**Cause :** `JSON.stringify()` a échoué

**Solutions :**
1. Vérifier la console pour erreurs JavaScript
2. Vérifier que `exportData` est un objet valide

### Erreur : "Blob généré vide"

**Cause :** Le Blob a `size === 0`

**Solutions :**
1. Vérifier que le JSON n'est pas vide
2. Vérifier les paramètres du Blob

### Fichier téléchargé = 0 octets MAIS logs indiquent Blob size > 0

**Cause :** Problème de téléchargement navigateur

**Solutions :**
1. Essayer un autre navigateur
2. Vérifier les permissions
3. Copier le JSON depuis la console :

```javascript
// Dans la console (F12)
const stored = localStorage.getItem('bizzart-photo-validation');
console.log(stored);
// Copier-coller le résultat
```

---

## 📊 RAPPORTER LES RÉSULTATS

Une fois les tests effectués, rapporter :

1. **Console logs (F12)** - Copier-coller tous les logs `[PHOTO-VALIDATION ...]`
2. **Taille du fichier téléchargé** - En octets
3. **Nombre de plats exportés** - `totalItems`
4. **Nombre de validations** - `validations.length`
5. **Statuts** - `summary`
6. **Première validation** - JSON de la première entrée
7. **Erreurs éventuelles** - Messages d'erreur complets

---

## ✅ SUCCÈS ATTENDU

```
✅ Backend : 200 OK, 98 items retournés
✅ Frontend : Chargé sans erreur
✅ localStorage : Peut être vide (normal si aucune validation)
✅ Export : Fichier JSON téléchargé
✅ Taille : > 0 octets (environ 50-100 KB attendu)
✅ Contenu : JSON valide avec 98 validations
✅ Statut : Si aucune validation effectuée, 98 plats avec status="pending"
```

---

## 🎯 APRÈS SUCCÈS

**Copier le fichier téléchargé vers :**

```
backend/validation-exports/bizzart-photo-validation-XXXXX.json
```

**Puis lancer l'analyse :**

```bash
cd backend
npm run analyze:mapping -- validation-exports/bizzart-photo-validation-XXXXX.json
```

---

**Date :** 2026-08-18  
**Version instrumentation :** 2.0  
**Build status :** ✅ SUCCÈS
