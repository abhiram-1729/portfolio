import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './utils/prisma.js';
import supabase from './utils/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../frontend/src/assets/product_image');
const BUCKET_NAME = 'product-images';

const MAPPING = {
  "amul gold milk.jpg": "Amul Gold Milk 1L",
  "amul.webp": "Amul Taza Milk 500ml",
  "britania.jpeg": "Britannia Good Day",
  "chips.jpeg": "Lays Classic Salted",
  "coca cola 1l.webp": "Coca-Cola 1L",
  "coca.jpg": "Coca-Cola 500ml",
  "dove.webp": "Dove Soap 100g",
  "lays magic masala.jpeg": "Lays Magic Masala",
  "lays.jpeg": "Lays American Onion",
  "lifeboy.webp": "Lifebuoy Soap 100g",
  "parle monaco.jpeg": "Parle Monaco",
  "parleg.webp": "Parle-G Biscuits",
  "pepsi.webp": "Pepsi 500ml",
  "surfexcel.webp": "Surf Excel Liquid 500ml",
  "tropicana.jpeg": "Tropicana Orange 1L",
  "tropicanna.webp": "Tropicana Apple 1L"
};

async function uploadImages() {
  console.log('🚀 Starting image upload process...');

  // 1. Ensure Bucket Exists (This might fail if using Anon key, but we'll try)
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('❌ Error listing buckets:', bucketError.message);
  } else {
    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`📦 Creating bucket: ${BUCKET_NAME}...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
        });
        if (createError) {
            console.error('❌ Could not create bucket (likely permissions):', createError.message);
            console.log('⚠️ Please ensure a public bucket named "product-images" exists in your Supabase dashboard.');
        }
    }
  }

  // 2. Upload and Update
  for (const [filename, productName] of Object.entries(MAPPING)) {
    const filePath = path.join(IMAGES_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: File not found: ${filename}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const extension = path.extname(filename).replace('.', '');
    const contentType = extension === 'webp' ? 'image/webp' : 
                         extension === 'png' ? 'image/png' : 'image/jpeg';

    console.log(`📤 Uploading ${filename} for ${productName}...`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`products/${filename}`, fileBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`❌ Upload failed for ${filename}:`, uploadError.message);
      continue;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`products/${filename}`);

    console.log(`✅ Success: ${publicUrl}`);

    // Update DB
    try {
        const product = await prisma.product.findFirst({
            where: { name: productName }
        });

        if (product) {
            await prisma.product.update({
                where: { id: product.id },
                data: { image: publicUrl }
            });
            console.log(`✨ Database updated for ${productName}`);
        } else {
            console.warn(`⚠️ Product not found in database: ${productName}`);
        }
    } catch (dbError) {
        console.error(`❌ DB Update failed for ${productName}:`, dbError.message);
    }
  }

  console.log('🏁 Process complete!');
}

uploadImages()
  .catch(err => console.error('🔥 FATAL ERROR:', err))
  .finally(() => prisma.$disconnect());
