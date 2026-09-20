import fs from 'fs';
import path from 'path';

const outDir = path.resolve('apps/web/public/images/products');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Curated search terms or specific file titles for each of the 30 crops
const CROP_DEFINITIONS = [
  {
    name: 'Rice',
    slug: 'rice',
    queries: ['File:Basmati Rice Kolkata', 'File:Rice grains (IRRI).jpg', 'File:Rice grains for seeds.jpg', 'File:Basmati Rice India, raw.jpg']
  },
  {
    name: 'Wheat',
    slug: 'wheat',
    queries: ['File:Wheat field.jpg', 'File:Wheat close-up.JPG', 'File:11186Harvested Wheat3.jpg', 'File:A sea of ripe wheat - geograph.org.uk - 905835.jpg']
  },
  {
    name: 'Maize',
    slug: 'maize',
    queries: ['File:Corn on the cob on a roadway in Beijing, China, October 2012.jpg', 'File:Brazilian corn on the cob.jpg', 'File:Corn on the cob - Massachusetts.jpg', 'File:Maize ears.jpg']
  },
  {
    name: 'Chickpea',
    slug: 'chickpea',
    queries: ['File:Chickpea field in Tamil Nadu JEG6258.jpg', 'File:Chickpea field in Tamil Nadu JEG6261.jpg', 'File:Chanakah (Sanskrit- चणकः) (4218516670).jpg', 'File:Arrancando garbanzos (4).jpg']
  },
  {
    name: 'Green Gram',
    slug: 'green-gram',
    queries: ['File:Mung bean field.jpg', 'File:Mung bean field 1.jpg', 'File:Mungbean flower (8644478637).jpg', 'File:Vigna radiata.jpg']
  },
  {
    name: 'Black Gram',
    slug: 'black-gram',
    queries: ['File:Urd beans.jpg', 'File:Black gram.jpg', 'File:A closeup scene of black gram in a bag.JPG', 'File:Vigna mungo.jpg']
  },
  {
    name: 'Potato',
    slug: 'potato',
    queries: ['File:2010-06-19-supermarkt-by-RalfR-29.jpg', 'File:Balls of flour, Omagh Market.jpg', 'File:2003-09-20 Biedenkopf Brott schwitzende Kartoffeln.jpg', 'File:Potatoes.jpg']
  },
  {
    name: 'Onion',
    slug: 'onion',
    queries: ['File:Oignon rosé de roscoffP1000686.jpg', 'File:Red onions.jpg', 'File:Onion bulbs.jpg', 'File:13-08-31-wien-redaktionstreffen-EuT-by-Bi-frie-025.jpg']
  },
  {
    name: 'Tomato',
    slug: 'tomato',
    queries: ['File:0150-Casoledelsa.JPG', 'File:2014 Prowincja Szirak, Giumri, Owoce i warzywa.jpg', 'File:2016-10-29 01-04-31 recup.jpg', 'File:Ripe tomatoes.jpg']
  },
  {
    name: 'Mango',
    slug: 'mango',
    queries: ['File:Ambo (Konkani- आंबॉ) (3167551108).jpg', 'File:Mangifera indica fruit.jpg', 'File:Mangoes in market.jpg', 'File:Alphonso mangoes.jpg']
  },
  {
    name: 'Banana',
    slug: 'banana',
    queries: ['File:A bunch of bananas.jpg', 'File:10.5 inch banana.JPG', 'File:27 cm banana.JPG', 'File:4 Bananes.jpg']
  },
  {
    name: 'Apple',
    slug: 'apple',
    queries: ['File:Apfel 01.jpg', 'File:Apfel 02.jpg', 'File:Red apples.jpg', 'File:Harvested apples.jpg']
  },
  {
    name: 'Soybean',
    slug: 'soybean',
    queries: ['File:Soybean seeds.jpg', 'File:Glycine max seeds.jpg', 'File:Soybeans in bowl.jpg', 'File:Bolgiano\'s capitol city seeds - 1963 (1963) (19767813244).jpg']
  },
  {
    name: 'Groundnut',
    slug: 'groundnut',
    queries: ['File:Amendoim no mercado de Wanchaq.JPG', 'File:Peanuts in shell.jpg', 'File:Groundnuts in market.jpg', 'File:Raw peanuts.jpg']
  },
  {
    name: 'Mustard',
    slug: 'mustard',
    queries: ['File:Mustard seed closeup.jpg', 'File:Brassicanigra.jpg', 'File:Moutarde.jpg', 'File:Alliaria petiolata seeds.jpg']
  },
  {
    name: 'Turmeric',
    slug: 'turmeric',
    queries: ['File:Curcuma longa - Hong Kong Botanical Garden - IMG 9629.JPG', 'File:Curcuma longa മഞ്ഞൾ Turmeric.jpg', 'File:A closeup of Turmeric.JPG', 'File:1-Turmeric plant.jpg']
  },
  {
    name: 'Dry Red Chilli',
    slug: 'dry-red-chilli',
    queries: ['File:Dried Red Chili.jpg', 'File:Dried Korean red chillies.jpg', 'File:Dried chillies 2.jpg', 'File:Old Bagan, Myanmar, Dried red chili (chilli) pepper.jpg']
  },
  {
    name: 'Cumin',
    slug: 'cumin',
    queries: ['File:Cumin-spice.jpg', 'File:Komijn-spice.jpg', 'File:Jeera Seeds Closeup.JPG', 'File:Cumin seed whole.JPG']
  },
  {
    name: 'Cotton',
    slug: 'cotton',
    queries: ['File:Cotton (8145399540).jpg', 'File:Cotton - പരുത്തി 03.JPG', 'File:Braga Pedagogical Farm Coton.jpg', 'File:Cotton bolls in field.jpg']
  },
  {
    name: 'Sugarcane',
    slug: 'sugarcane',
    queries: ['File:Sugarcane stalks.jpg', 'File:Cane-sugar.jpg', 'File:CanyaDeSucre.JPG', 'File:Sugarcane field of Kachirapalayam.jpg']
  },
  {
    name: 'Jute',
    slug: 'jute',
    queries: ['File:Asahimo.jpg', 'File:Jute fibre.jpg', 'File:Bundesarchiv B 145 Bild-F001100-0001, Bonn-Beuel, Jutespinnerei und Weberei.jpg', 'File:Jute harvest.jpg']
  },
  {
    name: 'Tea Leaves',
    slug: 'tea-leaves',
    queries: ['File:Bai Hao Yin Zhen tea leaf (Fuding).jpg', 'File:Bai Hao Yin Zhen tea leaf.jpg', 'File:Assam black tea.jpg', 'File:Bancha img 0594.jpg']
  },
  {
    name: 'Coffee',
    slug: 'coffee',
    queries: ['File:20110111- MG 9606.jpg', 'File:Bali 003 - Ubud - famous lukaw coffee.jpg', 'File:(64-365) Simply delicious!! (5330904503).jpg', 'File:Coffee beans.jpg']
  },
  {
    name: 'Coconut',
    slug: 'coconut',
    queries: ['File:Beached coconut.JPG', 'File:Bathsheba-beach.jpg', 'File:A coconut -seed.jpg', 'File:Fresh coconut.jpg']
  },
  {
    name: 'Berseem',
    slug: 'berseem',
    queries: ['File:Trifolium alexandrinum eF.jpg', 'File:Raidjeus1.jpg', 'File:Berseem clover.jpg', 'File:Berseem - the great forage and soiling crop of the Nile Valley (1902) (14782572785).jpg']
  },
  {
    name: 'Lucerne',
    slug: 'lucerne',
    queries: ['File:Medicago sativa Alfals006.jpg', 'File:MedicagoSativa-plant-hr.jpg', 'File:Alfalz destacato contra o cielo.jpg', 'File:Medicago-sativa-flowers.jpg']
  },
  {
    name: 'Fodder Maize',
    slug: 'fodder-maize',
    queries: ['File:African American farmer in corn field, Alachua County, Florida.jpg', 'File:Alley cropping corn walnuts.jpg', 'File:Agro PR Milho em Palotina.jpg', 'File:Maize silage harvest.jpg']
  },
  {
    name: 'Marigold',
    slug: 'marigold',
    queries: ['File:Beautiful Flowers 1.JPG', 'File:Flower found at Shivapuri National Park 31.jpg', 'File:Flower found at Shivapuri National Park 36.jpg', 'File:Tagetes erecta flower.jpg']
  },
  {
    name: 'Rose',
    slug: 'rose',
    queries: ['File:Red rose flower close up.jpg', 'File:A close-up of climbing roses.jpg', 'File:Pink rose bloom of a climbing rose at Boreham, Essex, England 1.jpg', 'File:Bicolor pink and white rose flower close up, by baby-bear.org.jpg']
  },
  {
    name: 'Ashwagandha',
    slug: 'ashwagandha',
    queries: ['File:Ashvagandha.jpg', 'File:Ashwagandha (Withania somnifera).jpg', 'File:A field of Withania somnifera.JPG', 'File:An image of Withania somnifera.JPG']
  }
];

async function resolveWikimediaUrl(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceCurator/2.0 (student@sih2026.gov.in)' } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png')) {
      const title = p.title.toLowerCase();
      if (!title.includes('.svg') && !title.includes('map') && !title.includes('diagram') && !title.includes('logo')) {
        return {
          title: p.title,
          url: info.url,
          mime: info.mime
        };
      }
    }
  }
  return null;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceCurator/2.0 (student@sih2026.gov.in)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error('File too small (< 5KB)');
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

async function run() {
  console.log('Starting resolution and download for all 30 crops (90 total images)...');
  const results = {};
  let totalDownloaded = 0;

  for (let i = 0; i < CROP_DEFINITIONS.length; i++) {
    const crop = CROP_DEFINITIONS[i];
    console.log(`\n[${i + 1}/30] Processing ${crop.name} (${crop.slug})...`);
    results[crop.name] = [];

    const usedUrls = new Set();

    for (let slot = 1; slot <= 3; slot++) {
      const filename = `${crop.slug}-${slot}.jpg`;
      const destPath = path.join(outDir, filename);

      // Check if already downloaded and valid
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
        console.log(`   Slot ${slot}: Already exists (${fs.statSync(destPath).size} bytes) -> /images/products/${filename}`);
        results[crop.name].push({
          slot,
          path: `/images/products/${filename}`,
          status: 'EXISTS'
        });
        totalDownloaded++;
        continue;
      }

      // Try queries until an unused, valid URL is found
      let downloaded = false;
      for (const q of crop.queries) {
        await sleep(600); // Polite rate-limiting
        try {
          const item = await resolveWikimediaUrl(q);
          if (item && !usedUrls.has(item.url)) {
            usedUrls.add(item.url);
            console.log(`   Slot ${slot}: Downloading "${item.title}"...`);
            const bytes = await downloadFile(item.url, destPath);
            console.log(`   Slot ${slot}: Success! (${bytes} bytes) -> /images/products/${filename}`);
            results[crop.name].push({
              slot,
              path: `/images/products/${filename}`,
              title: item.title,
              bytes,
              status: 'OK'
            });
            downloaded = true;
            totalDownloaded++;
            break;
          }
        } catch (err) {
          console.warn(`   Slot ${slot}: Query "${q}" failed: ${err.message}`);
        }
      }

      if (!downloaded) {
        console.error(`   ❌ Slot ${slot}: Failed to acquire image for ${crop.name}`);
        results[crop.name].push({
          slot,
          path: null,
          status: 'FAILED'
        });
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Completed! Total images verified/downloaded: ${totalDownloaded} / 90`);
  fs.writeFileSync('scripts/download-report.json', JSON.stringify(results, null, 2));
}

run();
