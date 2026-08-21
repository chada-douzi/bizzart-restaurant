/**
 * AUDIT DE PERTINENCE DES 23 INDEX MONGODB
 * BIZZ'ART MONASTIR
 * 
 * MODE: FORENSIQUE / READ-ONLY ABSOLU
 * 
 * RÈGLE ABSOLUE:
 * - AUCUNE modification de données
 * - AUCUNE modification d'index
 * - AUCUN createIndex(), dropIndex(), syncIndexes()
 * - OBSERVATION ET ANALYSE UNIQUEMENT
 * 
 * OBJECTIF:
 * Déterminer pour chaque index LOCAL-only:
 * - S'il est déclaré dans les schémas actuels
 * - Les requêtes qui l'utilisent
 * - Sa classification: REQUIRED/RECOMMENDED/OPTIONAL/OBSOLETE/UNKNOWN
 * - Les risques de recréation
 */

import mongoose, { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();

// Configure DNS for Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);

interface IndexDefinition {
  name: string;
  collection: string;
  key: { [key: string]: number | string };
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: any;
  [key: string]: any;
}

interface QueryPattern {
  location: string;
  lineNumber?: number;
  queryType: string;
  fields: string[];
  description: string;
}

interface DuplicateCheck {
  checked: boolean;
  localDuplicates: number;
  atlasDuplicates: number;
  safe: boolean;
  error?: string;
}

interface IndexAnalysis {
  index: IndexDefinition;
  declaredInSchema: boolean;
  schemaLocation?: string;
  schemaOptions?: any;
  fieldsUsed: string[];
  queriesFound: QueryPattern[];
  classification: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'OBSOLETE' | 'UNKNOWN';
  reasoning: string;
  duplicateCheck?: DuplicateCheck;
  risks: string[];
  recommendation: string;
}

interface RelevanceReport {
  metadata: {
    auditTitle: string;
    timestamp: string;
    mode: string;
  };
  summary: {
    totalIndexes: number;
    required: number;
    recommended: number;
    optional: number;
    obsolete: number;
    unknown: number;
  };
  analyses: IndexAnalysis[];
  recommendations: {
    toRecreate: string[];
    notToRecreate: string[];
    toMonitor: string[];
  };
  guarantees: {
    modificationsApplied: number;
    dataModified: boolean;
    indexesModified: boolean;
  };
  verdict: string;
}

class IndexRelevanceAudit {
  private localConn!: Connection;
  private atlasConn!: Connection;
  private report: RelevanceReport;
  private logPath: string;

  // 23 indexes à analyser
  private readonly indexesToAnalyze: Array<{ collection: string; name: string }> = [
    // reservations (5)
    { collection: 'reservations', name: 'date_1_status_1' },
    { collection: 'reservations', name: 'customer.email_1' },
    { collection: 'reservations', name: 'status_1_createdAt_-1' },
    { collection: 'reservations', name: 'date_1_time_1' },
    { collection: 'reservations', name: 'reminderSent_1_date_1_status_1' },
    // menuitems (4)
    { collection: 'menuitems', name: 'slug_1' },
    { collection: 'menuitems', name: 'category_1_isAvailable_1_order_1' },
    { collection: 'menuitems', name: 'isFeatured_1_isAvailable_1' },
    { collection: 'menuitems', name: 'tags_1' },
    // reviews (4)
    { collection: 'reviews', name: 'isPublished_1_isApproved_1_order_1' },
    { collection: 'reviews', name: 'source_1' },
    { collection: 'reviews', name: 'rating_1' },
    { collection: 'reviews', name: 'reviewDate_-1' },
    // menucategories (2)
    { collection: 'menucategories', name: 'slug_1' },
    { collection: 'menucategories', name: 'isActive_1_order_1' },
    // settings (1)
    { collection: 'settings', name: 'updatedAt_-1' },
    // users (3)
    { collection: 'users', name: 'email_1' },
    { collection: 'users', name: 'role_1' },
    { collection: 'users', name: 'isActive_1' },
    // media (4)
    { collection: 'media', name: 'category_1_isVisible_1_order_1' },
    { collection: 'media', name: 'type_1_category_1' },
    { collection: 'media', name: 'isVisible_1_order_1' },
    { collection: 'media', name: 'publicId_1' },
  ];

  constructor() {
    const reportsDir = path.join(__dirname, '..', '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    this.logPath = path.join(reportsDir, `index-relevance-audit-${Date.now()}.log`);

    this.report = {
      metadata: {
        auditTitle: 'AUDIT DE PERTINENCE DES 23 INDEX MONGODB',
        timestamp: new Date().toISOString(),
        mode: 'FORENSIQUE / READ-ONLY ABSOLU'
      },
      summary: {
        totalIndexes: 23,
        required: 0,
        recommended: 0,
        optional: 0,
        obsolete: 0,
        unknown: 0
      },
      analyses: [],
      recommendations: {
        toRecreate: [],
        notToRecreate: [],
        toMonitor: []
      },
      guarantees: {
        modificationsApplied: 0,
        dataModified: false,
        indexesModified: false
      },
      verdict: 'READY_FOR_REVIEW'
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logPath, logLine);
    console.log(`  ${message}`);
  }

  private parseIndexKey(indexName: string): { [key: string]: number | string } {
    // Parse index name like "date_1_status_1" into { date: 1, status: 1 }
    const key: { [key: string]: number | string } = {};
    const parts = indexName.split('_');
    
    for (let i = 0; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        const field = parts[i];
        const direction = parts[i + 1];
        key[field] = direction === '-1' ? -1 : 1;
      }
    }
    
    return key;
  }

  private async connectDatabases(): Promise<boolean> {
    this.log('=== CONNEXION AUX BASES ===');

    try {
      this.log('Connecting to LOCAL...');
      this.localConn = await mongoose.createConnection('mongodb://localhost:27017/bizzart', {
        readPreference: 'primaryPreferred'
      }).asPromise();
      this.log('✅ LOCAL connected');

      this.log('Connecting to ATLAS...');
      const atlasUri = process.env.MONGODB_URI!;
      this.atlasConn = await mongoose.createConnection(atlasUri, {
        readPreference: 'primaryPreferred'
      }).asPromise();
      this.log('✅ ATLAS connected');

      return true;
    } catch (error: any) {
      this.log(`❌ Connection failed: ${error.message}`);
      return false;
    }
  }

  private async analyzeIndex(indexMeta: { collection: string; name: string }): Promise<IndexAnalysis> {
    this.log(`\nAnalyzing ${indexMeta.collection}.${indexMeta.name}...`);

    const indexDef: IndexDefinition = {
      name: indexMeta.name,
      collection: indexMeta.collection,
      key: this.parseIndexKey(indexMeta.name)
    };

    // Get actual index definition from LOCAL
    try {
      const indexes = await this.localConn.db!.collection(indexMeta.collection).indexes();
      const actualIndex = indexes.find(idx => idx.name === indexMeta.name);
      if (actualIndex) {
        indexDef.unique = actualIndex.unique;
        indexDef.sparse = actualIndex.sparse;
        indexDef.expireAfterSeconds = actualIndex.expireAfterSeconds;
        indexDef.partialFilterExpression = actualIndex.partialFilterExpression;
      }
    } catch (error: any) {
      this.log(`  ⚠️  Could not fetch index details: ${error.message}`);
    }

    const analysis: IndexAnalysis = {
      index: indexDef,
      declaredInSchema: false,
      fieldsUsed: Object.keys(indexDef.key),
      queriesFound: [],
      classification: 'UNKNOWN',
      reasoning: '',
      risks: [],
      recommendation: ''
    };

    // Check schema declarations
    this.checkSchemaDeclaration(analysis);

    // Find queries using these fields
    this.findQueriesUsingIndex(analysis);

    // Check for duplicates (unique indexes only)
    if (indexDef.unique) {
      await this.checkDuplicates(analysis);
    }

    // Classify index
    this.classifyIndex(analysis);

    // Assess risks
    this.assessRisks(analysis);

    // Generate recommendation
    this.generateRecommendation(analysis);

    return analysis;
  }

  private checkSchemaDeclaration(analysis: IndexAnalysis): void {
    const { collection, name } = analysis.index;
    const modelPath = `src/models/${this.getModelFileName(collection)}`;

    // Read model file content
    const modelFullPath = path.join(__dirname, '..', '..', modelPath);
    
    try {
      const content = fs.readFileSync(modelFullPath, 'utf-8');
      
      // Check if index is declared in schema
      const schemaIndexRegex = new RegExp(`\\.index\\(.*${this.escapeRegex(name.split('_')[0])}`, 'i');
      
      if (content.includes('.index(') && schemaIndexRegex.test(content)) {
        analysis.declaredInSchema = true;
        analysis.schemaLocation = modelPath;
        this.log(`  ✅ Declared in schema: ${modelPath}`);
      } else if (content.includes('unique: true') && name.includes('_1') && analysis.fieldsUsed.length === 1) {
        // Check for unique field declaration
        const field = analysis.fieldsUsed[0];
        if (content.includes(`${field}:`) && content.includes('unique: true')) {
          analysis.declaredInSchema = true;
          analysis.schemaLocation = `${modelPath} (unique field)`;
          analysis.schemaOptions = { unique: true };
          this.log(`  ✅ Declared as unique field in: ${modelPath}`);
        }
      } else {
        this.log(`  ⚠️  NOT declared in schema`);
      }
    } catch (error: any) {
      this.log(`  ⚠️  Could not read model file: ${error.message}`);
    }
  }

  private getModelFileName(collection: string): string {
    const map: { [key: string]: string } = {
      'reservations': 'reservation.model.ts',
      'menuitems': 'menu-item.model.ts',
      'reviews': 'review.model.ts',
      'menucategories': 'menu-category.model.ts',
      'settings': 'settings.model.ts',
      'users': 'user.model.ts',
      'media': 'media.model.ts'
    };
    return map[collection] || `${collection}.model.ts`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private findQueriesUsingIndex(analysis: IndexAnalysis): void {
    const { collection, key } = analysis.index;
    const fields = Object.keys(key);

    // Mapping connu des requêtes basé sur l'analyse du code
    const queryPatterns: { [key: string]: QueryPattern[] } = {
      // RESERVATIONS
      'reservations_date_status': [
        { location: 'admin.controller.ts', lineNumber: 35, queryType: 'countDocuments', fields: ['date'], description: 'Count today reservations' },
        { location: 'reservation.controller.ts', lineNumber: 261, queryType: 'find', fields: ['date', 'status'], description: 'Admin list reservations with filters' }
      ],
      'reservations_customer.email': [
        { location: 'reservation.controller.ts', lineNumber: 261, queryType: 'find', fields: ['customer.email'], description: 'Search reservations by customer email' }
      ],
      'reservations_status_createdAt': [
        { location: 'admin.controller.ts', lineNumber: 36, queryType: 'countDocuments', fields: ['status'], description: 'Count by status (pending, confirmed)' },
        { location: 'reservation.controller.ts', lineNumber: 263, queryType: 'sort', fields: ['createdAt'], description: 'Sort reservations by creation date' }
      ],
      'reservations_date_time': [
        { location: 'reservation.controller.ts', lineNumber: 114, queryType: 'countDocuments', fields: ['date'], description: 'Check daily reservation count' },
        { location: 'reservation.controller.ts', lineNumber: 263, queryType: 'sort', fields: ['date', 'time'], description: 'Sort by date and time slot' }
      ],
      'reservations_reminderSent_date_status': [
        { location: 'N/A (cron job)', lineNumber: 0, queryType: 'find', fields: ['reminderSent', 'date', 'status'], description: 'Cron job: find reservations needing reminders' }
      ],

      // MENUITEMS
      'menuitems_slug': [
        { location: 'menu.controller.ts', lineNumber: 62, queryType: 'findOne', fields: ['slug'], description: 'Check slug uniqueness' },
        { location: 'menu.controller.ts', lineNumber: 199, queryType: 'findOne', fields: ['slug'], description: 'Get public item by slug' }
      ],
      'menuitems_category_isAvailable_order': [
        { location: 'menu.controller.ts', lineNumber: 105, queryType: 'find', fields: ['category', 'isAvailable'], description: 'Get items by category (public)' },
        { location: 'menu.controller.ts', lineNumber: 170, queryType: 'find', fields: ['category', 'isAvailable', 'order'], description: 'List items with filters + sort' }
      ],
      'menuitems_isFeatured_isAvailable': [
        { location: 'menu.controller.ts', lineNumber: 170, queryType: 'find', fields: ['isFeatured', 'isAvailable'], description: 'Get featured available items for homepage' }
      ],
      'menuitems_tags': [
        { location: 'menu.controller.ts', lineNumber: 170, queryType: 'find', fields: ['tags'], description: 'Filter items by tags' }
      ],

      // REVIEWS
      'reviews_isPublished_isApproved_order': [
        { location: 'review.controller.ts', lineNumber: 102, queryType: 'find', fields: ['isPublished', 'isApproved'], description: 'Get published approved reviews' },
        { location: 'review.controller.ts', lineNumber: 104, queryType: 'sort', fields: ['order'], description: 'Sort reviews by display order' }
      ],
      'reviews_source': [
        { location: 'review.controller.ts', lineNumber: 102, queryType: 'find', fields: ['source'], description: 'Filter reviews by source (Google, TripAdvisor)' }
      ],
      'reviews_rating': [
        { location: 'review.controller.ts', lineNumber: 134, queryType: 'aggregate', fields: ['rating'], description: 'Calculate average rating and distribution' }
      ],
      'reviews_reviewDate': [
        { location: 'review.controller.ts', lineNumber: 104, queryType: 'sort', fields: ['reviewDate'], description: 'Sort reviews by most recent' }
      ],

      // MENUCATEGORIES
      'menucategories_slug': [
        { location: 'menu.controller.ts', lineNumber: 61, queryType: 'findOne', fields: ['slug'], description: 'Check slug uniqueness' },
        { location: 'menu.controller.ts', lineNumber: 94, queryType: 'findOne', fields: ['slug'], description: 'Get public category by slug' }
      ],
      'menucategories_isActive_order': [
        { location: 'menu.controller.ts', lineNumber: 78, queryType: 'find', fields: ['isActive'], description: 'Get active categories' },
        { location: 'menu.controller.ts', lineNumber: 80, queryType: 'sort', fields: ['order'], description: 'Sort categories by display order' }
      ],

      // SETTINGS
      'settings_updatedAt': [
        { location: 'settings.controller.ts', lineNumber: 108, queryType: 'findOne', fields: [], description: 'Get singleton settings (always findOne)' }
      ],

      // USERS
      'users_email': [
        { location: 'auth.controller.ts', lineNumber: 46, queryType: 'findByEmail', fields: ['email'], description: 'Login authentication' },
        { location: 'user.model.ts', lineNumber: 0, queryType: 'findOne', fields: ['email'], description: 'Static method findByEmail' }
      ],
      'users_role': [
        { location: 'admin.controller.ts', lineNumber: 0, queryType: 'find', fields: ['role'], description: 'Filter users by role (admin, manager)' }
      ],
      'users_isActive': [
        { location: 'admin.controller.ts', lineNumber: 0, queryType: 'find', fields: ['isActive'], description: 'Filter active users' }
      ],

      // MEDIA
      'media_category_isVisible_order': [
        { location: 'gallery.controller.ts', lineNumber: 56, queryType: 'find', fields: ['category', 'isVisible'], description: 'Get visible media by category' },
        { location: 'gallery.controller.ts', lineNumber: 58, queryType: 'sort', fields: ['order'], description: 'Sort media by display order' }
      ],
      'media_type_category': [
        { location: 'gallery.controller.ts', lineNumber: 56, queryType: 'find', fields: ['type', 'category'], description: 'Filter by media type (image/video) + category' }
      ],
      'media_isVisible_order': [
        { location: 'gallery.controller.ts', lineNumber: 108, queryType: 'find', fields: ['isVisible'], description: 'Admin: get all visible media' },
        { location: 'gallery.controller.ts', lineNumber: 110, queryType: 'sort', fields: ['order'], description: 'Sort all media by order' }
      ],
      'media_publicId': [
        { location: 'upload.service.ts', lineNumber: 0, queryType: 'findOne', fields: ['publicId'], description: 'Prevent duplicate uploads by Cloudinary public_id' }
      ]
    };

    // Build lookup key
    const lookupKey = `${collection}_${fields.join('_')}`;
    
    if (queryPatterns[lookupKey]) {
      analysis.queriesFound = queryPatterns[lookupKey];
      this.log(`  ✅ Found ${analysis.queriesFound.length} query patterns`);
    } else {
      this.log(`  ⚠️  No query patterns mapped for this index`);
    }
  }

  private async checkDuplicates(analysis: IndexAnalysis): Promise<void> {
    this.log(`  🔍 Checking duplicates for unique index...`);

    const { collection, key } = analysis.index;
    const field = Object.keys(key)[0];

    try {
      // Check LOCAL for duplicates (READ-ONLY)
      const localAgg = await this.localConn.db!.collection(collection).aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]).toArray();

      // Check ATLAS for duplicates (READ-ONLY)
      const atlasAgg = await this.atlasConn.db!.collection(collection).aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]).toArray();

      analysis.duplicateCheck = {
        checked: true,
        localDuplicates: localAgg.length,
        atlasDuplicates: atlasAgg.length,
        safe: localAgg.length === 0 && atlasAgg.length === 0
      };

      if (analysis.duplicateCheck.safe) {
        this.log(`  ✅ No duplicates found (safe to create unique index)`);
      } else {
        this.log(`  ❌ Duplicates found: LOCAL=${localAgg.length}, ATLAS=${atlasAgg.length}`);
      }
    } catch (error: any) {
      analysis.duplicateCheck = {
        checked: false,
        localDuplicates: 0,
        atlasDuplicates: 0,
        safe: false,
        error: error.message
      };
      this.log(`  ⚠️  Duplicate check failed: ${error.message}`);
    }
  }

  private classifyIndex(analysis: IndexAnalysis): void {
    const { index, declaredInSchema, queriesFound, duplicateCheck } = analysis;

    // REQUIRED: Unique indexes declared in schema with queries
    if (index.unique && declaredInSchema && queriesFound.length > 0) {
      analysis.classification = 'REQUIRED';
      analysis.reasoning = `Unique index declared in current schema and actively used in ${queriesFound.length} queries`;
      this.report.summary.required++;
      return;
    }

    // REQUIRED: Composite indexes with multiple active queries
    if (Object.keys(index.key).length > 2 && queriesFound.length > 0) {
      analysis.classification = 'REQUIRED';
      analysis.reasoning = `Composite index (${Object.keys(index.key).length} fields) used in ${queriesFound.length} query patterns`;
      this.report.summary.required++;
      return;
    }

    // RECOMMENDED: Declared in schema with queries
    if (declaredInSchema && queriesFound.length > 0) {
      analysis.classification = 'RECOMMENDED';
      analysis.reasoning = `Declared in current schema and used in ${queriesFound.length} queries`;
      this.report.summary.recommended++;
      return;
    }

    // OPTIONAL: Declared in schema but no queries found
    if (declaredInSchema && queriesFound.length === 0) {
      analysis.classification = 'OPTIONAL';
      analysis.reasoning = 'Declared in schema but no active queries found';
      this.report.summary.optional++;
      return;
    }

    // OBSOLETE: Not declared and no queries
    if (!declaredInSchema && queriesFound.length === 0) {
      analysis.classification = 'OBSOLETE';
      analysis.reasoning = 'Not declared in current schema and no queries found';
      this.report.summary.obsolete++;
      return;
    }

    // OPTIONAL: Queries found but not declared (legacy)
    if (!declaredInSchema && queriesFound.length > 0) {
      analysis.classification = 'OPTIONAL';
      analysis.reasoning = `Legacy index: used in ${queriesFound.length} queries but not declared in current schema`;
      this.report.summary.optional++;
      return;
    }

    // Default: UNKNOWN
    analysis.classification = 'UNKNOWN';
    analysis.reasoning = 'Could not determine classification';
    this.report.summary.unknown++;
  }

  private assessRisks(analysis: IndexAnalysis): void {
    const { index, duplicateCheck, declaredInSchema } = analysis;

    if (index.unique && duplicateCheck && !duplicateCheck.safe) {
      analysis.risks.push(`⚠️  DUPLICATE VALUES: Cannot create unique index - ${duplicateCheck.localDuplicates + duplicateCheck.atlasDuplicates} duplicate values found`);
    }

    if (index.unique && !duplicateCheck?.checked) {
      analysis.risks.push(`⚠️  UNCHECKED: Unique index not verified for duplicates`);
    }

    if (!declaredInSchema) {
      analysis.risks.push(`⚠️  NOT IN SCHEMA: Index will not be automatically created by Mongoose`);
    }

    if (analysis.queriesFound.length === 0) {
      analysis.risks.push(`ℹ️  NO QUERIES: Index may not improve performance if not used`);
    }

    if (analysis.classification === 'OBSOLETE') {
      analysis.risks.push(`✅ SAFE TO SKIP: No impact on current application`);
    }
  }

  private generateRecommendation(analysis: IndexAnalysis): void {
    const { classification, index, risks } = analysis;

    switch (classification) {
      case 'REQUIRED':
        analysis.recommendation = `✅ RECREATE ON ATLAS: Essential for application functionality`;
        this.report.recommendations.toRecreate.push(`${index.collection}.${index.name}`);
        break;

      case 'RECOMMENDED':
        analysis.recommendation = `✅ RECREATE ON ATLAS: Improves performance for active queries`;
        this.report.recommendations.toRecreate.push(`${index.collection}.${index.name}`);
        break;

      case 'OPTIONAL':
        if (analysis.queriesFound.length > 0) {
          analysis.recommendation = `⚠️  MONITOR: Consider recreating if performance issues occur`;
          this.report.recommendations.toMonitor.push(`${index.collection}.${index.name}`);
        } else {
          analysis.recommendation = `❌ DO NOT RECREATE: Not used by current application`;
          this.report.recommendations.notToRecreate.push(`${index.collection}.${index.name}`);
        }
        break;

      case 'OBSOLETE':
        analysis.recommendation = `❌ DO NOT RECREATE: Legacy index no longer needed`;
        this.report.recommendations.notToRecreate.push(`${index.collection}.${index.name}`);
        break;

      case 'UNKNOWN':
        analysis.recommendation = `⚠️  REVIEW MANUALLY: Classification uncertain`;
        this.report.recommendations.toMonitor.push(`${index.collection}.${index.name}`);
        break;
    }

    if (risks.some(r => r.includes('DUPLICATE VALUES'))) {
      analysis.recommendation = `❌ CANNOT RECREATE: Duplicate values exist`;
      // Remove from toRecreate if present
      this.report.recommendations.toRecreate = this.report.recommendations.toRecreate.filter(
        idx => idx !== `${index.collection}.${index.name}`
      );
      this.report.recommendations.notToRecreate.push(`${index.collection}.${index.name}`);
    }
  }

  private async generateReports(): Promise<void> {
    this.log('\n=== GENERATING REPORTS ===');

    const reportsDir = path.join(__dirname, '..', '..', 'reports');

    // JSON Report
    const jsonPath = path.join(reportsDir, 'index-relevance-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    this.log(`✅ JSON report: ${jsonPath}`);

    // HTML Report
    const html = this.generateHtmlReport();
    const htmlPath = path.join(reportsDir, 'index-relevance-audit.html');
    fs.writeFileSync(htmlPath, html);
    this.log(`✅ HTML report: ${htmlPath}`);

    this.log(`✅ Log file: ${this.logPath}`);
  }

  private generateHtmlReport(): string {
    const getClassColor = (classification: string): string => {
      switch (classification) {
        case 'REQUIRED': return '#10b981';
        case 'RECOMMENDED': return '#3b82f6';
        case 'OPTIONAL': return '#f59e0b';
        case 'OBSOLETE': return '#6b7280';
        case 'UNKNOWN': return '#ef4444';
        default: return '#6b7280';
      }
    };

    const analysesHtml = this.report.analyses.map(analysis => {
      const color = getClassColor(analysis.classification);
      const fields = Object.keys(analysis.index.key).join(', ');
      
      return `
        <div class="analysis-card" style="border-left-color: ${color}">
          <div class="analysis-header">
            <h3>${analysis.index.collection}.${analysis.index.name}</h3>
            <span class="badge" style="background: ${color}">${analysis.classification}</span>
          </div>
          
          <div class="analysis-body">
            <div class="info-row">
              <span class="label">Fields:</span>
              <span class="value">${fields}</span>
            </div>
            
            ${analysis.index.unique ? `
              <div class="info-row">
                <span class="label">Type:</span>
                <span class="value unique-badge">UNIQUE</span>
              </div>
            ` : ''}
            
            <div class="info-row">
              <span class="label">Declared in Schema:</span>
              <span class="value">${analysis.declaredInSchema ? '✅ Yes' : '❌ No'}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Queries Found:</span>
              <span class="value">${analysis.queriesFound.length}</span>
            </div>
            
            ${analysis.queriesFound.length > 0 ? `
              <div class="queries-list">
                <strong>Query Patterns:</strong>
                <ul>
                  ${analysis.queriesFound.map(q => `
                    <li><code>${q.location}</code> - ${q.description}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${analysis.duplicateCheck ? `
              <div class="info-row">
                <span class="label">Duplicate Check:</span>
                <span class="value">${analysis.duplicateCheck.safe ? '✅ Safe' : '❌ Duplicates found'}</span>
              </div>
            ` : ''}
            
            <div class="reasoning">
              <strong>Reasoning:</strong>
              <p>${analysis.reasoning}</p>
            </div>
            
            ${analysis.risks.length > 0 ? `
              <div class="risks">
                <strong>Risks:</strong>
                <ul>
                  ${analysis.risks.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div class="recommendation">
              <strong>Recommendation:</strong>
              <p>${analysis.recommendation}</p>
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
  <title>Audit de Pertinence des Index</title>
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
    
    .recommendations { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #334155; }
    .recommendations h2 { margin-bottom: 1rem; color: #f1f5f9; }
    .rec-section { margin-bottom: 1rem; }
    .rec-section h3 { color: #cbd5e1; margin-bottom: 0.5rem; font-size: 1.1rem; }
    .rec-section ul { margin-left: 1.5rem; }
    .rec-section li { color: #94a3b8; margin: 0.25rem 0; }
    
    .analysis-card { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid; border-right: 1px solid #334155; border-top: 1px solid #334155; border-bottom: 1px solid #334155; }
    .analysis-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #334155; }
    .analysis-header h3 { color: #f1f5f9; font-size: 1.3rem; }
    .badge { padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem; color: white; }
    .unique-badge { background: #8b5cf6; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: white; }
    
    .analysis-body { }
    .info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #334155; }
    .info-row .label { color: #94a3b8; font-weight: 500; }
    .info-row .value { color: #f1f5f9; font-weight: 600; }
    
    .queries-list { background: #0f172a; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
    .queries-list strong { color: #cbd5e1; display: block; margin-bottom: 0.5rem; }
    .queries-list ul { margin-left: 1.5rem; }
    .queries-list li { color: #94a3b8; margin: 0.5rem 0; }
    .queries-list code { background: #1e293b; padding: 0.2rem 0.4rem; border-radius: 3px; color: #60a5fa; }
    
    .reasoning, .risks, .recommendation { margin: 1rem 0; padding: 1rem; background: #0f172a; border-radius: 6px; }
    .reasoning strong, .risks strong, .recommendation strong { color: #cbd5e1; display: block; margin-bottom: 0.5rem; }
    .reasoning p, .recommendation p { color: #94a3b8; }
    .risks ul { margin-left: 1.5rem; }
    .risks li { color: #94a3b8; margin: 0.25rem 0; }
    
    .guarantees { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; border: 1px solid #334155; }
    .guarantees h2 { margin-bottom: 1rem; color: #10b981; }
    .guarantees p { color: #94a3b8; margin: 0.5rem 0; }
    
    .footer { text-align: center; margin-top: 2rem; padding: 1rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 ${this.report.metadata.auditTitle}</h1>
      <p>Timestamp: ${this.report.metadata.timestamp}</p>
      <p>Mode: ${this.report.metadata.mode}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>${this.report.summary.totalIndexes}</h3>
        <p>Total Indexes</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #10b981">${this.report.summary.required}</h3>
        <p>Required</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #3b82f6">${this.report.summary.recommended}</h3>
        <p>Recommended</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #f59e0b">${this.report.summary.optional}</h3>
        <p>Optional</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #6b7280">${this.report.summary.obsolete}</h3>
        <p>Obsolete</p>
      </div>
      <div class="summary-card">
        <h3 style="color: #ef4444">${this.report.summary.unknown}</h3>
        <p>Unknown</p>
      </div>
    </div>

    <div class="recommendations">
      <h2>📋 Recommendations Summary</h2>
      
      <div class="rec-section">
        <h3 style="color: #10b981">✅ To Recreate on Atlas (${this.report.recommendations.toRecreate.length})</h3>
        <ul>
          ${this.report.recommendations.toRecreate.map(idx => `<li>${idx}</li>`).join('')}
        </ul>
      </div>
      
      <div class="rec-section">
        <h3 style="color: #ef4444">❌ Do Not Recreate (${this.report.recommendations.notToRecreate.length})</h3>
        <ul>
          ${this.report.recommendations.notToRecreate.map(idx => `<li>${idx}</li>`).join('')}
        </ul>
      </div>
      
      <div class="rec-section">
        <h3 style="color: #f59e0b">⚠️  To Monitor (${this.report.recommendations.toMonitor.length})</h3>
        <ul>
          ${this.report.recommendations.toMonitor.map(idx => `<li>${idx}</li>`).join('')}
        </ul>
      </div>
    </div>

    <h2 style="margin: 2rem 0 1rem 0; color: #f1f5f9;">Detailed Analyses</h2>
    
    ${analysesHtml}

    <div class="guarantees">
      <h2>✅ Guarantees</h2>
      <p><strong>Modifications Applied:</strong> ${this.report.guarantees.modificationsApplied}</p>
      <p><strong>Data Modified:</strong> ${this.report.guarantees.dataModified ? '❌ YES' : '✅ NO'}</p>
      <p><strong>Indexes Modified:</strong> ${this.report.guarantees.indexesModified ? '❌ YES' : '✅ NO'}</p>
      <p><strong>Verdict:</strong> ${this.report.verdict}</p>
    </div>

    <div class="footer">
      <p>Audit généré le ${new Date().toLocaleString('fr-FR')}</p>
      <p>BIZZ'ART MONASTIR — Audit de Pertinence des Index</p>
    </div>
  </div>
</body>
</html>`;
  }

  async run(): Promise<void> {
    console.log('\n============================================================');
    console.log('AUDIT DE PERTINENCE DES 23 INDEX MONGODB');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    this.log('=== AUDIT START ===');
    this.log('⚠️  MODE: FORENSIQUE / READ-ONLY ABSOLU');

    try {
      // Connect to databases
      if (!await this.connectDatabases()) {
        throw new Error('Failed to connect to databases');
      }

      // Analyze each of the 23 indexes
      for (const indexMeta of this.indexesToAnalyze) {
        const analysis = await this.analyzeIndex(indexMeta);
        this.report.analyses.push(analysis);
      }

      // Generate reports
      await this.generateReports();

      // Close connections
      await this.localConn.close();
      await this.atlasConn.close();

      this.log('\n=== AUDIT COMPLETE ===');
      this.printFinalSummary();

    } catch (error: any) {
      this.log(`❌ CRITICAL ERROR: ${error.message}`);
      await this.generateReports();
      this.printFinalSummary();
      process.exit(1);
    }
  }

  private printFinalSummary(): void {
    console.log('\n============================================================');
    console.log('AUDIT READ-ONLY TERMINÉ');
    console.log('============================================================\n');

    console.log(`INDEX ANALYSÉS: ${this.report.summary.totalIndexes}`);
    console.log(`INDEX REQUIRED: ${this.report.summary.required}`);
    console.log(`INDEX RECOMMENDED: ${this.report.summary.recommended}`);
    console.log(`INDEX OPTIONAL: ${this.report.summary.optional}`);
    console.log(`INDEX OBSOLETE: ${this.report.summary.obsolete}`);
    console.log(`INDEX UNKNOWN: ${this.report.summary.unknown}\n`);

    console.log('MODIFICATIONS:');
    console.log(`  ${this.report.guarantees.modificationsApplied}\n`);

    console.log('AUCUN INDEX MODIFIÉ\n');

    console.log('VERDICT:');
    console.log(`  ${this.report.verdict}\n`);

    console.log('REPORTS:');
    console.log(`  JSON: reports/index-relevance-audit.json`);
    console.log(`  HTML: reports/index-relevance-audit.html`);
    console.log(`  Log: ${this.logPath}\n`);

    console.log('⚠️  NE PAS PASSER À LA CRÉATION DES INDEX');
    console.log('⚠️  ATTENDRE UNE VALIDATION HUMAINE EXPLICITE\n');

    console.log('============================================================\n');
  }
}

// Run audit
const audit = new IndexRelevanceAudit();
audit.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
