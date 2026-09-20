import https from 'https';

async function searchCommons(query, limit = 5) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceFinder/1.0 (dev@sih26033.org)' }
  });
  const data = await res.json();
  if (!data.query || !data.query.pages) return [];
  const results = [];
  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png' || info.mime === 'image/webp')) {
      results.push({
        title: page.title,
        url: info.url,
        mime: info.mime,
        width: info.width,
        height: info.height
      });
    }
  }
  return results;
}

async function test() {
  const crops = ['Rice grains', 'Potatoes', 'Red roses', 'Turmeric roots', 'Cotton crop'];
  for (const crop of crops) {
    const images = await searchCommons(crop, 4);
    console.log(`=== ${crop} (${images.length} found) ===`);
    images.forEach(img => console.log(' ', img.title, '->', img.url));
  }
}

test();
