import fs from 'fs';

// Helper to query Wikimedia Commons with high precision
async function getTopPhotos(searchTerm, excludeWords = []) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|size|dimensions&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceCurator/2.0 (agri@sih2026.gov.in)' } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .filter(p => {
      const info = p.imageinfo?.[0];
      if (!info || (info.mime !== 'image/jpeg' && info.mime !== 'image/png')) return false;
      const title = (p.title || '').toLowerCase();
      const genericExcludes = [
        'map', 'flag', 'icon', 'logo', 'stamp', 'chart', 'graph', 'diagram',
        'portrait', 'person', 'people', 'drawing', 'painting', 'illustration',
        'currency', 'coin', 'ruler', 'cm', 'inch', 'recipe', 'soup', 'dish',
        'curry', 'book', 'plate', 'car', 'building', 'street', '.svg'
      ];
      if (genericExcludes.some(w => title.includes(w))) return false;
      if (excludeWords.some(w => title.includes(w.toLowerCase()))) return false;
      if (info.width < 600 || info.height < 400) return false;
      return true;
    })
    .map(p => ({
      title: p.title,
      url: p.imageinfo[0].url,
      width: p.imageinfo[0].width,
      height: p.imageinfo[0].height,
      size: p.imageinfo[0].size,
    }));
}

const ITEMS_TO_FIND = {
  'Ashwagandha_Farm_2': { query: 'Withania somnifera plant', exclude: ['root', 'seed'] },
  'Ashwagandha_Farm_3': { query: 'Withania somnifera roots', exclude: ['plant'] },
  'Marigold_Farm_1': { query: 'Orange marigold flowers', exclude: ['garland', 'temple'] },
  'Fodder_Maize_Farm_1': { query: 'Forage maize field green', exclude: ['book', '1879', 'vintage'] },
  'Fodder_Maize_Farm_2': { query: 'Corn field green agriculture', exclude: ['farmer', 'african'] },
  'Lucerne_Farm_3': { query: 'Medicago sativa alfalfa field green', exclude: ['drawing', 'flower close'] },
  'Berseem_Farm_2': { query: 'Trifolium alexandrinum berseem clover', exclude: ['drawing'] },
  'Coconut_Farm_2': { query: 'Fresh green coconuts tender', exclude: ['beach', 'palm tree far'] },
  'Coconut_Farm_3': { query: 'Brown coconuts heap pile market', exclude: ['hairpin', 'craft', 'shell'] },
  'Coffee_Farm_1': { query: 'Coffee cherries ripe red on tree', exclude: ['roasted', 'cup', 'mug'] },
  'Jute_Farm_3': { query: 'Raw jute fiber bundle harvest', exclude: ['museum', 'portrait', 'person'] },
  'Sugarcane_Farm_2': { query: 'Sugarcane stalks harvest pile cut', exclude: ['sugar', 'juice', 'bowl'] },
  'Turmeric_Farm_1': { query: 'Raw turmeric rhizomes fresh root', exclude: ['powder', 'curry'] },
  'Turmeric_Farm_2': { query: 'Fresh turmeric roots harvest pile', exclude: ['drawing', 'köhler'] },
  'Mustard_Farm_1': { query: 'Yellow mustard seeds bowl', exclude: ['sauce', 'paste'] },
  'Mustard_Farm_2': { query: 'Brown mustard seeds Brassica juncea', exclude: ['sauce', 'paste'] },
  'Mustard_Farm_3': { query: 'Yellow mustard field flowers blooming', exclude: ['macro single'] },
  'Groundnut_Farm_2': { query: 'Raw peanuts in shell groundnuts pile', exclude: ['roasted', 'fried', 'chart'] },
  'Soybean_Farm_1': { query: 'Dry harvested soybeans grain bowl', exclude: ['field distant', 'chart'] },
  'Apple_Farm_1': { query: 'Fresh red apples in crate', exclude: ['orange', 'assortment', 'salad'] },
  'Apple_Farm_2': { query: 'Red apples heap basket market', exclude: ['chart', 'tree distant'] },
  'Banana_Farm_1': { query: 'Ripe yellow bananas bunch fresh', exclude: ['ruler', 'inch', 'vendor portrait'] },
  'Banana_Farm_2': { query: 'Fresh green bananas bunch hanging', exclude: ['ruler', 'inch'] },
  'Banana_Farm_3': { query: 'Cavendish bananas market pile bunch', exclude: ['pancake', 'smoothie'] },
  'Tomato_Farm_1': { query: 'Ripe red tomatoes in wooden crate', exclude: ['landscape', 'street', 'pasta'] },
  'Tomato_Farm_2': { query: 'Fresh red vine tomatoes basket harvest', exclude: ['soup', 'sauce'] },
  'Tomato_Farm_3': { query: 'Red plum tomatoes harvest fresh', exclude: ['pizza', 'salad'] },
  'Black_Gram_Farm_3': { query: 'Whole black gram urad seeds Vigna mungo', exclude: ['vada', 'dosa', 'dal split', 'coffee'] },
  'Green_Gram_Farm_2': { query: 'Whole green mung beans seeds raw bowl', exclude: ['sprout salad', 'curry'] },
  'Maize_Farm_2': { query: 'Fresh yellow sweet corn cobs harvest husk', exclude: ['flour', 'popcorn'] },
  'Rice_Farm_3': { query: 'Paddy rice golden grains harvest raw', exclude: ['cooked', 'boiled', 'plate', 'bowl cooked'] },
};

async function run() {
  const finalChoices = {};
  for (const [key, config] of Object.entries(ITEMS_TO_FIND)) {
    console.log(`Searching for ${key}...`);
    const results = await getTopPhotos(config.query, config.exclude);
    console.log(`  Found ${results.length} valid images.`);
    finalChoices[key] = results;
    await new Promise(r => setTimeout(r, 200));
  }
  fs.writeFileSync('scripts/high-precision-candidates.json', JSON.stringify(finalChoices, null, 2));
  console.log('Saved high-precision candidates to scripts/high-precision-candidates.json');
}

run();
