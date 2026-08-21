/**
 * Vérification: Confirmer que "Gouta" est bien dans le menu
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyGoutaFix() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Vérifier qu'il n'y a plus de "Gouda" dans les pizzas
    const withGouda = await MenuItem.find({
      'description.fr': { $regex: /Gouda/i }
    }).select('name.fr description.fr');

    console.log('🔍 Plats contenant encore "Gouda":');
    if (withGouda.length === 0) {
      console.log('   ✅ Aucun plat trouvé (parfait!)');
    } else {
      withGouda.forEach(item => {
        console.log(`   ❌ ${item.name.fr}: ${item.description?.fr}`);
      });
    }

    // Vérifier que "Gouta" est bien présent
    const withGouta = await MenuItem.find({
      'description.fr': { $regex: /Gouta/i }
    }).select('name.fr description.fr');

    console.log('\n🔍 Plats contenant "Gouta":');
    if (withGouta.length > 0) {
      withGouta.forEach(item => {
        console.log(`   ✅ ${item.name.fr}: ${item.description?.fr}`);
      });
    } else {
      console.log('   ❌ Aucun plat trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyGoutaFix();
