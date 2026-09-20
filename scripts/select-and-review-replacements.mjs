import fs from 'fs';

const candidates = JSON.parse(fs.readFileSync('scripts/replacement-candidates.json', 'utf8'));
const resolvedTitles = JSON.parse(fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8'));

// Track all existing titles to prevent any reuse
const usedTitles = new Set();
for (const item of resolvedTitles) {
  // We only keep titles for listings NOT in the replacement list
  const isTarget = candidates.some(c => c.crop.toLowerCase() === item.crop.toLowerCase() && c.farm === item.slot);
  if (!isTarget) {
    usedTitles.add(item.title.toLowerCase());
  }
}

console.log(`Existing retained image titles: ${usedTitles.size}`);

const selections = [];
const missing = [];

for (const c of candidates) {
  let chosen = null;
  for (const cand of c.results) {
    const t = cand.title.toLowerCase();
    if (!usedTitles.has(t)) {
      chosen = cand;
      usedTitles.add(t);
      break;
    }
  }

  if (chosen) {
    selections.push({
      crop: c.crop,
      farm: c.farm,
      slug: c.slug,
      slot: c.slot,
      title: chosen.title,
      url: chosen.url,
      width: chosen.width,
      height: chosen.height,
      size: chosen.size,
    });
    console.log(`✓ [SELECTED] ${c.crop} (Farm ${c.farm}) -> ${chosen.title} (${chosen.width}x${chosen.height}, ${Math.round(chosen.size / 1024)} KB)`);
  } else {
    missing.push(c);
    console.log(`❌ [NO CANDIDATE] ${c.crop} (Farm ${c.farm})`);
  }
}

console.log(`\nSelected: ${selections.length} / ${candidates.length}`);
fs.writeFileSync('scripts/chosen-31-replacements.json', JSON.stringify(selections, null, 2));
if (missing.length > 0) {
  console.log('Missing items:', missing.map(m => `${m.crop} Farm ${m.farm}`));
}
