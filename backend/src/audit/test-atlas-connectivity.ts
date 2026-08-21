/**
 * TEST ATLAS CONNECTIVITY
 * BIZZ'ART MONASTIR
 * 
 * MODE: READ-ONLY TEST ONLY
 * 
 * Purpose: Verify DNS configuration impact on Atlas connectivity
 */

import mongoose, { Connection } from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
}

class AtlasConnectivityTest {
  private results: TestResult[] = [];

  private async testWithoutDNS(): Promise<TestResult> {
    console.log('\n🧪 TEST 1: Connection WITHOUT DNS configuration...');
    const startTime = Date.now();
    
    try {
      const conn = await mongoose.createConnection(process.env.MONGODB_URI!, {
        readPreference: 'primaryPreferred',
        serverSelectionTimeoutMS: 10000 // 10 second timeout
      }).asPromise();
      
      await conn.close();
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ SUCCESS in ${duration}ms`);
      return { test: 'Without DNS Config', success: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`  ❌ FAILED in ${duration}ms: ${error.message}`);
      return { test: 'Without DNS Config', success: false, duration, error: error.message };
    }
  }

  private async testWithDNS(): Promise<TestResult> {
    console.log('\n🧪 TEST 2: Connection WITH DNS configuration...');
    
    // Configure DNS servers (like audit:indexes does)
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('  📡 DNS servers configured: 8.8.8.8, 1.1.1.1');
    
    const startTime = Date.now();
    
    try {
      const conn = await mongoose.createConnection(process.env.MONGODB_URI!, {
        readPreference: 'primaryPreferred',
        serverSelectionTimeoutMS: 10000
      }).asPromise();
      
      await conn.close();
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ SUCCESS in ${duration}ms`);
      return { test: 'With DNS Config', success: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`  ❌ FAILED in ${duration}ms: ${error.message}`);
      return { test: 'With DNS Config', success: false, duration, error: error.message };
    }
  }

  private async testDNSResolution(): Promise<TestResult> {
    console.log('\n🧪 TEST 3: DNS SRV Resolution...');
    const startTime = Date.now();
    
    try {
      const records = await dns.promises.resolveSrv('_mongodb._tcp.cluster0.fhtq6yf.mongodb.net');
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ SUCCESS: Found ${records.length} SRV records in ${duration}ms`);
      records.forEach((record, i) => {
        console.log(`    ${i + 1}. ${record.name}:${record.port} (priority: ${record.priority})`);
      });
      
      return { test: 'DNS SRV Resolution', success: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`  ❌ FAILED in ${duration}ms: ${error.message}`);
      return { test: 'DNS SRV Resolution', success: false, duration, error: error.message };
    }
  }

  async run(): Promise<void> {
    console.log('============================================================');
    console.log('ATLAS CONNECTIVITY TEST');
    console.log('BIZZ\'ART MONASTIR');
    console.log('============================================================');
    console.log(`\nTesting MongoDB Atlas URI: ${this.maskUri(process.env.MONGODB_URI || '')}\n`);

    // Test 1: Without DNS config
    this.results.push(await this.testWithoutDNS());
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: With DNS config
    this.results.push(await this.testWithDNS());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: DNS SRV resolution
    this.results.push(await this.testDNSResolution());
    
    // Print summary
    this.printSummary();
  }

  private maskUri(uri: string): string {
    if (!uri) return 'NOT_CONFIGURED';
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/);
    if (match) {
      return `mongodb+srv://${match[1]}:***@${match[2]}/bizzart`;
    }
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  }

  private printSummary(): void {
    console.log('\n============================================================');
    console.log('TEST SUMMARY');
    console.log('============================================================\n');

    this.results.forEach((result, i) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'PASS' : 'FAIL';
      console.log(`${icon} Test ${i + 1}: ${result.test}`);
      console.log(`   Status: ${status}`);
      console.log(`   Duration: ${result.duration}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    // Conclusion
    const test1 = this.results.find(r => r.test === 'Without DNS Config');
    const test2 = this.results.find(r => r.test === 'With DNS Config');

    console.log('============================================================');
    console.log('CONCLUSION');
    console.log('============================================================\n');

    if (test1 && test2) {
      if (!test1.success && test2.success) {
        console.log('✅ ROOT CAUSE CONFIRMED:');
        console.log('   DNS configuration is REQUIRED for Atlas connectivity.');
        console.log('   Without DNS config: FAILED');
        console.log('   With DNS config (8.8.8.8, 1.1.1.1): SUCCESS\n');
        console.log('   This explains why audit:indexes works but audit:relevance fails.\n');
      } else if (test1.success && test2.success) {
        console.log('⚠️  UNEXPECTED: Both tests succeeded.');
        console.log('   DNS configuration may not be the root cause.');
        console.log('   Further investigation needed.\n');
      } else if (!test1.success && !test2.success) {
        console.log('❌ Both tests failed.');
        console.log('   DNS configuration alone does not resolve the issue.');
        console.log('   Other factors may be involved (network, credentials, etc.)\n');
      } else {
        console.log('⚠️  UNEXPECTED: Test without DNS succeeded but with DNS failed.');
        console.log('   This contradicts the hypothesis.\n');
      }
    }

    console.log('============================================================\n');
  }
}

// Run test
const test = new AtlasConnectivityTest();
test.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
