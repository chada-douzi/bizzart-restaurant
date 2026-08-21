/**
 * AUDIT FORENSIQUE CIBLÉ — settings.updatedAt_-1
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY ABSOLU
 * 
 * OBJECTIF:
 * Déterminer si l'index settings.updatedAt_-1 doit être créé
 */

import mongoose, { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

interface AuditReport {
  metadata: {
    title: string;
    timestamp: string;
    mode: string;
  };
  analysis: {
    collectionName: string;
    indexName: string;
    indexKeys: string;
    isSingleton: boolean;
    documentCount: number;
    existingIndexes: string[];
    queriesFound: {
      location: string;
      hasFilterOnUpdatedAt: boolean;
      hasSortOnUpdatedAt: boolean;
      query: string;
    }[];
    explainResult?: any;
    redundantWith: string[];
  };
  decision: {
    final: 'KEEP/CREATE_SAFE' | 'DO_NOT_CREATE' | 'REVIEW_REQUIRED';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning: string;
    performanceImpact: string;
  };
  guardRail: {
    readOnlyMode: boolean;
    indexCreated: number;
    dataModified: boolean;
  };
}

class SettingsUpdatedAtAudit {
  private localConn!: Connection;

  async connect() {
    try {
      const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/bizzart';
      console.log('🔌 Connecting to LOCAL...');
      this.localConn = await mongoose.createConnection(localUri).asPromise();
      console.log('✅ LOCAL connected');
    } catch (error: any) {
      console.error('❌ Connection error:', error.message);
      throw error;
    }
  }

  async auditSettingsUpdatedAt(): Promise<AuditReport> {
    console.log('\n============================================================');
    console.log('🔍 AUDIT FORENSIQUE CIBLÉ — settings.updatedAt_-1');
    console.log('============================================================\n');

    // 1. Vérifier le nombre de documents
    const settingsCollection = this.localConn.db?.collection('settings');
    if (!settingsCollection) {
      throw new Error('Settings collection not found');
    }

    const documentCount = await settingsCollection.countDocuments({});
    console.log(`📊 Documents in settings: ${documentCount}`);

    // 2. Récupérer les index existants
    const indexes = await settingsCollection.listIndexes().toArray();
    const existingIndexNames = indexes.map(idx => idx.name);
    console.log(`📋 Existing indexes: ${existingIndexNames.join(', ')}`);

    // 3. Analyser les requêtes (depuis le code source)
    const queriesFound = [
      {
        location: 'settings.controller.ts:120',
        hasFilterOnUpdatedAt: false,
        hasSortOnUpdatedAt: false,
        query: 'Settings.findOne().lean()'
      },
      {
        location: 'settings.controller.ts:142',
        hasFilterOnUpdatedAt: false,
        hasSortOnUpdatedAt: false,
        query: 'Settings.findOne().populate("updatedBy", "firstName lastName email").lean()'
      },
      {
        location: 'settings.controller.ts:188',
        hasFilterOnUpdatedAt: false,
        hasSortOnUpdatedAt: false,
        query: 'Settings.findOneAndUpdate({}, { $set: updateFields }, ...)'
      }
    ];

    console.log(`🔎 Queries analyzed: ${queriesFound.length}`);
    queriesFound.forEach(q => {
      console.log(`   - ${q.location}: filter=${q.hasFilterOnUpdatedAt}, sort=${q.hasSortOnUpdatedAt}`);
    });

    // 4. Exécuter explain sur une requête représentative
    let explainResult = null;
    try {
      const result = await settingsCollection.find({}).explain('executionStats');
      explainResult = {
        executionTimeMillis: result.executionStats?.executionTimeMillis || 0,
        totalDocsExamined: result.executionStats?.totalDocsExamined || 0,
        indexUsed: result.queryPlanner?.winningPlan?.inputStage?.indexName || 'COLLSCAN'
      };
      console.log(`📈 Explain result: ${JSON.stringify(explainResult)}`);
    } catch (error: any) {
      console.warn(`⚠️  Explain failed: ${error.message}`);
    }

    // 5. Vérifier redondance
    const redundantWith: string[] = [];
    // updatedAt_-1 est un index simple, pas de redondance avec _id_

    // 6. Décision finale
    let finalDecision: 'KEEP/CREATE_SAFE' | 'DO_NOT_CREATE' | 'REVIEW_REQUIRED';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    let reasoning: string;
    let performanceImpact: string;

    const hasFilterOrSort = queriesFound.some(q => q.hasFilterOnUpdatedAt || q.hasSortOnUpdatedAt);

    if (documentCount <= 1 && !hasFilterOrSort) {
      finalDecision = 'DO_NOT_CREATE';
      confidence = 'HIGH';
      reasoning = 'Collection singleton (≤1 document) et aucune requête ne filtre ou ne trie sur updatedAt. Index inutile.';
      performanceImpact = 'NONE - findOne() sur singleton est instantané sans index supplémentaire';
    } else if (documentCount > 1 && hasFilterOrSort) {
      finalDecision = 'KEEP/CREATE_SAFE';
      confidence = 'HIGH';
      reasoning = 'Collection non-singleton avec requêtes filtrant/triant sur updatedAt';
      performanceImpact = 'HIGH - Index nécessaire pour performance';
    } else {
      finalDecision = 'REVIEW_REQUIRED';
      confidence = 'MEDIUM';
      reasoning = 'Situation ambiguë nécessitant validation manuelle';
      performanceImpact = 'MEDIUM';
    }

    return {
      metadata: {
        title: 'AUDIT FORENSIQUE CIBLÉ — settings.updatedAt_-1',
        timestamp: new Date().toISOString(),
        mode: 'READ-ONLY ABSOLU'
      },
      analysis: {
        collectionName: 'settings',
        indexName: 'updatedAt_-1',
        indexKeys: '{ updatedAt: -1 }',
        isSingleton: documentCount <= 1,
        documentCount,
        existingIndexes: existingIndexNames,
        queriesFound,
        explainResult,
        redundantWith
      },
      decision: {
        final: finalDecision,
        confidence,
        reasoning,
        performanceImpact
      },
      guardRail: {
        readOnlyMode: true,
        indexCreated: 0,
        dataModified: false
      }
    };
  }

  generateReports(report: AuditReport) {
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // JSON
    const jsonPath = path.join(reportsDir, 'settings-updatedAt-final-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON report: ${jsonPath}`);

    // HTML
    const htmlContent = this.generateHTML(report);
    const htmlPath = path.join(reportsDir, 'settings-updatedAt-final-audit.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`✅ HTML report: ${htmlPath}`);
  }

  generateHTML(report: AuditReport): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Settings updatedAt Index Audit - BIZZ'ART Monastir</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .decision { font-size: 1.5em; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; }
    .decision-do-not-create { background: #e74c3c; color: white; }
    .decision-create-safe { background: #27ae60; color: white; }
    .decision-review { background: #f39c12; color: white; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    .yes { color: #27ae60; font-weight: bold; }
    .no { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 AUDIT FORENSIQUE CIBLÉ</h1>
    <h2>settings.updatedAt_-1</h2>
    <p>BIZZ'ART Monastir - ${report.metadata.timestamp}</p>
    <p>Mode: ${report.metadata.mode}</p>
  </div>

  <div class="decision decision-${report.decision.final.toLowerCase().replace('/', '-').replace('_', '-')}">
    ${report.decision.final}
  </div>

  <div class="section">
    <h2>📊 ANALYSE</h2>
    <table>
      <tr><th>Collection</th><td>${report.analysis.collectionName}</td></tr>
      <tr><th>Index Name</th><td>${report.analysis.indexName}</td></tr>
      <tr><th>Index Keys</th><td>${report.analysis.indexKeys}</td></tr>
      <tr><th>Is Singleton</th><td class="${report.analysis.isSingleton ? 'yes' : 'no'}">${report.analysis.isSingleton ? '✅ YES' : '❌ NO'}</td></tr>
      <tr><th>Document Count</th><td>${report.analysis.documentCount}</td></tr>
      <tr><th>Existing Indexes</th><td>${report.analysis.existingIndexes.join(', ')}</td></tr>
      <tr><th>Redundant With</th><td>${report.analysis.redundantWith.length > 0 ? report.analysis.redundantWith.join(', ') : 'None'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>🔎 REQUÊTES ANALYSÉES</h2>
    <table>
      <tr>
        <th>Location</th>
        <th>Filter on updatedAt</th>
        <th>Sort on updatedAt</th>
        <th>Query</th>
      </tr>
      ${report.analysis.queriesFound.map(q => `
        <tr>
          <td>${q.location}</td>
          <td class="${q.hasFilterOnUpdatedAt ? 'yes' : 'no'}">${q.hasFilterOnUpdatedAt ? '✅' : '❌'}</td>
          <td class="${q.hasSortOnUpdatedAt ? 'yes' : 'no'}">${q.hasSortOnUpdatedAt ? '✅' : '❌'}</td>
          <td><code>${q.query}</code></td>
        </tr>
      `).join('')}
    </table>
  </div>

  ${report.analysis.explainResult ? `
  <div class="section">
    <h2>📈 EXPLAIN RESULT</h2>
    <table>
      <tr><th>Execution Time</th><td>${report.analysis.explainResult.executionTimeMillis} ms</td></tr>
      <tr><th>Docs Examined</th><td>${report.analysis.explainResult.totalDocsExamined}</td></tr>
      <tr><th>Index Used</th><td>${report.analysis.explainResult.indexUsed}</td></tr>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>⚖️ DÉCISION FINALE</h2>
    <table>
      <tr><th>Decision</th><td><strong>${report.decision.final}</strong></td></tr>
      <tr><th>Confidence</th><td>${report.decision.confidence}</td></tr>
      <tr><th>Reasoning</th><td>${report.decision.reasoning}</td></tr>
      <tr><th>Performance Impact</th><td>${report.decision.performanceImpact}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>🔒 GARDE-FOU</h2>
    <table>
      <tr><th>Read-Only Mode</th><td class="yes">✅ ${report.guardRail.readOnlyMode ? 'YES' : 'NO'}</td></tr>
      <tr><th>Index Created</th><td>${report.guardRail.indexCreated}</td></tr>
      <tr><th>Data Modified</th><td class="no">❌ ${report.guardRail.dataModified ? 'YES' : 'NO'}</td></tr>
    </table>
  </div>
</body>
</html>`;
  }

  displayVerdict(report: AuditReport) {
    console.log('\n============================================================');
    console.log('⚖️  VERDICT FINAL');
    console.log('============================================================');
    console.log(`SETTINGS_UPDATEDAT_FINAL_DECISION: ${report.decision.final}`);
    console.log(`Confidence: ${report.decision.confidence}`);
    console.log(`Reasoning: ${report.decision.reasoning}`);
    console.log(`Performance Impact: ${report.decision.performanceImpact}`);
    console.log('\n============================================================');
    console.log('INDEX_CREATION_AUTHORIZED: NO');
    console.log('============================================================\n');
  }

  async disconnect() {
    if (this.localConn) {
      await this.localConn.close();
      console.log('✅ LOCAL disconnected');
    }
  }

  async run() {
    try {
      await this.connect();
      const report = await this.auditSettingsUpdatedAt();
      this.generateReports(report);
      this.displayVerdict(report);
      await this.disconnect();
      process.exit(0);
    } catch (error: any) {
      console.error('❌ FATAL ERROR:', error.message);
      console.error(error.stack);
      await this.disconnect();
      process.exit(1);
    }
  }
}

// EXÉCUTION
const audit = new SettingsUpdatedAtAudit();
audit.run();
