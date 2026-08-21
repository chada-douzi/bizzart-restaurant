# PHASE 3 — BACKUP PLAN

## Objectif

Créer un snapshot des 98 documents avant application.

## Méthode

```typescript
const backup = [];

for (const update of plannedUpdates) {
  const dish = await MenuItem.findById(update.dishId).lean();
  backup.push({
    _id: dish._id,
    image: dish.image,
    updatedAt: dish.updatedAt,
  });
}

fs.writeFileSync('PHASE-3-BACKUP.json', JSON.stringify(backup, null, 2));
```

## Vérification

Confirmer que le backup contient exactement 98 documents.

## Stockage

- Fichier: `PHASE-3-BACKUP.json`
- Emplacement: `backend/`
- Timestamp: Avant toute modification

## Important

- ✅ Créer AVANT toute modification
- ✅ Vérifier le contenu
- ✅ Sauvegarder dans un emplacement sûr
