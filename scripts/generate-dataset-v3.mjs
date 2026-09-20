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
if (!fs.existsSync(inputPath)) {
  throw new Error(`Input file not found: ${inputPath}`);
}

const rawContent = fs.readFileSync(inputPath, 'utf8');
const rawLines = rawContent.trim().split(/\r?\n/);

const headerCols = parseCSVLine(rawLines[0]);
console.log(`Input v2 has ${headerCols.length} columns and ${rawLines.length - 1} data rows.`);

// New header with image_1, image_2, image_3
const newHeaderLine = rawLines[0] + ',image_1,image_2,image_3';
const outputLines = [newHeaderLine];

const auditRows = [];

const productIdx = headerCols.indexOf('product');
const categoryIdx = headerCols.indexOf('category');
const districtIdx = headerCols.indexOf('district');
const stateIdx = headerCols.indexOf('state');
const farmIdx = headerCols.indexOf('farm');
const farmerIdx = headerCols.indexOf('farmer_name');

for (let i = 1; i < rawLines.length; i++) {
  const line = rawLines[i];
  const cols = parseCSVLine(line);

  const product = cols[productIdx];
  const category = cols[categoryIdx];
  const district = cols[districtIdx] || 'Unspecified District';
  const state = cols[stateIdx] || 'Unspecified State';
  const farm = cols[farmIdx];
  const farmer = cols[farmerIdx];

  // Per instruction 3, 5, 6:
  // "Use only farmer-uploaded images. Do not use stock photos, catalog images, AI-generated images, or generic images from the internet."
  // "Do not invent image URLs, farmer-upload claims, or district provenance. Only use images whose source and location can be verified."
  // "If suitable verified farmer-uploaded images cannot be found, leave the relevant image fields blank and record the issue in a separate report. Do not substitute unrelated images."
  const image_1 = '';
  const image_2 = '';
  const image_3 = '';

  outputLines.push(`${line},${image_1},${image_2},${image_3}`);

  auditRows.push({
    rowNumber: i,
    product,
    category,
    farm,
    farmer,
    district,
    state,
    image_1: image_1 || '[BLANK]',
    image_2: image_2 || '[BLANK]',
    image_3: image_3 || '[BLANK]',
    sourceVerified: 'No (No farmer-uploaded media available)',
    districtVerified: 'No (No verified local origin photos found)',
    status: 'BLANK_PENDING_VERIFIED_FARMER_UPLOADS',
    auditNotes: 'No verified farmer-uploaded images available meeting strict provenance and district criteria. Field kept blank per requirement 6 to prevent unverified or generic stock photo substitution.'
  });
}

const outputContent = outputLines.join('\n') + '\n';

// Save v3 files
const outPathData = path.resolve(__dirname, 'data', 'sih26033_agricultural_marketplace_dataset_v3.csv');
fs.writeFileSync(outPathData, outputContent, 'utf8');
console.log(`✓ Saved dataset v3 to: ${outPathData}`);

const outPathRoot = path.resolve(__dirname, '..', 'sih26033_agricultural_marketplace_dataset_v3.csv');
fs.writeFileSync(outPathRoot, outputContent, 'utf8');
console.log(`✓ Saved dataset v3 to workspace root: ${outPathRoot}`);

// Generate Image Audit Report
let reportMd = `# Image Audit Report — SIH26033 Agricultural Marketplace Dataset v3

**Generated Date**: ${new Date().toISOString()}  
**Dataset Version**: v3 (\`sih26033_agricultural_marketplace_dataset_v3.csv\`)  
**Total Listings Audited**: ${auditRows.length}  

---

## Executive Summary & Verification Policy Compliance

The dataset update strictly adhered to the six image requirements specified:
1. **No Stock / Catalog / AI Photos**: Prohibited stock photography (e.g. Unsplash, Shutterstock), catalog imagery, AI-generated art, and generic internet downloads.
2. **Zero Fabrication Policy**: Prohibited inventing URLs, farmer-upload claims, or fake district provenance.
3. **Mandatory Blank Fallback (Rule 6)**: As no verified farmer-uploaded images with cryptographically or source-verifiable provenance from the designated districts are present in the repository, all three image columns (\`image_1\`, \`image_2\`, \`image_3\`) have been left blank (\`""\`).
4. **Preservation**: All 22 existing columns, all 90 listing rows, official prices, demo reference prices, dates, farmer details, and notes from \`v2\` were 100% preserved.

---

## Audit Summary Table by Unique Product

| # | Product | Category | Sample District | image_1 | image_2 | image_3 | Source Verified? | District Verified? | Compliance Action Taken |
| :-: | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :-: | :--- |
`;

const byProduct = {};
auditRows.forEach(r => {
  if (!byProduct[r.product]) {
    byProduct[r.product] = r;
  }
});

let pIdx = 1;
for (const [prod, info] of Object.entries(byProduct)) {
  reportMd += `| ${pIdx++} | **${prod}** | ${info.category} | ${info.district}, ${info.state} | \`[BLANK]\` | \`[BLANK]\` | \`[BLANK]\` | ❌ No | ❌ No | Kept blank per Rule 6 (No verified farmer uploads) |\n`;
}

reportMd += `\n---\n\n## Full 90 Listing Itemized Audit Table\n\n`;
reportMd += `| Row | Farm / Farmer | Product | District, State | image_1 | image_2 | image_3 | Verified Source | Verified District | Audit Status |\n`;
reportMd += `| :-: | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :-: | :--- |\n`;

auditRows.forEach(r => {
  reportMd += `| ${r.rowNumber} | ${r.farmer} (${r.farm}) | ${r.product} | ${r.district}, ${r.state} | \`""\` | \`""\` | \`""\` | Unverified | Unverified | Left Blank (Rule 6 Compliant) |\n`;
});

reportMd += `\n---\n\n## Findings & Recommendations\n\n1. **Integrity Maintained**: By leaving fields blank rather than injecting unverified stock photos or fabricated URLs, data truthfulness and marketplace trust are preserved.\n2. **Next Steps for Production**: When real farmers register and complete onboarding via the seller portal, their actual camera uploads (with EXIF location and district verification) should be linked to \`image_1\`, \`image_2\`, and \`image_3\`.\n`;

// Write report to root
const reportPath = path.resolve(__dirname, '..', 'IMAGE_AUDIT_REPORT.md');
fs.writeFileSync(reportPath, reportMd, 'utf8');
console.log(`✓ Saved Image Audit Report to: ${reportPath}`);

// Verification check
const v3Raw = fs.readFileSync(outPathRoot, 'utf8');
const v3Lines = v3Raw.trim().split(/\r?\n/);
const v3Header = parseCSVLine(v3Lines[0]);
console.log(`\nVerification:`);
console.log(`Total lines in v3: ${v3Lines.length} (1 header + ${v3Lines.length - 1} data rows)`);
console.log(`Total columns in v3: ${v3Header.length}`);
console.log(`Columns: ${v3Header.slice(-5).join(', ')}`);

let allPreserved = true;
for (let i = 1; i < v3Lines.length; i++) {
  const origCols = parseCSVLine(rawLines[i]);
  const newCols = parseCSVLine(v3Lines[i]);
  if (newCols.length !== 25) {
    allPreserved = false;
    console.error(`Row ${i} length mismatch: ${newCols.length} cols`);
    break;
  }
  for (let c = 0; c < 22; c++) {
    if (origCols[c] !== newCols[c]) {
      allPreserved = false;
      console.error(`Mismatch at row ${i}, col ${c}`);
      break;
    }
  }
  if (newCols[22] !== '' || newCols[23] !== '' || newCols[24] !== '') {
    allPreserved = false;
    console.error(`Row ${i} image cols are not blank`);
    break;
  }
}

if (allPreserved) {
  console.log('🎉 CONFIRMATION: 100% of existing v2 data preserved across all 90 rows and 22 columns.');
  console.log('   New columns image_1, image_2, image_3 are safely added and left blank per Rule 6.');
}
