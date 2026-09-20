import fs from 'fs';

const TARGET_NEEDS = [
  { crop: 'Ashwagandha', farm: 2, slug: 'ashwagandha', slot: 2, query: 'Withania somnifera plant' },
  { crop: 'Ashwagandha', farm: 3, slug: 'ashwagandha', slot: 3, query: 'Withania somnifera root' },
  { crop: 'Marigold', farm: 1, slug: 'marigold', slot: 1, query: 'Tagetes patula flower' },
  { crop: 'Fodder Maize', farm: 1, slug: 'fodder-maize', slot: 1, query: 'Forage maize' },
  { crop: 'Fodder Maize', farm: 2, slug: 'fodder-maize', slot: 2, query: 'Zea mays green field' },
  { crop: 'Lucerne', farm: 3, slug: 'lucerne', slot: 3, query: 'Medicago sativa alfalfa field' },
  { crop: 'Berseem', farm: 2, slug: 'berseem', slot: 2, query: 'Trifolium alexandrinum clover' },
  { crop: 'Coconut', farm: 2, slug: 'coconut', slot: 2, query: 'Cocos nucifera green coconut' },
  { crop: 'Coconut', farm: 3, slug: 'coconut', slot: 3, query: 'Brown coconuts pile' },
  { crop: 'Coffee', farm: 1, slug: 'coffee', slot: 1, query: 'Coffee cherries red ripe' },
  { crop: 'Jute', farm: 3, slug: 'jute', slot: 3, query: 'Corchorus capsularis jute fibre' },
  { crop: 'Sugarcane', farm: 2, slug: 'sugarcane', slot: 2, query: 'Saccharum officinarum sugarcane stalks' },
  { crop: 'Turmeric', farm: 1, slug: 'turmeric', slot: 1, query: 'Curcuma longa fresh rhizome' },
  { crop: 'Turmeric', farm: 2, slug: 'turmeric', slot: 2, query: 'Raw turmeric roots pile' },
  { crop: 'Mustard', farm: 1, slug: 'mustard', slot: 1, query: 'Yellow mustard seeds' },
  { crop: 'Mustard', farm: 2, slug: 'mustard', slot: 2, query: 'Brown mustard seeds' },
  { crop: 'Mustard', farm: 3, slug: 'mustard', slot: 3, query: 'Brassica field yellow flowers' },
  { crop: 'Groundnut', farm: 2, slug: 'groundnut', slot: 2, query: 'Arachis hypogaea in shell peanuts' },
  { crop: 'Soybean', farm: 1, slug: 'soybean', slot: 1, query: 'Glycine max dried soybeans' },
  { crop: 'Apple', farm: 1, slug: 'apple', slot: 1, query: 'Fresh red apples crate' },
  { crop: 'Apple', farm: 2, slug: 'apple', slot: 2, query: 'Red delicious apples harvest' },
  { crop: 'Banana', farm: 1, slug: 'banana', slot: 1, query: 'Ripe yellow bananas bunch' },
  { crop: 'Banana', farm: 2, slug: 'banana', slot: 2, query: 'Musa cavendish fresh bananas' },
  { crop: 'Banana', farm: 3, slug: 'banana', slot: 3, query: 'Green and yellow bananas' },
  { crop: 'Tomato', farm: 1, slug: 'tomato', slot: 1, query: 'Fresh red ripe tomatoes basket' },
  { crop: 'Tomato', farm: 2, slug: 'tomato', slot: 2, query: 'Solanum lycopersicum red tomatoes vine' },
  { crop: 'Tomato', farm: 3, slug: 'tomato', slot: 3, query: 'Cherry tomatoes fresh harvest crate' },
  { crop: 'Black Gram', farm: 3, slug: 'black-gram', slot: 3, query: 'Vigna mungo whole black gram' },
  { crop: 'Green Gram', farm: 2, slug: 'green-gram', slot: 2, query: 'Vigna radiata mung beans whole' },
  { crop: 'Maize', farm: 2, slug: 'maize', slot: 2, query: 'Fresh corn cobs with husk' },
  { crop: 'Rice', farm: 3, slug: 'rice', slot: 3, query: 'Oryza sativa raw paddy grains' },
];

async function searchWikimedia(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime|size|dimensions&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceFinder/1.0 (contact@sih2026.gov.in)' } });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    return pages
      .filter(p => {
        const info = p.imageinfo?.[0];
        if (!info) return false;
        const mime = info.mime || '';
        if (mime !== 'image/jpeg' && mime !== 'image/png') return false;
        const title = (p.title || '').toLowerCase();
        // Disqualify charts, maps, portraits, postage, rulers/measurements
        if (
          title.includes('chart') || title.includes('graph') || title.includes('diagram') ||
          title.includes('map') || title.includes('icon') || title.includes('flag') ||
          title.includes('stamp') || title.includes('postage') || title.includes('logo') ||
          title.includes('inch') || title.includes('27 cm') || title.includes('ruler') ||
          title.includes('beach') || title.includes('museum') || title.includes('portrait') ||
          title.includes('person') || title.includes('sugar') || title.includes('cooked') ||
          title.includes('.svg')
        ) return false;
        // Require decent dimensions
        if (info.width && info.width < 400) return false;
        if (info.height && info.height < 300) return false;
        return true;
      })
      .map(p => ({
        title: p.title,
        url: p.imageinfo[0].url,
        width: p.imageinfo[0].width,
        height: p.imageinfo[0].height,
        size: p.imageinfo[0].size,
      }));
  } catch (err) {
    return [];
  }
}

async function run() {
  console.log(`Searching replacement images for ${TARGET_NEEDS.length} listings...`);
  const candidates = [];

  for (let i = 0; i < TARGET_NEEDS.length; i++) {
    const item = TARGET_NEEDS[i];
    console.log(`[${i + 1}/${TARGET_NEEDS.length}] Searching for ${item.crop} Farm ${item.farm} (query: "${item.query}")...`);
    let results = await searchWikimedia(item.query);
    if (results.length === 0) {
      // Fallback query
      results = await searchWikimedia(item.crop);
    }
    console.log(`  Found ${results.length} candidates.`);
    candidates.push({
      ...item,
      results,
    });
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync('scripts/replacement-candidates.json', JSON.stringify(candidates, null, 2));
  console.log('Saved candidates to scripts/replacement-candidates.json');
}

run();
