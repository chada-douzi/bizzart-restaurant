/**
 * ============================================================================
 * PRE-DEPLOYMENT CHECK — AUDIT FINAL READ-ONLY
 * ============================================================================
 * 
 * MISSION:
 * Vérifier l'état final avant livraison production
 * 
 * RÈGLES:
 * ✅ READ-ONLY absolu
 * ❌ Aucune modification MongoDB
 * ❌ Aucune modification Cloudinary
 * ❌ Aucune modification données
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import { Settings } from '../models/settings.model';
import { Reservation } from '../models/reservation.model';
import { Review } from '../models/review.model';

config();

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  critical: boolean;
}

interface PreDeploymentReport {
  timestamp: string;
  environment: string;
  checks: CheckResult[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    criticalIssues: number;
  };
  verdict: 'READY_FOR_DEPLOYMENT' | 'BLOCKED';
  blockedReasons: string[];
}

const checks: CheckResult[] = [];

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function addCheck(name: string, status: 'PASS' | 'FAIL' | 'WARNING', details: string, critical = false) {
  checks.push({ name, status, details, critical });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${details}`);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. CHECK MONGODB CONNECTION
// ────────────────────────────────────────────────────────────────────────────

async function checkMongoDBConnection(): Promise<void> {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      addCheck('MongoDB Connection', 'PASS', 'Connected successfully', true);
    } else {
      addCheck('MongoDB Connection', 'FAIL', `Connection state: ${state}`, true);
    }
  } catch (error) {
    addCheck('MongoDB Connection', 'FAIL', `Error: ${error}`, true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 2. CHECK MENU ITEMS
// ────────────────────────────────────────────────────────────────────────────

async function checkMenuItems(): Promise<void> {
  try {
    const totalItems = await MenuItem.countDocuments();
    
    if (totalItems === 114) {
      addCheck('Menu Items Count', 'PASS', `114 dishes found`, true);
    } else {
      addCheck('Menu Items Count', 'FAIL', `Found ${totalItems} dishes, expected 114`, true);
    }
    
    // Check items with real photos (not placeholder)
    const itemsWithPhotos = await MenuItem.countDocuments({
      image: { $not: /placeholder/ }
    });
    
    if (itemsWithPhotos >= 98) {
      addCheck('Menu Photos', 'PASS', `${itemsWithPhotos} items with real photos (≥98 validated)`, false);
    } else {
      addCheck('Menu Photos', 'WARNING', `${itemsWithPhotos} items with real photos, expected ≥98`, false);
    }
    
    // Check for missing images
    const itemsWithoutImage = await MenuItem.countDocuments({
      $or: [
        { image: { $exists: false } },
        { image: '' },
        { image: null }
      ]
    });
    
    if (itemsWithoutImage === 0) {
      addCheck('Missing Images', 'PASS', 'All items have images', false);
    } else {
      addCheck('Missing Images', 'FAIL', `${itemsWithoutImage} items without image`, true);
    }
    
    // Check Cloudinary URLs
    const cloudinaryItems = await MenuItem.countDocuments({
      image: /cloudinary/
    });
    
    if (cloudinaryItems === totalItems) {
      addCheck('Cloudinary URLs', 'PASS', 'All items use Cloudinary', false);
    } else {
      addCheck('Cloudinary URLs', 'WARNING', `${totalItems - cloudinaryItems} items not using Cloudinary`, false);
    }
    
    // Sample some items
    const sampleItems = await MenuItem.find().limit(5).lean();
    console.log('\n📋 Sample Menu Items:');
    sampleItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name.fr} - ${item.image.substring(0, 60)}...`);
    });
    
  } catch (error) {
    addCheck('Menu Items', 'FAIL', `Error: ${error}`, true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 3. CHECK CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

async function checkCategories(): Promise<void> {
  try {
    const categories = await MenuCategory.find().lean();
    
    if (categories.length > 0) {
      addCheck('Menu Categories', 'PASS', `${categories.length} categories found`, true);
      
      console.log('\n📂 Categories:');
      categories.forEach(cat => {
        console.log(`  - ${cat.name.fr}`);
      });
    } else {
      addCheck('Menu Categories', 'FAIL', 'No categories found', true);
    }
    
    // Check if all categories have items
    for (const category of categories) {
      const itemCount = await MenuItem.countDocuments({ category: category._id });
      if (itemCount === 0) {
        addCheck(`Category ${category.name.fr}`, 'WARNING', 'No items in this category', false);
      }
    }
    
  } catch (error) {
    addCheck('Menu Categories', 'FAIL', `Error: ${error}`, true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 4. CHECK SETTINGS
// ────────────────────────────────────────────────────────────────────────────

async function checkSettings(): Promise<void> {
  try {
    const settings = await Settings.findOne().lean();
    
    if (settings) {
      addCheck('Restaurant Settings', 'PASS', 'Settings configured', false);
      
      // Check important fields
      if (settings.openingHours && settings.openingHours.length > 0) {
        addCheck('Opening Hours', 'PASS', `${settings.openingHours.length} days configured`, false);
      } else {
        addCheck('Opening Hours', 'WARNING', 'No opening hours configured', false);
      }
      
      if (settings.contact) {
        addCheck('Contact Info', 'PASS', 'Contact information present', false);
      } else {
        addCheck('Contact Info', 'WARNING', 'No contact information', false);
      }
      
    } else {
      addCheck('Restaurant Settings', 'WARNING', 'No settings found', false);
    }
    
  } catch (error) {
    addCheck('Restaurant Settings', 'FAIL', `Error: ${error}`, false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 5. CHECK RESERVATIONS
// ────────────────────────────────────────────────────────────────────────────

async function checkReservations(): Promise<void> {
  try {
    const reservationCount = await Reservation.countDocuments();
    addCheck('Reservations Collection', 'PASS', `${reservationCount} reservations in database`, false);
    
  } catch (error) {
    addCheck('Reservations Collection', 'FAIL', `Error: ${error}`, false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 6. CHECK REVIEWS
// ────────────────────────────────────────────────────────────────────────────

async function checkReviews(): Promise<void> {
  try {
    const reviewCount = await Review.countDocuments();
    addCheck('Reviews Collection', 'PASS', `${reviewCount} reviews in database`, false);
    
    const publishedCount = await Review.countDocuments({ isPublished: true });
    addCheck('Published Reviews', 'PASS', `${publishedCount} published reviews`, false);
    
  } catch (error) {
    addCheck('Reviews Collection', 'FAIL', `Error: ${error}`, false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 7. CHECK ENVIRONMENT VARIABLES
// ────────────────────────────────────────────────────────────────────────────

function checkEnvironmentVariables(): void {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  
  let missing = 0;
  required.forEach(key => {
    if (!process.env[key]) {
      addCheck(`ENV: ${key}`, 'FAIL', 'Missing required environment variable', true);
      missing++;
    }
  });
  
  if (missing === 0) {
    addCheck('Environment Variables', 'PASS', 'All required variables present', true);
  }
  
  // Check production readiness
  if (process.env.NODE_ENV === 'production') {
    addCheck('NODE_ENV', 'PASS', 'Set to production', false);
  } else {
    addCheck('NODE_ENV', 'WARNING', `Set to ${process.env.NODE_ENV || 'development'}`, false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 8. CHECK BUILD FILES
// ────────────────────────────────────────────────────────────────────────────

function checkBuildFiles(): void {
  const distPath = path.join(__dirname, '../../dist/server.js');
  
  if (fs.existsSync(distPath)) {
    addCheck('Backend Build', 'PASS', 'dist/server.js exists', true);
  } else {
    addCheck('Backend Build', 'FAIL', 'dist/server.js not found', true);
  }
  
  const frontendDistPath = path.join(__dirname, '../../../frontend/dist/frontend/index.html');
  
  if (fs.existsSync(frontendDistPath)) {
    addCheck('Frontend Build', 'PASS', 'Frontend build exists', true);
  } else {
    addCheck('Frontend Build', 'WARNING', 'Frontend build not found', false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 9. CHECK CRITICAL PHOTO CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

async function checkCriticalPhotos(): Promise<void> {
  console.log('\n🔍 Checking critical categories...');
  
  const criticalCategories = [
    'Les Pizzas',
    'Pâtes',
    'Salade',
    'Viandes',
    'Volailles',
    'Tacos'
  ];
  
  for (const catName of criticalCategories) {
    const category = await MenuCategory.findOne({ 'name.fr': catName }).lean();
    
    if (category) {
      const items = await MenuItem.find({ category: category._id }).lean();
      const withRealPhotos = items.filter(item => !item.image.includes('placeholder')).length;
      
      if (withRealPhotos === items.length) {
        addCheck(`Photos: ${catName}`, 'PASS', `${withRealPhotos}/${items.length} with real photos`, false);
      } else {
        addCheck(`Photos: ${catName}`, 'WARNING', `${withRealPhotos}/${items.length} with real photos`, false);
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GENERATE REPORT
// ────────────────────────────────────────────────────────────────────────────

function generateReport(): PreDeploymentReport {
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;
  const criticalIssues = checks.filter(c => c.status === 'FAIL' && c.critical).length;
  
  const blockedReasons = checks
    .filter(c => c.status === 'FAIL' && c.critical)
    .map(c => `${c.name}: ${c.details}`);
  
  const verdict: 'READY_FOR_DEPLOYMENT' | 'BLOCKED' = criticalIssues === 0 ? 'READY_FOR_DEPLOYMENT' : 'BLOCKED';
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks,
    summary: {
      totalChecks: checks.length,
      passed,
      failed,
      warnings,
      criticalIssues,
    },
    verdict,
    blockedReasons,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DISPLAY REPORT
// ────────────────────────────────────────────────────────────────────────────

function displayReport(report: PreDeploymentReport): void {
  console.log('\n========================================');
  console.log(' PRE-DEPLOYMENT CHECK REPORT');
  console.log('========================================\n');
  
  console.log(`Environment: ${report.environment}`);
  console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString('fr-FR')}\n`);
  
  console.log('SUMMARY');
  console.log('-------');
  console.log(`Total checks: ${report.summary.totalChecks}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`🚨 Critical issues: ${report.summary.criticalIssues}\n`);
  
  if (report.blockedReasons.length > 0) {
    console.log('BLOCKING ISSUES');
    console.log('---------------');
    report.blockedReasons.forEach(reason => {
      console.log(`  ❌ ${reason}`);
    });
    console.log();
  }
  
  console.log('========================================');
  console.log(`VERDICT: ${report.verdict}`);
  console.log('========================================\n');
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║ PRE-DEPLOYMENT CHECK                                        ║');
  console.log('║ READ-ONLY AUDIT                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    console.log(`🔌 Connecting to: ${mongoURI}\n`);
    await mongoose.connect(mongoURI);
    
    // Run checks
    console.log('🔍 Running checks...\n');
    
    await checkMongoDBConnection();
    checkEnvironmentVariables();
    checkBuildFiles();
    await checkCategories();
    await checkMenuItems();
    await checkCriticalPhotos();
    await checkSettings();
    await checkReservations();
    await checkReviews();
    
    // Generate report
    const report = generateReport();
    
    // Save report
    const basePath = path.join(__dirname, '../..');
    fs.writeFileSync(
      path.join(basePath, 'PRE-DEPLOYMENT-REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Display
    displayReport(report);
    
    // Exit code
    process.exit(report.verdict === 'READY_FOR_DEPLOYMENT' ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Error during pre-deployment check:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
