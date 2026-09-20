async function testCategory(category) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(category)}&gcmtype=file&gcmlimit=10&prop=imageinfo&iiprop=url|mime|size&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceFinder/1.0 (dev@sih26033.org)' }
  });
  const data = await res.json();
  if (!data.query || !data.query.pages) return [];
  const results = [];
  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png')) {
      results.push({
        title: page.title,
        url: info.url,
        width: info.width,
        height: info.height
      });
    }
  }
  return results;
}

async function run() {
  const tests = [
    'Category:Roses',
    'Category:Potatoes',
    'Category:Rice',
    'Category:Wheat',
    'Category:Apples',
    'Category:Tomatoes',
    'Category:Withania somnifera',
    'Category:Cotton'
  ];
  for (const cat of tests) {
    const imgs = await testCategory(cat);
    console.log(`=== ${cat}: ${imgs.length} files ===`);
    imgs.slice(0, 3).forEach(img => console.log(' ', img.title, '->', img.url));
  }
}

run();
