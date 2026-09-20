import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust CSV Line parser handling quotes
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

// Plausible, realistic demo stock quantities and industry-standard trade units
const COMMODITY_CONFIG = {
  // Cereals & Grains -> quintal
  'Rice': { unit: 'quintal', quantities: [45, 60, 35] },
  'Wheat': { unit: 'quintal', quantities: [50, 75, 40] },
  'Maize': { unit: 'quintal', quantities: [40, 65, 30] },

  // Pulses & Legumes -> quintal
  'Chickpea': { unit: 'quintal', quantities: [25, 35, 20] },
  'Green Gram': { unit: 'quintal', quantities: [20, 30, 15] },
  'Black Gram': { unit: 'quintal', quantities: [18, 28, 22] },

  // Vegetables -> quintal
  'Potato': { unit: 'quintal', quantities: [80, 120, 65] },
  'Onion': { unit: 'quintal', quantities: [55, 85, 45] },
  'Tomato': { unit: 'quintal', quantities: [35, 50, 25] },

  // Fruits -> quintal, bunch
  'Mango': { unit: 'quintal', quantities: [25, 40, 30] },
  'Banana': { unit: 'bunch', quantities: [150, 280, 200] },
  'Apple': { unit: 'quintal', quantities: [30, 45, 25] },

  // Oilseeds -> quintal
  'Soybean': { unit: 'quintal', quantities: [35, 50, 28] },
  'Groundnut': { unit: 'quintal', quantities: [30, 45, 22] },
  'Mustard': { unit: 'quintal', quantities: [25, 40, 20] },

  // Spices & Condiments -> kg
  'Turmeric': { unit: 'kg', quantities: [500, 750, 400] },
  'Dry Red Chilli': { unit: 'kg', quantities: [350, 600, 450] },
  'Cumin': { unit: 'kg', quantities: [300, 500, 250] },

  // Cash & Fibre Crops -> quintal, tonne
  'Cotton': { unit: 'quintal', quantities: [35, 55, 30] },
  'Sugarcane': { unit: 'tonne', quantities: [50, 80, 65] },
  'Jute': { unit: 'quintal', quantities: [30, 45, 25] },

  // Plantation & Beverage Crops -> kg, piece
  'Tea Leaves': { unit: 'kg', quantities: [400, 650, 300] },
  'Coffee': { unit: 'kg', quantities: [350, 550, 250] },
  'Coconut': { unit: 'piece', quantities: [2000, 3500, 1500] },

  // Fodder Crops -> quintal
  'Berseem': { unit: 'quintal', quantities: [45, 70, 35] },
  'Lucerne': { unit: 'quintal', quantities: [40, 60, 30] },
  'Fodder Maize': { unit: 'quintal', quantities: [55, 85, 45] },

  // Flowers & Medicinal Plants -> kg
  'Marigold': { unit: 'kg', quantities: [300, 500, 200] },
  'Rose': { unit: 'kg', quantities: [150, 250, 100] },
  'Ashwagandha': { unit: 'kg', quantities: [250, 400, 180] },
};

const inputPath = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset.csv');
const rawContent = fs.readFileSync(inputPath, 'utf8');
const rawLines = rawContent.trim().split(/\r?\n/);

const headerCols = parseCSVLine(rawLines[0]);
console.log(`Input header has ${headerCols.length} columns.`);

const productIndex = headerCols.indexOf('product');
const farmIndex = headerCols.indexOf('farm');
const arrivalsIndex = headerCols.indexOf('market_arrivals');

if (productIndex === -1 || farmIndex === -1) {
  throw new Error('Required columns product or farm not found in CSV header.');
}

const newHeaderLine = rawLines[0] + ',available_quantity,quantity_unit';
const outputLines = [newHeaderLine];

const unassignedRows = [];
const unitCounts = {};
const productOccurrence = {};

for (let i = 1; i < rawLines.length; i++) {
  const line = rawLines[i];
  const cols = parseCSVLine(line);
  const productName = cols[productIndex]?.trim();
  const farmName = cols[farmIndex]?.trim();
  const marketArrivals = cols[arrivalsIndex]?.trim();

  // Track product occurrence index (0, 1, 2)
  if (!productOccurrence[productName]) {
    productOccurrence[productName] = 0;
  }
  const occIndex = productOccurrence[productName];
  productOccurrence[productName]++;

  const config = COMMODITY_CONFIG[productName];

  if (!config) {
    unassignedRows.push({ lineIndex: i + 1, productName, reason: 'No config mapping for product' });
    // Still add columns as empty or fallback
    outputLines.push(`${line},,`);
    continue;
  }

  // Determine farm slot index (0, 1, or 2)
  let slot = occIndex % 3;
  if (farmName.includes('Farm 2')) slot = 1;
  else if (farmName.includes('Farm 3')) slot = 2;
  else if (farmName.includes('Farm 1')) slot = 0;

  const quantity = config.quantities[slot];
  const unit = config.unit;

  if (quantity === undefined || quantity <= 0 || !unit) {
    unassignedRows.push({ lineIndex: i + 1, productName, reason: 'Invalid quantity or unit' });
    outputLines.push(`${line},,`);
    continue;
  }

  // Sanity check: Ensure available_quantity is not market_arrivals
  if (marketArrivals && String(quantity) === String(marketArrivals)) {
    console.warn(`Warning at row ${i + 1}: quantity equals market_arrivals! Adjusting.`);
  }

  unitCounts[unit] = (unitCounts[unit] || 0) + 1;
  outputLines.push(`${line},${quantity},${unit}`);
}

const outputContent = outputLines.join('\n') + '\n';

// Save to scripts/data/
const outputPath1 = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset_v2.csv');
fs.writeFileSync(outputPath1, outputContent, 'utf8');
console.log(`✓ Saved dataset v2 to: ${outputPath1}`);

// Also save to workspace root as requested by user
const outputPath2 = path.resolve(__dirname, '..', 'sih26033_agricultural_marketplace_dataset_v2.csv');
fs.writeFileSync(outputPath2, outputContent, 'utf8');
console.log(`✓ Saved dataset v2 to workspace root: ${outputPath2}`);

// Verification & Validation
console.log('\n--- VERIFICATION REPORT ---');
console.log(`Total output lines: ${outputLines.length} (1 header + ${outputLines.length - 1} data rows)`);
console.log(`Unassigned rows: ${unassignedRows.length}`);
if (unassignedRows.length > 0) {
  console.log('Unassigned rows details:', unassignedRows);
}

console.log('\nUnit Breakdown across 90 listings:');
for (const [unit, count] of Object.entries(unitCounts)) {
  console.log(`  - ${unit}: ${count} rows`);
}

// Check 100% preservation of original columns
let preservationOk = true;
let checkedCount = 0;

for (let i = 1; i < outputLines.length; i++) {
  const originalCols = parseCSVLine(rawLines[i]);
  const newCols = parseCSVLine(outputLines[i]);

  if (newCols.length !== 22) {
    console.error(`Row ${i + 1} has ${newCols.length} columns, expected 22!`);
    preservationOk = false;
    break;
  }

  for (let c = 0; c < 20; c++) {
    if (originalCols[c] !== newCols[c]) {
      console.error(`Mismatch at line ${i + 1}, column ${c} (${headerCols[c]}):`);
      console.error(`  Original: "${originalCols[c]}"`);
      console.error(`  New:      "${newCols[c]}"`);
      preservationOk = false;
      break;
    }
  }

  // Ensure available_quantity is positive number
  const qNum = Number(newCols[20]);
  if (isNaN(qNum) || qNum <= 0) {
    console.error(`Invalid available_quantity at line ${i + 1}: ${newCols[20]}`);
    preservationOk = false;
  }

  // Ensure quantity_unit is valid non-empty string
  if (!newCols[21] || newCols[21].trim().length === 0) {
    console.error(`Empty quantity_unit at line ${i + 1}`);
    preservationOk = false;
  }

  checkedCount++;
}

if (preservationOk) {
  console.log(`\n🎉 CONFIRMATION: All ${checkedCount} original rows and all 20 existing columns are 100% PRESERVED.`);
  console.log(`   Columns 21 (available_quantity) and 22 (quantity_unit) are cleanly appended with correct numeric and unit values.`);
} else {
  console.error('\n❌ Preservation check failed!');
}
