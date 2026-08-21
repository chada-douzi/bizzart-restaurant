/**
 * Upload Menu Images to Cloudinary
 * 
 * Usage: npx ts-node src/seed/upload-menu-images.ts
 * 
 * This script uploads all menu images from the extracted folder to Cloudinary
 * and saves the mapping of filenames to Cloudinary URLs in a JSON file.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Source directory with extracted images
const SOURCE_DIR = path.join(__dirname, '../../../bizzart-media-extracted/Nouveau dossier');
const OUTPUT_FILE = path.join(__dirname, 'menu-images-urls.json');

interface ImageMapping {
  originalName: string;
  cloudinaryUrl: string;
  publicId: string;
}

async function uploadImage(filePath: string, filename: string): Promise<ImageMapping> {
  try {
    console.log(`  📤 Uploading ${filename}...`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'bizzart/menu',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      resource_type: 'image',
    });

    console.log(`  ✅ Uploaded: ${result.secure_url}`);
    
    return {
      originalName: filename,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`  ❌ Failed to upload ${filename}:`, error);
    throw error;
  }
}

async function uploadAllImages(): Promise<void> {
  console.log('\n🖼️  ============================================');
  console.log('📤 Upload Menu Images to Cloudinary');
  console.log('🖼️  ============================================\n');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Get all image files
  const allFiles = fs.readdirSync(SOURCE_DIR, { recursive: true, withFileTypes: true });
  const imageFiles = allFiles
    .filter(file => file.isFile() && /\.(jpg|jpeg|png)$/i.test(file.name))
    .map(file => ({
      name: file.name,
      path: path.join(file.path || '', file.name),
    }));

  console.log(`📊 Found ${imageFiles.length} images to upload\n`);

  const mappings: ImageMapping[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const [index, file] of imageFiles.entries()) {
    console.log(`[${index + 1}/${imageFiles.length}] ${file.name}`);
    
    try {
      const mapping = await uploadImage(file.path, file.name);
      mappings.push(mapping);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`  ⚠️  Skipping ${file.name} due to error\n`);
    }
  }

  // Save mappings to JSON file
  console.log(`\n💾 Saving image mappings to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappings, null, 2), 'utf-8');
  console.log('✅ Mappings saved\n');

  // Summary
  console.log('🎉 ============================================');
  console.log(`✅ Successfully uploaded: ${successCount} images`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} images`);
  }
  console.log(`💾 Mappings saved to: ${OUTPUT_FILE}`);
  console.log('🎉 ============================================\n');
}

// Run
uploadAllImages()
  .then(() => {
    console.log('✅ Upload complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Upload failed:', err);
    process.exit(1);
  });
