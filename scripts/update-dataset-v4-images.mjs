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

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CROP_SLUGS = {
  'Rice': 'rice',
  'Wheat': 'wheat',
  'Maize': 'maize',
  'Chickpea': 'chickpea',
  'Green Gram': 'green-gram',
  'Black Gram': 'black-gram',
  'Potato': 'potato',
  'Onion': 'onion',
  'Tomato': 'tomato',
  'Mango': 'mango',
  'Banana': 'banana',
  'Apple': 'apple',
  'Soybean': 'soybean',
  'Groundnut': 'groundnut',
  'Mustard': 'mustard',
  'Turmeric': 'turmeric',
  'Dry Red Chilli': 'dry-red-chilli',
  'Cumin': 'cumin',
  'Cotton': 'cotton',
  'Sugarcane': 'sugarcane',
  'Jute': 'jute',
  'Tea Leaves': 'tea-leaves',
  'Coffee': 'coffee',
  'Coconut': 'coconut',
  'Berseem': 'berseem',
  'Lucerne': 'lucerne',
  'Fodder Maize': 'fodder-maize',
  'Marigold': 'marigold',
  'Rose': 'rose',
  'Ashwagandha': 'ashwagandha'
};

const csvFiles = [
  path.resolve('sih26033_agricultural_marketplace_dataset_v4.csv'),
  path.resolve('scripts/data/sih26033_agricultural_marketplace_dataset_v4.csv')
];

for (const targetFile of csvFiles) {
  const content = fs.readFileSync(targetFile, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]);
  const primaryImgIdx = headers.indexOf('primary_image');
  const productIdx = headers.indexOf('product');

  console.log(`Processing ${targetFile}: primary_image index=${primaryImgIdx}, product index=${productIdx}`);

  const cropOccurrences = {};
  const newLines = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const cropName = cols[productIdx];
    cropOccurrences[cropName] = (cropOccurrences[cropName] || 0) + 1;
    const slot = cropOccurrences[cropName];
    const slug = CROP_SLUGS[cropName] || cropName.toLowerCase().replace(/\s+/g, '-');

    const imagePath = `/images/products/${slug}-${slot}.jpg`;
    cols[primaryImgIdx] = imagePath;

    newLines.push(cols.map(escapeCSV).join(','));
  }

  fs.writeFileSync(targetFile, newLines.join('\n') + '\n');
  console.log(`Updated ${targetFile} with ${newLines.length - 1} rows.`);
}
