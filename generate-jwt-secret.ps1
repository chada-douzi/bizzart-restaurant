# ============================================================================
# BIZZ'ART - Generate Strong JWT Secret
# ============================================================================
# 
# Ce script génère un JWT_SECRET fort pour la production
# 
# USAGE:
# .\generate-jwt-secret.ps1
# ============================================================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       BIZZ'ART - JWT Secret Generator                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "🔐 Génération d'un JWT_SECRET fort...`n" -ForegroundColor Yellow

# Méthode 1: Base64 random (recommandé)
try {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)
    $secret1 = [System.Convert]::ToBase64String($bytes)
    
    Write-Host "✅ Secret généré (Base64 - 64 caractères):" -ForegroundColor Green
    Write-Host $secret1 -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erreur méthode Base64" -ForegroundColor Red
}

# Méthode 2: Alphanumeric random (alternative)
$chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+'
$secret2 = -join ((1..64) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

Write-Host "✅ Secret alternatif (Alphanumérique - 64 caractères):" -ForegroundColor Green
Write-Host $secret2 -ForegroundColor White
Write-Host ""

# Instructions
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "`n📋 INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Copier l'un des secrets ci-dessus" -ForegroundColor White
Write-Host ""
Write-Host "2. Option A - Fichier .env.production (VPS/PM2):" -ForegroundColor Cyan
Write-Host "   • Copier: backend\.env.production.template" -ForegroundColor Gray
Write-Host "   • Vers: backend\.env.production" -ForegroundColor Gray
Write-Host "   • Remplacer JWT_SECRET avec le secret généré" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Option B - Plateforme de déploiement:" -ForegroundColor Cyan
Write-Host "   • Heroku: heroku config:set JWT_SECRET=<secret>" -ForegroundColor Gray
Write-Host "   • Railway: Dashboard > Variables" -ForegroundColor Gray
Write-Host "   • Render: Dashboard > Environment" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   • Ne JAMAIS committer .env.production dans Git" -ForegroundColor Red
Write-Host "   • Ne JAMAIS partager ce secret publiquement" -ForegroundColor Red
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Option: Copier dans le presse-papiers (si disponible)
try {
    Set-Clipboard -Value $secret1
    Write-Host "✅ Le premier secret a été copié dans votre presse-papiers!`n" -ForegroundColor Green
} catch {
    Write-Host "💡 Copiez manuellement le secret de votre choix`n" -ForegroundColor Yellow
}

Write-Host "🚀 Prêt pour la production après configuration!`n" -ForegroundColor Cyan
