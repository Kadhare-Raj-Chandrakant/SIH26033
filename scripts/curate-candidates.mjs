import fs from 'fs';
import path from 'path';

const CROP_QUERIES = {
  'Rice': ['Category:Rice grains', 'Category:Rice varieties in India'],
  'Wheat': ['Category:Wheat grains', 'Category:Wheat fields'],
  'Maize': ['Category:Maize ears', 'Category:Corn kernels'],
  'Chickpea': ['Category:Cicer arietinum', 'Category:Chickpeas'],
  'Green Gram': ['Category:Vigna radiata'],
  'Black Gram': ['Category:Vigna mungo'],
  'Potato': ['Category:Potatoes', 'Category:Potato tubers'],
  'Onion': ['Category:Onions', 'Category:Red onions'],
  'Tomato': ['Category:Tomatoes'],
  'Mango': ['Category:Mangos', 'Category:Mangifera indica'],
  'Banana': ['Category:Bananas', 'Category:Banana bunches'],
  'Apple': ['Category:Apples', 'Category:Red apples'],
  'Soybean': ['Category:Soybeans', 'Category:Glycine max'],
  'Groundnut': ['Category:Peanuts', 'Category:Arachis hypogaea'],
  'Mustard': ['Category:Mustard seeds', 'Category:Brassica juncea'],
  'Turmeric': ['Category:Curcuma longa', 'Category:Turmeric'],
  'Dry Red Chilli': ['Category:Dried chili peppers', 'Category:Chili peppers in India'],
  'Cumin': ['Category:Cuminum cyminum'],
  'Cotton': ['Category:Cotton bolls', 'Category:Gossypium'],
  'Sugarcane': ['Category:Sugar canes'],
  'Jute': ['Category:Jute', 'Category:Corchorus'],
  'Tea Leaves': ['Category:Tea leaves', 'Category:Tea plantations'],
  'Coffee': ['Category:Coffee beans', 'Category:Coffea'],
  'Coconut': ['Category:Coconuts', 'Category:Cocos nucifera'],
  'Berseem': ['Category:Trifolium alexandrinum'],
  'Lucerne': ['Category:Medicago sativa'],
  'Fodder Maize': ['Category:Zea mays for silage', 'Category:Maize fields'],
  'Marigold': ['Category:Tagetes', 'Category:Tagetes erecta'],
  'Rose': ['Category:Rosa (flower)', 'Category:Garden roses'],
  'Ashwagandha': ['Category:Withania somnifera']
};

async function queryCategory(category) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(category)}&gcmtype=file&gcmlimit=25&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (dev@sih26033.org)' }
  });
  const data = await res.json();
  if (!data.query || !data.query.pages) return [];
  const files = [];
  for (const p of Object.values(data.query.pages)) {
    const info = p.imageinfo?.[0];
    if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png')) {
      const title = p.title;
      const lower = title.toLowerCase();
      // Filter out unwanted items
      if (
        lower.includes('map') ||
        lower.includes('icon') ||
        lower.includes('diagram') ||
        lower.includes('drawing') ||
        lower.includes('logo') ||
        lower.includes('herald') ||
        lower.includes('chart') ||
        lower.includes('distribution') ||
        lower.includes('postage') ||
        lower.includes('stamp') ||
        lower.includes('statue')
      ) {
        continue;
      }
      files.push({
        title: p.title,
        url: info.url,
        size: info.size
      });
    }
  }
  return files;
}

async function run() {
  const curated = {};
  for (const [crop, cats] of Object.entries(CROP_QUERIES)) {
    const list = [];
    const seen = new Set();
    for (const cat of cats) {
      const items = await queryCategory(cat);
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          list.push(item);
        }
      }
    }
    curated[crop] = list;
    console.log(`[${crop}]: ${list.length} clean items`);
    list.slice(0, 3).forEach((it, idx) => console.log(`   ${idx + 1}. ${it.title}`));
  }

  fs.writeFileSync('scripts/curated-candidates.json', JSON.stringify(curated, null, 2));
  console.log('Saved to scripts/curated-candidates.json');
}

run();
