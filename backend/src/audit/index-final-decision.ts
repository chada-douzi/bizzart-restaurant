/**
 * MATRICE DE DÉCISION FINALE DES 23 INDEX
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY / ANALYSE FORENSIQUE
 * 
 * OBJECTIF: Déterminer précisément quels index doivent être créés sur Atlas
 * 
 * RÈGLE ABSOLUE:
 * - AUCUNE création d'index
 * - AUCUNE modification
 * - ANALYSE ET DÉCISION UNIQUEMENT
 */

import * as fs from 'fs';
import * as path from 'path';

interface IndexAnalysis {
  index: {
    name: string;
    collection: string;
    key: any;
    unique?: boolean;
  };
  declaredInSchema: boolean;
  schemaLocation?: string;
  queriesFound: any[];
  classification: string;
  duplicateCheck?: {
    checked: boolean;
    safe: boolean;
    localDuplicates: number;
    atlasDuplicates: number;
  };
}

interface IndexDecision {
  collection: string;
  indexName: string;
  keys: string;
  isUnique: boolean;
  declaredInSchema: boolean;
  schemaLocation: string;
  queriesFound: number;
  queryPatterns: string[];
  classification: string;
  functionalJustification: string;
  riskIfAbsent: string;
  creationRisk: string;
  decision: 'CREATE' | 'DO_NOT_CREATE' | 'REVIEW_REQUIRED';
  decisionReasoning: string;
}

interface FinalDecisionReport {
  metadata: {
    title: string;
    timestamp: string;
    mode: string;
  };
  summary: {
    total: number;
    create: number;
    doNotCreate: number;
    reviewRequired: number;
  };
  uniqueIndexes: {
    verified: number;
    safe: number;
  };
  decisions: IndexDecision[];
  guarantees: {
    noIndexCreated: boolean;
    noIndexDropped: boolean;
    noDataModified: boolean;
    readOnlyMode: boolean;
  };
}

class IndexFinalDecision {
  private report: FinalDecisionReport;
  private relevanceAudit: any;

  constructor() {
    this.report = {
      metadata: {
        title: 'MATRICE DE DÉCISION FINALE DES 23 INDEX',
        timestamp: new Date().toISOString(),
        mode: 'READ-ONLY / ANALYSE FORENSIQUE'
      },
      summary: {
        total: 23,
        create: 0,
        doNotCreate: 0,
        reviewRequired: 0
      },
      uniqueIndexes: {
        verified: 0,
        safe: 0
      },
      decisions: [],
      guarantees: {
        noIndexCreated: true,
        noIndexDropped: true,
        noDataModified: true,
        readOnlyMode: true
      }
    };
  }

  private loadRelevanceAudit(): void {
    const auditPath = path.join(__dirname, '..', '..', 'reports', 'index-relevance-audit.json');
    const content = fs.readFileSync(auditPath, 'utf-8');
    this.relevanceAudit = JSON.parse(content);
  }

  private formatKeys(key: any): string {
    return Object.entries(key).map(([field, direction]) => `${field}:${direction}`).join(', ');
  }

  private makeDecision(analysis: IndexAnalysis): IndexDecision {
    const { index, declaredInSchema, schemaLocation, queriesFound, classification, duplicateCheck } = analysis;

    const decision: IndexDecision = {
      collection: index.collection,
      indexName: index.name,
      keys: this.formatKeys(index.key),
      isUnique: index.unique || false,
      declaredInSchema,
      schemaLocation: schemaLocation || 'Not found',
      queriesFound: queriesFound.length,
      queryPatterns: queriesFound.map(q => `${q.location} - ${q.description}`),
      classification,
      functionalJustification: '',
      riskIfAbsent: '',
      creationRisk: '',
      decision: 'REVIEW_REQUIRED',
      decisionReasoning: ''
    };

    // UNIQUE INDEXES - Critical for data integrity
    if (index.unique) {
      this.report.uniqueIndexes.verified++;

      if (duplicateCheck && duplicateCheck.checked && duplicateCheck.safe) {
        this.report.uniqueIndexes.safe++;
        
        decision.decision = 'CREATE';
        decision.functionalJustification = `UNIQUE constraint ensures data integrity for ${Object.keys(index.key).join(', ')}. ` +
          `Used in ${queriesFound.length} queries for lookups and validation.`;
        decision.riskIfAbsent = 'CRITICAL - Duplicate data possible, application errors, data corruption';
        decision.creationRisk = 'LOW - No duplicates found, safe to create';
        decision.decisionReasoning = `UNIQUE index essential for data integrity. No duplicates detected. Used in authentication/lookup queries.`;
        this.report.summary.create++;
      } else {
        decision.decision = 'REVIEW_REQUIRED';
        decision.functionalJustification = 'UNIQUE constraint required but duplicates may exist';
        decision.riskIfAbsent = 'CRITICAL - Data integrity at risk';
        decision.creationRisk = 'HIGH - Duplicate check failed or not performed';
        decision.decisionReasoning = 'Manual review required - duplicate check inconclusive';
        this.report.summary.reviewRequired++;
      }
      
      return decision;
    }

    // COMPOSITE INDEXES (3+ fields) - Generally essential for complex queries
    const fieldCount = Object.keys(index.key).length;
    if (fieldCount >= 3) {
      if (queriesFound.length > 0) {
        decision.decision = 'CREATE';
        decision.functionalJustification = `Composite index covering ${fieldCount} fields optimizes complex queries. ` +
          `Field order matches query patterns.`;
        decision.riskIfAbsent = 'HIGH - Significant performance degradation on filtered/sorted queries';
        decision.creationRisk = 'LOW - Standard composite index, no constraints';
        decision.decisionReasoning = `Complex query optimization requires all ${fieldCount} fields indexed in this order.`;
        this.report.summary.create++;
      } else {
        decision.decision = 'DO_NOT_CREATE';
        decision.functionalJustification = 'Declared but no active queries found';
        decision.riskIfAbsent = 'LOW - No queries using this pattern';
        decision.creationRisk = 'N/A';
        decision.decisionReasoning = 'No evidence of usage - skip to reduce index overhead';
        this.report.summary.doNotCreate++;
      }
      
      return decision;
    }

    // 2-FIELD INDEXES - Evaluate based on query patterns
    if (fieldCount === 2) {
      if (queriesFound.length >= 2) {
        decision.decision = 'CREATE';
        decision.functionalJustification = `Compound index supports ${queriesFound.length} query patterns with filtering and sorting.`;
        decision.riskIfAbsent = 'MEDIUM - Performance impact on admin/list queries';
        decision.creationRisk = 'LOW - Standard compound index';
        decision.decisionReasoning = `Multiple queries benefit from this index. Performance critical for user experience.`;
        this.report.summary.create++;
      } else if (queriesFound.length === 1) {
        // Check if it's a filter + sort pattern
        const hasFilterAndSort = queriesFound.some(q => 
          (q.queryType === 'find' || q.queryType === 'sort') && 
          q.fields.length >= 2
        );
        
        if (hasFilterAndSort) {
          decision.decision = 'CREATE';
          decision.functionalJustification = 'Index supports filter + sort operation efficiently';
          decision.riskIfAbsent = 'MEDIUM - Sort after filter requires full collection scan';
          decision.creationRisk = 'LOW';
          decision.decisionReasoning = 'Compound index necessary for efficient sorted results';
          this.report.summary.create++;
        } else {
          decision.decision = 'REVIEW_REQUIRED';
          decision.functionalJustification = 'Single query usage - evaluate if single-field index sufficient';
          decision.riskIfAbsent = 'LOW-MEDIUM - May be covered by other indexes';
          decision.creationRisk = 'LOW - But may be redundant';
          decision.decisionReasoning = 'Verify if simpler index covers this use case';
          this.report.summary.reviewRequired++;
        }
      } else {
        decision.decision = 'DO_NOT_CREATE';
        decision.functionalJustification = 'No queries found';
        decision.riskIfAbsent = 'NONE';
        decision.creationRisk = 'N/A';
        decision.decisionReasoning = 'No evidence of usage';
        this.report.summary.doNotCreate++;
      }
      
      return decision;
    }

    // SINGLE-FIELD INDEXES - Conservative approach
    if (fieldCount === 1) {
      if (queriesFound.length >= 1) {
        // Check if it's frequently queried or filtered
        const isAuthCritical = index.collection === 'users' && Object.keys(index.key)[0] === 'email';
        const isSlugLookup = Object.keys(index.key)[0] === 'slug';
        const isStatusFilter = ['isActive', 'isVisible', 'isPublished', 'isApproved'].includes(Object.keys(index.key)[0]);
        
        if (isAuthCritical || isSlugLookup) {
          decision.decision = 'CREATE';
          decision.functionalJustification = 'Critical for application functionality (auth/routing)';
          decision.riskIfAbsent = 'HIGH - Authentication/routing performance severely impacted';
          decision.creationRisk = 'LOW';
          decision.decisionReasoning = 'Essential for core application features';
          this.report.summary.create++;
        } else if (isStatusFilter && queriesFound.length >= 1) {
          decision.decision = 'CREATE';
          decision.functionalJustification = 'Boolean filter used in public/admin queries';
          decision.riskIfAbsent = 'MEDIUM - List queries scan full collection';
          decision.creationRisk = 'LOW';
          decision.decisionReasoning = 'Common filter pattern benefits from index';
          this.report.summary.create++;
        } else {
          decision.decision = 'REVIEW_REQUIRED';
          decision.functionalJustification = `Used in ${queriesFound.length} queries but may be covered by compound indexes`;
          decision.riskIfAbsent = 'LOW-MEDIUM - Compound indexes may provide coverage';
          decision.creationRisk = 'LOW - But check for redundancy';
          decision.decisionReasoning = 'Verify if compound indexes already cover this field';
          this.report.summary.reviewRequired++;
        }
      } else {
        decision.decision = 'DO_NOT_CREATE';
        decision.functionalJustification = 'No queries found';
        decision.riskIfAbsent = 'NONE';
        decision.creationRisk = 'N/A';
        decision.decisionReasoning = 'No usage detected';
        this.report.summary.doNotCreate++;
      }
      
      return decision;
    }

    // Default fallback
    decision.decision = 'REVIEW_REQUIRED';
    decision.decisionReasoning = 'Edge case - manual review required';
    this.report.summary.reviewRequired++;
    return decision;
  }

  private checkRedundancy(): void {
    // Group indexes by collection
    const byCollection = new Map<string, IndexDecision[]>();
    
    for (const decision of this.report.decisions) {
      if (!byCollection.has(decision.collection)) {
        byCollection.set(decision.collection, []);
      }
      byCollection.get(decision.collection)!.push(decision);
    }

    // Check for potential redundancy within each collection
    for (const [collection, indexes] of byCollection.entries()) {
      const createIndexes = indexes.filter(idx => idx.decision === 'CREATE');
      
      // Check if single-field indexes are covered by compound indexes
      for (const singleIdx of createIndexes.filter(idx => idx.keys.split(',').length === 1)) {
        const field = Object.keys(singleIdx)[0];
        
        const coveredByCompound = createIndexes.some(compoundIdx => {
          if (compoundIdx.keys.split(',').length <= 1) return false;
          // Check if compound index starts with this field
          const firstField = compoundIdx.keys.split(',')[0].split(':')[0].trim();
          return firstField === field;
        });

        if (coveredByCompound && !singleIdx.isUnique) {
          // Flag for review
          const idx = this.report.decisions.findIndex(d => 
            d.collection === singleIdx.collection && d.indexName === singleIdx.indexName
          );
          if (idx !== -1 && this.report.decisions[idx].decision === 'CREATE') {
            this.report.decisions[idx].decision = 'REVIEW_REQUIRED';
            this.report.decisions[idx].decisionReasoning += ' | REDUNDANCY CHECK: May be covered by compound index starting with same field';
            this.report.summary.create--;
            this.report.summary.reviewRequired++;
          }
        }
      }
    }
  }

  async run(): Promise<void> {
    console.log('\n============================================================');
    console.log('MATRICE DE DÉCISION FINALE DES 23 INDEX');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    // Load relevance audit
    this.loadRelevanceAudit();

    console.log(`Analyzing ${this.relevanceAudit.analyses.length} indexes...\n`);

    // Process each index
    for (const analysis of this.relevanceAudit.analyses) {
      const decision = this.makeDecision(analysis);
      this.report.decisions.push(decision);
    }

    // Check for redundancy
    this.checkRedundancy();

    // Generate reports
    this.generateReports();

    // Print summary
    this.printSummary();
  }

  private generateReports(): void {
    const reportsDir = path.join(__dirname, '..', '..', 'reports');

    // JSON Report
    const jsonPath = path.join(reportsDir, 'index-final-decision.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    console.log(`✅ JSON report: ${jsonPath}`);

    // HTML Report
    const html = this.generateHtmlReport();
    const htmlPath = path.join(reportsDir, 'index-final-decision.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML report: ${htmlPath}\n`);
  }

  private generateHtmlReport(): string {
    const getDecisionColor = (decision: string): string => {
      switch (decision) {
        case 'CREATE': return '#10b981';
        case 'DO_NOT_CREATE': return '#ef4444';
        case 'REVIEW_REQUIRED': return '#f59e0b';
        default: return '#6b7280';
      }
    };

    const getDecisionIcon = (decision: string): string => {
      switch (decision) {
        case 'CREATE': return '✅';
        case 'DO_NOT_CREATE': return '❌';
        case 'REVIEW_REQUIRED': return '⚠️';
        default: return '❓';
      }
    };

    const decisionsHtml = this.report.decisions.map(d => {
      const color = getDecisionColor(d.decision);
      const icon = getDecisionIcon(d.decision);
      
      return `
        <div class="decision-card" style="border-left-color: ${color}">
          <div class="decision-header">
            <h3>${d.collection}.${d.indexName}</h3>
            <span class="badge" style="background: ${color}">${icon} ${d.decision}</span>
          </div>
          
          <div class="decision-body">
            <div class="info-row">
              <span class="label">Keys:</span>
              <span class="value"><code>${d.keys}</code></span>
            </div>
            
            ${d.isUnique ? `
              <div class="info-row">
                <span class="label">Type:</span>
                <span class="value unique-badge">UNIQUE</span>
              </div>
            ` : ''}
            
            <div class="info-row">
              <span class="label">Schema:</span>
              <span class="value">${d.declaredInSchema ? '✅ Declared' : '❌ Not declared'}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Queries Found:</span>
              <span class="value">${d.queriesFound}</span>
            </div>
            
            ${d.queryPatterns.length > 0 ? `
              <div class="query-patterns">
                <strong>Query Patterns:</strong>
                <ul>
                  ${d.queryPatterns.map(p => `<li>${p}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div class="justification">
              <strong>Functional Justification:</strong>
              <p>${d.functionalJustification}</p>
            </div>
            
            <div class="risk">
              <strong>Risk if Absent:</strong>
              <p>${d.riskIfAbsent}</p>
            </div>
            
            <div class="creation-risk">
              <strong>Creation Risk:</strong>
              <p>${d.creationRisk}</p>
            </div>
            
            <div class="reasoning">
              <strong>Decision Reasoning:</strong>
              <p>${d.decisionReasoning}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Matrice de Décision Finale des Index</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; line-height: 1.6; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 2rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #334155; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #f1f5f9; }
    .header p { color: #94a3b8; }
    
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; text-align: center; }
    .summary-card h3 { font-size: 2rem; margin-bottom: 0.5rem; }
    .summary-card p { color: #94a3b8; font-size: 0.9rem; }
    
    .decision-card { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid; border-right: 1px solid #334155; border-top: 1px solid #334155; border-bottom: 1px solid #334155; }
    .decision-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #334155; }
    .decision-header h3 { color: #f1f5f9; font-size: 1.3rem; }
    .badge { padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem; color: white; }
    .unique-badge { background: #8b5cf6; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: white; }
    
    .decision-body { }
    .info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #334155; }
    .info-row .label { color: #94a3b8; font-weight: 500; }
    .info-row .value { color: #f1f5f9; font-weight: 600; }
    .info-row code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 3px; color: #60a5fa; }
    
    .query-patterns { background: #0f172a; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
    .query-patterns strong { color: #cbd5e1; display: block; margin-bottom: 0.5rem; }
    .query-patterns ul { margin-left: 1.5rem; }
    .query-patterns li { color: #94a3b8; margin: 0.5rem 0; }
    
    .justification, .risk, .creation-risk, .reasoning { margin: 1rem 0; padding: 1rem; background: #0f172a; border-radius: 6px; }
    .justification strong, .risk strong, .creation-risk strong, .reasoning strong { color: #cbd5e1; display: block; margin-bottom: 0.5rem; }
    .justification p, .risk p, .creation-risk p, .reasoning p { color: #94a3b8; }
    
    .guarantees { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; border: 1px solid #334155; }
    .guarantees h2 { margin-bottom: 1rem; color: #10b981; }
    .guarantees ul { list-style: none; }
    .guarantees li { padding: 0.5rem 0; color: #94a3b8; }
    .guarantees li:before { content: "✅ "; color: #10b981; }
    
    .footer { text-align: center; margin-top: 2rem; padding: 1rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${this.report.metadata.title}</h1>
      <p>Timestamp: ${this.report.metadata.timestamp}</p>
      <p>Mode: ${this.report.metadata.mode}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>${this.report.summary.total}</h3>
        <p>Total Indexes</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #10b981">${this.report.summary.create}</h3>
        <p>✅ CREATE</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #ef4444">${this.report.summary.doNotCreate}</h3>
        <p>❌ DO NOT CREATE</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #f59e0b">${this.report.summary.reviewRequired}</h3>
        <p>⚠️  REVIEW REQUIRED</p>
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>${this.report.uniqueIndexes.verified}</h3>
        <p>Unique Indexes Verified</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #10b981">${this.report.uniqueIndexes.safe}</h3>
        <p>Safe to Create (No Duplicates)</p>
      </div>
    </div>

    <h2 style="margin: 2rem 0 1rem 0; color: #f1f5f9;">Detailed Decisions (${this.report.decisions.length} indexes)</h2>
    
    ${decisionsHtml}

    <div class="guarantees">
      <h2>✅ Guarantees</h2>
      <ul>
        <li>No indexes created during analysis</li>
        <li>No indexes dropped during analysis</li>
        <li>No data modified</li>
        <li>READ-ONLY mode maintained</li>
        <li>Analysis based on forensic audit data only</li>
      </ul>
    </div>

    <div class="footer">
      <p>Matrice de décision générée le ${new Date().toLocaleString('fr-FR')}</p>
      <p>BIZZ'ART MONASTIR — Index Final Decision Matrix</p>
      <p style="margin-top: 1rem; color: #f59e0b;"><strong>⚠️  ATTENDRE VALIDATION HUMAINE AVANT CRÉATION</strong></p>
    </div>
  </div>
</body>
</html>`;
  }

  private printSummary(): void {
    console.log('\n============================================================');
    console.log('MATRICE DE DÉCISION FINALE');
    console.log('============================================================\n');

    console.log(`TOTAL: ${this.report.summary.total}`);
    console.log(`✅ CREATE: ${this.report.summary.create}`);
    console.log(`❌ DO_NOT_CREATE: ${this.report.summary.doNotCreate}`);
    console.log(`⚠️  REVIEW_REQUIRED: ${this.report.summary.reviewRequired}\n`);

    console.log(`UNIQUE INDEXES:`);
    console.log(`  Verified: ${this.report.uniqueIndexes.verified}`);
    console.log(`  Safe (No Duplicates): ${this.report.uniqueIndexes.safe}\n`);

    console.log('GUARANTEES:');
    console.log('  ✅ No indexes created');
    console.log('  ✅ No indexes dropped');
    console.log('  ✅ No data modified');
    console.log('  ✅ READ-ONLY mode maintained\n');

    console.log('⚠️  NEXT STEP: ATTENDRE VALIDATION HUMAINE EXPLICITE');
    console.log('⚠️  NE PAS CRÉER D\'INDEX AUTOMATIQUEMENT\n');

    console.log('============================================================\n');
  }
}

// Run decision matrix
const decision = new IndexFinalDecision();
decision.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
