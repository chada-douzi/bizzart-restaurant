/**
 * AUDIT FORENSIQUE DES INDEX LOCAL ↔ MONGODB ATLAS
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY ABSOLU
 * 
 * RÈGLE ABSOLUE:
 * - AUCUNE opération createIndex()
 * - AUCUNE opération dropIndex()
 * - AUCUNE opération syncIndexes()
 * - AUCUNE modification de schéma
 * - OBSERVATION ET COMPARAISON UNIQUEMENT
 */

import mongoose, { Connection } from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Configure DNS for Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);

interface IndexDefinition {
  name: string;
  key: { [key: string]: number | string };
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: any;
  collation?: any;
  hidden?: boolean;
  weights?: any;
  v?: number;
  [key: string]: any;
}

interface IndexComparison {
  name: string;
  localDefinition?: IndexDefinition;
  atlasDefinition?: IndexDefinition;
  status: 'MATCH' | 'MISMATCH' | 'LOCAL_ONLY' | 'ATLAS_ONLY';
  category: 'COSMETIC' | 'FUNCTIONAL_MATCH' | 'FUNCTIONAL_MISMATCH' | 'ATLAS_EXTRA' | 'LOCAL_EXTRA' | 'PERFECT_MATCH';
  differences?: string[];
}

interface CollectionIndexAudit {
  collection: string;
  localIndexes: IndexDefinition[];
  atlasIndexes: IndexDefinition[];
  matching: IndexComparison[];
  missingOnAtlas: IndexComparison[];
  extraOnAtlas: IndexComparison[];
  definitionMismatches: IndexComparison[];
}

interface IndexForensicReport {
  metadata: {
    auditTitle: string;
    timestamp: string;
    mode: string;
  };
  environment: {
    localUri: string;
    atlasUri: string; // masked
    database: string;
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
    error?: string;
  };
  collections: {
    [collectionName: string]: CollectionIndexAudit;
  };
  summary: {
    collectionsChecked: number;
    functionalMismatches: number;
    localOnly: number;
    atlasOnly: number;
    cosmeticDifferences: number;
    perfectMatches: number;
  };
  verdict: {
    status: 'PASS' | 'MISMATCH' | 'INCONCLUSIVE';
    reason: string;
    noChangesApplied: boolean;
  };
}

class IndexForensicAudit {
  private localConn!: Connection;
  private atlasConn!: Connection;
  private report: IndexForensicReport;
  private logPath: string;
  private requiredCollections = [
    'reservations',
    'menuitems',
    'reviews',
    'menucategories',
    'settings',
    'users',
    'media'
  ];

  constructor() {
    const timestamp = new Date().toISOString();
    const reportsDir = path.join(__dirname, '..', '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    this.logPath = path.join(reportsDir, `index-forensic-audit-${Date.now()}.log`);

    this.report = {
      metadata: {
        auditTitle: 'AUDIT FORENSIQUE DES INDEX LOCAL ↔ MONGODB ATLAS',
        timestamp,
        mode: 'READ-ONLY ABSOLU'
      },
      environment: {
        localUri: 'mongodb://localhost:27017/bizzart',
        atlasUri: this.maskUri(process.env.MONGODB_URI || ''),
        database: 'bizzart'
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
      collections: {},
      summary: {
        collectionsChecked: 0,
        functionalMismatches: 0,
        localOnly: 0,
        atlasOnly: 0,
        cosmeticDifferences: 0,
        perfectMatches: 0
      },
      verdict: {
        status: 'INCONCLUSIVE',
        reason: 'Not yet determined',
        noChangesApplied: true
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
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/);
    if (match) {
      return `mongodb+srv://${match[1]}:***@${match[2]}/bizzart`;
    }
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  }

  private normalizeIndexKey(key: any): string {
    return JSON.stringify(key, Object.keys(key).sort());
  }

  private compareIndexDefinitions(local: IndexDefinition, atlas: IndexDefinition): {
    match: boolean;
    category: IndexComparison['category'];
    differences: string[];
  } {
    const differences: string[] = [];

    // Compare key pattern (most important)
    const localKey = this.normalizeIndexKey(local.key);
    const atlasKey = this.normalizeIndexKey(atlas.key);
    
    if (localKey !== atlasKey) {
      differences.push(`Key pattern: LOCAL=${localKey} vs ATLAS=${atlasKey}`);
    }

    // Compare unique
    if (local.unique !== atlas.unique) {
      differences.push(`Unique: LOCAL=${local.unique || false} vs ATLAS=${atlas.unique || false}`);
    }

    // Compare sparse
    if (local.sparse !== atlas.sparse) {
      differences.push(`Sparse: LOCAL=${local.sparse || false} vs ATLAS=${atlas.sparse || false}`);
    }

    // Compare expireAfterSeconds (TTL)
    if (local.expireAfterSeconds !== atlas.expireAfterSeconds) {
      differences.push(`TTL: LOCAL=${local.expireAfterSeconds || 'none'} vs ATLAS=${atlas.expireAfterSeconds || 'none'}`);
    }

    // Compare partialFilterExpression
    const localPartial = JSON.stringify(local.partialFilterExpression || null);
    const atlasPartial = JSON.stringify(atlas.partialFilterExpression || null);
    if (localPartial !== atlasPartial) {
      differences.push(`PartialFilter: LOCAL=${localPartial} vs ATLAS=${atlasPartial}`);
    }

    // Determine category
    let category: IndexComparison['category'];
    
    if (differences.length === 0) {
      category = 'PERFECT_MATCH';
    } else if (differences.length === 1 && differences[0].includes('Key pattern') && local.name !== atlas.name) {
      // Name difference only, but functionally same
      category = 'COSMETIC';
    } else if (differences.some(d => d.includes('Key pattern') || d.includes('Unique') || d.includes('TTL'))) {
      // Functional difference
      category = 'FUNCTIONAL_MISMATCH';
    } else {
      category = 'FUNCTIONAL_MATCH';
    }

    return {
      match: differences.length === 0,
      category,
      differences
    };
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

    const expectedDb = 'bizzart';
    const dbMatch = atlasUri.includes(`/${expectedDb}`);

    this.log(`✅ MONGODB_URI configured: ${this.maskUri(atlasUri)}`);
    this.log(`✅ Database: ${expectedDb}`);
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
      this.report.phase2_connections.error = error.message;
      
      if (error.message.includes('IP') || error.message.includes('whitelist')) {
        this.log('⚠️  HINT: Check MongoDB Atlas Network Access (IP Whitelist)');
      }
      
      return false;
    }
  }

  async phase3_inventoryIndexes(): Promise<void> {
    this.log('=== PHASE 3 — INVENTAIRE DES INDEX ===');

    if (!this.localConn.db || !this.atlasConn.db) {
      throw new Error('Databases not connected');
    }

    for (const collName of this.requiredCollections) {
      this.log(`\nInspecting ${collName}...`);

      // Get indexes from LOCAL
      const localIndexes = await this.localConn.db.collection(collName).indexes() as IndexDefinition[];
      this.log(`  LOCAL: ${localIndexes.length} indexes`);

      // Get indexes from ATLAS
      const atlasIndexes = await this.atlasConn.db.collection(collName).indexes() as IndexDefinition[];
      this.log(`  ATLAS: ${atlasIndexes.length} indexes`);

      // Initialize collection audit
      const audit: CollectionIndexAudit = {
        collection: collName,
        localIndexes,
        atlasIndexes,
        matching: [],
        missingOnAtlas: [],
        extraOnAtlas: [],
        definitionMismatches: []
      };

      // Compare indexes
      await this.phase4_and_5_compareIndexes(audit);

      this.report.collections[collName] = audit;
      this.report.summary.collectionsChecked++;
    }
  }

  private async phase4_and_5_compareIndexes(audit: CollectionIndexAudit): Promise<void> {
    const { localIndexes, atlasIndexes } = audit;

    // Create maps by name
    const localMap = new Map(localIndexes.map(idx => [idx.name, idx]));
    const atlasMap = new Map(atlasIndexes.map(idx => [idx.name, idx]));

    // Check each local index
    for (const localIdx of localIndexes) {
      const atlasIdx = atlasMap.get(localIdx.name);

      if (!atlasIdx) {
        // Missing on Atlas
        const comparison: IndexComparison = {
          name: localIdx.name,
          localDefinition: localIdx,
          status: 'LOCAL_ONLY',
          category: 'LOCAL_EXTRA'
        };
        audit.missingOnAtlas.push(comparison);
        this.report.summary.localOnly++;
        this.log(`    ❌ ${localIdx.name}: LOCAL_ONLY`);
      } else {
        // Compare definitions
        const compResult = this.compareIndexDefinitions(localIdx, atlasIdx);

        const comparison: IndexComparison = {
          name: localIdx.name,
          localDefinition: localIdx,
          atlasDefinition: atlasIdx,
          status: compResult.match ? 'MATCH' : 'MISMATCH',
          category: compResult.category,
          differences: compResult.differences
        };

        if (compResult.match) {
          audit.matching.push(comparison);
          this.report.summary.perfectMatches++;
          this.log(`    ✅ ${localIdx.name}: PERFECT_MATCH`);
        } else {
          audit.definitionMismatches.push(comparison);
          
          if (compResult.category === 'FUNCTIONAL_MISMATCH') {
            this.report.summary.functionalMismatches++;
            this.log(`    ❌ ${localIdx.name}: FUNCTIONAL_MISMATCH`);
          } else if (compResult.category === 'COSMETIC') {
            this.report.summary.cosmeticDifferences++;
            this.log(`    ⚠️  ${localIdx.name}: COSMETIC`);
          } else {
            this.log(`    ℹ️  ${localIdx.name}: ${compResult.category}`);
          }

          // Log differences
          for (const diff of compResult.differences) {
            this.log(`        ${diff}`);
          }
        }
      }
    }

    // Check for extra indexes on Atlas
    for (const atlasIdx of atlasIndexes) {
      if (!localMap.has(atlasIdx.name)) {
        const comparison: IndexComparison = {
          name: atlasIdx.name,
          atlasDefinition: atlasIdx,
          status: 'ATLAS_ONLY',
          category: 'ATLAS_EXTRA'
        };
        audit.extraOnAtlas.push(comparison);
        this.report.summary.atlasOnly++;
        this.log(`    ⚠️  ${atlasIdx.name}: ATLAS_ONLY`);
      }
    }
  }

  private async phase6_verifyIdIndex(): Promise<void> {
    this.log('\n=== PHASE 6 — VÉRIFICATION INDEX _id ===');

    for (const collName of this.requiredCollections) {
      const audit = this.report.collections[collName];
      
      const localHasId = audit.localIndexes.some(idx => idx.name === '_id_');
      const atlasHasId = audit.atlasIndexes.some(idx => idx.name === '_id_');

      if (localHasId && atlasHasId) {
        this.log(`  ✅ ${collName}: _id_ index present on both`);
      } else {
        this.log(`  ❌ ${collName}: _id_ index missing (LOCAL=${localHasId}, ATLAS=${atlasHasId})`);
      }
    }
  }

  private calculateVerdict(): void {
    this.log('\n=== CALCULATING VERDICT ===');

    const { functionalMismatches, localOnly, atlasOnly } = this.report.summary;

    if (!this.report.phase2_connections.atlasConnected || !this.report.phase2_connections.localConnected) {
      this.report.verdict = {
        status: 'INCONCLUSIVE',
        reason: 'Cannot access one or both databases',
        noChangesApplied: true
      };
      return;
    }

    if (functionalMismatches > 0 || localOnly > 0 || atlasOnly > 0) {
      this.report.verdict = {
        status: 'MISMATCH',
        reason: `Found ${functionalMismatches} functional mismatches, ${localOnly} LOCAL-only indexes, ${atlasOnly} ATLAS-only indexes`,
        noChangesApplied: true
      };
    } else {
      this.report.verdict = {
        status: 'PASS',
        reason: 'All indexes match functionally between LOCAL and ATLAS',
        noChangesApplied: true
      };
    }
  }

  private async generateReports(): Promise<void> {
    this.log('\n=== GENERATING REPORTS ===');

    const reportsDir = path.join(__dirname, '..', '..', 'reports');

    // JSON Report
    const jsonPath = path.join(reportsDir, 'index-forensic-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    this.log(`✅ JSON report: ${jsonPath}`);

    // HTML Report
    const html = this.generateHtmlReport();
    const htmlPath = path.join(reportsDir, 'index-forensic-audit.html');
    fs.writeFileSync(htmlPath, html);
    this.log(`✅ HTML report: ${htmlPath}`);

    // Log file already being written
    this.log(`✅ Log file: ${this.logPath}`);
  }

  private generateHtmlReport(): string {
    const status = this.report.verdict.status;
    const statusColor = status === 'PASS' ? '#10b981' : status === 'MISMATCH' ? '#f59e0b' : '#6b7280';
    const statusIcon = status === 'PASS' ? '✅' : status === 'MISMATCH' ? '⚠️' : '❓';

    let collectionsHtml = '';

    for (const collName of this.requiredCollections) {
      const audit = this.report.collections[collName];
      if (!audit) continue;

      const hasMismatches = audit.definitionMismatches.length > 0 || 
                           audit.missingOnAtlas.length > 0 || 
                           audit.extraOnAtlas.length > 0;

      collectionsHtml += `
        <div class="section">
          <h2>${hasMismatches ? '⚠️' : '✅'} ${collName}</h2>
          
          <div class="metric">
            <span class="metric-label">LOCAL Indexes</span>
            <span class="metric-value">${audit.localIndexes.length}</span>
          </div>
          <div class="metric">
            <span class="metric-label">ATLAS Indexes</span>
            <span class="metric-value">${audit.atlasIndexes.length}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Matching</span>
            <span class="metric-value success">${audit.matching.length}</span>
          </div>
          ${audit.missingOnAtlas.length > 0 ? `
            <div class="metric">
              <span class="metric-label">Missing on ATLAS</span>
              <span class="metric-value failure">${audit.missingOnAtlas.length}</span>
            </div>
          ` : ''}
          ${audit.extraOnAtlas.length > 0 ? `
            <div class="metric">
              <span class="metric-label">Extra on ATLAS</span>
              <span class="metric-value warning">${audit.extraOnAtlas.length}</span>
            </div>
          ` : ''}
          ${audit.definitionMismatches.length > 0 ? `
            <div class="metric">
              <span class="metric-label">Definition Mismatches</span>
              <span class="metric-value warning">${audit.definitionMismatches.length}</span>
            </div>
            
            <h3>Mismatches Details</h3>
            ${audit.definitionMismatches.map(idx => `
              <div class="index-detail">
                <strong>${idx.name}</strong> - ${idx.category}
                ${idx.differences && idx.differences.length > 0 ? `
                  <ul>
                    ${idx.differences.map(diff => `<li>${diff}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          ` : ''}
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Forensique des Index</title>
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
    .section h3 { font-size: 1.2rem; margin: 1rem 0 0.5rem 0; color: #cbd5e1; }
    .metric { display: flex; justify-content: space-between; padding: 0.75rem; margin: 0.5rem 0; background: #0f172a; border-radius: 6px; }
    .metric-label { color: #94a3b8; }
    .metric-value { font-weight: 600; color: #f1f5f9; }
    .success { color: #10b981; }
    .failure { color: #ef4444; }
    .warning { color: #f59e0b; }
    .index-detail { background: #0f172a; padding: 1rem; margin: 0.5rem 0; border-radius: 6px; border-left: 3px solid #f59e0b; }
    .index-detail ul { margin-left: 1.5rem; margin-top: 0.5rem; }
    .index-detail li { color: #94a3b8; margin: 0.25rem 0; }
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
        <span class="metric-label">Collections Vérifiées</span>
        <span class="metric-value">${this.report.summary.collectionsChecked}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Perfect Matches</span>
        <span class="metric-value success">${this.report.summary.perfectMatches}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Functional Mismatches</span>
        <span class="metric-value ${this.report.summary.functionalMismatches > 0 ? 'failure' : 'success'}">${this.report.summary.functionalMismatches}</span>
      </div>
      <div class="metric">
        <span class="metric-label">LOCAL Only</span>
        <span class="metric-value ${this.report.summary.localOnly > 0 ? 'warning' : 'success'}">${this.report.summary.localOnly}</span>
      </div>
      <div class="metric">
        <span class="metric-label">ATLAS Only</span>
        <span class="metric-value ${this.report.summary.atlasOnly > 0 ? 'warning' : 'success'}">${this.report.summary.atlasOnly}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Cosmetic Differences</span>
        <span class="metric-value warning">${this.report.summary.cosmeticDifferences}</span>
      </div>
    </div>

    ${collectionsHtml}

    <div class="section">
      <h2>📝 Verdict Final</h2>
      <div class="metric">
        <span class="metric-label">Status</span>
        <span class="metric-value" style="color: ${statusColor}">${statusIcon} ${status}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Raison</span>
        <span class="metric-value">${this.report.verdict.reason}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Modifications Appliquées</span>
        <span class="metric-value success">AUCUNE (READ-ONLY)</span>
      </div>
    </div>

    <div class="footer">
      <p>Audit généré le ${new Date().toLocaleString('fr-FR')}</p>
      <p>BIZZ'ART MONASTIR — Audit Forensique des Index</p>
    </div>
  </div>
</body>
</html>`;
  }

  async run(): Promise<void> {
    console.log('\n============================================================');
    console.log('AUDIT FORENSIQUE DES INDEX LOCAL ↔ MONGODB ATLAS');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    this.log('=== AUDIT START ===');
    this.log('⚠️  MODE: READ-ONLY ABSOLU - NO INDEX MODIFICATIONS');

    try {
      // Phase 1
      if (!await this.phase1_environmentVerification()) {
        throw new Error('Environment verification failed');
      }

      // Phase 2
      if (!await this.phase2_connections()) {
        this.report.verdict = {
          status: 'INCONCLUSIVE',
          reason: 'Cannot connect to Atlas - Check Network Access (IP Whitelist)',
          noChangesApplied: true
        };
        await this.generateReports();
        this.printFinalSummary();
        return;
      }

      // Phase 3, 4, 5
      await this.phase3_inventoryIndexes();

      // Phase 6
      await this.phase6_verifyIdIndex();

      // Calculate verdict
      this.calculateVerdict();

      // Generate reports
      await this.generateReports();

      // Close connections
      await this.localConn.close();
      await this.atlasConn.close();

      this.log('\n=== AUDIT COMPLETE ===');
      this.printFinalSummary();

    } catch (error: any) {
      this.log(`❌ CRITICAL ERROR: ${error.message}`);
      this.report.verdict = {
        status: 'INCONCLUSIVE',
        reason: `Audit failed: ${error.message}`,
        noChangesApplied: true
      };
      await this.generateReports();
      this.printFinalSummary();
      process.exit(1);
    }
  }

  private printFinalSummary(): void {
    console.log('\n============================================================');
    console.log('INDEX FORENSIC AUDIT COMPLETE');
    console.log('============================================================\n');

    const status = this.report.verdict.status;
    const icon = status === 'PASS' ? '🟢' : status === 'MISMATCH' ? '🟡' : '🔴';

    console.log(`${icon} STATUS: ${status}\n`);
    console.log(`REASON: ${this.report.verdict.reason}\n`);

    console.log('SUMMARY:');
    console.log(`  Collections Checked: ${this.report.summary.collectionsChecked}`);
    console.log(`  Perfect Matches: ${this.report.summary.perfectMatches}`);
    console.log(`  Functional Mismatches: ${this.report.summary.functionalMismatches}`);
    console.log(`  LOCAL Only: ${this.report.summary.localOnly}`);
    console.log(`  ATLAS Only: ${this.report.summary.atlasOnly}`);
    console.log(`  Cosmetic Differences: ${this.report.summary.cosmeticDifferences}\n`);

    if (status === 'MISMATCH') {
      console.log('DETAILS:\n');
      
      for (const collName of this.requiredCollections) {
        const audit = this.report.collections[collName];
        if (!audit) continue;

        const hasMismatches = audit.definitionMismatches.length > 0 || 
                             audit.missingOnAtlas.length > 0 || 
                             audit.extraOnAtlas.length > 0;

        if (hasMismatches) {
          console.log(`  ${collName}:`);
          
          if (audit.missingOnAtlas.length > 0) {
            console.log(`    Missing on ATLAS: ${audit.missingOnAtlas.map(idx => idx.name).join(', ')}`);
          }
          
          if (audit.extraOnAtlas.length > 0) {
            console.log(`    Extra on ATLAS: ${audit.extraOnAtlas.map(idx => idx.name).join(', ')}`);
          }
          
          if (audit.definitionMismatches.length > 0) {
            console.log(`    Definition Mismatches:`);
            for (const idx of audit.definitionMismatches) {
              console.log(`      - ${idx.name} (${idx.category})`);
              if (idx.differences) {
                for (const diff of idx.differences) {
                  console.log(`          ${diff}`);
                }
              }
            }
          }
          console.log('');
        }
      }
    }

    console.log('GUARANTEES:');
    console.log(`  ✅ NO INDEX MODIFICATIONS APPLIED`);
    console.log(`  ✅ READ-ONLY MODE CONFIRMED`);
    console.log(`  ✅ NO createIndex() EXECUTED`);
    console.log(`  ✅ NO dropIndex() EXECUTED`);
    console.log(`  ✅ NO syncIndexes() EXECUTED\n`);

    console.log('REPORTS:');
    console.log(`  JSON: reports/index-forensic-audit.json`);
    console.log(`  HTML: reports/index-forensic-audit.html`);
    console.log(`  Log: ${this.logPath}\n`);

    console.log('============================================================\n');
  }
}

// Run audit
const audit = new IndexForensicAudit();
audit.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
