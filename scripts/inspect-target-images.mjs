import fs from 'fs';

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    return row;
  });
}

const csvContent = fs.readFileSync('sih26033_agricultural_marketplace_dataset_v4.csv', 'utf8');
const records = parseCsv(csvContent);

const targetItems = [
  { crop: 'Ashwagandha', farms: [2, 3] },
  { crop: 'Marigold', farms: [1] },
  { crop: 'Fodder Maize', farms: [1, 2] },
  { crop: 'Lucerne', farms: [3] },
  { crop: 'Berseem', farms: [2] },
  { crop: 'Coconut', farms: [2, 3] },
  { crop: 'Coffee', farms: [1] },
  { crop: 'Jute', farms: [3] },
  { crop: 'Sugarcane', farms: [2] },
  { crop: 'Turmeric', farms: [1, 2] },
  { crop: 'Mustard', farms: [1, 2, 3] },
  { crop: 'Groundnut', farms: [2] },
  { crop: 'Soybean', farms: [1] },
  { crop: 'Apple', farms: [1, 2] },
  { crop: 'Banana', farms: [1, 2, 3] },
  { crop: 'Tomato', farms: [1, 2, 3] },
  { crop: 'Black Gram', farms: [3] },
  { crop: 'Green Gram', farms: [2] },
  { crop: 'Maize', farms: [2] },
  { crop: 'Rice', farms: [3] },
];

console.log('=== TARGET CROPS & CURRENT IMAGES ===');
let matchCount = 0;
const resolvedTitles = JSON.parse(fs.readFileSync('scripts/resolved-batch-titles.json', 'utf8'));

for (const target of targetItems) {
  const matches = records.filter(r => r.product && r.product.toLowerCase() === target.crop.toLowerCase());
  for (const farmNum of target.farms) {
    const match = matches.find(m => m.farm === `Farm ${farmNum}`);
    const resolved = resolvedTitles.find(t => t.crop.toLowerCase() === target.crop.toLowerCase() && t.slot === farmNum);
    if (match) {
      matchCount++;
      console.log(`[TARGET ${matchCount}] ${match.product} Farm ${farmNum}: ${match.primary_image} | Title: ${resolved?.title || 'N/A'}`);
    } else {
      console.log(`[MISSING FARM] ${target.crop} | Farm ${farmNum}`);
    }
  }
}
console.log(`Total matched targets: ${matchCount}`);
