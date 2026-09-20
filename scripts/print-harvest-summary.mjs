import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/available-crop-photos.json', 'utf8'));
for (const [crop, photos] of Object.entries(data)) {
  console.log(`\n=== ${crop} (${photos.length} photos) ===`);
  photos.slice(0, 8).forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title} (${p.width}x${p.height}, ${Math.round(p.size / 1024)} KB)`);
  });
}
