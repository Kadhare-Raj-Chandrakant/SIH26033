import fs from 'fs';
import path from 'path';

const outDir = path.resolve('apps/web/public/images/products');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadFile(url, destPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (student@sih2026.gov.in)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('File too small (< 2KB)');
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function fetchBestUrl(title) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=1280&format=json`;
  const res = await fetch(api, {
    headers: { 'User-Agent': 'SIH26033ProduceCurator/1.0 (student@sih2026.gov.in)' }
  });
  const data = await res.json();
  const page = Object.values(data.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return {
    thumbUrl: info.thumburl,
    origUrl: info.url,
    title
  };
}

async function run() {
  const verified31 = JSON.parse(fs.readFileSync('scripts/verified-31-curated.json', 'utf8'));
  const batchTitles = JSON.parse(fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8'));
  
  console.log(`Starting replacement download for all 31 confirmed listings...`);
  
  const entries = Object.entries(verified31);
  let successCount = 0;
  const auditReport = [];

  for (let i = 0; i < entries.length; i++) {
    const [key, details] = entries[i];
    const [slug, farmStr] = key.split(/-(?=\d+$)/);
    const farm = parseInt(farmStr, 10);
    const filename = `${key}.jpg`;
    const destPath = path.join(outDir, filename);

    process.stdout.write(`[${i + 1}/${entries.length}] Replacing ${key} (${details.title})... `);

    try {
      await sleep(200);
      const urls = await fetchBestUrl(details.title);
      let bytes = 0;
      let usedUrl = '';

      if (urls?.thumbUrl) {
        try {
          bytes = await downloadFile(urls.thumbUrl, destPath);
          usedUrl = urls.thumbUrl;
        } catch (err) {
          // fallback to orig
          bytes = await downloadFile(urls.origUrl, destPath);
          usedUrl = urls.origUrl;
        }
      } else {
        bytes = await downloadFile(details.url, destPath);
        usedUrl = details.url;
      }

      console.log(`✓ OK (${Math.round(bytes / 1024)} KB)`);
      successCount++;

      // Update in batchTitles
      const foundIdx = batchTitles.findIndex(b => b.slug === slug && b.slot === farm);
      if (foundIdx !== -1) {
        batchTitles[foundIdx].title = details.title;
        batchTitles[foundIdx].downloadUrl = usedUrl;
        batchTitles[foundIdx].originalUrl = details.url;
        batchTitles[foundIdx].status = 'REPLACED_VERIFIED';
      }

      auditReport.push({
        key,
        crop: batchTitles[foundIdx]?.crop || slug,
        farm,
        filename,
        title: details.title,
        sizeKB: Math.round(bytes / 1024),
        path: `/images/products/${filename}`
      });
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  // Write updated resolved-batch-titles.json
  fs.writeFileSync('scripts/resolved-batch-titles.json', JSON.stringify(batchTitles, null, 2));
  fs.writeFileSync('scripts/31-replacements-audit.json', JSON.stringify(auditReport, null, 2));

  console.log(`\n==============================================`);
  console.log(`Successfully replaced ${successCount} / ${entries.length} images!`);
  console.log(`==============================================`);
}

run();
