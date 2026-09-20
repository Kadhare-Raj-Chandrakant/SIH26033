import fs from 'fs';

const CROPS = [
  { name: 'Rice', search: 'Rice grains' },
  { name: 'Wheat', search: 'Wheat grains' },
  { name: 'Maize', search: 'Corn cobs' },
  { name: 'Chickpea', search: 'Raw chickpeas' },
  { name: 'Green Gram', search: 'Mung beans' },
  { name: 'Black Gram', search: 'Urad dal' },
  { name: 'Potato', search: 'Fresh potatoes' },
  { name: 'Onion', search: 'Red onions' },
  { name: 'Tomato', search: 'Fresh red tomatoes' },
  { name: 'Mango', search: 'Ripe mangoes' },
  { name: 'Banana', search: 'Fresh bananas' },
  { name: 'Apple', search: 'Red apples' },
  { name: 'Soybean', search: 'Soybean seeds' },
  { name: 'Groundnut', search: 'Peanuts in shell' },
  { name: 'Mustard', search: 'Mustard seeds' },
  { name: 'Turmeric', search: 'Turmeric roots' },
  { name: 'Dry Red Chilli', search: 'Dried red chillies' },
  { name: 'Cumin', search: 'Jeera cumin seeds' },
  { name: 'Cotton', search: 'Cotton bolls in field' },
  { name: 'Sugarcane', search: 'Sugarcane stalks' },
  { name: 'Jute', search: 'Jute plant crop' },
  { name: 'Tea Leaves', search: 'Tea leaves fresh green' },
  { name: 'Coffee', search: 'Coffee beans roasted raw' },
  { name: 'Coconut', search: 'Fresh whole coconuts' },
  { name: 'Berseem', search: 'Trifolium alexandrinum clover' },
  { name: 'Lucerne', search: 'Medicago sativa alfalfa' },
  { name: 'Fodder Maize', search: 'Forage maize field' },
  { name: 'Marigold', search: 'Orange marigold flower' },
  { name: 'Rose', search: 'Red rose flower bloom' },
  { name: 'Ashwagandha', search: 'Withania somnifera ashwagandha' }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getCandidates(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|mime&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033/2.0' } });
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages.map(p => ({
    title: p.title,
    url: p.imageinfo?.[0]?.url,
    size: p.imageinfo?.[0]?.size,
    mime: p.imageinfo?.[0]?.mime
  })).filter(p => p.mime === 'image/jpeg' || p.mime === 'image/png');
}

async function run() {
  const all = {};
  for (const c of CROPS) {
    await sleep(700);
    const list = await getCandidates(c.search);
    console.log(`=== ${c.name} (${list.length} files) ===`);
    list.forEach((it, idx) => console.log(`  ${idx + 1}. ${it.title}`));
    all[c.name] = list;
  }
  fs.writeFileSync('scripts/candidate-pool.json', JSON.stringify(all, null, 2));
}

run();
