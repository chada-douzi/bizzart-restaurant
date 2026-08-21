# 📋 Rapport de Validation Photos BIZZ'ART

**Date:** 2026-08-19
**Restaurant:** BIZZ'ART Monastir
**Total Photos:** 35

## 📊 Résumé de Classification

| Groupe | Nombre | Description |
|--------|--------|-------------|
| **A - Confirmées BIZZ'ART** | 1 | Photos authentiques avec logo visible |
| **B - Stock/Générique** | 1 | À supprimer ou remplacer |
| **C - Révision Manuelle** | 6 | Origine incertaine, validation requise |
| **D - Non Analysées** | 27 | Quota dépassé, analyse manuelle |
| **Doublons HIGH** | 11 | Priorité critique |
| **Doublons MEDIUM** | 18 | Priorité moyenne |

## ⚠️ RÈGLES IMPORTANTES

- **NE PAS** considérer un score LOW comme une validation automatique
- **NE PAS** associer automatiquement une photo stock à un plat
- **NE PAS** modifier MongoDB/Cloudinary sans validation manuelle
- **VALIDER** manuellement toutes les photos du groupe C
- **ANALYSER** manuellement toutes les photos du groupe D

## ✅ Groupe A - Photos Confirmées BIZZ'ART (1)

### photo_12
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060796/bizzart/menu/FB_IMG_1786831504871_bopbcd.jpg
- **Utilisée par:** 2 plat(s)
- **Plat détecté:** Tagliatelles à la crème de pistache et burrata
- **Confiance:** 95%
- **Meilleur match:** Lasagne Fruits De Mer (score: 0.57)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Photo authentique BIZZ'ART confirmée (confiance: 95%). Logo visible dans l'image.

## 🚫 Groupe B - Photos Stock/Génériques (1)

**Action recommandée:** Supprimer ces associations ou remplacer par de vraies photos BIZZ'ART

### photo_3
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060780/bizzart/menu/DDBA871E-ADDC-4602-AA42-E875DD1D7559_ao2cts.png
- **Utilisée par:** 4 plat(s)
- **Plat détecté:** Assiette de grillades mixtes / Plateau de viandes grillées
- **Confiance:** 95%
- **⚠️ Doublon:** HIGH
- **Notes:** Photo stock/générique détectée (confiance: 95%). À supprimer du mapping ou remplacer par photo réelle.

## ❓ Groupe C - Révision Manuelle Requise (6)

**Action requise:** Valider manuellement chaque photo

### photo_2
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060804/bizzart/menu/IMG_0237_nkagke.jpg
- **Utilisée par:** 4 plat(s)
- **Plat détecté:** Tagliatelles à la sauce crémeuse, poulet, burrata et fruits à coque
- **Type:** Pâtes
- **Origine détectée:** INCERTAINE
- **Confiance:** 95%
- **Meilleur match:** Pâtes à L'italienne (score: 0.57, niveau: LOW)
- **⚠️ Doublon:** HIGH
- **Notes:** Origine incertaine (confiance: 95%). Plat détecté: "Tagliatelles à la sauce crémeuse, poulet, burrata et fruits à coque". Validation manuelle nécessaire.

### photo_20
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060791/bizzart/menu/FB_IMG_1786831387595_vrtvut.jpg
- **Utilisée par:** 2 plat(s)
- **Plat détecté:** Spaghetti aux crevettes / Pâtes aux fruits de mer
- **Type:** Pâtes
- **Origine détectée:** INCERTAINE
- **Confiance:** 95%
- **Meilleur match:** Pâtes Fruits de Mer (score: 0.63, niveau: LOW)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Origine incertaine (confiance: 95%). Plat détecté: "Spaghetti aux crevettes / Pâtes aux fruits de mer". Validation manuelle nécessaire.

### photo_24
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060807/bizzart/menu/IMG_9699_g5ubkl.jpg
- **Utilisée par:** 6 plat(s)
- **Plat détecté:** Penne au pesto et crevettes
- **Type:** Pâtes
- **Origine détectée:** INCERTAINE
- **Confiance:** 95%
- **Meilleur match:** Pâtes sauce pesto (score: 0.64, niveau: LOW)
- **⚠️ Doublon:** HIGH
- **Notes:** Origine incertaine (confiance: 95%). Plat détecté: "Penne au pesto et crevettes". Validation manuelle nécessaire.

### photo_27
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060792/bizzart/menu/FB_IMG_1786831392186_u0ikej.jpg
- **Utilisée par:** 1 plat(s)
- **Plat détecté:** Citronnade / Boisson fraîche au citron et menthe
- **Type:** Boisson
- **Origine détectée:** INCERTAINE
- **Confiance:** 95%
- **Meilleur match:** Filet de boeuf sauce au choix (score: 0.21, niveau: LOW)
- **Notes:** Origine incertaine (confiance: 95%). Plat détecté: "Citronnade / Boisson fraîche au citron et menthe". Validation manuelle nécessaire.

### photo_4
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060757/bizzart/menu/r07qxo_-_R_Download_2_evr2vc.jpg
- **Utilisée par:** 1 plat(s)
- **Plat détecté:** Plat Terre et Mer (Surf and Turf) au fromage fondu et gambas
- **Type:** Viande
- **Origine détectée:** INCERTAINE
- **Confiance:** 85%
- **Meilleur match:** Côtelette d'agneau (score: 0.56, niveau: LOW)
- **Notes:** Origine incertaine (confiance: 85%). Plat détecté: "Plat Terre et Mer (Surf and Turf) au fromage fondu et gambas". Validation manuelle nécessaire.

### photo_8
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060776/bizzart/menu/CE03FC6E-28EB-438B-A580-ACDE0EE43DB5_mc3e21.png
- **Utilisée par:** 3 plat(s)
- **Plat détecté:** Émincé de viande sauce forestière / poivre avec assortiment d'accompagnements
- **Type:** Viande
- **Origine détectée:** INCERTAINE
- **Confiance:** 90%
- **Meilleur match:** Filet de boeuf sauce au choix (score: 0.58, niveau: LOW)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Origine incertaine (confiance: 90%). Plat détecté: "Émincé de viande sauce forestière / poivre avec assortiment d'accompagnements". Validation manuelle nécessaire.

## ⏸️ Groupe D - Non Analysées (27)

**Action requise:** Analyse manuelle complète nécessaire

### photo_1
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060753/bizzart/menu/r07qxo_-_R_Download_11_ak1ici.jpg
- **Utilisée par:** 4 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_10
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060811/bizzart/menu/IMG_9720_jytrma.jpg
- **Utilisée par:** 5 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_11
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060795/bizzart/menu/FB_IMG_1786831464636_u2po6i.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_13
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060799/bizzart/menu/FB_IMG_1786831557428_uylzz1.jpg
- **Utilisée par:** 1 plat(s)
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_14
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060803/bizzart/menu/FD0F8561-B4E5-413D-98F4-FA5778A54F7B_sh80xf.png
- **Utilisée par:** 3 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_15
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060778/bizzart/menu/D2ACAC2E-1EDE-404C-8597-0006112AC6C2_beeo60.png
- **Utilisée par:** 1 plat(s)
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_16
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060785/bizzart/menu/F04A3E91-B691-4A8E-8F76-665B275F1812_wdtkew.png
- **Utilisée par:** 4 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_17
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060756/bizzart/menu/r07qxo_-_R_Download_13_djmfzt.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_18
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060763/bizzart/menu/r07qxo_-_R_Download_7_usi3f8.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_19
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060810/bizzart/menu/IMG_9701_qyr2m3.jpg
- **Utilisée par:** 1 plat(s)
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_21
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060789/bizzart/menu/FB_IMG_1786831383530_jofqku.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_22
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060788/bizzart/menu/FB_IMG_1786831381120_cigb5d.jpg
- **Utilisée par:** 3 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_23
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060791/bizzart/menu/FB_IMG_1786831389680_coillr.jpg
- **Utilisée par:** 1 plat(s)
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_25
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060768/bizzart/menu/r07qxo_-_R_Download_hgh4w0.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_26
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060783/bizzart/menu/EB2F2B90-88F1-44EB-90BF-BFDB31B8B15E_ui0hpb.png
- **Utilisée par:** 5 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_28
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060755/bizzart/menu/r07qxo_-_R_Download_12_nffdek.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_29
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060800/bizzart/menu/FB_IMG_1786831623991_kranmd.jpg
- **Utilisée par:** 5 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_30
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060798/bizzart/menu/FB_IMG_1786831543045_pyswfe.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_31
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060759/bizzart/menu/r07qxo_-_R_Download_4_clavnd.jpg
- **Utilisée par:** 3 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_32
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060790/bizzart/menu/FB_IMG_1786831385645_vzx61b.jpg
- **Utilisée par:** 4 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_33
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060758/bizzart/menu/r07qxo_-_R_Download_3_ah6kjf.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_34
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060782/bizzart/menu/E82B1115-081E-4CAB-8E58-F86532F170CC_ea60pq.png
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_35
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060793/bizzart/menu/FB_IMG_1786831394707_fictxa.jpg
- **Utilisée par:** 3 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_5
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060765/bizzart/menu/r07qxo_-_R_Download_8_jeurew.jpg
- **Utilisée par:** 2 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_6
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060767/bizzart/menu/r07qxo_-_R_Download_9_bp8oao.jpg
- **Utilisée par:** 5 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_7
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060771/bizzart/menu/A7D9ECFF-989F-45B7-8E9F-1AA5833C3B1D_uwxwjx.png
- **Utilisée par:** 4 plat(s)
- **⚠️ Doublon:** HIGH
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

### photo_9
- **URL:** https://res.cloudinary.com/gmpztbom/image/upload/v1787060762/bizzart/menu/r07qxo_-_R_Download_6_h7axod.jpg
- **Utilisée par:** 3 plat(s)
- **⚠️ Doublon:** MEDIUM
- **Notes:** Vision IA non disponible (quota dépassé). Validation manuelle requise.

---

**Généré le:** 2026-08-19T01:28:00.340Z
**Mode:** Lecture seule stricte - Aucune modification de production
