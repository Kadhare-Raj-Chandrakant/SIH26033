import fs from 'fs';

const CROP_SEARCH_TERMS = {
  'Ashwagandha': 'Withania somnifera',
  'Marigold': 'Tagetes patula',
  'Fodder Maize': 'Forage maize',
  'Lucerne': 'Medicago sativa field',
  'Berseem': 'Trifolium alexandrinum',
  'Coconut': 'Cocos nucifera',
  'Coffee': 'Coffee cherries',
  'Jute': 'Corchorus capsularis',
  'Sugarcane': 'Sugarcane stalks',
  'Turmeric': 'Curcuma longa rhizome',
  'Mustard': 'Mustard seeds',
  'Groundnut': 'Peanuts in shell',
  'Soybean': 'Soybeans',
  'Apple': 'Red apples',
  'Banana': 'Bananas',
  'Tomato': 'Red tomatoes',
  'Black Gram': 'Vigna mungo',
  'Green Gram': 'Vigna radiata',
  'Maize': 'Corn cobs',
  'Rice': 'Paddy rice',
};

async function getPhotosForCrop(cropName, term) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|mime|size|dimensions&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SIH26033ProduceCurator/3.0 (agri@sih2026.gov.in)' } });
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
        'currency', 'coin', 'ruler', 'inch', '27 cm', 'recipe', 'soup', 'dish',
        'curry', 'book', 'plate', 'car', 'building', 'street', '.svg', 'specimen'
      ];
      if (genericExcludes.some(w => title.includes(w))) return false;
      if (info.width < 400 || info.height < 300) return false;
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

async function run() {
  const report = {};
  for (const [crop, term] of Object.entries(CROP_SEARCH_TERMS)) {
    const photos = await getPhotosForCrop(crop, term);
    console.log(`${crop}: ${photos.length} photos found`);
    report[crop] = photos;
    await new Promise(r => setTimeout(r, 150));
  }
  fs.writeFileSync('scripts/available-crop-photos.json', JSON.stringify(report, null, 2));
  console.log('Saved to scripts/available-crop-photos.json');
}

run();
