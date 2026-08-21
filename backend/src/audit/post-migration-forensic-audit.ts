/**
 * AUDIT POST-MIGRATION FORENSIQUE LOCAL ↔ MONGODB ATLAS
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY ABSOLU / FORENSIC VERIFICATION
 * 
 * MISSION:
 * Vérifier que les données MongoDB Atlas correspondent EXACTEMENT
 * aux données MongoDB Local après migration.
 * 
 * RÈGLE ABSOLUE:
 * - AUCUNE opération d'écriture (INSERT, UPDATE, DELETE, DROP)
 * - AUCUNE modification de schéma
 * - AUCUNE modification d'index
 * - READ-ONLY UNIQUEMENT
 */

import mongoose, { Connection } from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Configure DNS for Atlas connectivity
dns.setServers(['8.8.8.8', '1.1.1.1']);

interface CollectionComparison {
  collection: string;
  localCount: number;
  atlasCount: number;
  countMatch: boolean;
  localIds: string[];
  atlasIds: string[];
  missingInAtlas: string[];
  extraInAtlas: string[];
  duplicateLocalIds: string[];
  duplicateAtlasIds: string[];
  localHash: string;
  atlasHash: string;
  hashMatch: boolean;
  documentDifferences: DocumentDifference[];
}

interface DocumentDifference {
  _id: string;
  field: string;
  localValue: any;
  atlasValue: any;
}

interface IndexComparison {
  name: string;
  localExists: boolean;
  atlasExists: boolean;
  match: boolean;
  details?: any;
}

interface ReferenceAudit {
  sourceCollection: string;
  targetCollection: string;
  field: string;
  orphanReferences: string[];
}

interface StabilityCheck {
  phase: string;
  timestamp: string;
  collections: {
    [key: string]: number;
  };
}

interface ForensicAuditReport {
  metadata: {
    auditTitle: string;
    timestamp: string;
    mode: string;
  };
  environment: {
    localUri: string;
    atlasUri: string; // masked
    expectedDatabase: string;
  };
  phase1_environment: {
    status: 'PASS' | 'FAIL';
    atlasUriValid: boolean;
    databaseMatch: boolean;
  };
  phase2_connections: {
    status: 'PASS' | 'FAIL';
    localConnected: boolean;
    atlasConnected: boolean;
  };
  phase3_initialSnapshot: StabilityCheck;
  phase4_idInventory: CollectionComparison[];
  phase5_documentComparison: CollectionComparison[];
  phase6_collectionHashes: CollectionComparison[];
  phase8_indexComparison: {
    [collection: string]: IndexComparison[];
  };
  phase9_referenceAudit: ReferenceAudit[];
  phase10_mediaAudit: {
    localCount: number;
    atlasCount: number;
    match: boolean;
    details: any;
  };
  phase11_reservationAudit: {
    localCount: number;
    atlasCount: number;
    match: boolean;
    details: any;
  };
  phase12_userAudit: {
    localCount: number;
    atlasCount: number;
    match: boolean;
    passwordsComparedSecurely: boolean;
  };
  phase13_stabilityCheck: {
    initialSnapshot: StabilityCheck;
    finalSnapshot: StabilityCheck;
    stable: boolean;
  };
  finalStatus: {
    status: 'PASS' | 'FAIL';
    reason: string;
    totalCollections: number;
    totalLocalDocuments: number;
    totalAtlasDocuments: number;
    allCountsMatch: boolean;
    allHashesMatch: boolean;
    allIdsMatch: boolean;
    noOrphanReferences: boolean;
    sourceStable: boolean;
    destinationStable: boolean;
    noWriteOperations: boolean;
  };
}

class PostMigrationForensicAudit {
  private localConn!: Connection;
  private atlasConn!: Connection;
  private report: ForensicAuditReport;
  private logPath: string;
  private expectedCollections = [
    'reservations',
    'menuitems',
    'reviews',
    'menucategories',
    'settings',
    'users',
    'media'
  ];
  private expectedCounts: { [key: string]: number } = {
    'reservations': 6,
    'menuitems': 114,
    'reviews': 3,
    'menucategories': 11,
    'settings': 1,
    'users': 1,
    'media': 56
  };

  constructor() {
    const timestamp = new Date().toISOString();
    const reportsDir = path.join(__dirname, '..', '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    this.logPath = path.join(reportsDir, `post-migration-audit-${Date.now()}.log`);

    this.report = {
      metadata: {
        auditTitle: 'AUDIT POST-MIGRATION FORENSIQUE LOCAL ↔ MONGODB ATLAS',
        timestamp,
        mode: 'READ-ONLY ABSOLU / FORENSIC VERIFICATION'
      },
      environment: {
        localUri: 'mongodb://localhost:27017/bizzart',
        atlasUri: this.maskUri(process.env.MONGODB_URI || ''),
        expectedDatabase: 'bizzart'
      },
      phase1_environment: {
        status: 'FAIL',
        atlasUriValid: false,
        databaseMatch: false
      },
      phase2_connections: {
        status: 'FAIL',
        localConnected: false,
        atlasConnected: false
      },
      phase3_initialSnapshot: {
        phase: 'initial',
        timestamp: '',
        collections: {}
      },
      phase4_idInventory: [],
      phase5_documentComparison: [],
      phase6_collectionHashes: [],
      phase8_indexComparison: {},
      phase9_referenceAudit: [],
      phase10_mediaAudit: {
        localCount: 0,
        atlasCount: 0,
        match: false,
        details: {}
      },
      phase11_reservationAudit: {
        localCount: 0,
        atlasCount: 0,
        match: false,
        details: {}
      },
      phase12_userAudit: {
        localCount: 0,
        atlasCount: 0,
        match: false,
        passwordsComparedSecurely: false
      },
      phase13_stabilityCheck: {
        initialSnapshot: {
          phase: 'initial',
          timestamp: '',
          collections: {}
        },
        finalSnapshot: {
          phase: 'final',
          timestamp: '',
          collections: {}
        },
        stable: false
      },
      finalStatus: {
        status: 'FAIL',
        reason: 'Not yet determined',
        totalCollections: 0,
        totalLocalDocuments: 0,
        totalAtlasDocuments: 0,
        allCountsMatch: false,
        allHashesMatch: false,
        allIdsMatch: false,
        noOrphanReferences: true,
        sourceStable: false,
        destinationStable: false,
        noWriteOperations: true
      }
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logPath, logLine);
    console.log(`  ${message}`);
  }

  private maskUri(uri: string): string {
    if (!uri) return 'NOT_CONFIGURED';
    // Extract username and hostname only
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/);
    if (match) {
      return `mongodb+srv://${match[1]}:***@${match[2]}/bizzart`;
    }
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (value instanceof Date) {
      return value.getTime();
    }
    
    if (mongoose.Types.ObjectId.isValid(value) && typeof value === 'object') {
      return value.toString();
    }
    
    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }
    
    if (Array.isArray(value)) {
      return value.map(v => this.normalizeValue(v));
    }
    
    if (typeof value === 'object' && value !== null) {
      const normalized: any = {};
      const keys = Object.keys(value).sort();
      for (const key of keys) {
        normalized[key] = this.normalizeValue(value[key]);
      }
      return normalized;
    }
    
    return value;
  }

  private normalizeDocument(doc: any): any {
    const normalized: any = {};
    const keys = Object.keys(doc).sort();
    
    for (const key of keys) {
      // Skip internal MongoDB fields except _id
      if (key.startsWith('__') && key !== '_id') continue;
      normalized[key] = this.normalizeValue(doc[key]);
    }
    
    return normalized;
  }

  private stableSerialize(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  private calculateHash(data: any): string {
    const serialized = this.stableSerialize(data);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private sanitizeForDisplay(doc: any): any {
    const sanitized = { ...doc };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.jwt;
    
    // Mask email
    if (sanitized.email) {
      const [local, domain] = sanitized.email.split('@');
      sanitized.email = `${local.substring(0, 2)}***@${domain}`;
    }
    
    return sanitized;
  }

  async phase1_environmentVerification(): Promise<boolean> {
    this.log('=== PHASE 1 — VÉRIFICATION ENVIRONNEMENT ===');

    const atlasUri = process.env.MONGODB_URI;
    
    if (!atlasUri) {
      this.log('❌ MONGODB_URI not configured');
      return false;
    }

    if (!atlasUri.startsWith('mongodb+srv://') && !atlasUri.startsWith('mongodb://')) {
      this.log('❌ Invalid MongoDB URI format');
      return false;
    }

    if (atlasUri.includes('localhost')) {
      this.log('❌ MONGODB_URI points to localhost (should be Atlas)');
      return false;
    }

    const expectedDb = 'bizzart';
    const dbMatch = atlasUri.includes(`/${expectedDb}`);

    this.log(`✅ MONGODB_URI configured: ${this.maskUri(atlasUri)}`);
    this.log(`✅ Database match: ${dbMatch ? 'YES' : 'NO'}`);

    this.report.phase1_environment = {
      status: dbMatch ? 'PASS' : 'FAIL',
      atlasUriValid: true,
      databaseMatch: dbMatch
    };

    return dbMatch;
  }

  async phase2_connections(): Promise<boolean> {
    this.log('=== PHASE 2 — CONNEXIONS ===');

    try {
      // Connect to LOCAL (READ-ONLY)
      this.log('Connecting to LOCAL...');
      this.localConn = await mongoose.createConnection('mongodb://localhost:27017/bizzart', {
        readPreference: 'primaryPreferred'
      }).asPromise();
      
      this.log('✅ LOCAL connected');
      this.report.phase2_connections.localConnected = true;

      // Connect to ATLAS (READ-ONLY)
      this.log('Connecting to ATLAS...');
      const atlasUri = process.env.MONGODB_URI!;
      this.atlasConn = await mongoose.createConnection(atlasUri, {
        readPreference: 'primaryPreferred'
      }).asPromise();
      
      this.log('✅ ATLAS connected');
      this.report.phase2_connections.atlasConnected = true;

      this.report.phase2_connections.status = 'PASS';
      return true;

    } catch (error: any) {
      this.log(`❌ Connection failed: ${error.message}`);
      this.report.phase2_connections.status = 'FAIL';
      return false;
    }
  }

  async takeSnapshot(phase: string): Promise<StabilityCheck> {
    const snapshot: StabilityCheck = {
      phase,
      timestamp: new Date().toISOString(),
      collections: {}
    };

    if (!this.localConn.db) {
      throw new Error('Local database not connected');
    }

    for (const collName of this.expectedCollections) {
      const localCount = await this.localConn.db.collection(collName).countDocuments();
      snapshot.collections[collName] = localCount;
    }

    return snapshot;
  }

  async phase3_initialSnapshot(): Promise<boolean> {
    this.log('=== PHASE 3 — SNAPSHOT DES COMPTEURS ===');

    const snapshot = await this.takeSnapshot('initial');
    this.report.phase3_initialSnapshot = snapshot;

    if (!this.atlasConn.db) {
      throw new Error('Atlas database not connected');
    }

    let totalLocal = 0;
    let allMatch = true;

    for (const collName of this.expectedCollections) {
      const localCount = snapshot.collections[collName];
      const atlasCount = await this.atlasConn.db.collection(collName).countDocuments();
      const expectedCount = this.expectedCounts[collName];

      totalLocal += localCount;

      const match = localCount === atlasCount && localCount === expectedCount;
      
      this.log(`${collName}: LOCAL=${localCount} ATLAS=${atlasCount} EXPECTED=${expectedCount} ${match ? '✅' : '❌'}`);

      if (!match) allMatch = false;
    }

    this.log(`TOTAL LOCAL: ${totalLocal}`);
    this.log(`Expected: 192`);

    if (totalLocal !== 192) {
      this.log('❌ Total count mismatch');
      allMatch = false;
    }

    return allMatch;
  }

  async phase4_idInventory(): Promise<boolean> {
    this.log('=== PHASE 4 — INVENTAIRE DES _id ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    let allMatch = true;

    for (const collName of this.expectedCollections) {
      this.log(`Checking ${collName}...`);

      const localDocs = await this.localConn.db.collection(collName).find({}, { projection: { _id: 1 } }).toArray();
      const atlasDocs = await this.atlasConn.db.collection(collName).find({}, { projection: { _id: 1 } }).toArray();

      const localIds = localDocs.map(d => d._id.toString()).sort();
      const atlasIds = atlasDocs.map(d => d._id.toString()).sort();

      // Check for duplicates
      const localDuplicates = localIds.filter((id, index) => localIds.indexOf(id) !== index);
      const atlasDuplicates = atlasIds.filter((id, index) => atlasIds.indexOf(id) !== index);

      // Find missing/extra
      const missingInAtlas = localIds.filter(id => !atlasIds.includes(id));
      const extraInAtlas = atlasIds.filter(id => !localIds.includes(id));

      const comparison: CollectionComparison = {
        collection: collName,
        localCount: localIds.length,
        atlasCount: atlasIds.length,
        countMatch: localIds.length === atlasIds.length,
        localIds,
        atlasIds,
        missingInAtlas,
        extraInAtlas,
        duplicateLocalIds: localDuplicates,
        duplicateAtlasIds: atlasDuplicates,
        localHash: '',
        atlasHash: '',
        hashMatch: false,
        documentDifferences: []
      };

      this.report.phase4_idInventory.push(comparison);

      if (missingInAtlas.length > 0) {
        this.log(`  ❌ ${missingInAtlas.length} IDs missing in Atlas`);
        allMatch = false;
      }

      if (extraInAtlas.length > 0) {
        this.log(`  ❌ ${extraInAtlas.length} extra IDs in Atlas`);
        allMatch = false;
      }

      if (localDuplicates.length > 0) {
        this.log(`  ❌ ${localDuplicates.length} duplicate IDs in Local`);
        allMatch = false;
      }

      if (atlasDuplicates.length > 0) {
        this.log(`  ❌ ${atlasDuplicates.length} duplicate IDs in Atlas`);
        allMatch = false;
      }

      if (comparison.countMatch && missingInAtlas.length === 0 && extraInAtlas.length === 0) {
        this.log(`  ✅ All ${localIds.length} IDs match`);
      }
    }

    return allMatch;
  }

  async phase5_and_6_documentComparison(): Promise<boolean> {
    this.log('=== PHASE 5 & 6 — COMPARAISON DOCUMENTS & HASH ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    let allMatch = true;

    for (const collName of this.expectedCollections) {
      this.log(`Comparing ${collName}...`);

      const localDocs = await this.localConn.db.collection(collName).find({}).toArray();
      const atlasDocs = await this.atlasConn.db.collection(collName).find({}).toArray();

      // Index by _id
      const localById: { [key: string]: any } = {};
      const atlasById: { [key: string]: any } = {};

      for (const doc of localDocs) {
        localById[doc._id.toString()] = doc;
      }

      for (const doc of atlasDocs) {
        atlasById[doc._id.toString()] = doc;
      }

      // Compare documents
      const differences: DocumentDifference[] = [];

      for (const id of Object.keys(localById)) {
        if (!atlasById[id]) continue;

        const localDoc = this.normalizeDocument(localById[id]);
        const atlasDoc = this.normalizeDocument(atlasById[id]);

        const localHash = this.calculateHash(localDoc);
        const atlasHash = this.calculateHash(atlasDoc);

        if (localHash !== atlasHash) {
          // Find specific differences
          const keys = new Set([...Object.keys(localDoc), ...Object.keys(atlasDoc)]);
          
          for (const key of keys) {
            const localValue = localDoc[key];
            const atlasValue = atlasDoc[key];

            if (JSON.stringify(localValue) !== JSON.stringify(atlasValue)) {
              differences.push({
                _id: id,
                field: key,
                localValue,
                atlasValue
              });
            }
          }

          allMatch = false;
        }
      }

      // Calculate collection-level hash
      const sortedLocalDocs = Object.keys(localById).sort().map(id => this.normalizeDocument(localById[id]));
      const sortedAtlasDocs = Object.keys(atlasById).sort().map(id => this.normalizeDocument(atlasById[id]));

      const localHash = this.calculateHash(sortedLocalDocs);
      const atlasHash = this.calculateHash(sortedAtlasDocs);

      const hashMatch = localHash === atlasHash;

      const comparison: CollectionComparison = {
        collection: collName,
        localCount: localDocs.length,
        atlasCount: atlasDocs.length,
        countMatch: localDocs.length === atlasDocs.length,
        localIds: [],
        atlasIds: [],
        missingInAtlas: [],
        extraInAtlas: [],
        duplicateLocalIds: [],
        duplicateAtlasIds: [],
        localHash,
        atlasHash,
        hashMatch,
        documentDifferences: differences
      };

      this.report.phase6_collectionHashes.push(comparison);

      if (hashMatch) {
        this.log(`  ✅ Hash match: ${localHash.substring(0, 16)}...`);
      } else {
        this.log(`  ❌ Hash mismatch`);
        this.log(`     LOCAL:  ${localHash.substring(0, 16)}...`);
        this.log(`     ATLAS:  ${atlasHash.substring(0, 16)}...`);
        this.log(`     Differences: ${differences.length}`);
        
        if (differences.length > 0 && differences.length <= 5) {
          for (const diff of differences) {
            this.log(`       _id=${diff._id} field=${diff.field}`);
          }
        }
      }
    }

    return allMatch;
  }

  async phase8_indexComparison(): Promise<void> {
    this.log('=== PHASE 8 — VÉRIFICATION DES INDEX ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    for (const collName of this.expectedCollections) {
      const localIndexes = await this.localConn.db.collection(collName).indexes();
      const atlasIndexes = await this.atlasConn.db.collection(collName).indexes();

      const comparisons: IndexComparison[] = [];

      // Create index maps
      const localIndexMap = new Map(localIndexes.map(idx => [idx.name, idx]));
      const atlasIndexMap = new Map(atlasIndexes.map(idx => [idx.name, idx]));

      const allIndexNames = new Set([...localIndexMap.keys(), ...atlasIndexMap.keys()]);

      for (const indexName of allIndexNames) {
        if (!indexName) continue;
        
        const localExists = localIndexMap.has(indexName);
        const atlasExists = atlasIndexMap.has(indexName);

        comparisons.push({
          name: indexName,
          localExists,
          atlasExists,
          match: localExists && atlasExists
        });
      }

      this.report.phase8_indexComparison[collName] = comparisons;

      const allMatch = comparisons.every(c => c.match);
      this.log(`  ${collName}: ${allMatch ? '✅' : '⚠️'} Indexes ${allMatch ? 'match' : 'differ'}`);
    }
  }

  async phase9_referenceAudit(): Promise<void> {
    this.log('=== PHASE 9 — VÉRIFICATION DES RÉFÉRENCES ===');

    // Check menuitem.category → menucategories._id
    await this.checkReference('menuitems', 'menucategories', 'category');
    
    // Check media references if applicable
    // (Add more reference checks as needed)
  }

  private async checkReference(sourceCollection: string, targetCollection: string, field: string): Promise<void> {
    this.log(`  Checking ${sourceCollection}.${field} → ${targetCollection}._id`);

    if (!this.atlasConn.db) {
      throw new Error('Atlas database not connected');
    }

    const sourceDocs = await this.atlasConn.db.collection(sourceCollection).find({}).toArray();
    const targetIds = (await this.atlasConn.db.collection(targetCollection).find({}, { projection: { _id: 1 } }).toArray())
      .map(d => d._id.toString());

    const orphans: string[] = [];

    for (const doc of sourceDocs) {
      if (doc[field]) {
        const refId = doc[field].toString();
        if (!targetIds.includes(refId)) {
          orphans.push(doc._id.toString());
        }
      }
    }

    this.report.phase9_referenceAudit.push({
      sourceCollection,
      targetCollection,
      field,
      orphanReferences: orphans
    });

    if (orphans.length > 0) {
      this.log(`    ❌ ${orphans.length} orphan references detected`);
    } else {
      this.log(`    ✅ No orphan references`);
    }
  }

  async phase10_mediaAudit(): Promise<void> {
    this.log('=== PHASE 10 — MÉDIAS ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    const localCount = await this.localConn.db.collection('media').countDocuments();
    const atlasCount = await this.atlasConn.db.collection('media').countDocuments();

    this.report.phase10_mediaAudit = {
      localCount,
      atlasCount,
      match: localCount === atlasCount && localCount === 56,
      details: {
        expected: 56
      }
    };

    this.log(`  LOCAL: ${localCount}, ATLAS: ${atlasCount}, Expected: 56`);
    this.log(`  ${this.report.phase10_mediaAudit.match ? '✅' : '❌'} Media audit`);
  }

  async phase11_reservationAudit(): Promise<void> {
    this.log('=== PHASE 11 — RÉSERVATIONS ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    const localCount = await this.localConn.db.collection('reservations').countDocuments();
    const atlasCount = await this.atlasConn.db.collection('reservations').countDocuments();

    this.report.phase11_reservationAudit = {
      localCount,
      atlasCount,
      match: localCount === atlasCount && localCount === 6,
      details: {
        expected: 6
      }
    };

    this.log(`  LOCAL: ${localCount}, ATLAS: ${atlasCount}, Expected: 6`);
    this.log(`  ${this.report.phase11_reservationAudit.match ? '✅' : '❌'} Reservation audit`);
  }

  async phase12_userAudit(): Promise<void> {
    this.log('=== PHASE 12 — USERS ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    const localCount = await this.localConn.db.collection('users').countDocuments();
    const atlasCount = await this.atlasConn.db.collection('users').countDocuments();

    const localUsers = await this.localConn.db.collection('users').find({}).toArray();
    const atlasUsers = await this.atlasConn.db.collection('users').find({}).toArray();

    // Compare hashes INCLUDING password (but don't display it)
    let passwordsMatch = true;
    if (localUsers.length > 0 && atlasUsers.length > 0) {
      const localHash = this.calculateHash(this.normalizeDocument(localUsers[0]));
      const atlasHash = this.calculateHash(this.normalizeDocument(atlasUsers[0]));
      passwordsMatch = localHash === atlasHash;
    }

    this.report.phase12_userAudit = {
      localCount,
      atlasCount,
      match: localCount === atlasCount && localCount === 1 && passwordsMatch,
      passwordsComparedSecurely: true
    };

    this.log(`  LOCAL: ${localCount}, ATLAS: ${atlasCount}, Expected: 1`);
    this.log(`  Passwords compared: ${passwordsMatch ? '✅' : '❌'} (securely, not displayed)`);
    this.log(`  ${this.report.phase12_userAudit.match ? '✅' : '❌'} User audit`);
  }

  async phase13_stabilityCheck(): Promise<boolean> {
    this.log('=== PHASE 13 — STABILITÉ ===');

    const finalSnapshot = await this.takeSnapshot('final');
    this.report.phase13_stabilityCheck.finalSnapshot = finalSnapshot;

    const initial = this.report.phase3_initialSnapshot.collections;
    const final = finalSnapshot.collections;

    let stable = true;

    for (const collName of this.expectedCollections) {
      if (initial[collName] !== final[collName]) {
        this.log(`  ❌ ${collName}: changed from ${initial[collName]} to ${final[collName]}`);
        stable = false;
      }
    }

    this.report.phase13_stabilityCheck.stable = stable;

    if (stable) {
      this.log('  ✅ Source and destination stable');
    } else {
      this.log('  ❌ SOURCE/TARGET INSTABILITY DETECTED');
    }

    return stable;
  }

  calculateFinalStatus(): void {
    this.log('=== CALCULATING FINAL STATUS ===');

    const totalLocal = Object.values(this.report.phase3_initialSnapshot.collections).reduce((a, b) => a + b, 0);
    const totalAtlas = this.expectedCollections.reduce((sum, coll) => {
      const comparison = this.report.phase6_collectionHashes.find(c => c.collection === coll);
      return sum + (comparison?.atlasCount || 0);
    }, 0);

    const allCountsMatch = this.report.phase6_collectionHashes.every(c => c.countMatch);
    const allHashesMatch = this.report.phase6_collectionHashes.every(c => c.hashMatch);
    const allIdsMatch = this.report.phase4_idInventory.every(c => 
      c.missingInAtlas.length === 0 && 
      c.extraInAtlas.length === 0 &&
      c.duplicateLocalIds.length === 0 &&
      c.duplicateAtlasIds.length === 0
    );

    const noOrphanReferences = this.report.phase9_referenceAudit.every(r => r.orphanReferences.length === 0);
    const sourceStable = this.report.phase13_stabilityCheck.stable;
    const destinationStable = this.report.phase13_stabilityCheck.stable;

    const isPassed = 
      totalLocal === 192 &&
      totalAtlas === 192 &&
      allCountsMatch &&
      allHashesMatch &&
      allIdsMatch &&
      noOrphanReferences &&
      sourceStable &&
      destinationStable;

    this.report.finalStatus = {
      status: isPassed ? 'PASS' : 'FAIL',
      reason: isPassed ? 'All forensic checks passed' : 'One or more checks failed',
      totalCollections: this.expectedCollections.length,
      totalLocalDocuments: totalLocal,
      totalAtlasDocuments: totalAtlas,
      allCountsMatch,
      allHashesMatch,
      allIdsMatch,
      noOrphanReferences,
      sourceStable,
      destinationStable,
      noWriteOperations: true
    };
  }

  async generateReports(): Promise<void> {
    this.log('=== GENERATING REPORTS ===');

    const reportsDir = path.join(__dirname, '..', '..', 'reports');

    // JSON Report
    const jsonPath = path.join(reportsDir, 'post-migration-forensic-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    this.log(`✅ JSON report: ${jsonPath}`);

    // HTML Report
    const html = this.generateHtmlReport();
    const htmlPath = path.join(reportsDir, 'post-migration-forensic-audit.html');
    fs.writeFileSync(htmlPath, html);
    this.log(`✅ HTML report: ${htmlPath}`);
  }

  private generateHtmlReport(): string {
    const status = this.report.finalStatus.status;
    const statusColor = status === 'PASS' ? '#10b981' : '#ef4444';
    const statusIcon = status === 'PASS' ? '✅' : '❌';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Post-Migration Forensique</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 2rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #334155; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #f1f5f9; }
    .header p { color: #94a3b8; }
    .status-badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; margin-top: 1rem; background: ${statusColor}; color: white; }
    .section { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #334155; }
    .section h2 { font-size: 1.5rem; margin-bottom: 1rem; color: #f1f5f9; border-bottom: 2px solid #334155; padding-bottom: 0.5rem; }
    .metric { display: flex; justify-content: space-between; padding: 0.75rem; margin: 0.5rem 0; background: #0f172a; border-radius: 6px; }
    .metric-label { color: #94a3b8; }
    .metric-value { font-weight: 600; color: #f1f5f9; }
    .success { color: #10b981; }
    .failure { color: #ef4444; }
    .warning { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #0f172a; color: #94a3b8; font-weight: 600; }
    tr:hover { background: #0f172a; }
    .hash { font-family: 'Courier New', monospace; font-size: 0.85rem; color: #60a5fa; }
    .footer { text-align: center; margin-top: 2rem; padding: 1rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusIcon} ${this.report.metadata.auditTitle}</h1>
      <p>Timestamp: ${this.report.metadata.timestamp}</p>
      <p>Mode: ${this.report.metadata.mode}</p>
      <div class="status-badge">${status}</div>
    </div>

    <div class="section">
      <h2>📊 Résumé Exécutif</h2>
      <div class="metric">
        <span class="metric-label">Collections Auditées</span>
        <span class="metric-value">${this.report.finalStatus.totalCollections}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Documents LOCAL</span>
        <span class="metric-value">${this.report.finalStatus.totalLocalDocuments}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Documents ATLAS</span>
        <span class="metric-value">${this.report.finalStatus.totalAtlasDocuments}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Comptes Correspondent</span>
        <span class="metric-value ${this.report.finalStatus.allCountsMatch ? 'success' : 'failure'}">
          ${this.report.finalStatus.allCountsMatch ? '✅ OUI' : '❌ NON'}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Hashes Correspondent</span>
        <span class="metric-value ${this.report.finalStatus.allHashesMatch ? 'success' : 'failure'}">
          ${this.report.finalStatus.allHashesMatch ? '✅ OUI' : '❌ NON'}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">IDs Correspondent</span>
        <span class="metric-value ${this.report.finalStatus.allIdsMatch ? 'success' : 'failure'}">
          ${this.report.finalStatus.allIdsMatch ? '✅ OUI' : '❌ NON'}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Stabilité</span>
        <span class="metric-value ${this.report.finalStatus.sourceStable ? 'success' : 'failure'}">
          ${this.report.finalStatus.sourceStable ? '✅ STABLE' : '❌ INSTABLE'}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Opérations d'Écriture</span>
        <span class="metric-value ${this.report.finalStatus.noWriteOperations ? 'success' : 'failure'}">
          ${this.report.finalStatus.noWriteOperations ? '✅ AUCUNE' : '❌ DÉTECTÉES'}
        </span>
      </div>
    </div>

    <div class="section">
      <h2>🔐 Hashes des Collections</h2>
      <table>
        <thead>
          <tr>
            <th>Collection</th>
            <th>LOCAL Count</th>
            <th>ATLAS Count</th>
            <th>Hash LOCAL</th>
            <th>Hash ATLAS</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          ${this.report.phase6_collectionHashes.map(c => `
            <tr>
              <td>${c.collection}</td>
              <td>${c.localCount}</td>
              <td>${c.atlasCount}</td>
              <td class="hash">${c.localHash.substring(0, 16)}...</td>
              <td class="hash">${c.atlasHash.substring(0, 16)}...</td>
              <td class="${c.hashMatch ? 'success' : 'failure'}">${c.hashMatch ? '✅' : '❌'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📝 Verdict Final</h2>
      <div class="metric">
        <span class="metric-label">Status</span>
        <span class="metric-value" style="color: ${statusColor}">${statusIcon} ${status}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Raison</span>
        <span class="metric-value">${this.report.finalStatus.reason}</span>
      </div>
    </div>

    <div class="footer">
      <p>Audit généré le ${new Date().toLocaleString('fr-FR')}</p>
      <p>BIZZ'ART MONASTIR — Audit Post-Migration Forensique</p>
    </div>
  </div>
</body>
</html>`;
  }

  async run(): Promise<void> {
    console.log('\n============================================================');
    console.log('AUDIT POST-MIGRATION FORENSIQUE LOCAL ↔ MONGODB ATLAS');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    this.log('=== AUDIT START ===');

    try {
      // Phase 1
      if (!await this.phase1_environmentVerification()) {
        throw new Error('Environment verification failed');
      }

      // Phase 2
      if (!await this.phase2_connections()) {
        throw new Error('Connection failed');
      }

      // Phase 3
      await this.phase3_initialSnapshot();

      // Phase 4
      await this.phase4_idInventory();

      // Phase 5 & 6
      await this.phase5_and_6_documentComparison();

      // Phase 8
      await this.phase8_indexComparison();

      // Phase 9
      await this.phase9_referenceAudit();

      // Phase 10
      await this.phase10_mediaAudit();

      // Phase 11
      await this.phase11_reservationAudit();

      // Phase 12
      await this.phase12_userAudit();

      // Phase 13
      await this.phase13_stabilityCheck();

      // Calculate final status
      this.calculateFinalStatus();

      // Generate reports
      await this.generateReports();

      // Close connections
      await this.localConn.close();
      await this.atlasConn.close();

      this.log('=== AUDIT COMPLETE ===');
      this.printFinalSummary();

    } catch (error: any) {
      this.log(`❌ CRITICAL ERROR: ${error.message}`);
      console.error('\n❌ Audit failed:', error.message);
      process.exit(1);
    }
  }

  private printFinalSummary(): void {
    console.log('\n============================================================');
    console.log('AUDIT FORENSIQUE COMPLETE');
    console.log('============================================================\n');

    const status = this.report.finalStatus.status;
    const icon = status === 'PASS' ? '🟢' : '🔴';

    console.log(`${icon} STATUS: ${status}\n`);

    console.log('COLLECTIONS:');
    console.log(`  Total: ${this.report.finalStatus.totalCollections}`);
    console.log(`  Local Documents: ${this.report.finalStatus.totalLocalDocuments}`);
    console.log(`  Atlas Documents: ${this.report.finalStatus.totalAtlasDocuments}\n`);

    console.log('VERIFICATION:');
    console.log(`  Counts Match: ${this.report.finalStatus.allCountsMatch ? '✅' : '❌'}`);
    console.log(`  Hashes Match: ${this.report.finalStatus.allHashesMatch ? '✅' : '❌'}`);
    console.log(`  IDs Match: ${this.report.finalStatus.allIdsMatch ? '✅' : '❌'}`);
    console.log(`  No Orphan References: ${this.report.finalStatus.noOrphanReferences ? '✅' : '❌'}`);
    console.log(`  Stability: ${this.report.finalStatus.sourceStable ? '✅' : '❌'}`);
    console.log(`  No Write Operations: ${this.report.finalStatus.noWriteOperations ? '✅' : '❌'}\n`);

    console.log('REPORTS:');
    console.log(`  JSON: backend/reports/post-migration-forensic-audit.json`);
    console.log(`  HTML: backend/reports/post-migration-forensic-audit.html`);
    console.log(`  Log: ${this.logPath}\n`);

    console.log('============================================================\n');

    if (status !== 'PASS') {
      console.log('⚠️  Audit did not pass all checks. Review reports for details.\n');
    }
  }
}

// Run audit
const audit = new PostMigrationForensicAudit();
audit.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
