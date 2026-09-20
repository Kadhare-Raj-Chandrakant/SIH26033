import fs from 'fs';
import path from 'path';

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

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
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function stringifyCsv(headers, rows) {
  const formatCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((r) => headers.map((h) => formatCell(r[h])).join(','));
  return [headerLine, ...rowLines].join('\n');
}

function roundToNiceRupees(amount) {
  if (amount < 100) return Math.round(amount);
  if (amount < 1000) return Math.round(amount / 5) * 5;
  if (amount < 5000) return Math.round(amount / 10) * 10;
  return Math.round(amount / 20) * 20;
}

const csvPaths = [
  path.resolve('sih26033_agricultural_marketplace_dataset_v4.csv'),
  path.resolve('scripts/data/sih26033_agricultural_marketplace_dataset_v4.csv'),
];

for (const p of csvPaths) {
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8');
  const { headers, rows } = parseCsv(content);

  // Process rows by grouping by crop
  const cropGroups = new Map();
  rows.forEach((r) => {
    const crop = r.product;
    if (!cropGroups.has(crop)) cropGroups.set(crop, []);
    cropGroups.get(crop).push(r);
  });

  console.log(`Processing ${cropGroups.size} crops in ${path.basename(p)}...`);

  for (const [crop, cropRows] of cropGroups.entries()) {
    // Check if crop has official mandi modal price
    const sampleMandi = cropRows.find((r) => r.official_mandi_modal_price_inr && parseFloat(r.official_mandi_modal_price_inr) > 0);
    
    if (sampleMandi) {
      const mandiPrice = parseFloat(sampleMandi.official_mandi_modal_price_inr);
      const baseFarmerPrice = mandiPrice * 0.92;

      // Factors for Farm 1, Farm 2, Farm 3
      // Farm 1: ~ -2.5% from base
      // Farm 2: baseline
      // Farm 3: ~ +2.5% from base
      const variations = [0.975, 1.00, 1.025];

      cropRows.forEach((r, idx) => {
        const factor = variations[idx % variations.length];
        const variedPrice = roundToNiceRupees(baseFarmerPrice * factor);
        r.illustrative_farmer_listing_reference_inr = String(variedPrice);
        
        // Update notes or price type if helpful
        r.illustrative_price_type = `Illustrative demo reference only; farm-specific ask benchmarked to mandi`;
      });
      console.log(`✓ ${crop}: Mandi = ₹${mandiPrice} -> Farms: ${cropRows.map(r => '₹' + r.illustrative_farmer_listing_reference_inr).join(', ')}`);
    } else {
      // Unpriced products (Sugarcane, Marigold, Coffee, etc.)
      cropRows.forEach((r) => {
        r.illustrative_farmer_listing_reference_inr = '';
        r.official_mandi_modal_price_inr = '';
      });
      console.log(`- ${crop}: No mandi price; marked unpriced (Out of stock)`);
    }
  }

  const updatedCsv = stringifyCsv(headers, rows);
  fs.writeFileSync(p, updatedCsv, 'utf8');
  console.log(`Saved updated CSV to ${p}`);
}

console.log('All dataset files updated successfully.');
