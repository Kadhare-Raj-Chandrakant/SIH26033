import fs from 'fs';
import path from 'path';

// 30 crops and targeted search queries / categories on Wikimedia Commons
const CROP_SEARCHES = {
  'Rice': ['File:Rice grains', 'Category:Rice grains', 'Category:Rice varieties in India'],
  'Wheat': ['Category:Wheat grains', 'File:Wheat field', 'Category:Wheat'],
  'Maize': ['Category:Maize ears', 'Category:Corn kernels', 'Category:Maize'],
  'Chickpea': ['Category:Cicer arietinum', 'File:Chickpeas', 'Category:Chickpeas'],
  'Green Gram': ['Category:Vigna radiata', 'File:Mung bean', 'File:Green gram'],
  'Black Gram': ['Category:Vigna mungo', 'File:Black gram', 'File:Urad dal'],
  'Potato': ['Category:Potatoes', 'Category:Potato tubers', 'File:Potatoes'],
  'Onion': ['Category:Onions', 'Category:Red onions', 'File:Onions'],
  'Tomato': ['Category:Tomatoes', 'Category:Red tomatoes', 'File:Tomatoes'],
  'Mango': ['Category:Mangos', 'Category:Mangifera indica', 'File:Mangoes'],
  'Banana': ['Category:Bananas', 'Category:Banana bunches', 'File:Bananas'],
  'Apple': ['Category:Apples', 'Category:Red apples', 'File:Apples'],
  'Soybean': ['Category:Soybeans', 'Category:Glycine max', 'File:Soybeans'],
  'Groundnut': ['Category:Peanuts', 'Category:Arachis hypogaea', 'File:Peanuts'],
  'Mustard': ['Category:Brassica juncea', 'Category:Mustard seeds', 'Category:Mustard fields'],
  'Turmeric': ['Category:Curcuma longa', 'File:Turmeric roots', 'Category:Turmeric'],
  'Dry Red Chilli': ['Category:Dried chili peppers', 'File:Dried red chillies', 'Category:Chili peppers'],
  'Cumin': ['Category:Cuminum cyminum', 'File:Cumin seeds', 'Category:Cumin'],
  'Cotton': ['Category:Cotton', 'Category:Gossypium', 'File:Cotton bolls'],
  'Sugarcane': ['Category:Sugar canes', 'Category:Saccharum officinarum', 'File:Sugarcane'],
  'Jute': ['Category:Jute', 'Category:Corchorus', 'File:Jute plant'],
  'Tea Leaves': ['Category:Tea leaves', 'Category:Tea plantations', 'File:Tea leaves'],
  'Coffee': ['Category:Coffee beans', 'Category:Coffea', 'File:Coffee cherries'],
  'Coconut': ['Category:Coconuts', 'Category:Cocos nucifera', 'File:Coconuts'],
  'Berseem': ['Category:Trifolium alexandrinum', 'File:Egyptian clover', 'Category:Trifolium'],
  'Lucerne': ['Category:Medicago sativa', 'File:Alfalfa', 'Category:Alfalfa'],
  'Fodder Maize': ['Category:Zea mays for silage', 'File:Forage maize', 'File:Corn silage'],
  'Marigold': ['Category:Tagetes', 'Category:Tagetes erecta', 'File:Marigold flower'],
  'Rose': ['Category:Garden roses', 'Category:Rosa (flower)', 'File:Red rose'],
  'Ashwagandha': ['Category:Withania somnifera', 'File:Ashwagandha', 'File:Withania somnifera']
};

async function queryWikimedia(searchTerms) {
  const candidates = [];
  for (const term of searchTerms) {
    let url;
    if (term.startsWith('Category:')) {
      url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(term)}&gcmtype=file&gcmlimit=15&prop=imageinfo&iiprop=url|mime|size|extmetadata&format=json`;
    } else {
      url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|size|extmetadata&format=json`;
    }

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (dev@sih26033.org)' }
      });
      const data = await res.json();
      if (!data.query || !data.query.pages) continue;
      for (const page of Object.values(data.query.pages)) {
        const info = page.imageinfo?.[0];
        if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png' || info.mime === 'image/webp')) {
          const title = page.title.toLowerCase();
          // Filter out obvious unwanted files: maps, coat of arms, flags, buildings, humans, books, diagrams
          if (
            title.includes('map') ||
            title.includes('flag') ||
            title.includes('coat_of_arms') ||
            title.includes('logo') ||
            title.includes('diagram') ||
            title.includes('church') ||
            title.includes('chapel') ||
            title.includes('statue') ||
            title.includes('monument') ||
            title.includes('portrait')
          ) {
            continue;
          }
          if (info.width >= 400 && info.height >= 300 && info.size < 15000000) {
            candidates.push({
              title: page.title,
              url: info.url,
              mime: info.mime,
              width: info.width,
              height: info.height,
              size: info.size
            });
          }
        }
      }
    } catch (e) {
      console.error(`Error querying ${term}:`, e.message);
    }
  }
  return candidates;
}

async function run() {
  const summary = {};
  for (const [crop, searches] of Object.entries(CROP_SEARCHES)) {
    const images = await queryWikimedia(searches);
    // Deduplicate by URL
    const unique = [];
    const seen = new Set();
    for (const img of images) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        unique.push(img);
      }
    }
    summary[crop] = unique.length;
    console.log(`[${crop}]: ${unique.length} candidates found`);
    if (unique.length < 3) {
      console.warn(`⚠️ WARNING: ${crop} has only ${unique.length} candidates!`);
    }
  }
  console.log('Done scanning.');
}

run();
