# 📖 GUIDE D'UTILISATION — Interface de Validation Photos

**Interface:** `audit-mapping-photos.html`  
**Mode:** Validation manuelle READ-ONLY  
**Plats à valider:** 114

---

## 🚀 DÉMARRAGE RAPIDE

### Étape 1: Ouvrir l'interface

```bash
cd backend
start audit-mapping-photos.html
```

Ou double-cliquer sur le fichier dans l'explorateur Windows.

### Étape 2: Comprendre l'interface

L'interface affiche :
- **Header:** Titre et description de la mission
- **Stats:** Statistiques en temps réel
- **Filtres:** Recherche et filtres
- **Plats:** Liste des 114 plats avec leurs photos

---

## 📊 DASHBOARD (STATISTIQUES)

En haut de la page, vous verrez 6 cartes :

| Carte | Description |
|-------|-------------|
| **Total Plats** | Nombre total de plats (114) |
| **Haute Confiance** | Plats avec score ≥ 85 |
| **Moyenne Confiance** | Plats avec score 65-84 |
| **Faible Confiance** | Plats avec score 40-64 |
| **Conflits** | Photos assignées à plusieurs plats |
| **Validés** | Nombre de plats que vous avez validés |

**La carte "Validés" se met à jour en temps réel** à chaque validation.

---

## 🔍 FILTRES ET RECHERCHE

### Recherche par nom
```
Tapez dans le champ "🔍 Rechercher un plat..."
Exemples : "margherita", "poulet", "paella"
```

### Filtre par catégorie
```
Sélectionnez dans "Toutes catégories"
- Les Pizzas
- Pâtes
- Plats Espagnol
- Salade
- Volailles
- Viandes
- Fruits de mer
- Tacos
- MAkIOUB
- Supplement
- Soda
```

### Filtre par confiance
```
Sélectionnez dans "Toutes confiances"
- Haute
- Moyenne
- Faible
- Aucune
```

### Appliquer les filtres
Cliquez sur **"Filtrer"** après avoir fait vos sélections.

### Réinitialiser
Cliquez sur **"Réinitialiser"** pour tout effacer.

---

## 🍕 VALIDATION D'UN PLAT

### Structure d'une carte plat

Chaque plat est affiché dans une carte contenant :

```
┌─────────────────────────────────────────────────────┐
│ [NOM DU PLAT]                    [BADGE CONFIANCE]  │
│ Catégorie: ... | Prix: ... TND | ID: ...            │
│ Description: ...                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📸 PHOTO ACTUELLE          ⭐ PROPOSITION #1       │
│  [Image]                     [Image]                │
│                              Score: 85              │
│                              🟢 HIGH                │
│                              Détails:               │
│                              - Nom: 80%             │
│                              - Catégorie: 90%       │
│                              - ...                  │
│                              [✓ Valider] [✗ Rejeter]│
│                                                      │
│  PROPOSITION #2              PROPOSITION #3         │
│  [Image]                     [Image]                │
│  Score: 65                   Score: 45              │
│  [Actions]                   [Actions]              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Photo actuelle
- Encadré **bleu** avec label "📸 PHOTO ACTUELLE"
- C'est la photo actuellement assignée au plat dans MongoDB
- **Ne la modifiez jamais directement**

### Propositions
- Encadré **vert** pour la meilleure proposition (⭐ #1)
- Encadrés normaux pour les autres propositions
- Chaque proposition affiche :
  - Score total (sur 100)
  - Badge de confiance (HIGH, MEDIUM, LOW, NO_MATCH)
  - Détails des sous-scores
  - Raisons de la proposition

---

## ✓ VALIDER UNE PHOTO

### Quand valider ?

Cliquez sur **"✓ Valider"** quand :

✅ La photo correspond clairement au plat  
✅ L'image est de bonne qualité  
✅ Le cadrage est approprié  
✅ Vous êtes sûr de l'association  

### Ce qui se passe

1. La carte de la proposition devient **verte**
2. Le bouton change d'état
3. La validation est sauvegardée dans **localStorage**
4. Le compteur "Validés" s'incrémente
5. **Aucune modification MongoDB** (READ-ONLY)

### Exemple

```
Plat: Pizza Margherita
Proposition #1: photo-margherita.jpg
Score: 92 (HIGH)
Raisons:
- ✓ Nom compatible
- ✓ Catégorie compatible
- ✓ Photo validée dans audit précédent

Action: Cliquez "✓ Valider"
```

---

## ✗ REJETER UNE PHOTO

### Quand rejeter ?

Cliquez sur **"✗ Rejeter"** quand :

❌ La photo ne correspond pas au plat  
❌ La photo est floue ou de mauvaise qualité  
❌ La photo est une image stock générique  
❌ La photo représente un autre plat  

### Ce qui se passe

1. La carte de la proposition devient **grise** avec opacité réduite
2. La proposition est marquée comme rejetée
3. Le rejet est sauvegardé dans **localStorage**
4. La photo n'apparaîtra plus dans les exports
5. **Aucune modification MongoDB** (READ-ONLY)

### Exemple

```
Plat: Pizza Margherita
Proposition #2: IMG_random_0023.jpg
Score: 32 (NO_MATCH)
Image affichée: photo de pâtes

Action: Cliquez "✗ Rejeter"
```

---

## 🔎 ZOOM SUR UNE PHOTO

### Comment zoomer

Cliquez directement sur **n'importe quelle image** dans l'interface.

### Ce qui se passe

1. Une **modal plein écran** s'ouvre
2. L'image est affichée en grand format
3. Fond noir pour meilleure visibilité
4. **Cliquez n'importe où** pour fermer
5. Appuyez sur **ESC** pour fermer

### Utilité

- Examiner les détails de la photo
- Confirmer l'identité du plat
- Vérifier la qualité de l'image
- Comparer plusieurs photos

---

## 💾 EXPORTER LES VALIDATIONS

Une fois que vous avez validé plusieurs plats :

### Export JSON

1. Scrollez en bas de la page
2. Cliquez sur **"💾 Export JSON"**
3. Un fichier est téléchargé : `bizzart-mapping-validated-YYYY-MM-DD.json`

**Contenu:**
```json
{
  "exportedAt": "2026-08-18...",
  "mode": "READ_ONLY",
  "validations": [
    {
      "dishId": "...",
      "dishName": "Pizza Margherita",
      "category": "Les Pizzas",
      "currentImage": "https://...",
      "validatedImage": "https://...",
      "score": 92,
      "confidence": "HIGH",
      "validatedAt": "2026-08-18..."
    },
    ...
  ]
}
```

### Export CSV

1. Cliquez sur **"📄 Export CSV"**
2. Un fichier tableur est téléchargé : `bizzart-mapping-validated-YYYY-MM-DD.csv`

**Colonnes:**
```
Dish ID, Dish Name, Category, Current Image, Validated Image, Score, Confidence, Validated At
```

**Utilité:** Ouvrir dans Excel ou Google Sheets pour analyse.

---

## 🔄 RESET DES VALIDATIONS

### ⚠️ ATTENTION : Action destructive (pour les validations locales uniquement)

Si vous voulez **recommencer à zéro** :

1. Scrollez en bas de la page
2. Cliquez sur **"🔄 Reset"**
3. Une **confirmation** apparaît
4. Cliquez "OK" pour confirmer

### Ce qui se passe

- ✅ Toutes les validations localStorage sont effacées
- ✅ Le compteur "Validés" revient à 0
- ✅ Toutes les cartes redeviennent neutres
- ❌ **Aucune modification MongoDB** (toujours READ-ONLY)

### Conseil

Exportez en JSON/CSV **AVANT** de faire un Reset, pour sauvegarder votre travail.

---

## 💡 CONSEILS DE VALIDATION

### Stratégie recommandée

1. **Commencer par les catégories simples**
   - Les Pizzas (noms explicites)
   - Soda (facile à identifier)
   - Salade (visuellement distinctes)

2. **Utiliser les filtres**
   - Filtrer par catégorie pour rester concentré
   - Valider catégorie par catégorie

3. **Faire confiance aux scores**
   - Score ≥ 85 (HIGH) → très probable
   - Score 65-84 (MEDIUM) → vérifier visuellement
   - Score < 40 (NO_MATCH) → probablement incorrect

4. **Zoomer systématiquement**
   - Cliquez sur chaque photo avant de valider
   - Vérifiez les détails (ingrédients, présentation)

5. **Exporter régulièrement**
   - Exportez toutes les 20-30 validations
   - Sauvegardez les exports JSON
   - Évitez de perdre votre travail

### Ce qu'il faut vérifier

✅ **Correspondance plat ↔ photo**
- Le nom du plat correspond-il à l'image ?
- Les ingrédients visibles correspondent-ils à la description ?

✅ **Qualité de l'image**
- Photo nette et bien cadrée ?
- Éclairage approprié ?
- Pas de logo ou watermark gênant ?

✅ **Cohérence avec la catégorie**
- Une pizza ressemble bien à une pizza ?
- Un plat de fruits de mer contient bien fruits de mer ?

✅ **Éviter les photos stock**
- Photos trop "parfaites" ou génériques ?
- Photos visiblement téléchargées d'internet ?

---

## 🔐 SAUVEGARDE AUTOMATIQUE

### localStorage

Vos validations sont automatiquement sauvegardées dans le **localStorage** du navigateur.

**Avantages:**
- ✅ Pas besoin de serveur
- ✅ Persist entre sessions
- ✅ Rechargez la page sans perdre votre travail
- ✅ Fermez le navigateur et reprenez plus tard

**Limitations:**
- ⚠️ Spécifique au navigateur (Chrome, Firefox, etc.)
- ⚠️ Spécifique à la machine
- ⚠️ Peut être effacé si vous nettoyez les données du navigateur
- ⚠️ Limité à ~5-10 MB

### Bonnes pratiques

1. **Utilisez toujours le même navigateur** pour continuer votre travail
2. **Ne nettoyez pas les données du navigateur** pendant la validation
3. **Exportez régulièrement** en JSON pour avoir une sauvegarde externe
4. **Conservez les exports** dans un dossier dédié

---

## 📊 SUIVI DE PROGRESSION

### Comment savoir où vous en êtes ?

1. **Compteur "Validés"** dans le dashboard
   - Exemple : 37 / 114 validés

2. **Filtrer les plats non validés**
   - Pas de filtre automatique, mais vous pouvez :
   - Parcourir la liste de haut en bas
   - Chercher visuellement les cartes sans bordure verte

3. **Consulter l'export JSON**
   - Le nombre d'entrées dans `validations[]` = plats validés

### Estimation du temps

- **Par plat:** 30 secondes à 2 minutes
- **Total 114 plats:** 1 à 4 heures
- **Dépend de:** Votre connaissance du menu, qualité des propositions

---

## 🆘 PROBLÈMES COURANTS

### "Les images ne s'affichent pas"

**Cause:** URLs Cloudinary non accessibles ou problème réseau

**Solution:**
1. Vérifiez votre connexion internet
2. Vérifiez que Cloudinary est accessible
3. Rechargez la page (Ctrl+R ou F5)

### "Mes validations ont disparu"

**Cause:** localStorage effacé ou navigateur différent

**Solution:**
1. Vérifiez que vous utilisez le même navigateur
2. Restaurez depuis votre dernier export JSON
3. Recommencez la validation (utilisez Reset)

### "Le bouton Valider ne fonctionne pas"

**Cause:** JavaScript désactivé ou erreur console

**Solution:**
1. Ouvrez la console (F12)
2. Vérifiez les erreurs JavaScript
3. Rechargez la page
4. Essayez un autre navigateur

### "Aucune proposition pour un plat"

**Cause:** Score trop faible (< 40) pour toutes les photos

**Solution:**
- C'est normal pour certains plats
- Le système n'a trouvé aucune correspondance fiable
- Laissez ce plat non validé
- Il sera identifié comme "orphan" dans le rapport

---

## 📞 WORKFLOW COMPLET

### Session de validation (exemple)

```
09:00 - Ouverture de audit-mapping-photos.html
09:05 - Filtre: Catégorie "Les Pizzas" (17 plats)
09:10 - Validation Pizza Margherita (✓ Valider #1)
09:12 - Validation Pizza Thon (✗ Rejeter #1, ✓ Valider #2)
09:14 - Validation Pizza 4 Fromages (✓ Valider #1)
...
10:00 - Export JSON (17 pizzas validées)
10:05 - Filtre: Catégorie "Pâtes" (11 plats)
...
11:00 - Export JSON (28 plats validés)
11:00 - Pause ☕
11:15 - Filtre: Catégorie "Plats Espagnol" (8 plats)
...
```

### Étapes recommandées

1. **Préparation** (5 min)
   - Ouvrir l'interface
   - Lire ce guide
   - Comprendre les scores

2. **Validation par catégories** (2-3h)
   - Les Pizzas → Export
   - Pâtes → Export
   - Plats Espagnol → Export
   - etc.

3. **Vérification finale** (15 min)
   - Revoir les plats avec LOW confidence
   - Vérifier les propositions incertaines
   - Export JSON final

4. **Sauvegarde** (5 min)
   - Copier tous les exports JSON
   - Les ranger dans un dossier sécurisé
   - Prêt pour Phase 2 (application)

---

## ✅ CHECKLIST DE FIN

Avant de considérer la validation terminée :

- [ ] Les 114 plats ont été examinés
- [ ] Chaque plat a soit :
  - [ ] Une photo validée (✓)
  - [ ] Aucune proposition acceptable (laissé non validé)
- [ ] Export JSON final effectué
- [ ] Export CSV final effectué
- [ ] Fichiers sauvegardés en lieu sûr
- [ ] Prêt pour Phase 2 (application des mappings)

---

## 🎓 RÉSUMÉ

### Commandes principales

| Action | Méthode |
|--------|---------|
| **Ouvrir** | Double-clic sur `audit-mapping-photos.html` |
| **Rechercher** | Taper dans le champ recherche |
| **Filtrer** | Sélectionner catégorie/confiance puis "Filtrer" |
| **Zoomer** | Cliquer sur une image |
| **Valider** | Cliquer "✓ Valider" sous une proposition |
| **Rejeter** | Cliquer "✗ Rejeter" sous une proposition |
| **Exporter** | Cliquer "💾 Export JSON" ou "📄 Export CSV" |
| **Reset** | Cliquer "🔄 Reset" (avec confirmation) |

### Points clés

- ✅ Travail 100% local dans le navigateur
- ✅ Sauvegarde automatique localStorage
- ✅ Aucune modification MongoDB
- ✅ Export JSON/CSV à tout moment
- ✅ Zoom sur toutes les images
- ✅ Progression visible en temps réel

---

**BON COURAGE POUR LA VALIDATION !** 🍕🎉

Une fois terminée, consultez le fichier d'export JSON pour la Phase 2 (application des mappings validés).
