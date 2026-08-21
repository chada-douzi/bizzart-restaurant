# 🤖 AUDIT VISUEL 100% AUTOMATISÉ - BIZZ'ART

## 📋 VUE D'ENSEMBLE

Système complet d'analyse automatique des 35 photos uniques du menu par **Vision IA**.

**Aucune validation manuelle requise** pour l'analyse initiale.

---

## ✅ CE QUI A ÉTÉ CRÉÉ

### 1. **Script d'audit automatisé** (`automated-vision-audit.ts`)

Analyse automatique complète avec Google Gemini Vision (gratuit).

**Fonctionnalités** :
- ✅ Analyse visuelle IA des 35 photos
- ✅ Détection automatique du contenu (plat, ingrédients, type)
- ✅ Identification de l'origine (vraie photo / stock / incertaine)
- ✅ Matching automatique avec les 98 plats
- ✅ Classification en 5 catégories
- ✅ Détection des doublons problématiques
- ✅ Génération de 4 rapports complets
- ✅ Cache des analyses (évite re-analyser)
- ✅ Mode lecture seule stricte

### 2. **Intégration Google Gemini Vision**

Package installé : `@google/generative-ai`

**Avantages** :
- 🆓 Gratuit jusqu'à 60 requêtes/minute
- ⚡ Rapide (~2-3 minutes pour 35 photos)
- 🎯 Précis pour l'analyse de plats de restaurant

### 3. **Documentation complète**

- `CONFIGURATION-VISION-IA.md` : Guide de configuration API
- `README-AUDIT-AUTOMATISE.md` : Ce fichier

### 4. **Script npm** ajouté

```bash
npm run audit:vision
```

---

## 🚀 DÉMARRAGE RAPIDE

### Étape 1 : Obtenir une clé API Google Gemini (gratuit)

1. Allez sur https://makersuite.google.com/app/apikey
2. Cliquez sur "Create API Key"
3. Copiez la clé générée

### Étape 2 : Configurer

Ajoutez dans `backend/.env` :

```bash
GOOGLE_API_KEY=VOTRE_CLE_ICI
```

### Étape 3 : Lancer l'audit

```powershell
cd c:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant\backend
npm run audit:vision
```

---

## 📊 WORKFLOW COMPLET

```
┌─────────────────────────────────────────┐
│  1. CHARGEMENT DONNÉES                  │
│     - 98 MenuItems MongoDB              │
│     - 35 photos uniques                 │
│     - Cache analyses précédentes        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. ANALYSE VISION IA                   │
│     Pour chaque photo :                 │
│     - Contenu visuel                    │
│     - Type de plat                      │
│     - Ingrédients visibles              │
│     - Origine estimée                   │
│     - Confiance (0-1)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. MATCHING AUTOMATIQUE                │
│     Pour chaque photo x 98 plats :      │
│     - Score de compatibilité            │
│     - Niveau (HIGH/MEDIUM/LOW)          │
│     - Top 10 matches                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. CLASSIFICATION                      │
│     Chaque plat classé en :             │
│     - PHOTO_REELLE_BIZZART_CORRECTE     │
│     - PHOTO_REELLE_BIZZART_MAUVAIS_PLAT │
│     - PHOTO_STOCK_GENERIQUE             │
│     - PHOTO_INCERTAINE                  │
│     - PHOTO_MANQUANTE                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. ANALYSE DOUBLONS                    │
│     Photos utilisées plusieurs fois :   │
│     - Criticité (HIGH/MEDIUM/LOW)       │
│     - Assignments corrects/incorrects   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. GÉNÉRATION RAPPORTS                 │
│     - JSON complet                      │
│     - CSV inventaire                    │
│     - JSON doublons                     │
│     - Markdown lisible                  │
└─────────────────────────────────────────┘
```

---

## 📄 RAPPORTS GÉNÉRÉS

### 1. `AUDIT-VISUEL-AI-FINAL-YYYY-MM-DD.json`

Rapport JSON complet contenant :
- Métadonnées (restaurant, date, provider)
- Statistiques globales
- Analyse détaillée des 35 photos
- Classification des 98 plats
- Analyse des doublons

### 2. `INVENTAIRE-PHOTOS-MANQUANTES-AI-YYYY-MM-DD.csv`

Format CSV prêt à l'emploi avec :
- ID du plat
- Nom FR
- Catégorie
- Photo actuelle
- Classification
- Score de match
- Raison

**Utilisable directement** pour planifier les nouvelles photos.

### 3. `RAPPORT-DOUBLONS-AI-YYYY-MM-DD.json`

Analyse des 29 photos utilisées plusieurs fois :
- Nombre d'utilisations
- Plats actuellement associés
- Matches corrects détectés
- Assignments incorrects
- Niveau de criticité

### 4. `RAPPORT-AUDIT-AI-YYYY-MM-DD.md`

Rapport Markdown lisible avec :
- Statistiques visuelles
- Tableaux de classification
- Actions recommandées
- Avertissements de sécurité

---

## 🎯 CLASSIFICATION DES 98 PLATS

Chaque plat est automatiquement classifié :

### ✅ PHOTO_REELLE_BIZZART_CORRECTE
Photo détectée comme vraie photo Bizz'Art **ET** correspondant au plat.

**Action** : Aucune - photo correcte

### ⚠️ PHOTO_REELLE_BIZZART_MAUVAIS_PLAT
Photo détectée comme vraie photo Bizz'Art **MAIS** correspondant à un autre plat.

**Action** : Réassigner la photo au bon plat

### 📦 PHOTO_STOCK_GENERIQUE
Photo détectée comme générique ou stock.

**Action** : Remplacer par une vraie photo Bizz'Art

### ❓ PHOTO_INCERTAINE
Origine ou contenu incertain.

**Action** : Vérification manuelle puis photographier si nécessaire

### ❌ PHOTO_MANQUANTE
Aucune photo compatible trouvée.

**Action** : Photographier le plat

---

## 💾 CACHE DES ANALYSES

Le système crée un fichier cache :

```
backend/vision-analysis-cache.json
```

**Avantages** :
- ✅ Évite de re-analyser les mêmes photos
- ✅ Économise les appels API
- ✅ Accélère les exécutions suivantes

**Pour forcer une nouvelle analyse** :
1. Supprimez le fichier cache
2. Relancez `npm run audit:vision`

---

## 🔒 GARANTIES DE SÉCURITÉ

### ✅ Mode lecture seule stricte

Le script **NE PEUT PAS** :
- ❌ Modifier MongoDB
- ❌ Supprimer des MenuItems
- ❌ Modifier Cloudinary
- ❌ Supprimer des photos
- ❌ Changer les associations
- ❌ Lancer une migration

### ✅ Le script PEUT SEULEMENT :
- ✅ Lire MongoDB (lecture seule)
- ✅ Lire les 35 photos locales
- ✅ Appeler l'API Vision (analyse)
- ✅ Créer des fichiers de rapport locaux
- ✅ Sauvegarder un cache local

---

## 📊 EXEMPLE DE RÉSULTAT

```
========================================
📊 RÉSUMÉ DE L'AUDIT AUTOMATISÉ
========================================

98 plats analysés
35 photos uniques
35 photos analysées par Vision IA

✅ Photos vraies Bizz'Art : 18
🟡 Probablement Bizz'Art : 12
📦 Photos stock : 3
❓ Incertaines : 2

✅ Plats photo correcte : 32
⚠️  Plats mauvais plat : 14
❌ Plats photo manquante : 52

🔁 Doublons critiques : 8

========================================
```

---

## ⚡ PERFORMANCES

### Première exécution
- ⏱️ Temps : ~2-3 minutes (35 photos)
- 📡 Appels API : 35 requêtes
- 💾 Cache : créé automatiquement

### Exécutions suivantes
- ⏱️ Temps : ~10-20 secondes
- 📡 Appels API : 0 (utilise le cache)
- 💾 Cache : réutilisé

---

## 🔄 DIFFÉRENCE AVEC L'ANCIEN SYSTÈME

### ❌ Ancien système (manuel)
- Interface HTML avec 35 photos
- Classification manuelle une par une
- Sélection manuelle des plats correspondants
- ~30-60 minutes de travail humain
- Risque d'erreur humaine

### ✅ Nouveau système (automatisé)
- 100% automatique avec Vision IA
- Aucune intervention manuelle
- Matching automatique avec les 98 plats
- ~2-3 minutes d'exécution
- Analyse objective et reproductible

---

## 🆘 DÉPANNAGE

### `VISION_PROVIDER_MISSING`

**Cause** : Pas de clé API configurée

**Solution** :
```bash
# Ajoutez dans backend/.env
GOOGLE_API_KEY=votre_clé_ici
```

### `Rate limit exceeded`

**Cause** : Trop de requêtes API

**Solution** : Attendez 1 minute, le script inclut déjà des délais

### `Photo file not found`

**Cause** : Photos manquantes dans `audit-photos/`

**Solution** :
```bash
npm run audit:visual  # Re-télécharge les photos
```

---

## 📞 COMMANDES DISPONIBLES

```bash
# Audit automatisé complet
npm run audit:vision

# Audit technique initial (si besoin)
npm run audit:visual

# Backup MongoDB (avant migration)
npm run backup:mongodb
```

---

## ✅ CHECKLIST AVANT MIGRATION

- [ ] Audit automatisé exécuté
- [ ] Les 4 rapports générés
- [ ] Inventaire CSV consulté
- [ ] Cas INCERTAINS vérifiés
- [ ] Doublons HIGH examinés
- [ ] Backup MongoDB confirmé
- [ ] Aucune modification production effectuée
- [ ] **Validation finale obtenue**

---

## ⚠️ IMPORTANT

**CE SCRIPT EST UN AUDIT UNIQUEMENT**

- ✅ Il analyse et recommande
- ❌ Il ne modifie RIEN en production

**La migration sera une étape séparée** nécessitant votre autorisation explicite.

---

**Date de création** : 2026-08-18  
**Version** : 1.0  
**Statut** : ✅ Prêt à l'utilisation (configuration API requise)  
**Fournisseur Vision** : Google Gemini (gratuit)
