import fs from 'fs';
import path from 'path';

// Let's load the current 90 listings
const current90 = JSON.parse(fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8'));

// The 31 target pairs from the user:
// - Ashwagandha — Farms 2 and 3
// - Marigold — Farm 1
// - Fodder Maize — Farms 1 and 2
// - Lucerne — Farm 3
// - Berseem — Farm 2
// - Coconut — Farms 2 and 3
// - Coffee — Farm 1
// - Jute — Farm 3
// - Sugarcane — Farm 2
// - Turmeric — Farms 1 and 2
// - Mustard — Farms 1, 2, and 3
// - Groundnut — Farm 2
// - Soybean — Farm 1
// - Apple — Farms 1 and 2
// - Banana — Farms 1, 2, and 3
// - Tomato — Farms 1, 2, and 3
// - Black Gram — Farm 3
// - Green Gram — Farm 2
// - Maize — Farm 2
// - Rice — Farm 3

const TARGET_KEYS = new Set([
  'ashwagandha-2', 'ashwagandha-3',
  'marigold-1',
  'fodder-maize-1', 'fodder-maize-2',
  'lucerne-3',
  'berseem-2',
  'coconut-2', 'coconut-3',
  'coffee-1',
  'jute-3',
  'sugarcane-2',
  'turmeric-1', 'turmeric-2',
  'mustard-1', 'mustard-2', 'mustard-3',
  'groundnut-2',
  'soybean-1',
  'apple-1', 'apple-2',
  'banana-1', 'banana-2', 'banana-3',
  'tomato-1', 'tomato-2', 'tomato-3',
  'black-gram-3',
  'green-gram-2',
  'maize-2',
  'rice-3'
]);

// Titles currently used by the 59 UNTOUCHED listings:
const preservedTitles = new Set();
current90.forEach(item => {
  const key = `${item.slug}-${item.slot}`;
  if (!TARGET_KEYS.has(key)) {
    preservedTitles.add(item.title.toLowerCase());
  }
});

console.log(`Preserved untouched listings: ${preservedTitles.size}`);

// Pre-curated candidate titles for each of the 31 target pairs:
const CANDIDATE_MAP = {
  'ashwagandha-2': [
    'File:Withania somnifera MHNT.BOT.2012.10.13.jpg',
    'File:Withania somnifera (Ashwagandha) in Hyderabad, W IMG 9625.jpg'
  ],
  'ashwagandha-3': [
    'File:Ashwagandha (Odia ଅଶ୍ବଗନ୍ଧା) (30703669187).jpg',
    'File:Withania somnifera (Ashwagandha) in Hyderabad, W IMG 9624.jpg'
  ],
  'marigold-1': [
    'File:African Marigold (405632987).jpg',
    'File:French marigold Tagetes patula.jpg',
    'File:Tagetes erecta 02.jpg'
  ],
  'fodder-maize-1': [
    'File:Dent Corn \'Oaxacan Green\' (Zea mays) MHNT 2.jpg',
    'File:Green fodder.jpg'
  ],
  'fodder-maize-2': [
    'File:Green fodder.jpg',
    'File:The ensilage of maize, and other green fodder crops (1879) (14595588039).jpg',
    'File:Field of maize in early August.jpg'
  ],
  'lucerne-3': [
    'File:Medicago sativa 0680.JPG',
    'File:Medicago sativa SKFabaceae.jpg',
    'File:Medicago sativa field at Beijing.jpg'
  ],
  'berseem-2': [
    'File:Trifolium alexandrinum plant Tocal legume trial 2.jpg',
    'File:Trifolium alexandrinum leaf Tocal legume trial 2.jpg',
    'File:Trifolium alexandrinum sl1.jpg'
  ],
  'coconut-2': [
    'File:Tender Coconut seller in Kannur market.jpg',
    'File:Coconut (Cocos nucifera).JPG',
    'File:Green coconuts in Kerala.jpg'
  ],
  'coconut-3': [
    'File:2013-01-24 18-09-34-Coconut-10f.jpg',
    'File:Hairpin coconut shells Baclayon13.jpg',
    'File:Coconut at market.jpg'
  ],
  'coffee-1': [
    'File:Hand holding coffee cherries.jpg',
    'File:Coffee-cherries-green-coffee-tarrazu-costa-rica.jpg',
    'File:Coffee cherries on white background.png'
  ],
  'jute-3': [
    'File:Patterns of jute in water.jpg',
    'File:Koshta (Bengali- কোष्टा) (2958595100).jpg',
    'File:Corchorus capsularis1228.jpg'
  ],
  'sugarcane-2': [
    'File:Starr 070206-4144 Saccharum officinarum.jpg',
    'File:Sugarcane (Saccharum) (2858289624).jpg',
    'File:USDA Sugarcane Research Unit, Houma Louisiana, December 2021 03.jpg'
  ],
  'turmeric-1': [
    'File:Curcuma longa roots.jpg',
    'File:Turmeric rhizomes.jpg'
  ],
  'turmeric-2': [
    'File:Starr-170114-6480-Curcuma longa-harvest-Hawea Pl Olinda-Maui (32344662501).jpg',
    'File:Starr-170114-6479-Curcuma longa-harvest-Hawea Pl Olinda-Maui (31654308183).jpg',
    'File:Turmeric (Curcuma longa) 1.jpg'
  ],
  'mustard-1': [
    'File:Sinapis alba graines.JPG'
  ],
  'mustard-2': [
    'File:BrownMustardSeed.JPG',
    'File:Senf-Variationen.jpg'
  ],
  'mustard-3': [
    'File:Rapsfeld Rapeseed Brassica napus.jpg',
    'File:A view of mustard seed.jpg',
    'File:Mustard Seeds.JPG'
  ],
  'groundnut-2': [
    'File:Arachis hypogaea - Peanuts in shell.jpg',
    'File:Fresh Peanuts.jpg',
    'File:Peanut 9417.jpg'
  ],
  'soybean-1': [
    'File:Soybeans (marketed) 1.jpg',
    'File:Soybeans 2.jpg',
    'File:Soybean Field with Healthy Soil (9316804120).jpg'
  ],
  'apple-1': [
    'File:Red delicious and cross section.jpg',
    'File:Australian Red delicious apples at the store.jpg'
  ],
  'apple-2': [
    'File:Red Apple.jpg',
    'File:Apples. red..JPG',
    'File:Australian Red delicious apples at the store.jpg'
  ],
  'banana-1': [
    'File:Bunch of bananas on sale.jpg',
    'File:Kadalikkula.JPG'
  ],
  'banana-2': [
    'File:Goa, India. Bananas in a bunch.jpg',
    'File:Single bananas in a bunch.jpg'
  ],
  'banana-3': [
    'File:Single bananas in a bunch.jpg',
    'File:Bananas 4.jpg',
    'File:Banana fruits.jpg'
  ],
  'tomato-1': [
    'File:Red tomatoes. img 01.jpg',
    'File:Bright red tomato and cross section02.jpg'
  ],
  'tomato-2': [
    'File:Red tomatoes. img 02.jpg',
    'File:Ripe Tomatoes in Their Prime.jpg'
  ],
  'tomato-3': [
    'File:Bright red tomato and cross section02.jpg',
    'File:Red tomatoes. img 03.jpg',
    'File:Red tomatoes. img 04.jpg'
  ],
  'black-gram-3': [
    'File:Black gram with skin.jpg',
    'File:A closeup scene of black gram in a bag.JPG'
  ],
  'green-gram-2': [
    'File:Green Mung Beans.jpg',
    'File:Bean pod of Vigna radiata (mung bean).jpg'
  ],
  'maize-2': [
    'File:Corn on the cob (14329885476).jpg',
    'File:Corn on the cob (5178296206).jpg',
    'File:Corn on the cob, India style - panoramio.jpg'
  ],
  'rice-3': [
    'File:Paddy crop near Malkapuram, Eluru.jpg',
    'File:Paddy fields in Dinajpur District 01.jpg',
    'File:Paddy fields at Kadavoor.jpg'
  ]
};

async function checkCandidates() {
  const selected = {};
  const usedTitles = new Set([...preservedTitles]);

  for (const [key, candidates] of Object.entries(CANDIDATE_MAP)) {
    let chosen = null;
    for (const title of candidates) {
      if (!usedTitles.has(title.toLowerCase())) {
        // Test fetch from Wikimedia
        const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|mime|size|dimensions&format=json`;
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (student@sih2026.gov.in)' } });
          const data = await res.json();
          const page = Object.values(data.query?.pages || {})[0];
          const info = page?.imageinfo?.[0];
          if (info?.url && info.size > 20000) {
            chosen = {
              title,
              url: info.url,
              width: info.width,
              height: info.height,
              size: info.size,
              mime: info.mime
            };
            usedTitles.add(title.toLowerCase());
            break;
          }
        } catch (e) {
          // ignore and try next
        }
      }
    }
    if (chosen) {
      selected[key] = chosen;
      console.log(`✓ ${key} -> ${chosen.title} (${chosen.width}x${chosen.height}, ${(chosen.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ FAILED for ${key}`);
    }
  }

  fs.writeFileSync('scripts/verified-31-curated.json', JSON.stringify(selected, null, 2));
  console.log(`\nVerified ${Object.keys(selected).length} / 31 candidates.`);
}

checkCandidates();
