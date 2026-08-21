/**
 * LISTE LES MODÈLES GEMINI DISPONIBLES
 * 
 * Vérifie quels modèles supportent Vision et generateContent
 */

import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function listGeminiModels() {
  console.log('🔍 LISTE DES MODÈLES GEMINI DISPONIBLES\n');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY manquante');
    process.exit(1);
  }
  
  console.log('✅ GOOGLE_API_KEY détectée (valeur masquée)\n');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log('📋 Récupération de la liste des modèles...\n');
  
  try {
    // Tester l'endpoint de listing
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      const text = await response.text();
      console.error('Réponse:', text.substring(0, 500));
      process.exit(1);
    }
    
    const data: any = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('⚠️  Aucun modèle trouvé');
      process.exit(0);
    }
    
    console.log(`✅ ${data.models.length} modèles disponibles\n`);
    console.log('='.repeat(100));
    
    const visionModels: any[] = [];
    
    for (const model of data.models) {
      const supportsGenerateContent = model.supportedGenerationMethods?.includes('generateContent');
      const supportsVision = model.inputTokenLimit && model.inputTokenLimit > 0;
      const displayName = model.displayName || model.name;
      
      console.log(`\n📦 ${displayName}`);
      console.log(`   Nom: ${model.name}`);
      console.log(`   Version: ${model.version || 'N/A'}`);
      console.log(`   Méthodes supportées: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`   Input token limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`   Output token limit: ${model.outputTokenLimit || 'N/A'}`);
      console.log(`   Température max: ${model.temperature || 'N/A'}`);
      
      if (supportsGenerateContent) {
        console.log(`   ✅ Supporte generateContent`);
      }
      
      if (model.name.includes('vision') || model.name.includes('pro-vision') || 
          (supportsGenerateContent && model.inputTokenLimit > 30000)) {
        console.log(`   🖼️  Probablement supporte Vision (multimodal)`);
        visionModels.push(model);
      }
      
      console.log('-'.repeat(100));
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('\n🖼️  MODÈLES VISION DÉTECTÉS:\n');
    
    if (visionModels.length === 0) {
      console.log('❌ Aucun modèle Vision détecté explicitement');
      console.log('\n💡 MODÈLES RECOMMANDÉS POUR VISION:');
      console.log('   - gemini-1.5-flash-latest');
      console.log('   - gemini-1.5-pro-latest');
      console.log('   - gemini-pro-vision');
    } else {
      visionModels.forEach((model) => {
        console.log(`✅ ${model.displayName || model.name}`);
        console.log(`   → Nom à utiliser: ${model.name}`);
        console.log(`   → API endpoint: v1beta`);
      });
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('\n🔧 TEST D\'UN MODÈLE VISION:\n');
    
    // Tester avec le premier modèle qui supporte generateContent
    const testModelNames = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-pro-vision',
      'models/gemini-1.5-flash-latest',
      'models/gemini-1.5-flash'
    ];
    
    for (const testName of testModelNames) {
      try {
        console.log(`Testing: ${testName}...`);
        const model = genAI.getGenerativeModel({ model: testName });
        const result = await model.generateContent('Réponds simplement "OK"');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${testName} fonctionne!`);
        console.log(`   Réponse: ${text.substring(0, 100)}`);
        console.log(`\n🎯 MODÈLE RECOMMANDÉ: ${testName}\n`);
        break;
      } catch (error: any) {
        console.log(`❌ ${testName}: ${error.message.substring(0, 150)}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

listGeminiModels();
