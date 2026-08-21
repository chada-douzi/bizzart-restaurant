# PHASE 3 — ROLLBACK PLAN

## Objectif

Restaurer les 98 documents à leur état initial si nécessaire.

## Prérequis

- Fichier `PHASE-3-BACKUP.json` créé avant application
- Backup vérifié et valide

## Méthode

```typescript
const backup = JSON.parse(fs.readFileSync('PHASE-3-BACKUP.json', 'utf-8'));

for (const item of backup) {
  await MenuItem.findByIdAndUpdate(
    item._id,
    {
      image: item.image,
    },
    { runValidators: true }
  );
}
```

## Vérification post-rollback

```typescript
for (const item of backup) {
  const dish = await MenuItem.findById(item._id);
  if (dish.image !== item.image) {
    console.error(`Rollback failed for ${item._id}`);
  }
}
```

## Propriétés

- ✅ **Ciblé** : Uniquement les 98 documents modifiés
- ✅ **Idempotent** : Peut être exécuté plusieurs fois
- ✅ **Vérifiable** : Validation post-rollback automatique
- ✅ **Protégé** : N'affecte pas les suppléments ni les doublons
- ✅ **Sûr** : Utilise les validators du schéma

## Exclusions

- ❌ Les 16 suppléments ne sont jamais touchés
- ❌ Les 4 doublons ne sont jamais touchés
- ✅ Uniquement les 98 plats validés

## Commande

```bash
npx ts-node src/seed/PHASE-3-ROLLBACK.ts
```

## Important

- Créer un backup AVANT le rollback aussi
- Vérifier que le rollback restaure correctement
- Ne jamais rollback sans backup valide
