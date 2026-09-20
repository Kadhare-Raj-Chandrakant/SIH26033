import fs from 'fs';

const CROP_QUERIES = {
  'Rice': ['File:Rice grains', 'File:Basmati rice', 'File:Paddy rice'],
  'Wheat': ['File:Wheat grains', 'File:Wheat ear', 'File:Wheat field'],
  'Maize': ['File:Corn on the cob', 'File:Maize ears', 'File:Corn cobs'],
  'Chickpea': ['File:Chickpeas', 'File:Raw chickpeas', 'File:Garbanzo beans'],
  'Green Gram': ['File:Mung bean', 'File:Green gram', 'File:Mung beans'],
  'Black Gram': ['File:Black gram', 'File:Urad dal', 'File:Vigna mungo'],
  'Potato': ['File:Potatoes', 'File:Potato tubers', 'File:Solanum tuberosum'],
  'Onion': ['File:Red onions', 'File:Onion bulbs', 'File:Fresh onions'],
  'Tomato': ['File:Ripe tomatoes', 'File:Red tomatoes', 'File:Tomatoes on vine'],
  'Mango': ['File:Ripe mangoes', 'File:Mango fruit', 'File:Mangifera indica fruit'],
  'Banana': ['File:Banana bunch', 'File:Ripe bananas', 'File:Fresh bananas'],
  'Apple': ['File:Red apples', 'File:Apple fruit', 'File:Harvested apples'],
  'Soybean': ['File:Soybeans', 'File:Soybean seeds', 'File:Glycine max seeds'],
  'Groundnut': ['File:Peanuts in shell', 'File:Groundnuts', 'File:Raw peanuts'],
  'Mustard': ['File:Mustard seeds', 'File:Mustard seed', 'File:Brassica juncea'],
  'Turmeric': ['File:Turmeric roots', 'File:Curcuma longa roots', 'File:Raw turmeric'],
  'Dry Red Chilli': ['File:Dried red chillies', 'File:Dried chili peppers', 'File:Red chili peppers drying'],
  'Cumin': ['File:Cumin seeds', 'File:Jeera seeds', 'File:Cuminum cyminum'],
  'Cotton': ['File:Cotton bolls', 'File:Raw cotton harvest', 'File:Gossypium bolls'],
  'Sugarcane': ['File:Sugarcane stalks', 'File:Sugarcane harvest', 'File:Sugarcane stems'],
  'Jute': ['File:Jute fibre', 'File:Jute plant', 'File:Corchorus capsularis'],
  'Tea Leaves': ['File:Fresh tea leaves', 'File:Green tea leaves', 'File:Tea leaves harvest'],
  'Coffee': ['File:Coffee beans', 'File:Roasted coffee beans', 'File:Coffee cherries'],
  'Coconut': ['File:Fresh coconut', 'File:Coconuts harvest', 'File:Brown coconuts'],
  'Berseem': ['File:Trifolium alexandrinum', 'File:Egyptian clover', 'File:Trifolium alexandrinum plant'],
  'Lucerne': ['File:Medicago sativa', 'File:Alfalfa hay', 'File:Medicago sativa flower'],
  'Fodder Maize': ['File:Maize silage', 'File:Forage maize', 'File:Corn field silage'],
  'Marigold': ['File:Marigold flower', 'File:Tagetes erecta', 'File:Orange marigold'],
  'Rose': ['File:Red rose flower', 'File:Garden rose flower', 'File:Pink rose flower'],
  'Ashwagandha': ['File:Withania somnifera', 'File:Ashwagandha', 'File:Ashvagandha']
};

async function searchSpecific(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033/1.0' } });
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  const clean = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png')) {
      const title = p.title.toLowerCase();
      if (
        title.includes('map') ||
        title.includes('icon') ||
        title.includes('flag') ||
        title.includes('church') ||
        title.includes('chapel') ||
        title.includes('monument') ||
        title.includes('politician') ||
        title.includes('portrait') ||
        title.includes('senate') ||
        title.includes('drawing') ||
        title.includes('stamp') ||
        title.includes('postage') ||
        title.includes('.svg')
      ) {
        continue;
      }
      clean.push({
        title: p.title,
        url: info.url,
        mime: info.mime,
        size: info.size
      });
    }
  }
  return clean;
}

async function run() {
  const results = {};
  for (const [crop, queries] of Object.entries(CROP_QUERIES)) {
    const list = [];
    const seen = new Set();
    for (const q of queries) {
      const items = await searchSpecific(q);
      for (const it of items) {
        if (!seen.has(it.url)) {
          seen.add(it.url);
          list.push(it);
        }
      }
    }
    results[crop] = list;
    console.log(`[${crop}]: ${list.length} items`);
    list.slice(0, 3).forEach((x, i) => console.log(`   ${i + 1}. ${x.title}`));
  }
  fs.writeFileSync('scripts/specific-produce-candidates.json', JSON.stringify(results, null, 2));
}

run();
