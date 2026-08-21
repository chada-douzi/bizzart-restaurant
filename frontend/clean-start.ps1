# Script pour nettoyer et redémarrer Angular proprement

Write-Host "🧹 Nettoyage du cache Angular..." -ForegroundColor Cyan

# Supprimer le cache Angular
if (Test-Path ".angular") {
    Remove-Item -Recurse -Force ".angular"
    Write-Host "✅ Cache Angular supprimé" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Démarrage du serveur Angular..." -ForegroundColor Cyan
Write-Host ""

npm start
