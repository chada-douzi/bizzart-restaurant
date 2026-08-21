/**
 * TEST FETCH NATIF NODE.JS
 */

async function testFetch() {
  console.log('🔍 Test fetch natif Node.js\n');
  
  console.log('Test 1: Google.com...');
  try {
    const r1 = await fetch('https://www.google.com', { method: 'HEAD' });
    console.log('✅ Google.com:', r1.status);
  } catch (e: any) {
    console.error('❌ Google.com:', e.message);
  }
  
  console.log('\nTest 2: Registry NPM...');
  try {
    const r2 = await fetch('https://registry.npmjs.org', { method: 'HEAD' });
    console.log('✅ NPM:', r2.status);
  } catch (e: any) {
    console.error('❌ NPM:', e.message);
  }
  
  console.log('\nTest 3: Google Gemini API endpoint...');
  try {
    const r3 = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { 
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    console.log('✅ Gemini API:', r3.status);
    const text = await r3.text();
    console.log('Réponse:', text.substring(0, 200));
  } catch (e: any) {
    console.error('❌ Gemini API:', e.message);
    console.error('Code:', e.code);
    console.error('Cause:', e.cause);
  }
}

testFetch();
