import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'icon.svg');

  // Verificar que el SVG existe
  if (!fs.existsSync(svgPath)) {
    console.error('❌ El archivo icon.svg no existe en public/');
    return;
  }

  console.log('🚀 Generando iconos PNG...');

  const sizes = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 192, name: 'icon-192-maskable.png', maskable: true },
    { size: 512, name: 'icon-512-maskable.png', maskable: true }
  ];

  for (const { size, name, maskable } of sizes) {
    const outputPath = path.join(publicDir, name);

    try {
      let pipeline = sharp(svgPath)
        .resize(size, size)
        .png();

      // Para iconos maskable, agregar padding para que el contenido sea seguro
      if (maskable) {
        const padding = Math.round(size * 0.1); // 10% padding
        const contentSize = size - (padding * 2);

        pipeline = sharp(svgPath)
          .resize(contentSize, contentSize)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 255, g: 255, b: 255, alpha: 0 } // transparente
          })
          .png();
      }

      await pipeline.toFile(outputPath);
      console.log(`✅ Generado: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error generando ${name}:`, error.message);
    }
  }

  console.log('🎉 ¡Iconos generados exitosamente!');
  console.log('📁 Archivos creados en public/:');
  console.log('   - icon-192.png');
  console.log('   - icon-512.png');
  console.log('   - icon-192-maskable.png');
  console.log('   - icon-512-maskable.png');
}

generateIcons().catch(console.error);