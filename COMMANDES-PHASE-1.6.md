# 📋 COMMANDES PHASE 1.6

**Version:** 2.0  
**Date:** 2026-08-18

---

## 🚀 COMMANDES PRINCIPALES

### 1. Relancer audit exhaustif (si besoin)

```bash
cd backend
npx ts-node src/seed/audit-exhaustif-sources-images.ts
```

**Output:**
- `photo-inventory-complete.json`
- `cloudinary-inventory-complete.json`
- `photo-source-audit.json`

---

### 2. Relancer reconstruction mapping v2

```bash
cd backend
npx ts-node src/seed/reconstruction-photo-mapping-v2.ts
```

**Output:**
- `photo-mapping-proposals-v2.json`
- `photo-mapping-validation-v2.json`
- `photo-mapping-proposals-v2.csv`
- `audit-mapping-photos-v2.html`

---

### 3. Ouvrir interface validation ⭐

```bash
cd backend
start audit-mapping-photos-v2.html
```

Ou:
- Double-clic sur le fichier
- Clic droit → Ouvrir avec → Navigateur

---

## 📁 FICHIERS GÉNÉRÉS

### Inventaires (Phase 1.5)

| Fichier | Taille | Description |
|---------|--------|-------------|
| `photo-inventory-complete.json` | ~200 KB | 276 photos |
| `cloudinary-inventory-complete.json` | ~150 KB | 186 Cloudinary |
| `photo-source-audit.json` | ~500 KB | Toutes sources |

### Mapping V2 (Phase 1.6)

| Fichier | Taille | Description |
|---------|--------|-------------|
| `audit-mapping-photos-v2.html` | 1.4 MB | Interface validation |
| `photo-mapping-proposals-v2.json` | 2.3 MB | Propositions complètes |
| `photo-mapping-validation-v2.json` | 51 KB | Template validations |
| `photo-mapping-proposals-v2.csv` | 34 KB | Export tableur |

---

## 🔍 CONSULTER LES RÉSULTATS

### Statistiques JSON

```powershell
# Statistiques proposals
Get-Content backend\photo-mapping-proposals-v2.json -Raw | ConvertFrom-Json | Select-Object -ExpandProperty summary | ConvertTo-Json

# Liste conflicts
Get-Content backend\photo-mapping-proposals-v2.json -Raw | ConvertFrom-Json | Select-Object -ExpandProperty mappings | Where-Object { $_.status -eq 'CONFLICT' } | Select-Object -ExpandProperty dish | Select-Object nameFr, categoryName

# Liste placeholder
Get-Content backend\photo-mapping-proposals-v2.json -Raw | ConvertFrom-Json | Select-Object -ExpandProperty mappings | Where-Object { $_.status -eq 'PLACEHOLDER' } | Select-Object -ExpandProperty dish | Select-Object nameFr, categoryName
```

### Statistiques CSV

```powershell
Import-Csv backend\photo-mapping-proposals-v2.csv | Group-Object 'Current Status' | Select-Object Name, Count | Format-Table
```

---

## 💾 APRÈS VALIDATION

### Export validations

Interface HTML:
1. Valider les 114 plats
2. Cliquer **"💾 Export JSON"**
3. Fichier téléchargé: `bizzart-mapping-validated-v2-YYYY-MM-DD.json`

### Vérifier export

```powershell
# Compter validations
$data = Get-Content "bizzart-mapping-validated-v2-2026-08-18.json" -Raw | ConvertFrom-Json
Write-Host "Total validations: $($data.validations.Count)"
Write-Host "Confirmed: $(($data.validations | Where-Object { $_.status -eq 'CONFIRMED' }).Count)"
Write-Host "Refused: $(($data.validations | Where-Object { $_.status -eq 'REFUSED' }).Count)"
```

---

## 🔄 WORKFLOW COMPLET

### Phase 1.5 (Audit exhaustif)

```bash
cd backend
npx ts-node src/seed/audit-exhaustif-sources-images.ts
```

**Résultat:**
- 276 photos trouvées
- 2 historically validated
- 30 conflicts détectés

### Phase 1.6 (Reconstruction v2)

```bash
cd backend
npx ts-node src/seed/reconstruction-photo-mapping-v2.ts
```

**Résultat:**
- 2 CONFIRMED_HISTORICAL
- 90 CONFLICT
- 16 PLACEHOLDER
- Interface HTML générée

### Validation humaine

```bash
cd backend
start audit-mapping-photos-v2.html
```

**Actions:**
- Valider 114 plats
- Export JSON
- Sauvegarder fichier

### Phase 2 (après validation) ⚠️

⚠️ **PAS ENCORE - ATTENDRE VALIDATION COMPLÈTE**

```bash
# À créer ultérieurement
cd backend
npx ts-node src/seed/apply-validated-mappings.ts
```

---

## 🔒 VÉRIFICATIONS READ-ONLY

### Vérifier qu'aucune modification MongoDB

```bash
# Compter plats
mongo bizzart --eval "db.menuitems.count()"

# Vérifier images actuelles (doivent être identiques)
mongo bizzart --eval "db.menuitems.find({}, {name: 1, image: 1}).limit(5)"
```

**Résultat attendu:** Toujours 114 plats, images identiques.

### Vérifier Cloudinary

**Aucun appel API Cloudinary** ne doit être fait par les scripts Phase 1.5 et 1.6.

**Vérification:** Pas d'upload, pas de delete, pas de transformation.

---

## 🐛 DÉPANNAGE

### Script ne trouve pas inventory

**Erreur:**
```
photo-inventory-complete.json not found!
```

**Solution:**
```bash
cd backend
npx ts-node src/seed/audit-exhaustif-sources-images.ts
```

### MongoDB connection failed

**Erreur:**
```
MongoServerSelectionError: connect ECONNREFUSED
```

**Solution:**
1. Vérifier MongoDB est démarré: `mongod --version`
2. Vérifier `.env`: `MONGODB_URI=mongodb://localhost:27017/bizzart`
3. Tester connexion: `mongo bizzart --eval "db.version()"`

### Interface HTML ne charge pas

**Problème:** Images ne s'affichent pas

**Solution:**
1. Vérifier connexion internet (Cloudinary URLs)
2. Ouvrir console navigateur (F12)
3. Vérifier erreurs CORS ou 404

### Erreur TypeScript compilation

**Erreur:**
```
TSError: Unable to compile TypeScript
```

**Solution:**
```bash
cd backend
npm install
npx tsc --noEmit
```

---

## 📊 STATISTIQUES ATTENDUES

### Phase 1.5 (Audit exhaustif)

```
Total photos: 276
Cloudinary: 186
Local: 90
Historically validated: 2
```

### Phase 1.6 (Reconstruction v2)

```
Total plats: 114
CONFIRMED_HISTORICAL: 2
HIGH_CONFIDENCE: 0
MEDIUM_CONFIDENCE: 0
LOW_CONFIDENCE: 4
NO_MATCH: 2
PLACEHOLDER: 16
CONFLICT: 90
```

**Si différent:** Vérifier données MongoDB ou inventaire.

---

## ✅ CHECKLIST

### Avant validation

- [x] Audit exhaustif exécuté
- [x] 276 photos inventoriées
- [x] Reconstruction v2 exécutée
- [x] Interface HTML générée
- [x] Fichiers vérifiés (ls backend/*v2*)
- [ ] **Interface HTML ouverte**
- [ ] **Validation humaine commencée**

### Après validation

- [ ] 114 plats validés
- [ ] Export JSON téléchargé
- [ ] Fichier JSON vérifié
- [ ] Fichier JSON sauvegardé
- [ ] Prêt pour Phase 2

---

## 📞 SUPPORT

### Documentation disponible

- `backend/RAPPORT-PHASE-1.5-AUDIT-EXHAUSTIF.md`
- `backend/RAPPORT-PHASE-1.6-RECONSTRUCTION-V2.md`
- `PHASE-1.5-TERMINE.md`
- `PHASE-1.6-PRET-VALIDATION.md`

### Fichiers logs

Les scripts affichent des logs détaillés:
```
[LOAD] Loading photo inventory...
[MONGODB] Fetching dishes...
[MATCHING] Computing matches...
[REPORT] Generating reports...
```

**Si erreur:** Copier le log complet pour diagnostic.

---

**Document créé le:** 2026-08-18  
**Version:** 2.0  
**Status:** ✅ Complet
