/**
 * TEST MINIMAL GOOGLE GEMINI VISION
 * 
 * Test une seule requête pour diagnostiquer le problème "fetch failed"
 */

import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function testGeminiVision() {
  console.log('🔍 TEST MINIMAL GOOGLE GEMINI VISION\n');
  
  // 1. Vérifier la clé API
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY non trouvée dans .env');
    process.exit(1);
  }
  console.log('✅ GOOGLE_API_KEY détectée (valeur masquée)\n');
  
  // 2. Initialiser le client
  console.log('🔧 Initialisation du client Google Gemini...');
  let genAI: GoogleGenerativeAI;
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Client initialisé\n');
  } catch (error: any) {
    console.error('❌ Erreur initialisation:', error.message);
    process.exit(1);
  }
  
  // 3. Test basique sans image (text-only)
  console.log('📝 Test 1: Requête text-only simple...');
  try {
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const textResult = await textModel.generateContent('Réponds simplement "OK"');
    const textResponse = await textResult.response;
    console.log('✅ Text-only fonctionne:', textResponse.text().substring(0, 50));
  } catch (error: any) {
    console.error('❌ Text-only échoué:', error.message);
    console.error('Détails:', error);
    process.exit(1);
  }
  
  console.log('\n✅ DIAGNOSTIC COMPLET\n');
  console.log('SDK: @google/generative-ai');
  console.log('Modèle: gemini-1.5-flash');
  console.log('Connectivité: OK');
  console.log('API Key: Valide');
}

testGeminiVision().catch((error) => {
  console.error('❌ Erreur fatale:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});
