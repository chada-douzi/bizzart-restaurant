import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const SOURCE_URI = 'mongodb://localhost:27017/bizzart';
const TARGET_URI = process.env.MONGODB_URI;

const COLLECTIONS = [
  'reservations',
  'menuitems',
  'reviews',
  'menucategories',
  'settings',
  'users',
  'media',
] as const;

const EXPECTED_COUNTS: Record<string, number> = {
  reservations: 6,
  menuitems: 114,
  reviews: 3,
  menucategories: 11,
  settings: 1,
  users: 1,
  media: 56,
};

const EXPECTED_TOTAL = 192;
const BATCH_SIZE = 500;

type Counts = Record<string, number>;

function validateEnvironment(): void {
  console.log('\nðŸ” VÃ©rification de lâ€™environnement...');

  if (!TARGET_URI) {
    throw new Error('âŒ MONGODB_URI absent du fichier .env');
  }

  if (
    TARGET_URI.includes('localhost') ||
    TARGET_URI.includes('127.0.0.1')
  ) {
    throw new Error(
      'âŒ MONGODB_URI pointe vers localhost. Migration annulÃ©e.'
    );
  }

  if (!TARGET_URI.startsWith('mongodb+srv://')) {
    throw new Error(
      'âŒ MONGODB_URI ne semble pas Ãªtre une URI MongoDB Atlas.'
    );
  }

  console.log('âœ… MONGODB_URI prÃ©sent');
  console.log('âœ… URI Atlas dÃ©tectÃ©e');
  console.log('ðŸ”’ Mot de passe non affichÃ©');
}

async function getCounts(
  db: mongoose.mongo.Db
): Promise<Counts> {
  const counts: Counts = {};

  for (const name of COLLECTIONS) {
    const exists =
      (await db.listCollections({ name }).toArray()).length > 0;

    counts[name] = exists
      ? await db.collection(name).countDocuments()
      : 0;
  }

  return counts;
}

function getTotal(counts: Counts): number {
  return Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );
}

function assertExpectedCounts(counts: Counts): void {
  for (const name of COLLECTIONS) {
    const expected = EXPECTED_COUNTS[name];
    const actual = counts[name];

    if (actual !== expected) {
      throw new Error(
        `âŒ ${name}: ${actual} documents trouvÃ©s, ${expected} attendus.`
      );
    }
  }

  const total = getTotal(counts);

  if (total !== EXPECTED_TOTAL) {
    throw new Error(
      `âŒ TOTAL LOCAL INATTENDU : ${total} documents trouvÃ©s, ${EXPECTED_TOTAL} attendus.`
    );
  }
}

async function verifySource(
  db: mongoose.mongo.Db
): Promise<void> {
  console.log(`
============================================
ðŸ”Ž VÃ‰RIFICATION SOURCE LOCALE
============================================
`);

  const counts = await getCounts(db);

  console.log('ðŸ“Š Ã‰tat de la base locale :');
  console.table(
    COLLECTIONS.map((name) => ({
      collection: name,
      documents: counts[name],
    }))
  );

  console.log(`TOTAL: ${getTotal(counts)} documents`);

  assertExpectedCounts(counts);

  console.log('âœ… Snapshot local conforme : 192 documents.');
}

async function verifyTargetIsEmpty(
  db: mongoose.mongo.Db
): Promise<void> {
  console.log(`
============================================
ðŸ›¡ï¸ VÃ‰RIFICATION DESTINATION ATLAS
============================================
`);

  const counts = await getCounts(db);

  console.table(
    COLLECTIONS.map((name) => ({
      collection: name,
      documents: counts[name],
    }))
  );

  const nonEmpty = COLLECTIONS.filter(
    (name) => counts[name] > 0
  );

  if (nonEmpty.length > 0) {
    console.error('âŒ Atlas contient dÃ©jÃ  des donnÃ©es :');

    for (const name of nonEmpty) {
      console.error(`   ${name}: ${counts[name]}`);
    }

    throw new Error(
      'Migration annulÃ©e : Atlas doit Ãªtre vide.'
    );
  }

  console.log('âœ… Les 7 collections Atlas sont vides.');
}

async function verifyDuplicateIds(
  sourceDb: mongoose.mongo.Db
): Promise<void> {
  console.log(`
============================================
ðŸ” VÃ‰RIFICATION DES _id
============================================
`);

  for (const name of COLLECTIONS) {
    const duplicates = await sourceDb
      .collection(name)
      .aggregate([
        {
          $group: {
            _id: '$_id',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
        {
          $limit: 1,
        },
      ])
      .toArray();

    if (duplicates.length > 0) {
      throw new Error(
        `âŒ Doublon _id dÃ©tectÃ© dans ${name}. Migration annulÃ©e.`
      );
    }

    console.log(`âœ… ${name}: aucun doublon _id`);
  }
}

async function verifySourceStable(
  sourceDb: mongoose.mongo.Db,
  expectedCounts: Counts
): Promise<void> {
  console.log('\nðŸ”’ VÃ©rification de stabilitÃ© de la source...');

  const currentCounts = await getCounts(sourceDb);

  for (const name of COLLECTIONS) {
    if (currentCounts[name] !== expectedCounts[name]) {
      throw new Error(
        `âŒ La source a changÃ© pendant la prÃ©paration : ${name} Ã©tait Ã  ${expectedCounts[name]}, maintenant ${currentCounts[name]}.`
      );
    }
  }

  console.log('âœ… Source toujours stable.');
}

async function migrateCollection(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  name: string
): Promise<void> {
  const source = sourceDb.collection(name);
  const target = targetDb.collection(name);

  const sourceCount = await source.countDocuments();

  console.log(
    `\nðŸ“¦ Migration ${name}: ${sourceCount} documents`
  );

  if (sourceCount !== EXPECTED_COUNTS[name]) {
    throw new Error(
      `âŒ ${name}: changement dÃ©tectÃ© avant insertion.`
    );
  }

  const documents = await source.find({}).toArray();

  if (documents.length !== sourceCount) {
    throw new Error(
      `âŒ Lecture incomplÃ¨te de ${name}: ${documents.length}/${sourceCount}`
    );
  }

  for (
    let start = 0;
    start < documents.length;
    start += BATCH_SIZE
  ) {
    const batch = documents.slice(
      start,
      start + BATCH_SIZE
    );

    await target.insertMany(batch, {
      ordered: true,
    });

    console.log(
      `   âœ… ${Math.min(
        start + batch.length,
        documents.length
      )}/${documents.length}`
    );
  }

  const targetCount =
    await target.countDocuments();

  if (targetCount !== sourceCount) {
    throw new Error(
      `âŒ VÃ©rification Ã©chouÃ©e pour ${name}: source=${sourceCount}, atlas=${targetCount}`
    );
  }

  console.log(
    `âœ… ${name}: ${targetCount}/${sourceCount} vÃ©rifiÃ©s`
  );
}

async function verifyFinalState(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db
): Promise<void> {
  console.log(`
============================================
ðŸ”Ž VÃ‰RIFICATION FINALE
============================================
`);

  const sourceCounts = await getCounts(sourceDb);
  const targetCounts = await getCounts(targetDb);

  console.log('LOCAL :');
  console.table(
    COLLECTIONS.map((name) => ({
      collection: name,
      documents: sourceCounts[name],
    }))
  );

  console.log('ATLAS :');
  console.table(
    COLLECTIONS.map((name) => ({
      collection: name,
      documents: targetCounts[name],
    }))
  );

  for (const name of COLLECTIONS) {
    if (sourceCounts[name] !== targetCounts[name]) {
      throw new Error(
        `âŒ MISMATCH ${name}: local=${sourceCounts[name]}, atlas=${targetCounts[name]}`
      );
    }
  }

  const sourceTotal = getTotal(sourceCounts);
  const targetTotal = getTotal(targetCounts);

  if (sourceTotal !== EXPECTED_TOTAL) {
    throw new Error(
      `âŒ TOTAL LOCAL FINAL INATTENDU: ${sourceTotal}`
    );
  }

  if (targetTotal !== EXPECTED_TOTAL) {
    throw new Error(
      `âŒ TOTAL ATLAS FINAL INATTENDU: ${targetTotal}`
    );
  }

  console.log(
    `\nâœ… TOTAL VÃ‰RIFIÃ‰ : ${targetTotal} documents`
  );
}

async function main(): Promise<void> {
  console.log(`
============================================
ðŸ” BIZZ'ART MONASTIR
ðŸ” LOCAL â†’ MONGODB ATLAS
ðŸ” MIGRATION STRICTEMENT CONTRÃ”LÃ‰E
============================================
`);

  validateEnvironment();

  console.log('\nðŸ”Œ Connexion MongoDB locale...');

  const sourceConnection =
    await mongoose
      .createConnection(SOURCE_URI)
      .asPromise();

  console.log('âœ… MongoDB locale connectÃ©e');

  console.log('\nðŸ”Œ Connexion MongoDB Atlas...');

  const targetConnection =
    await mongoose
      .createConnection(TARGET_URI!)
      .asPromise();

  console.log('âœ… MongoDB Atlas connectÃ©e');
  console.log(
    `â˜ï¸ Base Atlas : ${targetConnection.name}`
  );

  const sourceDb = sourceConnection.db;
  const targetDb = targetConnection.db;

  if (!sourceDb || !targetDb) {
    throw new Error(
      'âŒ Impossible dâ€™accÃ©der aux bases MongoDB.'
    );
  }

  /*
   * PHASE 1
   * VÃ©rification source.
   */
  await verifySource(sourceDb);

  /*
   * PHASE 2
   * VÃ©rification Atlas vide.
   */
  await verifyTargetIsEmpty(targetDb);

  /*
   * PHASE 3
   * VÃ©rification doublons _id.
   */
  await verifyDuplicateIds(sourceDb);

  /*
   * PHASE 4
   * VÃ©rification stabilitÃ© juste avant migration.
   */
  const snapshot = await getCounts(sourceDb);

  await verifySourceStable(
    sourceDb,
    snapshot
  );

  console.log(`
============================================
ðŸš¨ PRÃŠT POUR MIGRATION
============================================

Source :
localhost/bizzart

Destination :
MongoDB Atlas / bizzart

Documents :
192

Collections :
7

âš ï¸ Aucune donnÃ©e locale ne sera supprimÃ©e.
âš ï¸ Atlas doit rester vide jusqu'Ã  l'insertion.
âš ï¸ Les _id seront conservÃ©s.
============================================
`);

  /*
   * PHASE 5
   * Migration.
   */
  for (const name of COLLECTIONS) {
    await migrateCollection(
      sourceDb,
      targetDb,
      name
    );
  }

  /*
   * PHASE 6
   * VÃ©rification finale.
   */
  await verifyFinalState(
    sourceDb,
    targetDb
  );

  console.log(`
============================================
ðŸŽ‰ MIGRATION RÃ‰USSIE
============================================

âœ… 7 collections migrÃ©es
âœ… 192 documents vÃ©rifiÃ©s
âœ… _id conservÃ©s
âœ… Source locale intacte
âœ… Atlas vÃ©rifiÃ©
============================================
`);

  await sourceConnection.close();
  await targetConnection.close();
}

main().catch(async (error) => {
  console.error(`
============================================
âŒ MIGRATION ANNULÃ‰E / Ã‰CHEC
============================================
`);

  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  console.error(`
âš ï¸ IMPORTANT :
Aucune suppression de la base locale
n'est effectuÃ©e par ce script.
`);

  process.exit(1);
});
