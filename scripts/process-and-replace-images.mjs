import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = 'C:\\Users\\Shrey\\OneDrive\\Desktop\\Architetcture of Agri\\Product images';
const TARGET_DIR = path.resolve('apps/web/public/images/products');

// Explicit mapping from source file name to target product slug & listing index
const MAPPINGS = [
  // Cereals & Grains
  { source: 'Rice 1.jpg', target: 'rice-1.jpg', crop: 'Rice', varietyIndex: 1 },
  { source: 'Rice 2.jpeg', target: 'rice-2.jpg', crop: 'Rice', varietyIndex: 2 },
  { source: 'Rice 3.jpg', target: 'rice-3.jpg', crop: 'Rice', varietyIndex: 3 },

  { source: 'Wheat 1.jpeg', target: 'wheat-1.jpg', crop: 'Wheat', varietyIndex: 1 },
  { source: 'Wheat 2.jpeg', target: 'wheat-2.jpg', crop: 'Wheat', varietyIndex: 2 },
  { source: 'Wheat 3.jpeg', target: 'wheat-3.jpg', crop: 'Wheat', varietyIndex: 3 },

  { source: 'Maize 1.jpeg', target: 'maize-1.jpg', crop: 'Maize', varietyIndex: 1 },
  { source: 'Maize 2.jpeg', target: 'maize-2.jpg', crop: 'Maize', varietyIndex: 2 },
  { source: 'Maize 3.jpeg', target: 'maize-3.jpg', crop: 'Maize', varietyIndex: 3 },

  // Pulses & Legumes
  { source: 'Chick peas 1.jpeg', target: 'chickpea-1.jpg', crop: 'Chickpea', varietyIndex: 1 },
  { source: 'Chick peas 2.jpg', target: 'chickpea-2.jpg', crop: 'Chickpea', varietyIndex: 2 },
  { source: 'Chick peas 3.jpeg', target: 'chickpea-3.jpg', crop: 'Chickpea', varietyIndex: 3 },

  { source: 'Green gram 1.jpeg', target: 'green-gram-1.jpg', crop: 'Green Gram', varietyIndex: 1 },
  { source: 'Green gram 2.jpeg', target: 'green-gram-2.jpg', crop: 'Green Gram', varietyIndex: 2 },
  { source: 'Green gram 3.jpeg', target: 'green-gram-3.jpg', crop: 'Green Gram', varietyIndex: 3 },

  { source: 'Black gram 1.png', target: 'black-gram-1.jpg', crop: 'Black Gram', varietyIndex: 1 },
  { source: 'Black gram 2.jpeg', target: 'black-gram-2.jpg', crop: 'Black Gram', varietyIndex: 2 },
  { source: 'Black gram 3.jpeg', target: 'black-gram-3.jpg', crop: 'Black Gram', varietyIndex: 3 },

  // Vegetables
  { source: 'Potato 1.jpeg', target: 'potato-1.jpg', crop: 'Potato', varietyIndex: 1 },
  { source: 'Potato 2.jpeg', target: 'potato-2.jpg', crop: 'Potato', varietyIndex: 2 },
  { source: 'Potato 3.jpeg', target: 'potato-3.jpg', crop: 'Potato', varietyIndex: 3 },

  { source: 'Onion 1.jpeg', target: 'onion-1.jpg', crop: 'Onion', varietyIndex: 1 },
  { source: 'Onion 2.jpeg', target: 'onion-2.jpg', crop: 'Onion', varietyIndex: 2 },
  { source: 'Onion 3.jpeg', target: 'onion-3.jpg', crop: 'Onion', varietyIndex: 3 },

  { source: 'Tomato 1.jpeg', target: 'tomato-1.jpg', crop: 'Tomato', varietyIndex: 1 },
  { source: 'Tomato 2.jpeg', target: 'tomato-2.jpg', crop: 'Tomato', varietyIndex: 2 },
  { source: 'Tomato 3.jpeg', target: 'tomato-3.jpg', crop: 'Tomato', varietyIndex: 3 },

  // Fruits
  { source: 'Mango 1.jpeg', target: 'mango-1.jpg', crop: 'Mango', varietyIndex: 1 },
  { source: 'Mango 2.jpeg', target: 'mango-2.jpg', crop: 'Mango', varietyIndex: 2 },
  { source: 'Mango 3.jpg', target: 'mango-3.jpg', crop: 'Mango', varietyIndex: 3 },

  { source: 'Banana 1.jpg', target: 'banana-1.jpg', crop: 'Banana', varietyIndex: 1 },
  { source: 'Banana 2.jpeg', target: 'banana-2.jpg', crop: 'Banana', varietyIndex: 2 },
  { source: 'Banana 3.jpeg', target: 'banana-3.jpg', crop: 'Banana', varietyIndex: 3 },

  { source: 'Apple 1.jpeg', target: 'apple-1.jpg', crop: 'Apple', varietyIndex: 1 },
  { source: 'Apple 2.jpeg', target: 'apple-2.jpg', crop: 'Apple', varietyIndex: 2 },
  { source: 'Apple 3.jpeg', target: 'apple-3.jpg', crop: 'Apple', varietyIndex: 3 },

  // Oilseeds
  { source: 'Soybean 1.jpeg', target: 'soybean-1.jpg', crop: 'Soybean', varietyIndex: 1 },
  { source: 'Soybean 2.jpeg', target: 'soybean-2.jpg', crop: 'Soybean', varietyIndex: 2 },
  { source: 'Soy bean 3.jpeg', target: 'soybean-3.jpg', crop: 'Soybean', varietyIndex: 3 },

  { source: 'Groundnut 1.jpeg', target: 'groundnut-1.jpg', crop: 'Groundnut', varietyIndex: 1 },
  { source: 'Groundnut 2.jpeg', target: 'groundnut-2.jpg', crop: 'Groundnut', varietyIndex: 2 },
  { source: 'Groundnut 3.webp', target: 'groundnut-3.jpg', crop: 'Groundnut', varietyIndex: 3 },

  { source: 'Mustard seed 1.jpg', target: 'mustard-1.jpg', crop: 'Mustard', varietyIndex: 1 },
  { source: 'Mustard seed 2.jpeg', target: 'mustard-2.jpg', crop: 'Mustard', varietyIndex: 2 },
  { source: 'Mustard seed.jpeg', target: 'mustard-3.jpg', crop: 'Mustard', varietyIndex: 3 },

  // Spices
  { source: 'Turmeric 1.jpeg', target: 'turmeric-1.jpg', crop: 'Turmeric', varietyIndex: 1 },
  { source: 'Tumeric 2.jpg', target: 'turmeric-2.jpg', crop: 'Turmeric', varietyIndex: 2 },
  { source: 'Tumeric 3.webp', target: 'turmeric-3.jpg', crop: 'Turmeric', varietyIndex: 3 },

  { source: 'Red chilli 1.jpg', target: 'dry-red-chilli-1.jpg', crop: 'Dry Red Chilli', varietyIndex: 1 },
  { source: 'Red chilli 2.jpeg', target: 'dry-red-chilli-2.jpg', crop: 'Dry Red Chilli', varietyIndex: 2 },
  { source: 'Red chilli 3.jpeg', target: 'dry-red-chilli-3.jpg', crop: 'Dry Red Chilli', varietyIndex: 3 },

  { source: 'Cumin 1.jpeg', target: 'cumin-1.jpg', crop: 'Cumin', varietyIndex: 1 },
  { source: 'Cumin 2.jpeg', target: 'cumin-2.jpg', crop: 'Cumin', varietyIndex: 2 },
  { source: 'Cumin 3.jpeg', target: 'cumin-3.jpg', crop: 'Cumin', varietyIndex: 3 },

  // Commercial / Fiber / Cash Crops
  { source: 'Cotton 1.jpeg', target: 'cotton-1.jpg', crop: 'Cotton', varietyIndex: 1 },
  { source: 'Cotton 2.webp', target: 'cotton-2.jpg', crop: 'Cotton', varietyIndex: 2 },
  { source: 'Cotton 3.jpeg', target: 'cotton-3.jpg', crop: 'Cotton', varietyIndex: 3 },

  { source: 'Sugarcane 1', target: 'sugarcane-1.jpg', crop: 'Sugarcane', varietyIndex: 1 },
  { source: 'Sugarcane 2.jpeg', target: 'sugarcane-2.jpg', crop: 'Sugarcane', varietyIndex: 2 },
  { source: 'Sugarcane 3.jpeg', target: 'sugarcane-3.jpg', crop: 'Sugarcane', varietyIndex: 3 },

  { source: 'Jute 1.jpg', target: 'jute-1.jpg', crop: 'Jute', varietyIndex: 1 },
  { source: 'Jute 2.jpeg', target: 'jute-2.jpg', crop: 'Jute', varietyIndex: 2 },
  { source: 'Jute 3.webp', target: 'jute-3.jpg', crop: 'Jute', varietyIndex: 3 },

  // Plantation Crops
  { source: 'Tea 1.jpeg', target: 'tea-leaves-1.jpg', crop: 'Tea Leaves', varietyIndex: 1 },
  { source: 'Tea 2.jpeg', target: 'tea-leaves-2.jpg', crop: 'Tea Leaves', varietyIndex: 2 },
  { source: 'Tea 3.jpeg', target: 'tea-leaves-3.jpg', crop: 'Tea Leaves', varietyIndex: 3 },

  { source: 'Coffee 1.jpeg', target: 'coffee-1.jpg', crop: 'Coffee', varietyIndex: 1 },
  { source: 'Coffee 2.jpg', target: 'coffee-2.jpg', crop: 'Coffee', varietyIndex: 2 },
  { source: 'Coffee 3.jpg', target: 'coffee-3.jpg', crop: 'Coffee', varietyIndex: 3 },

  { source: 'Coconut 1.jpeg', target: 'coconut-1.jpg', crop: 'Coconut', varietyIndex: 1 },
  { source: 'Coconut 2.jpeg', target: 'coconut-2.jpg', crop: 'Coconut', varietyIndex: 2 },
  { source: 'Coconut 3.jpeg', target: 'coconut-3.jpg', crop: 'Coconut', varietyIndex: 3 },

  // Fodder Crops
  { source: 'berseem 1.jpg', target: 'berseem-1.jpg', crop: 'Berseem', varietyIndex: 1 },
  { source: 'berseem 2.jpg', target: 'berseem-2.jpg', crop: 'Berseem', varietyIndex: 2 },
  { source: 'besreem 3.jpeg', target: 'berseem-3.jpg', crop: 'Berseem', varietyIndex: 3 },

  { source: 'Luecerne 1.jpeg', target: 'lucerne-1.jpg', crop: 'Lucerne', varietyIndex: 1 },
  { source: 'Luecerne 2.jpeg', target: 'lucerne-2.jpg', crop: 'Lucerne', varietyIndex: 2 },
  { source: 'Luecerne 3.jpeg', target: 'lucerne-3.jpg', crop: 'Lucerne', varietyIndex: 3 },

  { source: 'Fodder Maize 1.jpeg', target: 'fodder-maize-1.jpg', crop: 'Fodder Maize', varietyIndex: 1 },
  { source: 'Fodder Maize 2', target: 'fodder-maize-2.jpg', crop: 'Fodder Maize', varietyIndex: 2 },
  { source: 'Fodder Maize 3.png', target: 'fodder-maize-3.jpg', crop: 'Fodder Maize', varietyIndex: 3 },

  // Floriculture
  { source: 'Marigold 1.jpeg', target: 'marigold-1.jpg', crop: 'Marigold', varietyIndex: 1 },
  { source: 'Marigold 2.jpeg', target: 'marigold-2.jpg', crop: 'Marigold', varietyIndex: 2 },
  { source: 'Marigold 3.jpeg', target: 'marigold-3.jpg', crop: 'Marigold', varietyIndex: 3 },

  { source: 'Rose 1.jpeg', target: 'rose-1.jpg', crop: 'Rose', varietyIndex: 1 },
  { source: 'Rose 2.jpeg', target: 'rose-2.jpg', crop: 'Rose', varietyIndex: 2 },
  { source: 'Rose 3.jpeg', target: 'rose-3.jpg', crop: 'Rose', varietyIndex: 3 },

  // Medicinal & Aromatic Plants
  { source: 'Ashwagandha 1.jpeg', target: 'ashwagandha-1.jpg', crop: 'Ashwagandha', varietyIndex: 1 },
  { source: 'Ashwagandha 2.jpg', target: 'ashwagandha-2.jpg', crop: 'Ashwagandha', varietyIndex: 2 },
  { source: 'Ashwagandha 3.jpeg', target: 'ashwagandha-3.jpg', crop: 'Ashwagandha', varietyIndex: 3 },
];

async function main() {
  console.log(`Starting image processing for ${MAPPINGS.length} listings...`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  // Check that all source files exist
  const missing = [];
  for (const m of MAPPINGS) {
    const srcPath = path.join(SOURCE_DIR, m.source);
    if (!fs.existsSync(srcPath)) {
      missing.push(m.source);
    }
  }

  if (missing.length > 0) {
    console.error(`Error: ${missing.length} source files missing:`, missing);
    process.exit(1);
  }

  console.log(`All ${MAPPINGS.length} source files confirmed present.`);

  let processedCount = 0;
  for (const m of MAPPINGS) {
    const srcPath = path.join(SOURCE_DIR, m.source);
    const destPath = path.join(TARGET_DIR, m.target);

    try {
      const meta = await sharp(srcPath).metadata();
      const minDim = Math.min(meta.width, meta.height);
      const maxDim = Math.max(meta.width, meta.height);

      let targetW = meta.width;
      let targetH = meta.height;
      let s = 1.0;

      // Upscale low-res images so minimum dimension is at least 960px for high-DPI cards
      if (minDim < 960) {
        s = 960 / minDim;
        targetW = Math.round(meta.width * s);
        targetH = Math.round(meta.height * s);
      } else if (maxDim > 1600) {
        // Downscale excessively large images to max 1600px for performance
        s = 1600 / maxDim;
        targetW = Math.round(meta.width * s);
        targetH = Math.round(meta.height * s);
      }

      // Adaptive sharpening based on upscale magnitude
      let sharpenParams;
      if (s >= 3.0) {
        sharpenParams = { sigma: 1.4, m1: 2.0, m2: 0.8 };
      } else if (s >= 1.5) {
        sharpenParams = { sigma: 1.2, m1: 1.5, m2: 0.6 };
      } else if (s > 1.0) {
        sharpenParams = { sigma: 1.0, m1: 1.2, m2: 0.5 };
      } else {
        sharpenParams = { sigma: 0.8, m1: 1.0, m2: 0.5 };
      }

      let pipeline = sharp(srcPath);

      if (targetW !== meta.width || targetH !== meta.height) {
        pipeline = pipeline.resize(targetW, targetH, {
          kernel: sharp.kernel.lanczos3,
          fit: 'fill'
        });
      }

      await pipeline
        .sharpen(sharpenParams)
        .modulate({ brightness: 1.01, saturation: 1.04 })
        .jpeg({
          quality: 95,
          chromaSubsampling: '4:4:4',
          mozjpeg: true
        })
        .toFile(destPath);

      const stats = fs.statSync(destPath);
      processedCount++;
      console.log(`[${processedCount}/${MAPPINGS.length}] ${m.crop} #${m.varietyIndex}: ${m.source} (${meta.width}x${meta.height}) -> ${m.target} (${targetW}x${targetH}, s=${s.toFixed(2)}, ${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`Failed to process ${m.source} -> ${m.target}:`, err);
      process.exit(1);
    }
  }

  console.log(`\nSuccessfully processed and replaced all ${processedCount} product images!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
