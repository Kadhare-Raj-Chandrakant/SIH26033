import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extract() {
  try {
    // 1. Fetch categories
    const catRes = await fetch('http://localhost:4000/api/v1/categories');
    const catData = await catRes.json();
    console.log('Categories count:', catData.data?.length || catData.length);

    // 2. Fetch filter options
    const filterRes = await fetch('http://localhost:4000/api/v1/marketplace/products/filter-options');
    const filterData = await filterRes.json();
    console.log('States count:', filterData.data?.states?.length);

    // 3. Fetch products page by page
    let allProducts = [];
    let page = 1;
    while (true) {
      const res = await fetch(`http://localhost:4000/api/v1/marketplace/products?page=${page}&limit=50`);
      const data = await res.json();
      const items = data.data || [];
      if (!items.length) break;
      allProducts.push(...items);
      console.log(`Page ${page}: got ${items.length} items (total so far: ${allProducts.length})`);
      if (allProducts.length >= (data.meta?.total || 90)) break;
      page++;
    }

    const targetPath = path.join(__dirname, '../apps/web/src/lib/fallback-catalog.json');
    fs.writeFileSync(
      targetPath,
      JSON.stringify(
        {
          categories: catData.data || catData,
          filterOptions: filterData.data || filterData,
          products: allProducts,
        },
        null,
        2
      )
    );
    console.log(`Successfully wrote ${allProducts.length} products to ${targetPath}`);
  } catch (err) {
    console.error('Extraction failed:', err);
  }
}

extract();
