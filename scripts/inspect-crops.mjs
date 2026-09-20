import fs from 'fs';
import path from 'path';

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

const csvPath = path.resolve('scripts/data/sih26033_agricultural_marketplace_dataset_v4.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = parseCSVLine(lines[0]);
console.log('Headers count:', headers.length);
console.log('Headers:', headers);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  const row = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx];
  });
  rows.push(row);
}

console.log('Total rows:', rows.length);

const crops = {};
rows.forEach((r, idx) => {
  const p = r.product;
  if (!crops[p]) {
    crops[p] = { category: r.category, indices: [] };
  }
  crops[p].indices.push(idx + 1);
});

console.log('Unique crops count:', Object.keys(crops).length);
for (const [crop, info] of Object.entries(crops)) {
  console.log(`${crop} (${info.category}) -> ${info.indices.length} listings (rows ${info.indices.join(', ')})`);
}
