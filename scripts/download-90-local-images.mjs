import fs from 'fs';
import path from 'path';

const outDir = path.resolve('apps/web/public/images/products');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadFile(url, destPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceDownloader/1.0 (student@sih2026.gov.in)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('File too small (< 2KB)');
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function run() {
  const raw = fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8');
  const items = JSON.parse(raw);

  console.log(`Starting download of ${items.length} images into ${outDir}...`);
  let successCount = 0;
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const filename = `${item.slug}-${item.slot}.jpg`;
    const destPath = path.join(outDir, filename);

    process.stdout.write(`[${i + 1}/${items.length}] ${item.crop} (slot ${item.slot})... `);

    try {
      await sleep(250); // polite delay
      let bytes;
      try {
        bytes = await downloadFile(item.downloadUrl, destPath);
      } catch (err) {
        // Fallback to original URL
        bytes = await downloadFile(item.originalUrl, destPath);
      }
      console.log(`✓ OK (${Math.round(bytes / 1024)} KB) -> ${filename}`);
      successCount++;
      results.push({
        crop: item.crop,
        slug: item.slug,
        slot: item.slot,
        filename,
        path: `/images/products/${filename}`,
        title: item.title,
        sizeBytes: bytes,
        status: 'SUCCESS'
      });
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      results.push({
        crop: item.crop,
        slug: item.slug,
        slot: item.slot,
        filename,
        path: null,
        title: item.title,
        error: err.message,
        status: 'FAILED'
      });
    }
  }

  console.log(`\n========================================`);
  console.log(`Downloads Complete: ${successCount} / ${items.length} successfully downloaded!`);
  fs.writeFileSync('scripts/local-images-report.json', JSON.stringify(results, null, 2));
}

run();
