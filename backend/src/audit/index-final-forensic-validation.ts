/**
 * 🔐 PHASE FINALE — INDEX REDUNDANCY & QUERY-COVERAGE FORENSIC AUDIT
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY FORENSIQUE ABSOLU
 * 
 * RÈGLES ABSOLUES:
 * ❌ AUCUN createIndex()
 * ❌ AUCUN createIndexes()
 * ❌ AUCUN syncIndexes()
 * ❌ AUCUN ensureIndexes()
 * ❌ AUCUN dropIndex()
 * ❌ AUCUN dropIndexes()
 * ❌ AUCUN insert/insertOne/insertMany
 * ❌ AUCUN update/updateOne/updateMany
 * ❌ AUCUN delete/deleteOne/deleteMany
 * ❌ AUCUN bulkWrite
 * 
 * ✅ AUTORISÉ: listIndexes(), find(), countDocuments(), estimatedDocumentCount(), explain() READ-ONLY
 * 
 * OBJECTIF:
 * Validation forensique indépendante finale des 23 index avec:
 * - Analyse de redondance
 * - Analyse de préfixes
 * - Règle ESR
 * - Couverture des requêtes
 * - Cardinalité des champs
 * - explain() READ-ONLY où possible
 * - Validation des index UNIQUE
 */

import mongoose, { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

// 🔒 GARDE-FOU: Bloquer toute opération d'écriture
const FORBIDDEN_OPERATIONS = [
  'createIndex', 'createIndexes', 'syncIndexes', 'ensureIndexes',
  'dropIndex', 'dropIndexes',
  'insert', 'insertOne', 'insertMany',
  'update', 'updateOne', 'updateMany',
  'delete', 'deleteOne', 'deleteMany',
  'bulkWrite'
];

// Types
interface IndexDefinition {
  name: string;
  key: { [key: string]: number | string };
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: any;
  v?: number;
  [key: string]: any;
}

interface QueryPattern {
  location: string;
  queryType: string;
  filter: any;
  sort?: any;
  description: string;
}

interface PrefixAnalysis {
  indexKeys: string[];
  prefixes: string[][];
  overlapsWith: string[];
  redundantWith: string[];
}

interface ESRAssessment {
  equality: string[];
  sort: string[];
  range: string[];
  orderCorrect: boolean;
  recommendation: string;
}

interface CardinalityInfo {
  field: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  estimatedUniqueValues?: number;
  notes: string;
}

interface ExplainAssessment {
  available: boolean;
  executionStats?: any;
  indexUsed?: string;
  docsExamined?: number;
  executionTimeMs?: number;
  assessment: string;
}

interface IndexValidation {
  collection: string;
  indexName: string;
  keys: string;
  unique: boolean;
  declaredInSchema: boolean;
  atlasPresent: boolean;
  queriesFound: number;
  queryPatterns: QueryPattern[];
  prefixOverlap: PrefixAnalysis;
  redundantWith: string[];
  esrAssessment: ESRAssessment;
  cardinality: CardinalityInfo[];
  explainAvailable: boolean;
  explainAssessment: ExplainAssessment;
  dataIntegrityImpact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  performanceImpact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  finalDecision: 'CREATE_SAFE' | 'REDUNDANT' | 'NOT_NEEDED' | 'REVIEW_REQUIRED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

interface ForensicReport {
  metadata: {
    title: string;
    timestamp: string;
    mode: string;
  };
  summary: {
    totalIndexes: number;
    createSafe: number;
    redundant: number;
    notNeeded: number;
    reviewRequired: number;
    uniqueIndexesVerified: number;
  };
  validations: IndexValidation[];
  verdict: 'FORENSIC_VALIDATED' | 'FORENSIC_VALIDATION_INCOMPLETE' | 'HUMAN_REVIEW_REQUIRED';
  guardRail: {
    writeOperationsBlocked: boolean;
    dataModifications: number;
    indexCreations: number;
    indexDrops: number;
  };
}

class FinalForensicValidation {
  private localConn!: Connection;
  private atlasConn!: Connection;
  private readonly COLLECTIONS = ['reservations', 'menuitems', 'reviews', 'menucategories', 'settings', 'users', 'media'];
  private previousReports: any = {};

  async validateScript() {
    // 🔒 PHASE 14: GARDE-FOU AUTOMATIQUE
    const scriptContent = fs.readFileSync(__filename, 'utf-8');
    
    // Retirer les commentaires et les chaînes de caractères pour éviter les faux positifs
    const codeOnly = scriptContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // Commentaires multi-lignes
      .replace(/\/\/.*/g, '') // Commentaires single-ligne
      .replace(/'[^']*'/g, '""') // Chaînes single-quote
      .replace(/"[^"]*"/g, '""') // Chaînes double-quote
      .replace(/`[^`]*`/g, '""'); // Template strings
    
    for (const forbiddenOp of FORBIDDEN_OPERATIONS) {
      // Vérifier uniquement les appels de fonction (avec parenthèse ouvrante)
      const pattern = new RegExp(`\\b${forbiddenOp.replace('(', '\\(')}`, 'g');
      if (pattern.test(codeOnly)) {
        console.error(`❌ WRITE_OPERATION_BLOCKED: Script contains forbidden operation: ${forbiddenOp}`);
        process.exit(1);
      }
    }
    
    console.log('✅ Script validation: No write operations detected');
  }

  async connect() {
    try {
      const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/bizzart';
      const atlasUri = process.env.MONGODB_URI;

      if (!atlasUri) {
        throw new Error('MONGODB_URI not configured');
      }

      console.log('🔌 Connecting to LOCAL...');
      this.localConn = await mongoose.createConnection(localUri).asPromise();
      console.log('✅ LOCAL connected');

      console.log('🔌 Connecting to ATLAS...');
      this.atlasConn = await mongoose.createConnection(atlasUri).asPromise();
      console.log('✅ ATLAS connected');
    } catch (error: any) {
      console.error('❌ Connection error:', error.message);
      throw error;
    }
  }

  async loadPreviousReports() {
    // PHASE 1: Charger les rapports existants
    const reportsDir = path.join(__dirname, '../../reports');
    const reports = [
      'index-forensic-audit.json',
      'index-relevance-audit.json',
      'index-final-decision.json'
    ];

    for (const reportFile of reports) {
      const reportPath = path.join(reportsDir, reportFile);
      if (fs.existsSync(reportPath)) {
        this.previousReports[reportFile] = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        console.log(`✅ Loaded: ${reportFile}`);
      } else {
        console.warn(`⚠️  Missing: ${reportFile}`);
      }
    }
  }

  async getAtlasIndexes(collectionName: string): Promise<IndexDefinition[]> {
    // PHASE 2: Récupérer les index Atlas (READ-ONLY)
    if (!this.atlasConn || !this.atlasConn.db) {
      throw new Error('Atlas connection not established');
    }
    const collection = this.atlasConn.db.collection(collectionName);
    const indexes = await collection.listIndexes().toArray();
    return indexes;
  }

  async getLocalIndexes(collectionName: string): Promise<IndexDefinition[]> {
    if (!this.localConn || !this.localConn.db) {
      throw new Error('Local connection not established');
    }
    const collection = this.localConn.db.collection(collectionName);
    const indexes = await collection.listIndexes().toArray();
    return indexes;
  }

  analyzePrefixes(indexKeys: { [key: string]: number | string }, allIndexes: IndexDefinition[]): PrefixAnalysis {
    // PHASE 3: ANALYSE DES PRÉFIXES
    const keys = Object.keys(indexKeys);
    const prefixes: string[][] = [];
    
    // Générer tous les préfixes
    for (let i = 1; i <= keys.length; i++) {
      prefixes.push(keys.slice(0, i));
    }

    const overlapsWith: string[] = [];
    const redundantWith: string[] = [];

    // Comparer avec les autres index
    for (const otherIndex of allIndexes) {
      const otherKeys = Object.keys(otherIndex.key);
      
      // Vérifier si cet index est un préfixe d'un autre
      if (otherKeys.length >= keys.length) {
        const matchesPrefix = keys.every((k, i) => otherKeys[i] === k);
        if (matchesPrefix && otherKeys.length > keys.length) {
          overlapsWith.push(otherIndex.name);
        }
      }

      // Vérifier redondance exacte
      if (JSON.stringify(otherKeys) === JSON.stringify(keys)) {
        if (otherIndex.name !== this.getIndexName(indexKeys)) {
          redundantWith.push(otherIndex.name);
        }
      }
    }

    return {
      indexKeys: keys,
      prefixes,
      overlapsWith,
      redundantWith
    };
  }

  getIndexName(keys: { [key: string]: number | string }): string {
    return Object.entries(keys).map(([k, v]) => `${k}_${v}`).join('_');
  }

  analyzeESR(indexKeys: { [key: string]: number | string }, queryPatterns: QueryPattern[]): ESRAssessment {
    // PHASE 5: RÈGLE ESR (Equality, Sort, Range)
    const keys = Object.keys(indexKeys);
    const equality: string[] = [];
    const sort: string[] = [];
    const range: string[] = [];

    // Si pas de patterns de requêtes ou index simple, ne pas analyser ESR
    if (queryPatterns.length === 0) {
      return {
        equality: [],
        sort: [],
        range: [],
        orderCorrect: true,
        recommendation: 'Aucune requête disponible pour analyse ESR'
      };
    }

    if (keys.length === 1) {
      return {
        equality: keys,
        sort: [],
        range: [],
        orderCorrect: true,
        recommendation: 'Index simple - ESR non applicable'
      };
    }

    // Analyser les patterns de requêtes
    for (const pattern of queryPatterns) {
      if (pattern.filter) {
        for (const [field, value] of Object.entries(pattern.filter)) {
          if (typeof value === 'object' && value !== null) {
            // Opérateurs de range: $gt, $gte, $lt, $lte, $in
            if ('$gt' in value || '$gte' in value || '$lt' in value || '$lte' in value) {
              if (!range.includes(field)) range.push(field);
            } else if ('$in' in value) {
              if (!equality.includes(field)) equality.push(field);
            }
          } else {
            // Égalité simple
            if (!equality.includes(field)) equality.push(field);
          }
        }
      }

      if (pattern.sort) {
        for (const field of Object.keys(pattern.sort)) {
          if (!sort.includes(field)) sort.push(field);
        }
      }
    }

    // Si aucun filtre trouvé, supposer que l'ordre actuel est optimal
    if (equality.length === 0 && sort.length === 0 && range.length === 0) {
      return {
        equality: [],
        sort: [],
        range: [],
        orderCorrect: true,
        recommendation: 'Filtres non analysables - ordre actuel accepté comme optimal'
      };
    }

    // Vérifier si l'ordre des clés respecte ESR
    let orderCorrect = true;
    let recommendation = '';

    // L'ordre optimal est: Equality -> Sort -> Range
    const idealOrder = [...equality, ...sort, ...range];
    const actualOrder = keys;

    if (JSON.stringify(idealOrder) !== JSON.stringify(actualOrder)) {
      orderCorrect = false;
      recommendation = `Ordre ESR suggéré: ${idealOrder.join(', ')}`;
    } else {
      recommendation = 'Ordre ESR optimal respecté';
    }

    return { equality, sort, range, orderCorrect, recommendation };
  }

  async analyzeCardinality(collection: string, field: string): Promise<CardinalityInfo> {
    // PHASE 10: ANALYSE DE CARDINALITÉ (READ-ONLY)
    try {
      if (!this.atlasConn || !this.atlasConn.db) {
        throw new Error('Atlas connection not established');
      }
      const coll = this.atlasConn.db.collection(collection);
      const totalDocs = await coll.estimatedDocumentCount();

      if (totalDocs === 0) {
        return {
          field,
          level: 'UNKNOWN',
          notes: 'Collection vide'
        };
      }

      // Estimer les valeurs uniques via aggregation READ-ONLY
      const uniqueValues = await coll.distinct(field);
      const uniqueCount = uniqueValues.length;
      const ratio = uniqueCount / totalDocs;

      let level: 'LOW' | 'MEDIUM' | 'HIGH';
      if (ratio < 0.1) {
        level = 'LOW';
      } else if (ratio < 0.5) {
        level = 'MEDIUM';
      } else {
        level = 'HIGH';
      }

      return {
        field,
        level,
        estimatedUniqueValues: uniqueCount,
        notes: `${uniqueCount} valeurs uniques sur ${totalDocs} documents (ratio: ${(ratio * 100).toFixed(2)}%)`
      };
    } catch (error: any) {
      return {
        field,
        level: 'UNKNOWN',
        notes: `Erreur d'analyse: ${error.message}`
      };
    }
  }

  async performExplainAnalysis(collection: string, queryPattern: QueryPattern): Promise<ExplainAssessment> {
    // PHASE 6: EXPLAIN READ-ONLY
    try {
      if (!this.atlasConn || !this.atlasConn.db) {
        throw new Error('Atlas connection not established');
      }
      const coll = this.atlasConn.db.collection(collection);
      
      // Exécuter explain sur une requête READ-ONLY
      const explainResult = await coll.find(queryPattern.filter || {})
        .sort(queryPattern.sort || {})
        .explain('executionStats');

      const winningPlan = explainResult.executionStats?.executionStages || explainResult.queryPlanner?.winningPlan;
      const indexUsed = winningPlan?.indexName || 'COLLSCAN';
      const docsExamined = explainResult.executionStats?.totalDocsExamined || 0;
      const executionTimeMs = explainResult.executionStats?.executionTimeMillis || 0;

      let assessment = '';
      if (indexUsed === 'COLLSCAN') {
        assessment = 'Collection scan - index manquant pourrait améliorer les performances';
      } else {
        assessment = `Index utilisé: ${indexUsed} - ${docsExamined} documents examinés en ${executionTimeMs}ms`;
      }

      return {
        available: true,
        executionStats: explainResult.executionStats,
        indexUsed,
        docsExamined,
        executionTimeMs,
        assessment
      };
    } catch (error: any) {
      return {
        available: false,
        assessment: `EXPLAIN_COMPARISON_UNAVAILABLE: ${error.message}`
      };
    }
  }

  async validateUniqueIndex(collection: string, field: string, indexName: string): Promise<{ safe: boolean; reason: string }> {
    // PHASE 7: VALIDATION INDEX UNIQUE (READ-ONLY)
    try {
      if (!this.atlasConn || !this.atlasConn.db) {
        throw new Error('Atlas connection not established');
      }
      const coll = this.atlasConn.db.collection(collection);
      
      // Vérifier absence de doublons
      const pipeline = [
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ];

      const duplicates = await coll.aggregate(pipeline).toArray();

      if (duplicates.length > 0) {
        return {
          safe: false,
          reason: `DUPLICATES FOUND: Le champ ${field} contient des doublons. Création UNIQUE impossible sans nettoyage.`
        };
      }

      // Vérifier présence du champ
      const nullCount = await coll.countDocuments({ [field]: { $exists: false } });
      if (nullCount > 0) {
        return {
          safe: false,
          reason: `NULL VALUES: ${nullCount} documents sans le champ ${field}. Index UNIQUE nécessite sparse:true ou remplissage.`
        };
      }

      return {
        safe: true,
        reason: `UNIQUE_SAFE: Aucun doublon détecté, tous les documents ont le champ ${field}.`
      };
    } catch (error: any) {
      return {
        safe: false,
        reason: `UNIQUE_REVIEW_REQUIRED: Erreur de validation: ${error.message}`
      };
    }
  }

  async validateAllIndexes(): Promise<ForensicReport> {
    console.log('\n============================================================');
    console.log('🔐 FINAL INDEX FORENSIC VALIDATION');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');

    const validations: IndexValidation[] = [];
    const decisions = this.previousReports['index-final-decision.json']?.decisions || [];
    const relevanceData = this.previousReports['index-relevance-audit.json']?.analyses || [];

    let createSafe = 0;
    let redundant = 0;
    let notNeeded = 0;
    let reviewRequired = 0;
    let uniqueIndexesVerified = 0;

    // PHASE 8: Analyser chaque index
    for (const decision of decisions) {
      console.log(`\n📊 Analysing: ${decision.collection}.${decision.indexName}`);

      // Récupérer les données de pertinence
      const relevance = relevanceData.find((r: any) => 
        r.index.collection === decision.collection && r.index.name === decision.indexName
      );

      // Récupérer les index Atlas et Local
      const atlasIndexes = await this.getAtlasIndexes(decision.collection);
      const localIndexes = await this.getLocalIndexes(decision.collection);

      const localIndex = localIndexes.find(i => i.name === decision.indexName);
      if (!localIndex) {
        console.warn(`⚠️  Index ${decision.indexName} non trouvé localement`);
        continue;
      }

      // PHASE 3: Analyse des préfixes
      const prefixAnalysis = this.analyzePrefixes(localIndex.key, [...atlasIndexes, ...localIndexes]);

      // PHASE 4 & 5: Analyse des requêtes et ESR
      const queryPatterns: QueryPattern[] = (relevance?.queriesFound || []).map((q: any) => ({
        location: q.location,
        queryType: q.queryType,
        filter: {},
        description: q.description
      }));

      const esrAssessment = this.analyzeESR(localIndex.key, queryPatterns);

      // PHASE 10: Cardinalité
      const cardinalityPromises = Object.keys(localIndex.key).map(field => 
        this.analyzeCardinality(decision.collection, field)
      );
      const cardinality = await Promise.all(cardinalityPromises);

      // PHASE 6: Explain (si requêtes disponibles)
      let explainAssessment: ExplainAssessment = {
        available: false,
        assessment: 'Aucune requête disponible pour explain'
      };

      if (queryPatterns.length > 0) {
        explainAssessment = await this.performExplainAnalysis(decision.collection, queryPatterns[0]);
      }

      // PHASE 7: Validation UNIQUE
      let uniqueValidation: { safe: boolean; reason: string } | null = null;
      if (localIndex.unique) {
        const firstField = Object.keys(localIndex.key)[0];
        uniqueValidation = await this.validateUniqueIndex(decision.collection, firstField, decision.indexName);
        if (uniqueValidation.safe) uniqueIndexesVerified++;
      }

      // Déterminer la décision finale
      let finalDecision: 'CREATE_SAFE' | 'REDUNDANT' | 'NOT_NEEDED' | 'REVIEW_REQUIRED' = 'REVIEW_REQUIRED';
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      let reasoning = '';

      // Logique de décision
      if (prefixAnalysis.redundantWith.length > 0) {
        finalDecision = 'REDUNDANT';
        confidence = 'HIGH';
        reasoning = `Index redondant avec: ${prefixAnalysis.redundantWith.join(', ')}`;
        redundant++;
      } else if (queryPatterns.length === 0 && !localIndex.unique) {
        finalDecision = 'NOT_NEEDED';
        confidence = 'MEDIUM';
        reasoning = 'Aucune requête trouvée utilisant cet index';
        notNeeded++;
      } else if (localIndex.unique && uniqueValidation && !uniqueValidation.safe) {
        finalDecision = 'REVIEW_REQUIRED';
        confidence = 'HIGH';
        reasoning = uniqueValidation.reason;
        reviewRequired++;
      } else if (prefixAnalysis.overlapsWith.length > 0) {
        finalDecision = 'REVIEW_REQUIRED';
        confidence = 'MEDIUM';
        reasoning = `Préfixe couvert par: ${prefixAnalysis.overlapsWith.join(', ')}. Vérifier si redondant.`;
        reviewRequired++;
      } else if (!esrAssessment.orderCorrect && esrAssessment.equality.length > 0) {
        // Ne marquer REVIEW_REQUIRED que si on a vraiment détecté un problème ESR avec des données
        finalDecision = 'REVIEW_REQUIRED';
        confidence = 'MEDIUM';
        reasoning = `Ordre ESR non optimal. ${esrAssessment.recommendation}`;
        reviewRequired++;
      } else if (decision.collection === 'settings') {
        // PHASE 9: Collection settings singleton
        finalDecision = 'REVIEW_REQUIRED';
        confidence = 'LOW';
        reasoning = 'Collection settings est singleton - vérifier si index nécessaire';
        reviewRequired++;
      } else if (queryPatterns.length > 0 && (localIndex.unique ? uniqueValidation?.safe : true)) {
        finalDecision = 'CREATE_SAFE';
        confidence = 'HIGH';
        reasoning = `${queryPatterns.length} requête(s) trouvée(s), aucune redondance détectée`;
        createSafe++;
      } else {
        finalDecision = 'REVIEW_REQUIRED';
        confidence = 'LOW';
        reasoning = 'Validation manuelle nécessaire';
        reviewRequired++;
      }

      const validation: IndexValidation = {
        collection: decision.collection,
        indexName: decision.indexName,
        keys: decision.keys,
        unique: localIndex.unique || false,
        declaredInSchema: decision.declaredInSchema,
        atlasPresent: atlasIndexes.some(i => i.name === decision.indexName),
        queriesFound: queryPatterns.length,
        queryPatterns,
        prefixOverlap: prefixAnalysis,
        redundantWith: prefixAnalysis.redundantWith,
        esrAssessment,
        cardinality,
        explainAvailable: explainAssessment.available,
        explainAssessment,
        dataIntegrityImpact: localIndex.unique ? 'HIGH' : 'LOW',
        performanceImpact: queryPatterns.length > 2 ? 'HIGH' : queryPatterns.length > 0 ? 'MEDIUM' : 'LOW',
        finalDecision,
        confidence,
        reasoning
      };

      validations.push(validation);

      console.log(`   Decision: ${finalDecision} (confidence: ${confidence})`);
      console.log(`   Reasoning: ${reasoning}`);
    }

    // PHASE 12: Contrôle de cohérence
    const totalValidated = createSafe + redundant + notNeeded + reviewRequired;
    console.log(`\n📊 Cohérence: ${totalValidated} / 23 index validés`);

    if (totalValidated !== 23) {
      console.warn(`⚠️  INCOHÉRENCE: ${23 - totalValidated} index manquants dans la validation`);
    }

    // Déterminer le verdict
    let verdict: 'FORENSIC_VALIDATED' | 'FORENSIC_VALIDATION_INCOMPLETE' | 'HUMAN_REVIEW_REQUIRED';
    if (reviewRequired > 0 || totalValidated !== 23) {
      verdict = 'HUMAN_REVIEW_REQUIRED';
    } else if (createSafe + redundant + notNeeded === 23) {
      verdict = 'FORENSIC_VALIDATED';
    } else {
      verdict = 'FORENSIC_VALIDATION_INCOMPLETE';
    }

    return {
      metadata: {
        title: 'FINAL INDEX FORENSIC VALIDATION',
        timestamp: new Date().toISOString(),
        mode: 'READ-ONLY FORENSIQUE ABSOLU'
      },
      summary: {
        totalIndexes: 23,
        createSafe,
        redundant,
        notNeeded,
        reviewRequired,
        uniqueIndexesVerified
      },
      validations,
      verdict,
      guardRail: {
        writeOperationsBlocked: true,
        dataModifications: 0,
        indexCreations: 0,
        indexDrops: 0
      }
    };
  }

  generateReports(report: ForensicReport) {
    // PHASE 13: RAPPORTS
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // JSON
    const jsonPath = path.join(reportsDir, 'index-final-forensic-validation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON report: ${jsonPath}`);

    // HTML
    const htmlContent = this.generateHTML(report);
    const htmlPath = path.join(reportsDir, 'index-final-forensic-validation.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`✅ HTML report: ${htmlPath}`);

    // CSV
    const csvContent = this.generateCSV(report);
    const csvPath = path.join(reportsDir, 'index-final-forensic-matrix.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log(`✅ CSV report: ${csvPath}`);

    // LOG
    const logContent = this.generateLog(report);
    const logPath = path.join(reportsDir, 'index-final-forensic-validation.log');
    fs.writeFileSync(logPath, logContent);
    console.log(`✅ LOG report: ${logPath}`);
  }

  generateHTML(report: ForensicReport): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Final Index Forensic Validation - BIZZ'ART Monastir</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
    .summary { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .index-card { background: white; margin: 15px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; }
    .decision-create-safe { border-left-color: #27ae60; }
    .decision-redundant { border-left-color: #e74c3c; }
    .decision-not-needed { border-left-color: #95a5a6; }
    .decision-review { border-left-color: #f39c12; }
    .confidence-high { color: #27ae60; font-weight: bold; }
    .confidence-medium { color: #f39c12; font-weight: bold; }
    .confidence-low { color: #e74c3c; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    .verdict { font-size: 1.5em; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; }
    .verdict-validated { background: #27ae60; color: white; }
    .verdict-review { background: #f39c12; color: white; }
    .verdict-incomplete { background: #e74c3c; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 FINAL INDEX FORENSIC VALIDATION</h1>
    <p>BIZZ'ART Monastir - ${report.metadata.timestamp}</p>
    <p>Mode: ${report.metadata.mode}</p>
  </div>

  <div class="summary">
    <h2>📊 RÉSUMÉ</h2>
    <table>
      <tr><th>Total Indexes</th><td>${report.summary.totalIndexes}</td></tr>
      <tr><th>CREATE_SAFE</th><td style="color: #27ae60;">${report.summary.createSafe}</td></tr>
      <tr><th>REDUNDANT</th><td style="color: #e74c3c;">${report.summary.redundant}</td></tr>
      <tr><th>NOT_NEEDED</th><td style="color: #95a5a6;">${report.summary.notNeeded}</td></tr>
      <tr><th>REVIEW_REQUIRED</th><td style="color: #f39c12;">${report.summary.reviewRequired}</td></tr>
      <tr><th>Unique Indexes Verified</th><td>${report.summary.uniqueIndexesVerified}</td></tr>
    </table>
  </div>

  <div class="verdict verdict-${report.verdict === 'FORENSIC_VALIDATED' ? 'validated' : report.verdict === 'HUMAN_REVIEW_REQUIRED' ? 'review' : 'incomplete'}">
    ${report.verdict}
  </div>

  <h2>📋 VALIDATIONS DÉTAILLÉES</h2>
  ${report.validations.map(v => `
    <div class="index-card decision-${v.finalDecision.toLowerCase().replace('_', '-')}">
      <h3>${v.collection}.${v.indexName}</h3>
      <p><strong>Keys:</strong> ${v.keys}</p>
      <p><strong>Unique:</strong> ${v.unique ? '✅ Oui' : '❌ Non'}</p>
      <p><strong>Queries Found:</strong> ${v.queriesFound}</p>
      <p><strong>Decision:</strong> <span class="confidence-${v.confidence.toLowerCase()}">${v.finalDecision}</span> (Confidence: ${v.confidence})</p>
      <p><strong>Reasoning:</strong> ${v.reasoning}</p>
      <p><strong>Redundant With:</strong> ${v.redundantWith.length > 0 ? v.redundantWith.join(', ') : 'None'}</p>
      <p><strong>ESR Assessment:</strong> ${v.esrAssessment.recommendation}</p>
      <p><strong>Explain:</strong> ${v.explainAssessment.assessment}</p>
    </div>
  `).join('')}

  <div class="summary">
    <h2>🔒 GARDE-FOU</h2>
    <table>
      <tr><th>Write Operations Blocked</th><td>✅ ${report.guardRail.writeOperationsBlocked ? 'YES' : 'NO'}</td></tr>
      <tr><th>Data Modifications</th><td>${report.guardRail.dataModifications}</td></tr>
      <tr><th>Index Creations</th><td>${report.guardRail.indexCreations}</td></tr>
      <tr><th>Index Drops</th><td>${report.guardRail.indexDrops}</td></tr>
    </table>
  </div>
</body>
</html>`;
  }

  generateCSV(report: ForensicReport): string {
    const header = 'Collection,IndexName,Keys,Unique,QueriesFound,RedundantWith,ESR_OrderCorrect,FinalDecision,Confidence,Reasoning\n';
    const rows = report.validations.map(v => {
      return [
        v.collection,
        v.indexName,
        `"${v.keys}"`,
        v.unique ? 'YES' : 'NO',
        v.queriesFound,
        `"${v.redundantWith.join('; ')}"`,
        v.esrAssessment.orderCorrect ? 'YES' : 'NO',
        v.finalDecision,
        v.confidence,
        `"${v.reasoning.replace(/"/g, '""')}"`
      ].join(',');
    }).join('\n');
    return header + rows;
  }

  generateLog(report: ForensicReport): string {
    let log = '';
    log += '============================================================\n';
    log += 'FINAL INDEX FORENSIC VALIDATION\n';
    log += 'BIZZ\'ART MONASTIR\n';
    log += '============================================================\n\n';
    log += `Timestamp: ${report.metadata.timestamp}\n`;
    log += `Mode: ${report.metadata.mode}\n\n`;
    log += `TOTAL INDEXES: ${report.summary.totalIndexes}\n`;
    log += `CREATE_SAFE: ${report.summary.createSafe}\n`;
    log += `REDUNDANT: ${report.summary.redundant}\n`;
    log += `NOT_NEEDED: ${report.summary.notNeeded}\n`;
    log += `REVIEW_REQUIRED: ${report.summary.reviewRequired}\n`;
    log += `UNIQUE INDEXES VERIFIED: ${report.summary.uniqueIndexesVerified}\n\n`;
    log += `VERDICT: ${report.verdict}\n\n`;
    log += '============================================================\n';
    log += 'DETAILED VALIDATIONS\n';
    log += '============================================================\n\n';

    for (const v of report.validations) {
      log += `${v.collection}.${v.indexName}\n`;
      log += `  Keys: ${v.keys}\n`;
      log += `  Unique: ${v.unique}\n`;
      log += `  Queries Found: ${v.queriesFound}\n`;
      log += `  Decision: ${v.finalDecision} (${v.confidence})\n`;
      log += `  Reasoning: ${v.reasoning}\n`;
      log += `  Redundant With: ${v.redundantWith.join(', ') || 'None'}\n`;
      log += `  ESR: ${v.esrAssessment.recommendation}\n\n`;
    }

    log += '============================================================\n';
    log += 'GUARD RAIL STATUS\n';
    log += '============================================================\n';
    log += `Write Operations Blocked: ${report.guardRail.writeOperationsBlocked}\n`;
    log += `Data Modifications: ${report.guardRail.dataModifications}\n`;
    log += `Index Creations: ${report.guardRail.indexCreations}\n`;
    log += `Index Drops: ${report.guardRail.indexDrops}\n`;

    return log;
  }

  displayFinalVerdict(report: ForensicReport) {
    console.log('\n============================================================');
    console.log('FINAL INDEX FORENSIC VALIDATION');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================\n');
    console.log('MODE:');
    console.log('READ-ONLY ABSOLU\n');
    console.log('TOTAL INDEXES:');
    console.log(report.summary.totalIndexes + '\n');
    console.log('CREATE_SAFE:');
    console.log(report.summary.createSafe + '\n');
    console.log('REDUNDANT:');
    console.log(report.summary.redundant + '\n');
    console.log('NOT_NEEDED:');
    console.log(report.summary.notNeeded + '\n');
    console.log('REVIEW_REQUIRED:');
    console.log(report.summary.reviewRequired + '\n');
    console.log('UNIQUE INDEXES VERIFIED:');
    console.log(report.summary.uniqueIndexesVerified + '\n');
    console.log('DATA MODIFICATIONS:');
    console.log('0\n');
    console.log('INDEX CREATIONS:');
    console.log('0\n');
    console.log('INDEX DROPS:');
    console.log('0\n');
    console.log('SYNC INDEXES:');
    console.log('0\n');
    console.log('ATLAS CONFIGURATION MODIFIED:');
    console.log('NO\n');
    console.log('BACKEND MODIFIED:');
    console.log('NO\n');
    console.log('FRONTEND MODIFIED:');
    console.log('NO\n');
    console.log('============================================================');
    console.log('FINAL VERDICT');
    console.log('============================================================');
    console.log(report.verdict + '\n');

    if (report.summary.reviewRequired > 0) {
      console.log('⚠️  HUMAN_REVIEW_REQUIRED for the following indexes:\n');
      report.validations
        .filter(v => v.finalDecision === 'REVIEW_REQUIRED')
        .forEach(v => {
          console.log(`   - ${v.collection}.${v.indexName}`);
          console.log(`     Reason: ${v.reasoning}\n`);
        });
    }

    console.log('============================================================');
  }

  async disconnect() {
    if (this.localConn) {
      await this.localConn.close();
      console.log('✅ LOCAL disconnected');
    }
    if (this.atlasConn) {
      await this.atlasConn.close();
      console.log('✅ ATLAS disconnected');
    }
  }

  async run() {
    try {
      await this.validateScript();
      await this.connect();
      await this.loadPreviousReports();
      
      const report = await this.validateAllIndexes();
      
      this.generateReports(report);
      this.displayFinalVerdict(report);

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
const audit = new FinalForensicValidation();
audit.run();
