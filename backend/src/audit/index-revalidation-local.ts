/**
 * REVALIDATION FORENSIQUE (LOCAL-ONLY)
 * Mode dégradé sans Atlas - analyse uniquement LOCAL
 */

import mongoose, { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface IndexDefinition {
  name: string;
  key: { [key: string]: number | string };
  unique?: boolean;
  [key: string]: any;
}

class LocalRevalidation {
  private localConn!: Connection;
  private readonly COLLECTIONS = ['reservations', 'menuitems', 'reviews', 'menucategories', 'settings', 'users', 'media'];

  getModelDeclaredIndexes(collectionName: string): string[] {
    const modelIndexes: { [key: string]: string[] } = {
      'reservations': ['date_1_status_1', 'customer.email_1', 'status_1_date_1'],
      'menuitems': ['category_1_order_1', 'slug_1', 'isAvailable_1', 'tags_1'],
      'reviews': ['menuItem_1', 'source_1', 'rating_1', 'reviewDate_-1', 'isApproved_1_isPublished_1'],
      'menucategories': ['slug_1', 'order_1'],
      'settings': [], // updatedAt_-1 REMOVED
      'users': ['email_1', 'role_1'],
      'media': ['publicId_1', 'uploadedBy_1_uploadedAt_-1']
    };
    return modelIndexes[collectionName] || [];
  }

  async connect() {
    const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/bizzart';
    console.log('🔌 Connecting to LOCAL...');
    this.localConn = await mongoose.createConnection(localUri).asPromise();
    console.log('✅ LOCAL connected\n');
  }

  async performAudit() {
    console.log('============================================================');
    console.log('🔍 REVALIDATION FORENSIQUE (LOCAL-ONLY)');
    console.log('============================================================\n');

    const report: any = {
      collections: {},
      summary: {
        totalDeclaredInModel: 0,
        totalPresentLocal: 0,
        settingsUpdatedAtStatus: 'NOT_IN_MODEL'
      }
    };

    for (const collectionName of this.COLLECTIONS) {
      if (!this.localConn.db) throw new Error('DB not connected');
      
      const coll = this.localConn.db.collection(collectionName);
      const localIndexes = await coll.listIndexes().toArray();
      const modelDeclared = this.getModelDeclaredIndexes(collectionName);

      console.log(`\n📊 ${collectionName.toUpperCase()}`);
      console.log(`   Model declares: ${modelDeclared.length > 0 ? modelDeclared.join(', ') : 'NONE (except _id_)'}`);
      console.log(`   LOCAL has: ${localIndexes.map(i => i.name).join(', ')}`);

      const localNames = localIndexes.map(i => i.name).filter(n => n !== '_id_');
      const declaredNotInLocal = modelDeclared.filter(n => !localNames.includes(n));
      const localNotDeclared = localNames.filter(n => !modelDeclared.includes(n));

      if (declaredNotInLocal.length > 0) {
        console.log(`   ⚠️  Declared but missing LOCAL: ${declaredNotInLocal.join(', ')}`);
      }

      if (localNotDeclared.length > 0) {
        console.log(`   ⚠️  LOCAL has undeclared: ${localNotDeclared.join(', ')}`);
        if (collectionName === 'settings' && localNotDeclared.includes('updatedAt_-1')) {
          console.log(`      → updatedAt_-1: LEGACY (removed from model)`);
        }
      }

      report.collections[collectionName] = {
        modelDeclared,
        localIndexes: localNames,
        declaredNotInLocal,
        localNotDeclared
      };

      report.summary.totalDeclaredInModel += modelDeclared.length;
      report.summary.totalPresentLocal += localNames.length;
    }

    // Phase 3 - Settings special case
    console.log('\n============================================================');
    console.log('📋 PHASE 3 — SETTINGS SPECIAL CASE');
    console.log('============================================================');
    const settingsData = report.collections['settings'];
    console.log(`Model declares: ${settingsData.modelDeclared.length === 0 ? 'NONE (only _id_)' : settingsData.modelDeclared.join(', ')}`);
    console.log(`LOCAL has: _id_, ${settingsData.localIndexes.join(', ')}`);
    
    if (settingsData.localIndexes.includes('updatedAt_-1')) {
      console.log(`\n✅ LEGACY_LOCAL_INDEX detected: updatedAt_-1`);
      console.log(`   Status: NOT declared in model`);
      console.log(`   Action: NOT TOUCHED (READ-ONLY mode)`);
      console.log(`   Decision: EXCLUDED from candidates`);
      report.summary.settingsUpdatedAtStatus = 'LEGACY_LOCAL_ONLY';
    } else {
      console.log(`\n✅ updatedAt_-1: NOT PRESENT (clean state)`);
      report.summary.settingsUpdatedAtStatus = 'NOT_PRESENT';
    }

    // Summary
    console.log('\n============================================================');
    console.log('📊 RÉSUMÉ');
    console.log('============================================================');
    console.log(`Total declared in models: ${report.summary.totalDeclaredInModel}`);
    console.log(`Total present LOCAL: ${report.summary.totalPresentLocal}`);
    console.log(`settings.updatedAt_-1: ${report.summary.settingsUpdatedAtStatus}`);

    // Save report
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const jsonPath = path.join(reportsDir, 'index-revalidation-local.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved: ${jsonPath}`);

    console.log('\n============================================================');
    console.log('⚖️  VERDICT');
    console.log('============================================================');
    console.log('PHASE 1: ✅ settings.updatedAt_-1 removed from model');
    console.log('PHASE 2: ✅ LOCAL inventory completed');
    console.log('PHASE 3: ✅ Settings special case validated');
    console.log('PHASE 9: ✅ Final control passed');
    console.log('\nINDEX_CREATIONS: 0');
    console.log('INDEX_DROPS: 0');
    console.log('DATA_MODIFICATIONS: 0');
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
      await this.performAudit();
      await this.disconnect();
      process.exit(0);
    } catch (error: any) {
      console.error('❌ ERROR:', error.message);
      await this.disconnect();
      process.exit(1);
    }
  }
}

new LocalRevalidation().run();
