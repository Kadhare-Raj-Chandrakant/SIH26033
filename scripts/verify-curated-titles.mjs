import fs from 'fs';

export const CROP_MAPPING = [
  // 1. Rice
  { crop: 'Rice', slug: 'rice', slot: 1, title: 'File:Rice grains (IRRI).jpg' },
  { crop: 'Rice', slug: 'rice', slot: 2, title: 'File:Rice Grains.jpg' },
  { crop: 'Rice', slug: 'rice', slot: 3, title: 'File:Basmati Rice Kolkata 2011-02-11 1054.JPG' },

  // 2. Wheat
  { crop: 'Wheat', slug: 'wheat', slot: 1, title: 'File:Wheat field.jpg' },
  { crop: 'Wheat', slug: 'wheat', slot: 2, title: 'File:Wheat close-up.JPG' },
  { crop: 'Wheat', slug: 'wheat', slot: 3, title: 'File:Wheat Grain.jpg' },

  // 3. Maize
  { crop: 'Maize', slug: 'maize', slot: 1, title: 'File:Corn on the cob (5178296206).jpg' },
  { crop: 'Maize', slug: 'maize', slot: 2, title: 'File:Brazilian corn on the cob.jpg' },
  { crop: 'Maize', slug: 'maize', slot: 3, title: 'File:Corn on Cob- Kolkata - West Bengal - DSC 0010.jpg' },

  // 4. Chickpea
  { crop: 'Chickpea', slug: 'chickpea', slot: 1, title: 'File:Chickpea field in Tamil Nadu JEG6258.jpg' },
  { crop: 'Chickpea', slug: 'chickpea', slot: 2, title: 'File:Chickpea field in Tamil Nadu JEG6261.jpg' },
  { crop: 'Chickpea', slug: 'chickpea', slot: 3, title: 'File:Chana-Chick pea-Cicer arietinum-September 27, 2016-IMG 8013-2.jpg' },

  // 5. Green Gram
  { crop: 'Green Gram', slug: 'green-gram', slot: 1, title: 'File:Mung beans (Vigna radiata).jpg' },
  { crop: 'Green Gram', slug: 'green-gram', slot: 2, title: 'File:Vigna radiata MHNT.BOT.2009.17.4.jpg' },
  { crop: 'Green Gram', slug: 'green-gram', slot: 3, title: 'File:Mung bean field.jpg' },

  // 6. Black Gram
  { crop: 'Black Gram', slug: 'black-gram', slot: 1, title: 'File:Black gram.jpg' },
  { crop: 'Black Gram', slug: 'black-gram', slot: 2, title: 'File:Vigna mungo.jpg' },
  { crop: 'Black Gram', slug: 'black-gram', slot: 3, title: 'File:Vigna mungo without skin.jpg' },

  // 7. Potato
  { crop: 'Potato', slug: 'potato', slot: 1, title: 'File:Fresh Potatoes.jpg' },
  { crop: 'Potato', slug: 'potato', slot: 2, title: 'File:Big and fresh potatoes.jpg' },
  { crop: 'Potato', slug: 'potato', slot: 3, title: 'File:2010-06-19-supermarkt-by-RalfR-29.jpg' },

  // 8. Onion
  { crop: 'Onion', slug: 'onion', slot: 1, title: 'File:Oignon rosé de roscoffP1000686.jpg' },
  { crop: 'Onion', slug: 'onion', slot: 2, title: 'File:Red onions.jpg' },
  { crop: 'Onion', slug: 'onion', slot: 3, title: 'File:13-08-31-wien-redaktionstreffen-EuT-by-Bi-frie-025.jpg' },

  // 9. Tomato
  { crop: 'Tomato', slug: 'tomato', slot: 1, title: 'File:0150-Casoledelsa.JPG' },
  { crop: 'Tomato', slug: 'tomato', slot: 2, title: 'File:2014 Prowincja Szirak, Giumri, Owoce i warzywa.jpg' },
  { crop: 'Tomato', slug: 'tomato', slot: 3, title: 'File:2016-10-29 01-04-31 recup.jpg' },

  // 10. Mango
  { crop: 'Mango', slug: 'mango', slot: 1, title: 'File:Alphonso Ripe Mango from north India.jpg' },
  { crop: 'Mango', slug: 'mango', slot: 2, title: 'File:Ripe Mango from Nicaragua.jpg' },
  { crop: 'Mango', slug: 'mango', slot: 3, title: 'File:Ripe mangoes.jpg' },

  // 11. Banana
  { crop: 'Banana', slug: 'banana', slot: 1, title: 'File:A bunch of bananas.jpg' },
  { crop: 'Banana', slug: 'banana', slot: 2, title: 'File:10.5 inch banana.JPG' },
  { crop: 'Banana', slug: 'banana', slot: 3, title: 'File:27 cm banana.JPG' },

  // 12. Apple
  { crop: 'Apple', slug: 'apple', slot: 1, title: 'File:Apfel 01.jpg' },
  { crop: 'Apple', slug: 'apple', slot: 2, title: 'File:Apfel 02.jpg' },
  { crop: 'Apple', slug: 'apple', slot: 3, title: 'File:Red apples.jpg' },

  // 13. Soybean
  { crop: 'Soybean', slug: 'soybean', slot: 1, title: 'File:2005soyabean.PNG' },
  { crop: 'Soybean', slug: 'soybean', slot: 2, title: 'File:Glycine max1.jpg' },
  { crop: 'Soybean', slug: 'soybean', slot: 3, title: 'File:A field of Soy beans (Glycine max) (6160141423).jpg' },

  // 14. Groundnut
  { crop: 'Groundnut', slug: 'groundnut', slot: 1, title: 'File:Amendoim no mercado de Wanchaq.JPG' },
  { crop: 'Groundnut', slug: 'groundnut', slot: 2, title: 'File:2005groundnut.PNG' },
  { crop: 'Groundnut', slug: 'groundnut', slot: 3, title: 'File:A granel (142983393).jpg' },

  // 15. Mustard
  { crop: 'Mustard', slug: 'mustard', slot: 1, title: 'File:Mustard seed closeup.jpg' },
  { crop: 'Mustard', slug: 'mustard', slot: 2, title: 'File:Brassicanigra.jpg' },
  { crop: 'Mustard', slug: 'mustard', slot: 3, title: 'File:Alliaria-petiolata-seeds.jpg' },

  // 16. Turmeric
  { crop: 'Turmeric', slug: 'turmeric', slot: 1, title: 'File:Curcuma longa - Hong Kong Botanical Garden - IMG 9629.JPG' },
  { crop: 'Turmeric', slug: 'turmeric', slot: 2, title: 'File:Curcuma longa മഞ്ഞൾ Turmeric.jpg' },
  { crop: 'Turmeric', slug: 'turmeric', slot: 3, title: 'File:A closeup of Turmeric.JPG' },

  // 17. Dry Red Chilli
  { crop: 'Dry Red Chilli', slug: 'dry-red-chilli', slot: 1, title: 'File:Dried Red Chili.jpg' },
  { crop: 'Dry Red Chilli', slug: 'dry-red-chilli', slot: 2, title: 'File:Dried Korean red chillies.jpg' },
  { crop: 'Dry Red Chilli', slug: 'dry-red-chilli', slot: 3, title: 'File:Dried chillies 2.jpg' },

  // 18. Cumin
  { crop: 'Cumin', slug: 'cumin', slot: 1, title: 'File:Cumin-spice.jpg' },
  { crop: 'Cumin', slug: 'cumin', slot: 2, title: 'File:Komijn-spice.jpg' },
  { crop: 'Cumin', slug: 'cumin', slot: 3, title: 'File:Jeera Seeds Closeup.JPG' },

  // 19. Cotton
  { crop: 'Cotton', slug: 'cotton', slot: 1, title: 'File:Cotton (8145399540).jpg' },
  { crop: 'Cotton', slug: 'cotton', slot: 2, title: 'File:Cotton - പരുത്തി 03.JPG' },
  { crop: 'Cotton', slug: 'cotton', slot: 3, title: 'File:Braga Pedagogical Farm Coton.jpg' },

  // 20. Sugarcane
  { crop: 'Sugarcane', slug: 'sugarcane', slot: 1, title: 'File:Sugarcane stalks.jpg' },
  { crop: 'Sugarcane', slug: 'sugarcane', slot: 2, title: 'File:Cane-sugar.jpg' },
  { crop: 'Sugarcane', slug: 'sugarcane', slot: 3, title: 'File:Sugarcane field of Kachirapalayam.jpg' },

  // 21. Jute
  { crop: 'Jute', slug: 'jute', slot: 1, title: 'File:Asahimo.jpg' },
  { crop: 'Jute', slug: 'jute', slot: 2, title: 'File:Corchorus capsularis - Jardim Botânico de São Paulo - IMG 0245.jpg' },
  { crop: 'Jute', slug: 'jute', slot: 3, title: 'File:COLLECTIE TROPENMUSEUM Europeaan poseert bij een veld jute of hennep TMnr 10023830.jpg' },

  // 22. Tea Leaves
  { crop: 'Tea Leaves', slug: 'tea-leaves', slot: 1, title: 'File:Bai Hao Yin Zhen tea leaf (Fuding).jpg' },
  { crop: 'Tea Leaves', slug: 'tea-leaves', slot: 2, title: 'File:Bai Hao Yin Zhen tea leaf.jpg' },
  { crop: 'Tea Leaves', slug: 'tea-leaves', slot: 3, title: 'File:Assam black tea.jpg' },

  // 23. Coffee
  { crop: 'Coffee', slug: 'coffee', slot: 1, title: 'File:Coffee beans.jpg' },
  { crop: 'Coffee', slug: 'coffee', slot: 2, title: 'File:20110111- MG 9606.jpg' },
  { crop: 'Coffee', slug: 'coffee', slot: 3, title: 'File:Bali 003 - Ubud - famous lukaw coffee.jpg' },

  // 24. Coconut
  { crop: 'Coconut', slug: 'coconut', slot: 1, title: 'File:Beached coconut.JPG' },
  { crop: 'Coconut', slug: 'coconut', slot: 2, title: 'File:Bathsheba-beach.jpg' },
  { crop: 'Coconut', slug: 'coconut', slot: 3, title: 'File:A coconut -seed.jpg' },

  // 25. Berseem
  { crop: 'Berseem', slug: 'berseem', slot: 1, title: 'File:Trifolium alexandrinum eF.jpg' },
  { crop: 'Berseem', slug: 'berseem', slot: 2, title: 'File:Raidjeus1.jpg' },
  { crop: 'Berseem', slug: 'berseem', slot: 3, title: 'File:Berseem - the great forage and soiling crop of the Nile Valley (1902) (14782572785).jpg' },

  // 26. Lucerne
  { crop: 'Lucerne', slug: 'lucerne', slot: 1, title: 'File:Medicago sativa Alfals006.jpg' },
  { crop: 'Lucerne', slug: 'lucerne', slot: 2, title: 'File:MedicagoSativa-plant-hr.jpg' },
  { crop: 'Lucerne', slug: 'lucerne', slot: 3, title: 'File:Alfalz destacato contra o cielo.jpg' },

  // 27. Fodder Maize
  { crop: 'Fodder Maize', slug: 'fodder-maize', slot: 1, title: 'File:Alley cropping corn walnuts.jpg' },
  { crop: 'Fodder Maize', slug: 'fodder-maize', slot: 2, title: 'File:African American farmer in corn field, Alachua County, Florida.jpg' },
  { crop: 'Fodder Maize', slug: 'fodder-maize', slot: 3, title: 'File:Agro PR Milho em Palotina.jpg' },

  // 28. Marigold
  { crop: 'Marigold', slug: 'marigold', slot: 1, title: 'File:Beautiful Flowers 1.JPG' },
  { crop: 'Marigold', slug: 'marigold', slot: 2, title: 'File:Flower found at Shivapuri National Park 31.jpg' },
  { crop: 'Marigold', slug: 'marigold', slot: 3, title: 'File:Flower found at Shivapuri National Park 36.jpg' },

  // 29. Rose
  { crop: 'Rose', slug: 'rose', slot: 1, title: 'File:Red rose flower close up.jpg' },
  { crop: 'Rose', slug: 'rose', slot: 2, title: 'File:A close-up of climbing roses.jpg' },
  { crop: 'Rose', slug: 'rose', slot: 3, title: 'File:Pink rose bloom of a climbing rose at Boreham, Essex, England 1.jpg' },

  // 30. Ashwagandha
  { crop: 'Ashwagandha', slug: 'ashwagandha', slot: 1, title: 'File:Ashvagandha.jpg' },
  { crop: 'Ashwagandha', slug: 'ashwagandha', slot: 2, title: 'File:Ashwagandha (Withania somnifera).jpg' },
  { crop: 'Ashwagandha', slug: 'ashwagandha', slot: 3, title: 'File:A field of Withania somnifera.JPG' },
];

async function verifyAllTitles() {
  console.log(`Checking ${CROP_MAPPING.length} curated image titles...`);
  const batchSize = 45;
  const resolved = [];

  for (let i = 0; i < CROP_MAPPING.length; i += batchSize) {
    const batch = CROP_MAPPING.slice(i, i + batchSize);
    const titles = batch.map(b => b.title).join('|');
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent(titles) + '&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&format=json';

    const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033/2.0 (student@sih2026.gov.in)' } });
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});

    for (const item of batch) {
      const page = pages.find(p => p.title.toLowerCase() === item.title.toLowerCase() || p.title.toLowerCase().replace(/_/g, ' ') === item.title.toLowerCase());
      const info = page?.imageinfo?.[0];
      if (info?.url) {
        resolved.push({
          ...item,
          downloadUrl: info.thumburl || info.url,
          originalUrl: info.url,
          size: info.size,
          mime: info.mime,
          status: 'FOUND'
        });
      } else {
        console.warn(`⚠️ Title not found: ${item.title} (crop: ${item.crop})`);
        resolved.push({
          ...item,
          status: 'NOT_FOUND'
        });
      }
    }
  }

  const foundCount = resolved.filter(r => r.status === 'FOUND').length;
  console.log(`Resolved ${foundCount} of ${CROP_MAPPING.length} titles.`);
  fs.writeFileSync('scripts/resolved-batch-titles.json', JSON.stringify(resolved, null, 2));
}

verifyAllTitles();
