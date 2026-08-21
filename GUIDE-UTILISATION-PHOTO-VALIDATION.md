# GUIDE D'UTILISATION - OUTIL VALIDATION PHOTOS

## 🎯 Objectif

Valider visuellement la correspondance entre les 98 plats du restaurant BIZZ'ART et leurs photos.

**Important** : Cet outil ne modifie **RIEN**. Il permet uniquement de créer un fichier JSON avec vos décisions de validation.

---

## 🚀 Démarrage

### 1. Lancer le Backend

```bash
cd backend
npm run dev
```

Attendez le message : `🚀 BIZZ'ART Monastir API - Server running on port 3000`

### 2. Lancer le Frontend

```bash
cd frontend
npm start
```

Attendez le message : `** Angular Live Development Server is listening on localhost:4200 **`

### 3. Se connecter

1. Ouvrir le navigateur : `http://localhost:4200/admin/login`
2. Se connecter avec un compte administrateur
3. Vous serez redirigé vers le dashboard

### 4. Accéder à l'outil

Naviguer vers : `http://localhost:4200/admin/photo-validation`

---

## 📋 Interface

### En-tête

- **Validation Photos** : Titre de la page
- **📥 Exporter JSON** : Télécharge le mapping de validation
- **🔄 Réinitialiser** : Supprime toutes les validations locales

### Progression

```
VALIDATION PHOTOS
37 / 98
[=============================           ] 38%

✅ Correctes: 25    ❌ Incorrectes: 8    🔄 Corrigées: 4    ⏳ À vérifier: 61
```

### Filtres

- **Tous (98)** : Affiche tous les plats
- **⏳ À vérifier** : Plats non encore validés
- **✅ Correctes** : Photos confirmées correctes
- **❌ Incorrectes** : Photos déclarées incorrectes
- **🔄 Corrigées** : Plats avec nouvelle photo sélectionnée
- **🔁 Doublons** : Photos utilisées par plusieurs plats

### Plat actuel

```
PLAT #12
Pizza Margherita
Catégorie: Pizzas

PHOTO ACTUELLE
[Grande image de la photo actuelle]

URL: IMG_9699_g5ubkl.jpg
Utilisée par: 6 plat(s)

⚠️ DOUBLON DÉTECTÉ
Cette photo est utilisée par: Pizza Margherita, Pizza Thon, Pizza 4 Fromages, ...

Statut: ⏳ NON VALIDÉ

[✓ PHOTO CORRECTE]  [✗ PHOTO INCORRECTE]
```

### Photos candidates (si photo incorrecte)

```
PHOTOS CANDIDATES
[Grille de photos disponibles]

Chaque photo affiche:
- Image miniature
- Nom du fichier
- Nombre d'utilisations
```

### Navigation

```
[← PRÉCÉDENT]    12 / 98    [SUIVANT →]
```

---

## 🎬 Workflow de validation

### Cas 1 : Photo correcte

1. Visualiser la photo actuelle
2. Vérifier qu'elle correspond bien au plat
3. Cliquer sur **✓ PHOTO CORRECTE**
4. Le statut passe à **✅ PHOTO CORRECTE**
5. Cliquer sur **SUIVANT →**

### Cas 2 : Photo incorrecte

1. Visualiser la photo actuelle
2. Constater qu'elle ne correspond PAS au plat
3. Cliquer sur **✗ PHOTO INCORRECTE**
4. Le statut passe à **❌ PHOTO INCORRECTE**
5. Une galerie de photos candidates apparaît
6. Parcourir visuellement les candidates
7. Cliquer sur la photo correcte pour ce plat
8. Le statut passe à **🔄 CORRIGÉE**
9. Cliquer sur **SUIVANT →**

### Cas 3 : Photo douteuse

Si vous n'êtes pas sûr :
1. Ne validez rien (laissez en **⏳ NON VALIDÉ**)
2. Cliquer sur **SUIVANT →**
3. Vous pourrez revenir plus tard avec les filtres

---

## 📊 Suivre votre progression

### Statistiques en temps réel

- **37 / 98** : 37 plats validés sur 98
- **✅ Correctes: 25** : 25 photos confirmées correctes
- **❌ Incorrectes: 8** : 8 photos déclarées incorrectes (sans remplacement)
- **🔄 Corrigées: 4** : 4 photos remplacées par une candidate
- **⏳ À vérifier: 61** : 61 plats non encore validés

### Barre de progression

La barre se remplit au fur et à mesure :
- Vert foncé : validations complètes (correct + validated)
- Progression en pourcentage

---

## 🔍 Utiliser les filtres

### Stratégie recommandée

1. **Début** : Filtre "Tous" pour parcourir les 98 plats
2. **Focus doublons** : Filtre "🔁 Doublons" pour traiter les photos partagées
3. **Révision** : Filtre "⏳ À vérifier" pour terminer les plats non validés
4. **Vérification** : Filtres "✅ Correctes", "❌ Incorrectes", "🔄 Corrigées" pour relire

### Exemple : Traiter les doublons en priorité

1. Cliquer sur filtre **🔁 Doublons**
2. Le compteur affiche par exemple "1 / 29" (29 plats concernés)
3. Pour chaque doublon :
   - Vérifier visuellement
   - Marquer comme correct SI c'est vraiment la bonne photo
   - OU marquer comme incorrect et sélectionner la vraie photo
4. Une fois terminé, revenir au filtre **Tous**

---

## 💾 Sauvegarde automatique

### localStorage

Toutes vos validations sont sauvegardées automatiquement dans le navigateur (localStorage).

**Avantages** :
- ✅ Pas besoin de "Sauvegarder" manuellement
- ✅ Vous pouvez fermer la page et revenir plus tard
- ✅ Rafraîchir la page (F5) ne perd pas vos validations
- ✅ Aucune donnée n'est envoyée au serveur

**Limites** :
- ❌ Si vous videz le cache du navigateur, les validations sont perdues
- ❌ Si vous changez de navigateur, les validations ne sont pas synchronisées
- ❌ Si vous changez d'ordinateur, les validations ne sont pas transférées

**Solution** : Exporter régulièrement le JSON comme backup

---

## 📥 Exporter le mapping JSON

### Quand exporter ?

- **Durant la validation** : Tous les 20-30 plats pour avoir un backup
- **À la fin** : Quand tous les 98 plats sont validés
- **Avant de fermer** : Pour ne pas perdre votre travail

### Comment exporter ?

1. Cliquer sur **📥 Exporter JSON**
2. Le fichier se télécharge automatiquement
3. Nom du fichier : `bizzart-photo-validation-[timestamp].json`
4. Le fichier contient **TOUS** les 98 plats, même les non validés

### Contenu du fichier

```json
{
  "generatedAt": "2026-08-18T19:30:00.000Z",
  "totalItems": 98,
  "validations": [
    {
      "menuItemId": "64f8b1234567890abcdef123",
      "nameFr": "Pizza Margherita",
      "currentImage": "https://res.cloudinary.com/.../IMG_9699_g5ubkl.jpg",
      "validatedImage": "https://res.cloudinary.com/.../IMG_1234_abcd.jpg",
      "status": "validated"
    },
    {
      "menuItemId": "64f8b1234567890abcdef124",
      "nameFr": "Pizza Thon",
      "currentImage": "https://res.cloudinary.com/.../IMG_5678_efgh.jpg",
      "validatedImage": null,
      "status": "correct"
    },
    {
      "menuItemId": "64f8b1234567890abcdef125",
      "nameFr": "Pizza 4 Fromages",
      "currentImage": "https://res.cloudinary.com/.../IMG_9699_g5ubkl.jpg",
      "validatedImage": null,
      "status": "incorrect"
    },
    {
      "menuItemId": "64f8b1234567890abcdef126",
      "nameFr": "Pizza Saumon",
      "currentImage": "https://res.cloudinary.com/.../IMG_8888_xyz.jpg",
      "validatedImage": null,
      "status": "pending"
    }
  ]
}
```

### Interpréter les statuts

- **`"status": "pending"`** : Pas encore validé
- **`"status": "correct"`** : Photo actuelle confirmée correcte
- **`"status": "incorrect"`** : Photo actuelle déclarée incorrecte (aucune candidate sélectionnée)
- **`"status": "validated"`** : Nouvelle photo sélectionnée (voir `validatedImage`)

### Que faire du fichier JSON ?

1. **Vérifier** : Ouvrir le JSON et vérifier les validations
2. **Sauvegarder** : Garder le fichier en backup
3. **Plus tard** : Le fichier servira pour une étape séparée d'application des corrections à MongoDB

**Important** : Le JSON exporté ne modifie **RIEN** dans MongoDB ou Cloudinary. C'est juste un fichier de référence.

---

## 🔄 Réinitialiser

### Quand réinitialiser ?

- Vous voulez recommencer à zéro
- Vous avez fait des erreurs et voulez tout effacer
- Vous voulez tester l'outil

### Comment réinitialiser ?

1. Cliquer sur **🔄 Réinitialiser**
2. Une confirmation s'affiche :
   ```
   ⚠️ ATTENTION
   
   Voulez-vous vraiment réinitialiser toutes les validations ?
   
   Cette action supprimera toutes les validations enregistrées localement.
   
   Les données MongoDB et Cloudinary ne seront PAS affectées.
   ```
3. Cliquer sur **Annuler** pour garder vos validations
4. Cliquer sur **OK** pour tout supprimer

### Après réinitialisation

- Toutes les validations sont supprimées
- Progression retourne à "0 / 98"
- Tous les statuts retournent à "⏳ NON VALIDÉ"
- localStorage est vidé
- **MAIS** : MongoDB et Cloudinary ne sont PAS modifiés

---

## ⚠️ Points d'attention

### Doublons

**Problème détecté** : 29 photos sont utilisées par plusieurs plats différents.

**Exemple** : `IMG_9699_g5ubkl.jpg` est utilisée pour :
- Eau Gazeuse
- Escalope à la crème
- Soda
- Citronnade
- Côte à L'os Grillée
- Pizza Fruits de mer

**Solution** :
1. Pour chaque plat concerné, vérifier visuellement
2. Un seul de ces 6 plats a la bonne photo
3. Les 5 autres doivent être marqués **✗ PHOTO INCORRECTE**
4. Pour chaque incorrect, sélectionner la vraie photo depuis les candidates

### Photos génériques

Beaucoup de photos ont des noms génériques :
- `IMG_9699.jpg`
- `FB_IMG_1234567890123.jpg`
- `uuid-xxxx-xxxx-xxxx.jpg`

**→ Impossible de deviner la correspondance par le nom**

**→ Seule la validation visuelle humaine est fiable**

### Photos inaccessibles

4 URLs ont été détectées comme potentiellement inaccessibles lors des audits :
- Steak
- Pizza 4 Fromages sauce tomate
- Pâtes Fruits de Mer
- Pizza Saumon

**Si l'image ne charge pas** :
1. Un placeholder s'affiche
2. Vous pouvez quand même valider le plat
3. Marquer comme **✗ PHOTO INCORRECTE**
4. Sélectionner une photo candidate qui fonctionne

---

## 🎯 Stratégie recommandée

### Phase 1 : Traiter les doublons (priorité)

1. Filtre **🔁 Doublons**
2. Valider les ~29 plats concernés
3. Cela résout les conflits les plus critiques

### Phase 2 : Parcourir tous les plats

1. Filtre **Tous**
2. Parcourir les 98 plats un par un
3. Valider chaque photo visuellement

### Phase 3 : Terminer les restants

1. Filtre **⏳ À vérifier**
2. Valider les plats non encore traités

### Phase 4 : Révision

1. Filtres **✅ Correctes**, **❌ Incorrectes**, **🔄 Corrigées**
2. Relire vos validations
3. Corriger si nécessaire

### Phase 5 : Export final

1. Vérifier progression : **98 / 98**
2. Cliquer sur **📥 Exporter JSON**
3. Sauvegarder le fichier
4. Vérifier manuellement le JSON

---

## 🔒 Sécurité et garanties

### Ce que l'outil NE FAIT JAMAIS

- ❌ Modifier MongoDB
- ❌ Créer/supprimer des documents MongoDB
- ❌ Uploader des photos sur Cloudinary
- ❌ Supprimer des photos de Cloudinary
- ❌ Remplacer automatiquement les photos
- ❌ Envoyer les validations au serveur

### Ce que l'outil FAIT

- ✅ Lecture seule des données MongoDB
- ✅ Affichage des photos Cloudinary
- ✅ Sauvegarde locale dans le navigateur (localStorage)
- ✅ Export JSON téléchargé localement

### Vérification

Vous pouvez vérifier à tout moment dans MongoDB Compass :
- Aucun document modifié
- Aucune URL changée
- Aucune photo supprimée

---

## 📞 Besoin d'aide ?

### Problèmes courants

**L'outil ne charge pas les plats**
- Vérifier que le backend tourne (port 3000)
- Vérifier que vous êtes connecté en tant qu'admin
- Vérifier la console navigateur (F12)

**La photo ne s'affiche pas**
- Normal pour les 4 URLs cassées détectées
- Un placeholder s'affichera
- Vous pouvez quand même valider

**J'ai perdu mes validations**
- Vérifier localStorage (F12 → Application → Local Storage)
- Si vide : réimporter depuis un JSON exporté précédemment (fonctionnalité future)

**Je veux annuler une validation**
- Retourner sur le plat concerné
- Cliquer sur **✓ PHOTO CORRECTE** ou **✗ PHOTO INCORRECTE** pour changer
- Ou sélectionner une autre candidate

---

## ✅ Checklist finale

Avant de considérer le travail terminé :

- [ ] 98 / 98 plats validés
- [ ] 0 plats en statut **⏳ À vérifier**
- [ ] Tous les doublons traités
- [ ] JSON exporté et sauvegardé
- [ ] JSON vérifié manuellement
- [ ] Backup du JSON effectué

---

## 🔜 Prochaine étape

Après validation manuelle du JSON exporté :

1. Transmettre le JSON validé
2. Une étape séparée sera créée pour appliquer les corrections
3. Les modifications seront testées en développement
4. Puis appliquées en production après votre validation

**Important** : L'application des corrections sera traitée dans une mission séparée, avec toutes les sécurités nécessaires (backup MongoDB, tests, validation étape par étape).

---

Bonne validation ! 🍕📸
