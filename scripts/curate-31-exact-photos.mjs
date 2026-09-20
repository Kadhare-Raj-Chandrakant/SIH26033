import fs from 'fs';

// Specific high-precision search queries for each of the 31 listings
const TARGET_SEARCHES = [
  // 1. Ashwagandha Farm 2 & 3
  {
    crop: 'Ashwagandha', farm: 2, slug: 'ashwagandha',
    queries: ['Withania somnifera plant', 'Withania somnifera green', 'Withania somnifera shrub']
  },
  {
    crop: 'Ashwagandha', farm: 3, slug: 'ashwagandha',
    queries: ['Withania somnifera root', 'Ashwagandha roots', 'Withania somnifera dry']
  },

  // 2. Marigold Farm 1
  {
    crop: 'Marigold', farm: 1, slug: 'marigold',
    queries: ['Tagetes patula flower fresh', 'Orange marigold flower bloom', 'Tagetes erecta yellow']
  },

  // 3. Fodder Maize Farm 1 & 2
  {
    crop: 'Fodder Maize', farm: 1, slug: 'fodder-maize',
    queries: ['Silage maize green field', 'Forage maize crop', 'Green corn field agriculture']
  },
  {
    crop: 'Fodder Maize', farm: 2, slug: 'fodder-maize',
    queries: ['Zea mays field green', 'Corn fodder field', 'Maize plant field']
  },

  // 4. Lucerne Farm 3
  {
    crop: 'Lucerne', farm: 3, slug: 'lucerne',
    queries: ['Medicago sativa field green', 'Alfalfa crop field', 'Medicago sativa forage']
  },

  // 5. Berseem Farm 2
  {
    crop: 'Berseem', farm: 2, slug: 'berseem',
    queries: ['Trifolium alexandrinum plant', 'Egyptian clover green', 'Berseem clover field']
  },

  // 6. Coconut Farm 2 & 3
  {
    crop: 'Coconut', farm: 2, slug: 'coconut',
    queries: ['Green coconuts harvest pile', 'Tender coconuts market', 'Cocos nucifera green fruit']
  },
  {
    crop: 'Coconut', farm: 3, slug: 'coconut',
    queries: ['Brown coconuts heap market', 'Harvested coconuts pile', 'Coconuts in shell market']
  },

  // 7. Coffee Farm 1
  {
    crop: 'Coffee', farm: 1, slug: 'coffee',
    queries: ['Coffee cherries ripe branch', 'Red coffee cherries harvest', 'Coffea arabica ripe berries']
  },

  // 8. Jute Farm 3
  {
    crop: 'Jute', farm: 3, slug: 'jute',
    queries: ['Raw jute fibre bundles', 'Jute harvest drying', 'Corchorus capsularis plant field']
  },

  // 9. Sugarcane Farm 2
  {
    crop: 'Sugarcane', farm: 2, slug: 'sugarcane',
    queries: ['Sugarcane stalks harvest pile', 'Harvested sugarcane bundle', 'Saccharum officinarum stalks']
  },

  // 10. Turmeric Farm 1 & 2
  {
    crop: 'Turmeric', farm: 1, slug: 'turmeric',
    queries: ['Curcuma longa fresh roots', 'Raw turmeric rhizomes', 'Turmeric rhizomes pile']
  },
  {
    crop: 'Turmeric', farm: 2, slug: 'turmeric',
    queries: ['Fresh turmeric fingers market', 'Curcuma longa rhizome harvest', 'Raw turmeric root']
  },

  // 11. Mustard Farm 1, 2, 3
  {
    crop: 'Mustard', farm: 1, slug: 'mustard',
    queries: ['Yellow mustard seeds in bowl', 'Sinapis alba seeds', 'Mustard seeds yellow']
  },
  {
    crop: 'Mustard', farm: 2, slug: 'mustard',
    queries: ['Brown mustard seeds bowl', 'Brassica juncea seeds', 'Mustard seeds brown']
  },
  {
    crop: 'Mustard', farm: 3, slug: 'mustard',
    queries: ['Brassica napus flowering field', 'Mustard yellow flowers field', 'Mustard crop field bloom']
  },

  // 12. Groundnut Farm 2
  {
    crop: 'Groundnut', farm: 2, slug: 'groundnut',
    queries: ['Raw peanuts in shell pile', 'Groundnuts in shell market', 'Arachis hypogaea pods']
  },

  // 13. Soybean Farm 1
  {
    crop: 'Soybean', farm: 1, slug: 'soybean',
    queries: ['Dry soybeans in bowl', 'Soybean seeds harvest', 'Glycine max seeds heap']
  },

  // 14. Apple Farm 1 & 2
  {
    crop: 'Apple', farm: 1, slug: 'apple',
    queries: ['Red apples in crate', 'Red delicious apples harvest', 'Fresh red apples in basket']
  },
  {
    crop: 'Apple', farm: 2, slug: 'apple',
    queries: ['Crisp red apples pile', 'Harvested red apples market', 'Red apples wooden box']
  },

  // 15. Banana Farm 1, 2, 3
  {
    crop: 'Banana', farm: 1, slug: 'banana',
    queries: ['Ripe yellow bananas bunch market', 'Musa acuminata bananas bunch', 'Fresh yellow bananas']
  },
  {
    crop: 'Banana', farm: 2, slug: 'banana',
    queries: ['Green and yellow bananas bunch', 'Bananas hanging stalk tree', 'Fresh bananas market stall']
  },
  {
    crop: 'Banana', farm: 3, slug: 'banana',
    queries: ['Cavendish bananas bunch fresh', 'Ripe bananas market display', 'Organic bananas bunch']
  },

  // 16. Tomato Farm 1, 2, 3
  {
    crop: 'Tomato', farm: 1, slug: 'tomato',
    queries: ['Fresh red tomatoes crate', 'Ripe red tomatoes in wooden crate', 'Tomatoes harvest box']
  },
  {
    crop: 'Tomato', farm: 2, slug: 'tomato',
    queries: ['Vine ripe red tomatoes basket', 'Red tomatoes on the vine fresh', 'Fresh red tomatoes market']
  },
  {
    crop: 'Tomato', farm: 3, slug: 'tomato',
    queries: ['Plum tomatoes harvest crate', 'Cherry tomatoes in basket red', 'Fresh tomatoes pile market']
  },

  // 17. Black Gram Farm 3
  {
    crop: 'Black Gram', farm: 3, slug: 'black-gram',
    queries: ['Whole black gram urad seeds', 'Vigna mungo black seeds bowl', 'Raw black gram beans']
  },

  // 18. Green Gram Farm 2
  {
    crop: 'Green Gram', farm: 2, slug: 'green-gram',
    queries: ['Mung beans in bowl raw', 'Vigna radiata green seeds', 'Whole green gram moong']
  },

  // 19. Maize Farm 2
  {
    crop: 'Maize', farm: 2, slug: 'maize',
    queries: ['Fresh yellow corn on the cob husk', 'Sweet corn ears basket', 'Yellow maize cobs harvest']
  },

  // 20. Rice Farm 3
  {
    crop: 'Rice', farm: 3, slug: 'rice',
    queries: ['Raw paddy grains golden harvest', 'Unmilled paddy rice grain', 'Paddy seeds Oryza sativa']
  },
];

async function searchWikimedia(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|mime|size|dimensions&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (student@sih2026.gov.in)' } });
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
        // Disqualify diagrams, charts, coins, stamps, portraits, drawings, cooked recipes, ruler measurements
        const badKeywords = [
          'chart', 'graph', 'diagram', 'map', 'icon', 'flag', 'stamp', 'postage', 'logo',
          'coin', 'currency', 'ruler', 'inch', '27 cm', 'cm banana', 'beach', 'museum', 'portrait',
          'person', 'statue', 'monument', 'painting', 'drawing', 'illustration', 'sugar',
          'cooked', 'recipe', 'soup', 'pancake', 'khanom', 'vada', 'curry', 'dish', 'plate',
          'assortment', 'canadian apple production', 'köhler', 'specimen', '.svg'
        ];
        if (badKeywords.some(bk => title.includes(bk))) return false;
        if (info.width && info.width < 500) return false;
        if (info.height && info.height < 400) return false;
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
  console.log('Searching precision candidates for all 31 listings...');
  const resolvedTitles = JSON.parse(fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8'));
  const usedTitles = new Set();
  for (const item of resolvedTitles) {
    const isTarget = TARGET_SEARCHES.some(t => t.crop.toLowerCase() === item.crop.toLowerCase() && t.farm === item.slot);
    if (!isTarget) {
      usedTitles.add(item.title.toLowerCase());
    }
  }

  const selections = [];

  for (let i = 0; i < TARGET_SEARCHES.length; i++) {
    const item = TARGET_SEARCHES[i];
    let candidate = null;

    for (const q of item.queries) {
      const results = await searchWikimedia(q);
      for (const r of results) {
        const titleLower = r.title.toLowerCase();
        if (!usedTitles.has(titleLower)) {
          candidate = r;
          usedTitles.add(titleLower);
          break;
        }
      }
      if (candidate) break;
      await new Promise(r => setTimeout(r, 150));
    }

    if (candidate) {
      selections.push({
        crop: item.crop,
        farm: item.farm,
        slug: item.slug,
        slot: item.farm,
        title: candidate.title,
        url: candidate.url,
        width: candidate.width,
        height: candidate.height,
        size: candidate.size,
      });
      console.log(`[${i + 1}/31] ✓ ${item.crop} Farm ${item.farm} -> ${candidate.title} (${candidate.width}x${candidate.height})`);
    } else {
      console.log(`[${i + 1}/31] ❌ NO MATCH for ${item.crop} Farm ${item.farm}`);
    }
  }

  fs.writeFileSync('scripts/precision-31-replacements.json', JSON.stringify(selections, null, 2));
  console.log(`\nSuccessfully selected ${selections.length} / 31 precision replacements.`);
}

run();
