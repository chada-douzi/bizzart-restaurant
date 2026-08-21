/**
 * Migration: Corriger "Gouda" → "Gouta" dans les descriptions des pizzas 4 Fromages
 * 
 * Cette migration corrige l'orthographe de l'ingrédient "Gouda" en "Gouta"
 * pour les 2 plats concernés dans la catégorie Pizza.
 */

import mongoose from 'mongoose';
import { MenuItem } from '../models/menu-item.model';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function fixGoudaToGouta() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Pizza 4 Fromages sauce tomate
    const result1 = await MenuItem.updateOne(
      {
        'name.fr': 'Pizza 4 Fromages sauce tomate',
        'description.fr': { $regex: /Gouda/i }
      },
      {
        $set: {
          'description.fr': 'Mozzarella + Fromage Gruyère + Gouta + Emmental'
        }
      }
    );

    // Pizza 4 Fromages sauce blanche
    const result2 = await MenuItem.updateOne(
      {
        'name.fr': 'Pizza 4 Fromages sauce blanche',
        'description.fr': { $regex: /Gouda/i }
      },
      {
        $set: {
          'description.fr': 'Mozzarella + Gruyère + Gouta + Emmental'
        }
      }
    );

    console.log('📊 Résultats de la migration:');
    console.log(`   Pizza 4 Fromages sauce tomate: ${result1.modifiedCount} plat(s) modifié(s)`);
    console.log(`   Pizza 4 Fromages sauce blanche: ${result2.modifiedCount} plat(s) modifié(s)`);
    console.log(`\n✅ Migration terminée avec succès`);

    // Vérification
    console.log('\n🔍 Vérification des données:');
    const pizzas = await MenuItem.find({
      'name.fr': { $in: ['Pizza 4 Fromages sauce tomate', 'Pizza 4 Fromages sauce blanche'] }
    }).select('name.fr description.fr');

    pizzas.forEach(pizza => {
      console.log(`   - ${pizza.name.fr}: ${pizza.description?.fr || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Déconnexion de MongoDB');
    process.exit(0);
  }
}

fixGoudaToGouta();
