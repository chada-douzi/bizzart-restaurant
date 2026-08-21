/**
 * DEBUG: Pourquoi 78 plats ne sont pas matchés alors qu'ils sont dans l'inventaire ?
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

config();

async function main() {
  console.log('\n=== DEBUG: 78 PLATS NON MATCHÉS ===\n');
  
  // Load reports
  const finalReport = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../photo-mapping-final-report.json'), 'utf-8')
  );
  
  const inventory = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../photo-inventory-complete.json'), 'utf-8')
  );
  
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart');
  
  // Get all dishes
  const categories = await MenuCategory.find({ isActive: true }).lean();
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name.fr]));
  
  const items = await MenuItem.find({}).populate('category').lean();
  const dishes = items.map(item => ({
    _id: item._id.toString(),
    nameFr: item.name.fr,
    categoryName: categoryMap.get(item.category._id.toString()) || 'Unknown',
    existingImage: item.image || '',
  }));
  
  // Find the 78 non-matched dishes
  const nonMatched = finalReport.mappings.filter((m: any) => m.status === 'NO_CONFIDENT_MATCH');
  
  console.log(`Total non-matched: ${nonMatched.length}\n`);
  
  // Check each one
  let inInventoryWithRelation = 0;
  let inInventoryNoRelation = 0;
  let notInInventory = 0;
  
  const examples: any[] = [];
  
  nonMatched.forEach((mapping: any) => {
    const dish = dishes.find(d => d._id === mapping.dishId);
    
    if (!dish || !dish.existingImage) {
      notInInventory++;
      return;
    }
    
    // Find in inventory
    const photoInInventory = inventory.photos.find((p: any) => 
      p.url === dish.existingImage ||
      (p.cloudinary?.publicId && dish.existingImage.includes(p.cloudinary.publicId))
    );
    
    if (photoInInventory) {
      const hasRelation = photoInInventory.dishes?.some((d: any) => d.dishId === dish._id);
      
      if (hasRelation) {
        inInventoryWithRelation++;
        
        // Save example
        if (examples.length < 5) {
          examples.push({
            dishName: dish.nameFr,
            category: dish.categoryName,
            existingImage: dish.existingImage,
            photoId: photoInInventory.id,
            photoFilename: photoInInventory.filename,
            relationship: photoInInventory.dishes.find((d: any) => d.dishId === dish._id)?.relationship,
            reason: 'IN INVENTORY WITH RELATION but NOT MATCHED',
          });
        }
      } else {
        inInventoryNoRelation++;
      }
    } else {
      notInInventory++;
      
      if (examples.length < 5) {
        examples.push({
          dishName: dish.nameFr,
          existingImage: dish.existingImage,
          reason: 'NOT IN INVENTORY',
        });
      }
    }
  });
  
  console.log('=== RÉSULTATS ===\n');
  console.log(`Dans l'inventaire AVEC relation : ${inInventoryWithRelation}`);
  console.log(`Dans l'inventaire SANS relation  : ${inInventoryNoRelation}`);
  console.log(`PAS dans l'inventaire           : ${notInInventory}\n`);
  
  console.log('=== EXEMPLES (5 premiers) ===\n');
  examples.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.dishName} (${ex.category || 'N/A'})`);
    console.log(`   URL: ${ex.existingImage?.substring(0, 80)}...`);
    console.log(`   Photo ID: ${ex.photoId || 'N/A'}`);
    console.log(`   Filename: ${ex.photoFilename || 'N/A'}`);
    console.log(`   Relation: ${ex.relationship || 'N/A'}`);
    console.log(`   Raison: ${ex.reason}\n`);
  });
  
  await mongoose.disconnect();
}

main().catch(console.error);
