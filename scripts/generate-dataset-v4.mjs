import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const inputPath = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset_v2.csv');
const rawContent = fs.readFileSync(inputPath, 'utf8');
const rawLines = rawContent.trim().split(/\r?\n/);

const headerCols = parseCSVLine(rawLines[0]);
console.log(`Input v2 has ${headerCols.length} columns and ${rawLines.length - 1} data rows.`);

// New header with exactly ONE primary image column: primary_image
const newHeaderLine = rawLines[0] + ',primary_image';
const outputLines = [newHeaderLine];

// Rule 4 & 5: Genuine farmer uploaded images only. If unverified, keep blank.
// Distinct photos for different listings of same crop when available.
for (let i = 1; i < rawLines.length; i++) {
  const line = rawLines[i];
  // Since no verified farmer-uploaded photos exist in the repository, primary_image is kept blank.
  const primaryImage = '';
  outputLines.push(`${line},${primaryImage}`);
}

const outputContent = outputLines.join('\n') + '\n';

// Save to scripts/data/
const outputPathData = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset_v4.csv');
fs.writeFileSync(outputPathData, outputContent, 'utf8');
console.log(`✓ Saved dataset v4 to: ${outputPathData}`);

// Also save to workspace root
const outputPathRoot = path.resolve(__dirname, '..', 'sih26033_agricultural_marketplace_dataset_v4.csv');
fs.writeFileSync(outputPathRoot, outputContent, 'utf8');
console.log(`✓ Saved dataset v4 to workspace root: ${outputPathRoot}`);

// Validation
console.log(`Total output lines in v4: ${outputLines.length} (1 header + ${outputLines.length - 1} data rows)`);
const v4Header = parseCSVLine(outputLines[0]);
console.log(`Total columns in v4: ${v4Header.length}`);
console.log(`Last column: ${v4Header[v4Header.length - 1]}`);
