/**
 * PHASE 16-ALT — CONTROLLED MONGODB ATLAS MIGRATION
 * BIZZ'ART MONASTIR
 * 
 * MODE: ULTRA-STRICT / FORENSIC / CONTROLLED MIGRATION
 * READ-ONLY until CHECKPOINT authorization
 * 
 * CRITICAL RULES:
 * - NO modification of source database
 * - NO deletion of source data
 * - NO automatic migration without checkpoint
 * - NO credential logging
 * - Forensic archive must remain intact
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CollectionInventory {
  collection: string;
  documentCount: number;
  indexes: any[];
  sampleDocument?: any;
}

interface SourceInventory {
  timestamp: string;
  database: string;
  collections: CollectionInventory[];
  totalCollections: number;
  totalDocuments: number;
  inventoryHash: string;
}

interface ForensicArchiveStatus {
  basePath: string;
  exists: boolean;
  archives: string[];
  validated: boolean;
}

interface AtlasConnectivity {
  configured: boolean;
  accessible: boolean;
  database?: string;
  error?: string;
}

interface Phase16AltReport {
  metadata: {
    phase: string;
    timestamp: string;
    mode: string;
  };
  toolchain: {
    nodejs: string;
    mongoose: string;
    status: string;
  };
  source: {
    uri: string; // masked
    database: string;
    accessible: boolean;
    inventory?: SourceInventory;
  };
  forensicArchive: ForensicArchiveStatus;
  atlas: AtlasConnectivity;
  checkpoints: {
    '16B': 'READY' | 'BLOCKED' | 'UNKNOWN';
  };
  verdict: {
    status: 'PASS' | 'FAIL' | 'BLOCKED';
    reason: string;
  };
}

class Phase16AltMigration {
  private reportDir: string;
  private logPath: string;
  private sourceUri: string;
  private atlasUri: string | null = null;
  private report: Phase16AltReport;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportDir = path.join(process.env.TEMP || '/tmp', `phase16-alt-migration-${timestamp}`);
    
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    this.logPath = path.join(this.reportDir, 'phase16-alt.log');
    this.sourceUri = process.env.MONGODB_URI || '';
    this.atlasUri = process.env.ATLAS_URI || process.env.MONGODB_ATLAS_URI || null;

    this.report = {
      metadata: {
        phase: 'PHASE 16-ALT',
        timestamp: new Date().toISOString(),
        mode: 'ULTRA-STRICT / FORENSIC / CONTROLLED MIGRATION'
      },
      toolchain: {
        nodejs: process.version,
        mongoose: require('mongoose/package.json').version,
        status: 'VALIDATING'
      },
      source: {
        uri: this.maskUri(this.sourceUri),
        database: this.extractDatabaseName(this.sourceUri),
        accessible: false
      },
      forensicArchive: {
        basePath: 'C:\\Archives\\BizzArt-Monastir',
        exists: false,
        archives: [],
        validated: false
      },
      atlas: {
        configured: !!this.atlasUri,
        accessible: false
      },
      checkpoints: {
        '16B': 'UNKNOWN'
      },
      verdict: {
        status: 'BLOCKED',
        reason: 'Not yet determined'
      }
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logPath, logLine);
    console.log(`    ${message}`);
  }

  private maskUri(uri: string): string {
    // Mask credentials in MongoDB URI
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//<username>:<password>@');
  }

  private extractDatabaseName(uri: string): string {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'unknown';
  }

  private calculateHash(data: any): string {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  async phase0_toolchainValidation(): Promise<boolean> {
    this.log('=== PHASE 16-ALT.0 — TOOLCHAIN VALIDATION ===');
    
    try {
      this.log(`Node.js version: ${process.version}`);
      this.log(`Mongoose version: ${this.report.toolchain.mongoose}`);
      
      if (!this.sourceUri) {
        this.log('❌ CRITICAL: MONGODB_URI not found in .env');
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'MONGODB_URI not configured in .env'
        };
        return false;
      }

      this.log('✅ Toolchain validated');
      this.report.toolchain.status = 'VALIDATED';
      return true;

    } catch (error: any) {
      this.log(`❌ CRITICAL: Toolchain validation failed - ${error.message}`);
      this.report.verdict = {
        status: 'BLOCKED',
        reason: `Toolchain validation failed: ${error.message}`
      };
      return false;
    }
  }

  async phase1_sourceConnectivityReadOnly(): Promise<boolean> {
    this.log('=== PHASE 16-ALT.1 — SOURCE CONNECTIVITY READ-ONLY ===');

    try {
      this.log(`Connecting to source: ${this.maskUri(this.sourceUri)}`);
      
      // Connect with read preference
      await mongoose.connect(this.sourceUri, {
        readPreference: 'primaryPreferred',
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000
      });

      this.log('✅ Source MongoDB connected');

      // Test ping
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established');
      }
      const admin = mongoose.connection.db.admin();
      const pingResult = await admin.ping();
      
      if (pingResult.ok === 1) {
        this.log('✅ Ping successful');
        this.report.source.accessible = true;
      } else {
        this.log('❌ Ping failed');
        return false;
      }

      return true;

    } catch (error: any) {
      this.log(`❌ CRITICAL: Cannot connect to source - ${error.message}`);
      this.report.source.accessible = false;
      this.report.verdict = {
        status: 'BLOCKED',
        reason: `Source MongoDB not accessible: ${error.message}`
      };
      return false;
    }
  }

  async phase2_forensicSourceInventory(): Promise<boolean> {
    this.log('=== PHASE 16-ALT.2 — FORENSIC SOURCE INVENTORY ===');

    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const collections = await db.listCollections().toArray();

      this.log(`Found ${collections.length} collections`);

      const inventory: CollectionInventory[] = [];
      let totalDocuments = 0;

      for (const coll of collections) {
        const collName = coll.name;
        const collection = db.collection(collName);
        
        // Count documents (READ-ONLY)
        const count = await collection.countDocuments();
        
        // Get indexes (READ-ONLY)
        const indexes = await collection.indexes();
        
        // Get sample document (READ-ONLY) - without sensitive fields
        const sample = await collection.findOne({}, { 
          projection: { password: 0, token: 0, secret: 0 } 
        });

        inventory.push({
          collection: collName,
          documentCount: count,
          indexes: indexes,
          sampleDocument: sample ? { _id: sample._id, fields: Object.keys(sample) } : null
        });

        totalDocuments += count;

        this.log(`✅ ${collName}: ${count} documents, ${indexes.length} indexes`);
      }

      const sourceInventory: SourceInventory = {
        timestamp: new Date().toISOString(),
        database: this.report.source.database,
        collections: inventory,
        totalCollections: collections.length,
        totalDocuments: totalDocuments,
        inventoryHash: this.calculateHash(inventory)
      };

      this.report.source.inventory = sourceInventory;

      // Save inventory
      const inventoryPath = path.join(this.reportDir, 'phase16-alt-source-inventory.json');
      fs.writeFileSync(inventoryPath, JSON.stringify(sourceInventory, null, 2));
      this.log(`✅ Source inventory saved: ${inventoryPath}`);

      this.log(`Total: ${collections.length} collections, ${totalDocuments} documents`);
      this.log(`Inventory hash: ${sourceInventory.inventoryHash.substring(0, 16)}...`);

      return true;

    } catch (error: any) {
      this.log(`❌ CRITICAL: Cannot build source inventory - ${error.message}`);
      this.report.verdict = {
        status: 'BLOCKED',
        reason: `Cannot read source inventory: ${error.message}`
      };
      return false;
    }
  }

  async phase3_forensicArchiveValidation(): Promise<boolean> {
    this.log('=== PHASE 16-ALT.3 — FORENSIC ARCHIVE VALIDATION ===');

    try {
      const archiveBase = 'C:\\Archives\\BizzArt-Monastir';
      
      if (!fs.existsSync(archiveBase)) {
        this.log('❌ CRITICAL: Forensic archive base directory not found');
        this.report.forensicArchive.exists = false;
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'Forensic archive not found'
        };
        return false;
      }

      this.log(`✅ Archive base exists: ${archiveBase}`);
      this.report.forensicArchive.exists = true;

      // List archives
      const items = fs.readdirSync(archiveBase);
      const archives = items.filter(item => {
        const fullPath = path.join(archiveBase, item);
        return fs.statSync(fullPath).isDirectory() && item.startsWith('forensic-archive-');
      });

      this.report.forensicArchive.archives = archives;
      this.log(`Found ${archives.length} forensic archive(s)`);

      if (archives.length === 0) {
        this.log('❌ CRITICAL: No forensic archives found');
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'No forensic archives in base directory'
        };
        return false;
      }

      // Verify latest archive structure
      const latestArchive = archives.sort().reverse()[0];
      const archivePath = path.join(archiveBase, latestArchive);
      
      const requiredDirs = ['r1-evidence', 'r4-audit', 'metadata'];
      let structureValid = true;

      for (const dir of requiredDirs) {
        const dirPath = path.join(archivePath, dir);
        if (!fs.existsSync(dirPath)) {
          this.log(`❌ Missing required directory: ${dir}`);
          structureValid = false;
        } else {
          this.log(`✅ ${dir}/ present`);
        }
      }

      if (!structureValid) {
        this.log('❌ CRITICAL: Archive structure incomplete');
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'Forensic archive structure incomplete'
        };
        return false;
      }

      // Verify metadata files
      const inventoryPath = path.join(archivePath, 'metadata', 'archive-inventory.json');
      const manifestPath = path.join(archivePath, 'metadata', 'persistent-archive-manifest.json');

      if (!fs.existsSync(inventoryPath)) {
        this.log('❌ CRITICAL: archive-inventory.json missing');
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'Archive inventory missing'
        };
        return false;
      }

      if (!fs.existsSync(manifestPath)) {
        this.log('❌ CRITICAL: persistent-archive-manifest.json missing');
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'Archive manifest missing'
        };
        return false;
      }

      this.log('✅ Archive metadata files present');
      this.report.forensicArchive.validated = true;

      return true;

    } catch (error: any) {
      this.log(`❌ CRITICAL: Archive validation failed - ${error.message}`);
      this.report.verdict = {
        status: 'BLOCKED',
        reason: `Archive validation failed: ${error.message}`
      };
      return false;
    }
  }

  async phase4_atlasDiscoveryConnectivity(): Promise<boolean> {
    this.log('=== PHASE 16-ALT.4 — ATLAS DISCOVERY / CONNECTIVITY ===');

    try {
      if (!this.atlasUri) {
        this.log('❌ CRITICAL: Atlas URI not configured');
        this.log('Required: ATLAS_URI or MONGODB_ATLAS_URI in .env');
        this.report.atlas.configured = false;
        this.report.verdict = {
          status: 'BLOCKED',
          reason: 'MongoDB Atlas URI not configured in .env'
        };
        return false;
      }

      this.log(`✅ Atlas URI configured (credentials masked)`);
      this.report.atlas.configured = true;
      this.report.atlas.database = this.extractDatabaseName(this.atlasUri);

      // Test Atlas connectivity (READ-ONLY ping)
      this.log('Testing Atlas connectivity...');
      
      // Create separate connection for Atlas
      const atlasConnection = await mongoose.createConnection(this.atlasUri, {
        readPreference: 'primaryPreferred',
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000
      }).asPromise();

      if (!atlasConnection.db) {
        throw new Error('Atlas database connection not established');
      }
      const atlasAdmin = atlasConnection.db.admin();
      const pingResult = await atlasAdmin.ping();

      if (pingResult.ok === 1) {
        this.log('✅ Atlas ping successful');
        this.report.atlas.accessible = true;
        
        // Close Atlas connection (we'll reconnect later for actual migration)
        await atlasConnection.close();
      } else {
        this.log('❌ Atlas ping failed');
        this.report.atlas.accessible = false;
        this.report.atlas.error = 'Ping failed';
        return false;
      }

      return true;

    } catch (error: any) {
      this.log(`❌ CRITICAL: Atlas connectivity failed - ${error.message}`);
      this.report.atlas.accessible = false;
      this.report.atlas.error = error.message;
      this.report.verdict = {
        status: 'BLOCKED',
        reason: `Atlas not accessible: ${error.message}`
      };
      return false;
    }
  }

  async checkpoint16B(): Promise<boolean> {
    this.log('=== CHECKPOINT 16-B ===');

    const sourceReady = this.report.source.accessible && 
                        this.report.source.inventory !== undefined;
    
    const archiveReady = this.report.forensicArchive.exists && 
                         this.report.forensicArchive.validated;
    
    const atlasReady = this.report.atlas.configured && 
                       this.report.atlas.accessible;

    this.log(`Source: ${sourceReady ? 'READY' : 'BLOCKED'}`);
    this.log(`Archive: ${archiveReady ? 'READY' : 'BLOCKED'}`);
    this.log(`Atlas: ${atlasReady ? 'READY' : 'BLOCKED'}`);

    if (sourceReady && archiveReady && atlasReady) {
      this.report.checkpoints['16B'] = 'READY';
      this.log('✅ CHECKPOINT 16-B: READY');
      return true;
    } else {
      this.report.checkpoints['16B'] = 'BLOCKED';
      this.log('❌ CHECKPOINT 16-B: BLOCKED');
      
      const blockers = [];
      if (!sourceReady) blockers.push('Source not ready');
      if (!archiveReady) blockers.push('Archive not validated');
      if (!atlasReady) blockers.push('Atlas not accessible');

      this.report.verdict = {
        status: 'BLOCKED',
        reason: blockers.join('; ')
      };
      
      return false;
    }
  }

  async generateReports(): Promise<void> {
    this.log('=== GENERATING REPORTS ===');

    // JSON Report
    const jsonPath = path.join(this.reportDir, 'phase16-alt-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    this.log(`✅ JSON report: ${jsonPath}`);

    // Markdown Report
    const mdContent = this.generateMarkdownReport();
    const mdPath = path.join(this.reportDir, 'phase16-alt-report.md');
    fs.writeFileSync(mdPath, mdContent);
    this.log(`✅ Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(): string {
    const inventory = this.report.source.inventory;
    
    return `# PHASE 16-ALT — CONTROLLED MONGODB ATLAS MIGRATION

**Bizz'Art Monastir**

**Timestamp**: ${this.report.metadata.timestamp}  
**Mode**: ${this.report.metadata.mode}

---

## EXECUTIVE SUMMARY

**Status**: ${this.report.verdict.status === 'PASS' ? '✅' : this.report.verdict.status === 'BLOCKED' ? '🟡' : '❌'} **${this.report.verdict.status}**

**Reason**: ${this.report.verdict.reason}

---

## TOOLCHAIN

- **Node.js**: ${this.report.toolchain.nodejs}
- **Mongoose**: ${this.report.toolchain.mongoose}
- **Status**: ${this.report.toolchain.status}

---

## SOURCE DATABASE

- **URI**: \`${this.report.source.uri}\`
- **Database**: ${this.report.source.database}
- **Accessible**: ${this.report.source.accessible ? '✅ YES' : '❌ NO'}

${inventory ? `
### Collections

| Collection | Documents | Indexes |
|------------|-----------|---------|
${inventory.collections.map(c => `| ${c.collection} | ${c.documentCount} | ${c.indexes.length} |`).join('\n')}

**Total Collections**: ${inventory.totalCollections}  
**Total Documents**: ${inventory.totalDocuments}  
**Inventory Hash**: \`${inventory.inventoryHash.substring(0, 32)}...\`
` : ''}

---

## FORENSIC ARCHIVE

- **Base Path**: \`${this.report.forensicArchive.basePath}\`
- **Exists**: ${this.report.forensicArchive.exists ? '✅ YES' : '❌ NO'}
- **Archives Found**: ${this.report.forensicArchive.archives.length}
- **Validated**: ${this.report.forensicArchive.validated ? '✅ YES' : '❌ NO'}

---

## MONGODB ATLAS

- **Configured**: ${this.report.atlas.configured ? '✅ YES' : '❌ NO'}
- **Accessible**: ${this.report.atlas.accessible ? '✅ YES' : '❌ NO'}
${this.report.atlas.database ? `- **Database**: ${this.report.atlas.database}` : ''}
${this.report.atlas.error ? `- **Error**: ${this.report.atlas.error}` : ''}

---

## CHECKPOINT 16-B

**Status**: ${this.report.checkpoints['16B']}

- **Source**: ${this.report.source.accessible ? '✅ READY' : '❌ BLOCKED'}
- **Archive**: ${this.report.forensicArchive.validated ? '✅ READY' : '❌ BLOCKED'}
- **Atlas**: ${this.report.atlas.accessible ? '✅ READY' : '❌ BLOCKED'}

---

## VERDICT

**Status**: **${this.report.verdict.status}**

**Reason**: ${this.report.verdict.reason}

---

## NEXT STEPS

${this.report.verdict.status === 'BLOCKED' ? `
⚠️ **Migration blocked. Resolve issues above before proceeding.**
` : `
✅ **Pre-migration validation complete.**

**IMPORTANT**: Real migration NOT executed. This was a validation phase only.

To proceed with actual migration, explicit authorization required for PHASE 16-ALT.6.
`}

---

**Report Generated**: ${this.report.metadata.timestamp}  
**Phase 16-ALT**: ${this.report.verdict.status}

🔴 **STOP** — Real migration requires explicit authorization.
`;
  }

  async run(): Promise<void> {
    console.log('\n============================================================');
    console.log('PHASE 16-ALT — CONTROLLED MONGODB ATLAS MIGRATION');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    this.log('=== PHASE 16-ALT START ===');
    this.log(`Report directory: ${this.reportDir}`);

    try {
      // Phase 0: Toolchain
      if (!await this.phase0_toolchainValidation()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // Phase 1: Source connectivity
      if (!await this.phase1_sourceConnectivityReadOnly()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // Phase 2: Source inventory
      if (!await this.phase2_forensicSourceInventory()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // Phase 3: Archive validation
      if (!await this.phase3_forensicArchiveValidation()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // Phase 4: Atlas connectivity
      if (!await this.phase4_atlasDiscoveryConnectivity()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // Checkpoint 16-B
      if (!await this.checkpoint16B()) {
        await this.generateReports();
        this.printFinalSummary();
        process.exit(1);
      }

      // All checks passed
      this.report.verdict = {
        status: 'PASS',
        reason: 'All pre-migration validations passed. Ready for controlled migration.'
      };

      this.log('=== ALL VALIDATIONS PASSED ===');
      
      await this.generateReports();
      this.printFinalSummary();

      // Close source connection
      await mongoose.connection.close();
      this.log('Source connection closed');

    } catch (error: any) {
      this.log(`❌ CRITICAL ERROR: ${error.message}`);
      this.report.verdict = {
        status: 'FAIL',
        reason: `Unexpected error: ${error.message}`
      };
      await this.generateReports();
      this.printFinalSummary();
      process.exit(1);
    }
  }

  private printFinalSummary(): void {
    console.log('\n============================================================');
    console.log('PHASE 16-ALT COMPLETE');
    console.log('============================================================\n');

    console.log(`STATUS: ${this.report.verdict.status}\n`);

    console.log('SOURCE:');
    console.log(`  Database: ${this.report.source.database}`);
    console.log(`  Accessible: ${this.report.source.accessible ? 'YES' : 'NO'}`);
    if (this.report.source.inventory) {
      console.log(`  Collections: ${this.report.source.inventory.totalCollections}`);
      console.log(`  Documents: ${this.report.source.inventory.totalDocuments}`);
    }

    console.log('\nFORENSIC ARCHIVE:');
    console.log(`  Path: ${this.report.forensicArchive.basePath}`);
    console.log(`  Exists: ${this.report.forensicArchive.exists ? 'YES' : 'NO'}`);
    console.log(`  Validated: ${this.report.forensicArchive.validated ? 'YES' : 'NO'}`);

    console.log('\nATLAS:');
    console.log(`  Configured: ${this.report.atlas.configured ? 'YES' : 'NO'}`);
    console.log(`  Accessible: ${this.report.atlas.accessible ? 'YES' : 'NO'}`);

    console.log(`\nCHECKPOINT 16-B: ${this.report.checkpoints['16B']}`);

    console.log(`\nSOURCE UNMODIFIED: YES`);
    console.log(`NO REAL MIGRATION EXECUTED: YES`);

    console.log('\nREPORTS GENERATED:');
    console.log(`  ${path.join(this.reportDir, 'phase16-alt-report.json')}`);
    console.log(`  ${path.join(this.reportDir, 'phase16-alt-report.md')}`);
    console.log(`  ${path.join(this.reportDir, 'phase16-alt-source-inventory.json')}`);
    console.log(`  ${this.logPath}`);

    if (this.report.verdict.status === 'PASS') {
      console.log('\n🟡 CHECKPOINT 16-C — WAITING FOR EXPLICIT MIGRATION AUTHORIZATION');
      console.log('\n🔴 STOP — Real migration requires explicit authorization\n');
    } else {
      console.log(`\n🔴 ${this.report.verdict.status} — ${this.report.verdict.reason}\n`);
    }

    console.log('============================================================\n');
  }
}

// Run migration
const migration = new Phase16AltMigration();
migration.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
