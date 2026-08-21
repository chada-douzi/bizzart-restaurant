/**
 * GÉNÉRATION RAPPORT AUDIT VISUEL — MODE READ-ONLY STRICT
 * Génère un HTML standalone avec données pré-chargées (pas de CORS)
 */

import mongoose from 'mongoose';
import { MenuItem } from './src/models/menu-item.model';
import { MenuCategory } from './src/models/menu-category.model';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: './backend/.env' });

async function genererRapportAudit() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
    await mongoose.connect(mongoUri);
    
    console.log('═'.repeat(80));
    console.log('GÉNÉRATION RAPPORT AUDIT VISUEL');
    console.log('═'.repeat(80) + '\n');

    // Récupérer les catégories
    console.log('📡 Chargement des catégories...');
    const categories = await MenuCategory.find({ isActive: true }).sort({ order: 1 }).lean();
    console.log(`✅ ${categories.length} catégories chargées\n`);

    // Récupérer les plats
    console.log('📡 Chargement des plats...');
    const items = await MenuItem.find({ isAvailable: true })
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: 1 })
      .lean();
    console.log(`✅ ${items.length} plats chargés\n`);

    // Préparer les données
    const dishesData = items.map((item, index) => ({
      id: item._id.toString(),
      number: index + 1,
      category: (item.category as any)?.name?.fr || 'Sans catégorie',
      categorySlug: (item.category as any)?.slug || '',
      name: item.name?.fr || 'Sans nom',
      description: item.description?.fr || '',
      price: item.price,
      image: item.image,
      slug: item.slug
    }));

    const categoriesData = categories.map(cat => ({
      slug: cat.slug,
      name: cat.name.fr
    }));

    // Générer le HTML
    console.log('📝 Génération du HTML...\n');
    
    const html = generateHTML(dishesData, categoriesData);
    
    const outputPath = path.join(__dirname, 'AUDIT-VISUEL-MENU-114-PLATS.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log('═'.repeat(80));
    console.log('✅ RAPPORT GÉNÉRÉ AVEC SUCCÈS');
    console.log('═'.repeat(80) + '\n');
    console.log(`📁 Fichier: ${outputPath}`);
    console.log(`📊 Plats inclus: ${dishesData.length}`);
    console.log(`📂 Catégories: ${categoriesData.length}`);
    console.log(`📏 Taille: ${(Buffer.byteLength(html) / 1024).toFixed(2)} KB\n`);
    console.log('🌐 Pour ouvrir:');
    console.log(`   Double-cliquez sur: ${outputPath}`);
    console.log(`   Ou: Start-Process "${outputPath}"`);
    console.log('');
    console.log('✅ MODE READ-ONLY: Aucune donnée MongoDB modifiée');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

function generateHTML(dishes: any[], categories: any[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Visuel Menu BIZZ'ART — ${dishes.length} Plats</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .stats-bar {
            background: #f8f9fa;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e0e0e0;
            flex-wrap: wrap;
            gap: 15px;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stat-icon { font-size: 1.5em; }
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 0.9em;
            color: #666;
        }
        .progress-bar {
            flex: 1;
            min-width: 300px;
        }
        .progress-bar-inner {
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .controls {
            padding: 20px 30px;
            background: white;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .search-box {
            flex: 1;
            min-width: 300px;
        }
        .search-box input {
            width: 100%;
            padding: 12px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1em;
            transition: border-color 0.3s;
        }
        .search-box input:focus {
            outline: none;
            border-color: #667eea;
        }
        select {
            padding: 12px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1em;
            cursor: pointer;
            background: white;
            transition: border-color 0.3s;
        }
        select:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
            transform: translateY(-2px);
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
            transform: translateY(-2px);
        }
        .grid {
            padding: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: all 0.3s;
            border: 3px solid transparent;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .card.confirmed { border-color: #28a745; }
        .card.uncertain { border-color: #ffc107; }
        .card.wrong { border-color: #dc3545; }
        .card.missing { border-color: #6c757d; }
        .card-header {
            background: #f8f9fa;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: start;
        }
        .card-number {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 8px;
            font-weight: bold;
        }
        .card-category {
            background: #764ba2;
            color: white;
            padding: 5px 12px;
            border-radius: 8px;
            font-size: 0.9em;
        }
        .card-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .card-image:hover { transform: scale(1.05); }
        .card-body { padding: 15px; }
        .card-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .card-description {
            color: #666;
            font-size: 0.95em;
            margin-bottom: 10px;
            line-height: 1.4;
            max-height: 60px;
            overflow: hidden;
        }
        .card-price {
            font-size: 1.4em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
        }
        .card-url {
            font-size: 0.75em;
            color: #999;
            word-break: break-all;
            margin-bottom: 15px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 5px;
            max-height: 40px;
            overflow: hidden;
        }
        .card-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        .status-btn {
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: bold;
            transition: all 0.2s;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        .status-btn:hover { transform: scale(1.05); }
        .status-btn.active {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .status-btn.confirmed {
            border-color: #28a745;
            background: #28a745;
            color: white;
        }
        .status-btn.uncertain {
            border-color: #ffc107;
            background: #ffc107;
            color: #333;
        }
        .status-btn.wrong {
            border-color: #dc3545;
            background: #dc3545;
            color: white;
        }
        .status-btn.missing {
            border-color: #6c757d;
            background: #6c757d;
            color: white;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            justify-content: center;
            align-items: center;
        }
        .modal.active { display: flex; }
        .modal-content {
            max-width: 90%;
            max-height: 90%;
            position: relative;
        }
        .modal-image {
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 10px;
        }
        .modal-close {
            position: absolute;
            top: -40px;
            right: 0;
            color: white;
            font-size: 2em;
            cursor: pointer;
            background: rgba(0,0,0,0.5);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .no-results {
            text-align: center;
            padding: 60px;
            color: #999;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍕 Audit Visuel Menu BIZZ'ART</h1>
            <p>Validation des ${dishes.length} plats et leurs photos — Mode READ-ONLY</p>
        </div>
        <div class="stats-bar">
            <div class="stat-item">
                <span class="stat-icon">📊</span>
                <div>
                    <div class="stat-value" id="stat-total">${dishes.length}</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🟢</span>
                <div>
                    <div class="stat-value" id="stat-confirmed">0</div>
                    <div class="stat-label">Confirmed</div>
                </div>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🟡</span>
                <div>
                    <div class="stat-value" id="stat-uncertain">0</div>
                    <div class="stat-label">Uncertain</div>
                </div>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🔴</span>
                <div>
                    <div class="stat-value" id="stat-wrong">0</div>
                    <div class="stat-label">Wrong</div>
                </div>
            </div>
            <div class="stat-item">
                <span class="stat-icon">⚫</span>
                <div>
                    <div class="stat-value" id="stat-missing">0</div>
                    <div class="stat-label">Missing</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-inner">
                    <div class="progress-bar-fill" id="progress-fill">0 / ${dishes.length} vérifiés</div>
                </div>
            </div>
        </div>
        <div class="controls">
            <div class="search-box">
                <input type="text" id="search-input" placeholder="🔍 Rechercher un plat...">
            </div>
            <select id="category-filter">
                <option value="">Toutes les catégories</option>
                ${categories.map(cat => `<option value="${cat.slug}">${cat.name}</option>`).join('')}
            </select>
            <select id="status-filter">
                <option value="">Tous les statuts</option>
                <option value="CONFIRMED">🟢 Confirmed</option>
                <option value="UNCERTAIN">🟡 Uncertain</option>
                <option value="WRONG_DISH">🔴 Wrong Dish</option>
                <option value="MISSING">⚫ Missing</option>
                <option value="PENDING">⚪ Non vérifiés</option>
            </select>
            <button class="btn btn-success" onclick="exportJSON()">📥 Export JSON</button>
            <button class="btn btn-danger" onclick="resetValidations()">🔄 Reset</button>
        </div>
        <div id="content" class="grid"></div>
    </div>
    <div class="modal" id="image-modal">
        <div class="modal-content">
            <span class="modal-close" onclick="closeModal()">&times;</span>
            <img class="modal-image" id="modal-image" src="" alt="">
        </div>
    </div>
    <script>
        const allDishes = ${JSON.stringify(dishes)};
        let validations = {};

        function loadValidations() {
            const saved = localStorage.getItem('bizzart-menu-validations');
            if (saved) {
                validations = JSON.parse(saved);
                console.log('✅ Validations chargées:', Object.keys(validations).length);
            }
        }

        function saveValidations() {
            localStorage.setItem('bizzart-menu-validations', JSON.stringify(validations));
        }

        function renderDishes() {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const categoryFilter = document.getElementById('category-filter').value;
            const statusFilter = document.getElementById('status-filter').value;

            let filtered = allDishes.filter(dish => {
                if (searchTerm && !dish.name.toLowerCase().includes(searchTerm)) return false;
                if (categoryFilter && dish.categorySlug !== categoryFilter) return false;
                if (statusFilter) {
                    const dishStatus = validations[dish.id] || 'PENDING';
                    if (statusFilter !== dishStatus) return false;
                }
                return true;
            });

            const content = document.getElementById('content');
            if (filtered.length === 0) {
                content.innerHTML = '<div class="no-results">Aucun plat ne correspond aux filtres.</div>';
                return;
            }

            content.innerHTML = filtered.map(dish => {
                const status = validations[dish.id] || '';
                const statusClass = status.toLowerCase().replace('_', '');
                return \`
                    <div class="card \${statusClass}">
                        <div class="card-header">
                            <span class="card-number">#\${dish.number}</span>
                            <span class="card-category">\${dish.category}</span>
                        </div>
                        <img class="card-image" src="\${dish.image}" alt="\${dish.name}" onclick="openModal('\${dish.image}')" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2220%22>Image manquante</text></svg>'">
                        <div class="card-body">
                            <div class="card-title">\${dish.name}</div>
                            \${dish.description ? \`<div class="card-description">\${dish.description}</div>\` : ''}
                            <div class="card-price">\${dish.price.toFixed(2)} DT</div>
                            <div class="card-url">\${dish.image}</div>
                            <div class="card-actions">
                                <button class="status-btn \${status === 'CONFIRMED' ? 'confirmed active' : ''}" onclick="setStatus('\${dish.id}', 'CONFIRMED')">🟢 Correct</button>
                                <button class="status-btn \${status === 'UNCERTAIN' ? 'uncertain active' : ''}" onclick="setStatus('\${dish.id}', 'UNCERTAIN')">🟡 Incertain</button>
                                <button class="status-btn \${status === 'WRONG_DISH' ? 'wrong active' : ''}" onclick="setStatus('\${dish.id}', 'WRONG_DISH')">🔴 Mauvais</button>
                                <button class="status-btn \${status === 'MISSING' ? 'missing active' : ''}" onclick="setStatus('\${dish.id}', 'MISSING')">⚫ Absent</button>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function setStatus(dishId, status) {
            validations[dishId] = status;
            saveValidations();
            renderDishes();
            updateStats();
        }

        function updateStats() {
            const confirmed = Object.values(validations).filter(v => v === 'CONFIRMED').length;
            const uncertain = Object.values(validations).filter(v => v === 'UNCERTAIN').length;
            const wrong = Object.values(validations).filter(v => v === 'WRONG_DISH').length;
            const missing = Object.values(validations).filter(v => v === 'MISSING').length;
            const verified = confirmed + uncertain + wrong + missing;
            const percentage = (verified / ${dishes.length} * 100).toFixed(1);

            document.getElementById('stat-confirmed').textContent = confirmed;
            document.getElementById('stat-uncertain').textContent = uncertain;
            document.getElementById('stat-wrong').textContent = wrong;
            document.getElementById('stat-missing').textContent = missing;
            document.getElementById('progress-fill').textContent = \`\${verified} / ${dishes.length} vérifiés (\${percentage}%)\`;
            document.getElementById('progress-fill').style.width = \`\${percentage}%\`;
        }

        function openModal(imageSrc) {
            document.getElementById('modal-image').src = imageSrc;
            document.getElementById('image-modal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('image-modal').classList.remove('active');
        }

        function exportJSON() {
            const report = {
                date: new Date().toISOString(),
                total: allDishes.length,
                statistics: {
                    confirmed: Object.values(validations).filter(v => v === 'CONFIRMED').length,
                    uncertain: Object.values(validations).filter(v => v === 'UNCERTAIN').length,
                    wrong_dish: Object.values(validations).filter(v => v === 'WRONG_DISH').length,
                    missing: Object.values(validations).filter(v => v === 'MISSING').length,
                    pending: allDishes.length - Object.keys(validations).length
                },
                dishes: allDishes.map(dish => ({
                    number: dish.number,
                    id: dish.id,
                    category: dish.category,
                    name: dish.name,
                    price: dish.price,
                    image: dish.image,
                    status: validations[dish.id] || 'PENDING'
                }))
            };
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`audit-menu-bizzart-\${new Date().toISOString().split('T')[0]}.json\`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function resetValidations() {
            if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les validations ?')) {
                validations = {};
                localStorage.removeItem('bizzart-menu-validations');
                renderDishes();
                updateStats();
            }
        }

        document.getElementById('search-input').addEventListener('input', renderDishes);
        document.getElementById('category-filter').addEventListener('change', renderDishes);
        document.getElementById('status-filter').addEventListener('change', renderDishes);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
        document.getElementById('image-modal').addEventListener('click', (e) => { if (e.target.id === 'image-modal') closeModal(); });

        loadValidations();
        renderDishes();
        updateStats();
    </script>
</body>
</html>`;
}

genererRapportAudit();
