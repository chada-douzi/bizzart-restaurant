// PHASE 3 — FORENSIC INVENTORY SOURCE
// ULTRA-STRICT READ-ONLY ANALYSIS
// MIGRATION_WRITE_ENABLED = FALSE

const mongoUri = 'mongodb://localhost:27017/bizzart';
db = connect(mongoUri);

print('=== PHASE 3 FORENSIC INVENTORY ===\n');

// 3.3 — COLLECTION FORENSIC INVENTORY
print('---COLLECTIONS_START---');
const collections = db.getCollectionNames();
collections.forEach(colName => {
    print(`COLLECTION:${colName}`);
    
    const stats = db.getCollection(colName).stats();
    print(`  COUNT:${stats.count}`);
    print(`  SIZE:${stats.size}`);
    print(`  AVG_SIZE:${stats.avgObjSize || 0}`);
    print(`  STORAGE_SIZE:${stats.storageSize}`);
    print(`  CAPPED:${stats.capped || false}`);
    
    // Indexes
    const indexes = db.getCollection(colName).getIndexes();
    print(`  INDEXES_COUNT:${indexes.length}`);
    indexes.forEach(idx => {
        print(`  INDEX:${idx.name}|${JSON.stringify(idx.key)}|unique=${idx.unique || false}|sparse=${idx.sparse || false}`);
    });
    
    print(`---`);
});
print('---COLLECTIONS_END---\n');

// 3.4 — DOCUMENT SHAPE ANALYSIS
print('---DOCUMENT_SHAPE_START---');
collections.forEach(colName => {
    const col = db.getCollection(colName);
    const count = col.countDocuments();
    
    if (count > 0) {
        print(`SHAPE:${colName}`);
        
        // Sample documents
        const sample = col.findOne();
        if (sample) {
            const fields = Object.keys(sample);
            print(`  FIELDS:${fields.join(',')}`);
            
            // Analyze field types
            fields.forEach(field => {
                const value = sample[field];
                let type = typeof value;
                if (value === null) type = 'null';
                else if (value instanceof Date) type = 'date';
                else if (value instanceof ObjectId) type = 'ObjectId';
                else if (Array.isArray(value)) type = 'array';
                
                print(`  FIELD_TYPE:${field}=${type}`);
            });
        }
        
        print(`---`);
    }
});
print('---DOCUMENT_SHAPE_END---\n');

// 3.6 — REFERENCE FORENSICS
print('---REFERENCES_START---');

// Check for common reference patterns
['menuitems', 'menuItems'].forEach(itemCol => {
    if (collections.includes(itemCol)) {
        const items = db.getCollection(itemCol).find().limit(10).toArray();
        items.forEach(item => {
            if (item.category || item.categoryId) {
                const refField = item.category ? 'category' : 'categoryId';
                const refValue = item[refField];
                print(`REF:${itemCol}.${refField} -> menucategories (${refValue})`);
            }
        });
    }
});

print('---REFERENCES_END---\n');

// 3.7 — DATA QUALITY AUDIT
print('---DATA_QUALITY_START---');

collections.forEach(colName => {
    const col = db.getCollection(colName);
    const count = col.countDocuments();
    
    if (count > 0) {
        print(`QUALITY:${colName}`);
        
        // Check for documents without _id (should not exist)
        const noId = col.countDocuments({ _id: { $exists: false } });
        if (noId > 0) {
            print(`  ANOMALY:CRITICAL|missing_id=${noId}`);
        }
        
        // Check for null critical fields (example patterns)
        if (colName.match(/item|menu/i)) {
            const noName = col.countDocuments({ name: { $in: [null, ''] } });
            if (noName > 0) {
                print(`  ANOMALY:HIGH|missing_name=${noName}`);
            }
            
            const noPrice = col.countDocuments({ price: { $in: [null, undefined] } });
            if (noPrice > 0) {
                print(`  ANOMALY:MEDIUM|missing_price=${noPrice}`);
            }
        }
        
        print(`---`);
    }
});

print('---DATA_QUALITY_END---\n');

// 3.8 — MENU FORENSIC INVENTORY
print('---MENU_FORENSIC_START---');

['menucategories', 'menuCategories', 'categories'].forEach(catCol => {
    if (collections.includes(catCol)) {
        print(`MENU_CATEGORIES:${catCol}`);
        const categories = db.getCollection(catCol).find().toArray();
        categories.forEach(cat => {
            print(`  CAT_ID:${cat._id}|name=${cat.name}|slug=${cat.slug || 'N/A'}|order=${cat.displayOrder || cat.order || 'N/A'}`);
        });
    }
});

['menuitems', 'menuItems', 'dishes'].forEach(itemCol => {
    if (collections.includes(itemCol)) {
        print(`MENU_ITEMS:${itemCol}`);
        const items = db.getCollection(itemCol).find().limit(20).toArray();
        items.forEach(item => {
            const catRef = item.category || item.categoryId || 'N/A';
            const photoRef = item.image || item.photo || item.photoUrl || 'N/A';
            print(`  ITEM_ID:${item._id}|name=${item.name}|category=${catRef}|price=${item.price}|photo=${photoRef}`);
        });
    }
});

print('---MENU_FORENSIC_END---\n');

// 3.9 — PHOTO/CLOUDINARY FORENSICS
print('---PHOTO_FORENSIC_START---');

['menuitems', 'menuItems', 'media', 'gallery'].forEach(col => {
    if (collections.includes(col)) {
        const docs = db.getCollection(col).find().toArray();
        docs.forEach(doc => {
            // Check for image/photo fields
            ['image', 'photo', 'photoUrl', 'imageUrl', 'cloudinaryPublicId', 'publicId'].forEach(field => {
                if (doc[field]) {
                    print(`PHOTO:${col}|doc=${doc._id}|field=${field}|value=${doc[field]}`);
                }
            });
        });
    }
});

print('---PHOTO_FORENSIC_END---\n');

print('=== PHASE 3 FORENSIC INVENTORY COMPLETE ===');
