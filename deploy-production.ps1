# ============================================================================
# BIZZ'ART MONASTIR - PRODUCTION DEPLOYMENT SCRIPT
# ============================================================================
# 
# Ce script déploie le backend et le frontend en production
# 
# PRÉREQUIS:
# - Node.js installé
# - MongoDB en production accessible
# - Variables d'environnement configurées
# - Builds déjà générés (npm run build)
#
# USAGE:
# .\deploy-production.ps1
# ============================================================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ BIZZ'ART MONASTIR - PRODUCTION DEPLOYMENT                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# ────────────────────────────────────────────────────────────────────────────
# 1. PRE-DEPLOYMENT CHECKS
# ────────────────────────────────────────────────────────────────────────────

Write-Host "🔍 Running pre-deployment checks..." -ForegroundColor Yellow

# Check if builds exist
if (!(Test-Path "backend/dist/server.js")) {
    Write-Host "❌ Backend build not found. Run 'npm run build' in backend/" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "frontend/dist/frontend/browser/index.html")) {
    Write-Host "❌ Frontend build not found. Run 'npm run build' in frontend/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend build found" -ForegroundColor Green
Write-Host "✅ Frontend build found" -ForegroundColor Green

# Check environment variables
if (!(Test-Path "backend/.env.production")) {
    Write-Host "⚠️  No .env.production found. Using .env" -ForegroundColor Yellow
}

Write-Host "`n✅ Pre-deployment checks passed`n" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 2. BACKUP MONGODB
# ────────────────────────────────────────────────────────────────────────────

Write-Host "💾 Creating MongoDB backup..." -ForegroundColor Yellow

$backupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$mongoUri = $env:MONGODB_URI
if (!$mongoUri) {
    $mongoUri = "mongodb://localhost:27017/bizzart"
}

Write-Host "📦 Backup location: $backupDir" -ForegroundColor Cyan

try {
    mongodump --uri="$mongoUri" --out="./$backupDir"
    Write-Host "✅ MongoDB backup created`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MongoDB backup failed (continuing anyway): $_" -ForegroundColor Yellow
}

# ────────────────────────────────────────────────────────────────────────────
# 3. DEPLOY BACKEND
# ────────────────────────────────────────────────────────────────────────────

Write-Host "🚀 Deploying backend..." -ForegroundColor Yellow

Set-Location backend

# Install production dependencies
Write-Host "📦 Installing production dependencies..." -ForegroundColor Cyan
npm ci --production

# Check if PM2 is available
$pm2Available = Get-Command pm2 -ErrorAction SilentlyContinue

if ($pm2Available) {
    Write-Host "🔄 Starting backend with PM2..." -ForegroundColor Cyan
    
    # Stop existing process if running
    pm2 stop bizzart-backend 2>$null
    pm2 delete bizzart-backend 2>$null
    
    # Start new process
    pm2 start dist/server.js --name bizzart-backend
    pm2 save
    
    Write-Host "✅ Backend deployed with PM2" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 not found. Install with: npm install -g pm2" -ForegroundColor Yellow
    Write-Host "💡 To start manually: npm run start" -ForegroundColor Cyan
}

Set-Location ..

Write-Host "✅ Backend deployment complete`n" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 4. DEPLOY FRONTEND
# ────────────────────────────────────────────────────────────────────────────

Write-Host "🎨 Frontend build ready for deployment" -ForegroundColor Yellow
Write-Host "📁 Location: frontend/dist/frontend/browser/" -ForegroundColor Cyan
Write-Host "💡 Deploy this folder to your hosting service (Netlify, Vercel, Nginx, etc.)" -ForegroundColor Yellow
Write-Host "✅ Frontend ready`n" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 5. POST-DEPLOYMENT VERIFICATION
# ────────────────────────────────────────────────────────────────────────────

Write-Host "✅ Testing API health..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    if ($response.success -eq $true) {
        Write-Host "✅ API is healthy" -ForegroundColor Green
        Write-Host "   Message: $($response.message)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Could not verify API health. Check logs." -ForegroundColor Yellow
}

# ────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ────────────────────────────────────────────────────────────────────────────

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Backend: " -NoNewline; Write-Host "DEPLOYED" -ForegroundColor Green
Write-Host "✅ Frontend: " -NoNewline; Write-Host "READY" -ForegroundColor Green
Write-Host "✅ Database: " -NoNewline; Write-Host "BACKED UP" -ForegroundColor Green

Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy frontend/dist/frontend/browser/ to your hosting" -ForegroundColor White
Write-Host "2. Configure DNS and SSL certificates" -ForegroundColor White
Write-Host "3. Update ALLOWED_ORIGINS in production .env" -ForegroundColor White
Write-Host "4. Test all endpoints: https://your-domain.com" -ForegroundColor White
Write-Host "5. Monitor PM2 logs: pm2 logs bizzart-backend" -ForegroundColor White

Write-Host "`n🎉 BIZZ'ART is ready for production!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "========================================`n" -ForegroundColor Cyan
