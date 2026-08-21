const https = require('https');
const fs = require('fs');

const mapping = JSON.parse(fs.readFileSync('cloudinary-category-images-mapping.json', 'utf8'));

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 'ERROR', ok: false }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', ok: false });
    });
  });
}

(async () => {
  console.log('━━━ VÉRIFICATION URLs CLOUDINARY ━━━\n');
  
  let ok = 0;
  let failed = 0;
  
  for (const item of mapping) {
    const result = await checkUrl(item.cloudinaryUrl);
    const status = result.ok ? '✅ 200 OK' : `❌ ${result.status}`;
    console.log(`${status}: ${item.categoryName}`);
    console.log(`   ${item.cloudinaryUrl}`);
    
    if (result.ok) ok++;
    else failed++;
  }
  
  console.log('\n━━━ RÉSUMÉ ━━━');
  console.log(`✅ OK: ${ok}/10`);
  console.log(`❌ Échecs: ${failed}/10`);
})();
