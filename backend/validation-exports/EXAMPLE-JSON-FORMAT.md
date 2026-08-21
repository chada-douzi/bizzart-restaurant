# FORMAT ATTENDU DU JSON EXPORTÉ

## 📋 Structure du fichier

Le fichier JSON exporté depuis `/admin/photo-validation` doit avoir cette structure :

```json
{
  "version": 1,
  "readonly": true,
  "validatedAt": "2026-08-18T14:30:00.000Z",
  "generatedAt": "2026-08-18T14:30:00.000Z",
  "totalItems": 98,
  "summary": {
    "correct": 45,
    "incorrect": 10,
    "invalid": 5,
    "missing": 8,
    "validated": 30,
    "pending": 0,
    "duplicates": 15
  },
  "validations": [
    {
      "menuItemId": "507f1f77bcf86cd799439011",
      "nameFr": "Pizza Margherita",
      "category": "Pizzas",
      "currentImage": "https://res.cloudinary.com/.../IMG_9699_g5ubkl.jpg",
      "validatedImage": "https://res.cloudinary.com/.../pizza-margherita-real.jpg",
      "status": "validated",
      "professionalFilename": "pizza-margherita.jpg",
      "duplicate": false
    },
    {
      "menuItemId": "507f1f77bcf86cd799439012",
      "nameFr": "Pizza 4 Fromages",
      "category": "Pizzas",
      "currentImage": "https://res.cloudinary.com/.../IMG_9700_abc123.jpg",
      "validatedImage": null,
      "status": "correct",
      "professionalFilename": "pizza-4-fromages.jpg",
      "duplicate": false
    },
    {
      "menuItemId": "507f1f77bcf86cd799439013",
      "nameFr": "Escalope à la Crème",
      "category": "Viandes",
      "currentImage": "https://res.cloudinary.com/.../IMG_9699_g5ubkl.jpg",
      "validatedImage": null,
      "status": "incorrect",
      "professionalFilename": "escalope-a-la-creme.jpg",
      "duplicate": true
    }
  ]
}
```

---

## 🔑 Champs obligatoires

### Niveau racine

| Champ | Type | Description |
|-------|------|-------------|
| `version` | number | Version du format (1) |
| `readonly` | boolean | Toujours `true` (mode lecture seule) |
| `validatedAt` | string | Date de validation ISO 8601 |
| `generatedAt` | string | Date de génération ISO 8601 |
| `totalItems` | number | Nombre total de plats (98) |
| `summary` | object | Résumé des statuts |
| `validations` | array | Liste des 98 validations |

### Objet `summary`

| Champ | Type | Description |
|-------|------|-------------|
| `correct` | number | Nombre de photos correctes |
| `incorrect` | number | Nombre de photos incorrectes |
| `invalid` | number | Nombre de photos invalides |
| `missing` | number | Nombre de photos manquantes |
| `validated` | number | Nombre de photos remplacées |
| `pending` | number | Nombre de plats non validés |
| `duplicates` | number | Nombre de doublons |

### Objet `validation` (dans le tableau `validations`)

| Champ | Type | Description | Obligatoire |
|-------|------|-------------|-------------|
| `menuItemId` | string | ID MongoDB du MenuItem | ✅ Oui |
| `nameFr` | string | Nom du plat en français | ✅ Oui |
| `category` | string | Nom de la catégorie | ✅ Oui |
| `currentImage` | string | URL actuelle de l'image | ✅ Oui |
| `validatedImage` | string \| null | Nouvelle URL (si remplacement) | ✅ Oui |
| `status` | string | Statut de validation | ✅ Oui |
| `professionalFilename` | string | Nom professionnel recommandé | ✅ Oui |
| `duplicate` | boolean | Photo utilisée plusieurs fois | ✅ Oui |

---

## 📊 Statuts possibles

| Statut | Signification | `validatedImage` |
|--------|---------------|------------------|
| `correct` | Photo correcte, rien à changer | `null` |
| `validated` | Photo remplacée | URL valide |
| `incorrect` | Photo incorrecte sans remplacement | `null` |
| `invalid` | Photo invalide (flyer/menu) | `null` ou URL |
| `missing` | Aucune photo adaptée | `null` ou URL |
| `pending` | Non encore validé | `null` |

---

## ✅ Règles de validation

### Total items

```javascript
validations.length === totalItems === 98
```

### Summary cohérent

```javascript
summary.correct + 
summary.incorrect + 
summary.invalid + 
summary.missing + 
summary.validated + 
summary.pending 
=== totalItems
```

### Status `validated` avec image

```javascript
if (status === 'validated') {
  validatedImage !== null && validatedImage !== ''
}
```

### MenuItemId valide

```javascript
// Format MongoDB ObjectId (24 caractères hexadécimaux)
/^[a-f0-9]{24}$/.test(menuItemId)
```

### URLs valides

```javascript
// URLs Cloudinary ou autre CDN
validatedImage.startsWith('https://res.cloudinary.com/') ||
validatedImage.startsWith('https://')
```

---

## 🚨 Erreurs à éviter

### ❌ Erreur 1 : Status `validated` sans image

```json
{
  "status": "validated",
  "validatedImage": null  ← BLOCKER
}
```

### ❌ Erreur 2 : URL invalide

```json
{
  "validatedImage": "not-a-valid-url"  ← BLOCKER
}
```

### ❌ Erreur 3 : MenuItemId inexistant

```json
{
  "menuItemId": "000000000000000000000000"  ← BLOCKER si n'existe pas dans MongoDB
}
```

### ❌ Erreur 4 : Champ manquant

```json
{
  "menuItemId": "...",
  "nameFr": "...",
  // "category" manquant ← BLOCKER
}
```

---

## ✅ Exemple correct

```json
{
  "version": 1,
  "readonly": true,
  "validatedAt": "2026-08-18T14:30:00.000Z",
  "generatedAt": "2026-08-18T14:30:00.000Z",
  "totalItems": 98,
  "summary": {
    "correct": 40,
    "incorrect": 15,
    "invalid": 5,
    "missing": 8,
    "validated": 30,
    "pending": 0,
    "duplicates": 20
  },
  "validations": [
    {
      "menuItemId": "67a1b2c3d4e5f6g7h8i9j0k1",
      "nameFr": "Pizza Margherita",
      "category": "Pizzas",
      "currentImage": "https://res.cloudinary.com/demo/IMG_9699_g5ubkl.jpg",
      "validatedImage": "https://res.cloudinary.com/demo/pizza-margherita.jpg",
      "status": "validated",
      "professionalFilename": "pizza-margherita.jpg",
      "duplicate": false
    },
    {
      "menuItemId": "67a1b2c3d4e5f6g7h8i9j0k2",
      "nameFr": "Pizza 4 Fromages",
      "category": "Pizzas",
      "currentImage": "https://res.cloudinary.com/demo/pizza-4-fromages.jpg",
      "validatedImage": null,
      "status": "correct",
      "professionalFilename": "pizza-4-fromages.jpg",
      "duplicate": false
    }
    // ... 96 autres validations
  ]
}
```

---

## 🔍 Comment vérifier votre JSON

### Vérification manuelle rapide

1. **Total items** : `totalItems: 98` ✅
2. **Nombre validations** : `validations.length === 98` ✅
3. **Pas de pending** : `summary.pending === 0` ✅
4. **Somme cohérente** : `correct + incorrect + invalid + missing + validated === 98` ✅

### Vérification automatique

Le script `analyze:mapping` va automatiquement détecter :

- ✅ MenuItemId inexistants
- ✅ URLs invalides
- ✅ Champs manquants
- ✅ Statuts incohérents
- ✅ Totaux incorrects

---

## 📁 Où placer le fichier

```
backend/validation-exports/bizzart-photo-validation-1723989000000.json
```

Le nom du fichier doit commencer par `bizzart-photo-validation-` et se terminer par `.json`.

---

## 🚀 Commande d'analyse

Une fois le JSON placé :

```bash
cd backend
npm run analyze:mapping -- validation-exports/bizzart-photo-validation-XXXXX.json
```

Remplacer `XXXXX` par le timestamp dans votre nom de fichier.

---

**Si votre JSON respecte ce format, l'analyse se déroulera sans problème !**
