# 🤖 CONFIGURATION VISION IA - AUDIT AUTOMATISÉ

## 🎯 OBJECTIF

Activer l'analyse automatique des 35 photos uniques du menu BIZZ'ART par Vision IA.

**Aucune validation manuelle requise** - le système analyse et classifie automatiquement.

---

## 🆓 OPTION RECOMMANDÉE : Google Gemini (GRATUIT)

### Avantages
- ✅ **100% gratuit** jusqu'à 60 requêtes/minute
- ✅ Modèle `gemini-1.5-flash` très performant
- ✅ API simple et rapide
- ✅ Aucun coût pour 35 photos

### Étape 1 : Obtenir une clé API

1. Allez sur https://makersuite.google.com/app/apikey
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"**
4. Copiez la clé générée (format : `AIzaSy...`)

### Étape 2 : Configurer la clé

Ouvrez le fichier `.env` du backend :

```
c:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant\backend\.env
```

Ajoutez cette ligne à la fin :

```bash
# Vision IA (Google Gemini)
GOOGLE_API_KEY=VOTRE_CLE_ICI
```

Remplacez `VOTRE_CLE_ICI` par votre vraie clé API.

### Étape 3 : Lancer l'audit

```powershell
cd c:\Users\boukh\OneDrive\Bureau\restaurant\bizzart-restaurant\backend
npm run audit:vision
```

---

## 💰 ALTERNATIVES (PAYANTES)

### Option 2 : OpenAI GPT-4 Vision

**Coût estimé** : ~$0.35 pour 35 photos

1. Obtenez une clé sur https://platform.openai.com/api-keys
2. Ajoutez dans `.env` :

```bash
OPENAI_API_KEY=sk-...
```

3. Modifiez le code pour utiliser OpenAI au lieu de Gemini

### Option 3 : Anthropic Claude Vision

**Coût estimé** : ~$0.11 pour 35 photos

1. Obtenez une clé sur https://console.anthropic.com/
2. Ajoutez dans `.env` :

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

3. Modifiez le code pour utiliser Anthropic

---

## ⚡ UTILISATION

Une fois configuré :

```powershell
# Audit complet automatisé
npm run audit:vision
```

Le script va :
1. ✅ Analyser les 35 photos avec Vision IA
2. ✅ Matcher automatiquement avec les 98 plats
3. ✅ Classifier chaque plat en 5 catégories
4. ✅ Détecter les doublons problématiques
5. ✅ Générer 4 rapports complets

---

## 📊 RAPPORTS GÉNÉRÉS

Le système génère automatiquement :

### 1. `AUDIT-VISUEL-AI-FINAL-YYYY-MM-DD.json`
Rapport JSON complet avec toutes les analyses Vision IA

### 2. `INVENTAIRE-PHOTOS-MANQUANTES-AI-YYYY-MM-DD.csv`
Liste CSV des plats nécessitant une nouvelle photo

### 3. `RAPPORT-DOUBLONS-AI-YYYY-MM-DD.json`
Analyse des photos utilisées par plusieurs plats

### 4. `RAPPORT-AUDIT-AI-YYYY-MM-DD.md`
Rapport Markdown lisible avec statistiques

---

## 💾 CACHE

Le système met en cache les analyses pour éviter de re-analyser les mêmes photos :

```
backend/vision-analysis-cache.json
```

Si vous voulez forcer une nouvelle analyse :
1. Supprimez ce fichier
2. Relancez `npm run audit:vision`

---

## 🔒 SÉCURITÉ

### ✅ Mode lecture seule strict

Le script **NE MODIFIE JAMAIS** :
- MongoDB
- Cloudinary
- MenuItems
- Media
- Photos existantes

### ✅ Données locales uniquement

Les rapports sont générés dans `backend/` :
- Aucune modification de production
- Aucune migration automatique
- Aucune suppression de photos

---

## ⚠️ DÉPANNAGE

### Erreur : `VISION_PROVIDER_MISSING`

**Cause** : Aucune clé API Vision configurée

**Solution** :
1. Ajoutez `GOOGLE_API_KEY` dans `.env`
2. Relancez `npm run audit:vision`

### Erreur : `Unable to verify certificate`

**Cause** : Problème SSL réseau

**Solution** :
```powershell
npm install @google/generative-ai --strict-ssl=false
```

### Erreur : `Rate limit exceeded`

**Cause** : Trop de requêtes API

**Solution** : Le script inclut déjà des délais (1s entre chaque photo). Si l'erreur persiste, attendez quelques minutes.

### Photos non analysées

**Cause** : Fichiers photo manquants

**Solution** :
```powershell
cd backend
npm run audit:visual  # Re-télécharge les 35 photos
```

---

## 📈 PERFORMANCES

### Google Gemini (gratuit)
- ⏱️ Temps : ~2-3 minutes pour 35 photos
- 💰 Coût : **$0.00**
- 🚀 Limite : 60 requêtes/minute

### OpenAI GPT-4 Vision
- ⏱️ Temps : ~1-2 minutes pour 35 photos
- 💰 Coût : ~$0.35
- 🚀 Limite : Selon votre tier

### Anthropic Claude Vision
- ⏱️ Temps : ~1-2 minutes pour 35 photos
- 💰 Coût : ~$0.11
- 🚀 Limite : Selon votre tier

---

## ✅ VALIDATION

Après l'audit automatisé :

1. Consultez le rapport Markdown
2. Vérifiez l'inventaire CSV des photos manquantes
3. Examinez les cas **INCERTAINS** (confidence < 0.7)
4. Validez les doublons **HIGH priority**

**Seulement après validation**, planifiez la migration.

---

## 🆘 SUPPORT

En cas de problème :

1. Vérifiez que `.env` contient `GOOGLE_API_KEY`
2. Vérifiez que les 35 photos sont dans `backend/audit-photos/`
3. Consultez les logs du terminal
4. Vérifiez le fichier cache `vision-analysis-cache.json`

---

**Date de création** : 2026-08-18  
**Version** : 1.0  
**Statut** : ✅ Prêt à l'utilisation (configuration API requise)
