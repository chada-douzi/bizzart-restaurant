/**
 * Seed Admin Script
 *
 * Usage: npx ts-node src/seed/seed-admin.ts
 *
 * Required environment variables:
 *   MONGODB_URI    - MongoDB connection string
 *   ADMIN_EMAIL    - Email of the initial admin user
 *   ADMIN_PASSWORD - Password for the initial admin user (min 8 chars)
 *   ADMIN_FIRST_NAME (optional) - Default: "Admin"
 *   ADMIN_LAST_NAME  (optional) - Default: "BIZZ'ART"
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { CONSTANTS } from '../config/constants';

// Load .env from the backend root
dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value.trim();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local[0] + '*';
  return `${maskedLocal}@${domain}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  console.log('🌱 ============================================');
  console.log("🍕 BIZZ'ART — Admin Seed Script");
  console.log('🌱 ============================================');

  // ── 1. Validate required env vars ──────────────────────────────────────────
  const mongoUri = getRequiredEnv('MONGODB_URI');
  const adminEmail = getRequiredEnv('ADMIN_EMAIL');
  const adminPassword = getRequiredEnv('ADMIN_PASSWORD');

  if (adminPassword.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const adminFirstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME?.trim() || "BIZZ'ART";

  // ── 2. Connect to MongoDB ───────────────────────────────────────────────────
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }

  // ── 3. Check for existing admin ────────────────────────────────────────────
  try {
    const existingAdmin = await User.findOne({
      role: CONSTANTS.USER_ROLES.ADMIN,
      isActive: true,
    });

    if (existingAdmin) {
      console.log('');
      console.log('ℹ️  An active admin user already exists.');
      console.log(`   Email: ${maskEmail(existingAdmin.email)}`);
      console.log('   No changes made.');
      console.log('');
      return;
    }

    // ── 4. Check if the specific email is already taken ────────────────────
    const emailTaken = await User.findOne({
      email: adminEmail.toLowerCase().trim(),
    });

    if (emailTaken) {
      console.log('');
      console.log(`⚠️  A user with email ${maskEmail(adminEmail)} already exists (role: ${emailTaken.role}).`);
      console.log('   No changes made.');
      console.log('');
      return;
    }

    // ── 5. Create admin user ───────────────────────────────────────────────
    // NOTE: password is hashed automatically by the pre-save hook in user.model.ts
    const admin = new User({
      email: adminEmail,
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: CONSTANTS.USER_ROLES.ADMIN,
      isActive: true,
    });

    await admin.save();

    console.log('');
    console.log('✅ Admin user created successfully!');
    console.log(`   Email:      ${maskEmail(adminEmail)}`);
    console.log(`   First name: ${adminFirstName}`);
    console.log(`   Last name:  ${adminLastName}`);
    console.log(`   Role:       ${CONSTANTS.USER_ROLES.ADMIN}`);
    console.log('   Password:   [HIDDEN]');
    console.log('');
    console.log('⚠️  Store these credentials securely. They cannot be recovered.');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// ─── Run & cleanup ────────────────────────────────────────────────────────────

seedAdmin()
  .then(async () => {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    console.log('🌱 Seed complete.');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Unexpected error:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors during cleanup
    }
    process.exit(1);
  });
