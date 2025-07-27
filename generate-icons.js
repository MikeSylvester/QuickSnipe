const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

// Configuration
const sourcePath = './assets/icon.png';
const outputDir = './assets/icons';
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

// Check if source icon exists
if (!fs.existsSync(sourcePath)) {
  console.error('❌ Source icon not found!');
  console.log('📋 Please place your icon.png file in the assets/ folder');
  console.log('📋 The icon should be 1024x1024 pixels for best results');
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('🔄 Generating icons...');
    
    // Generate PNG files for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(sourcePath)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${size}x${size} PNG`);
    }
    
    // Create ICO file (Windows icon)
    const iconPaths = [
      path.join(outputDir, 'icon-16x16.png'),
      path.join(outputDir, 'icon-32x32.png'),
      path.join(outputDir, 'icon-48x48.png'),
      path.join(outputDir, 'icon-64x64.png'),
      path.join(outputDir, 'icon-128x128.png'),
      path.join(outputDir, 'icon-256x256.png')
    ];
    
    // Filter to only include files that exist and read them as buffers
    const existingIcons = iconPaths.filter(p => fs.existsSync(p));
    
    if (existingIcons.length > 0) {
      try {
        const iconBuffers = existingIcons.map(p => fs.readFileSync(p));
        const icoBuffer = await toIco(iconBuffers);
        fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
        console.log('✅ Generated icon.ico file');
      } catch (icoError) {
        console.log('⚠️  Could not generate .ico file, but PNG files are ready');
        console.log('💡 You can manually create the .ico file using online tools');
      }
    }
    
    // Copy 256x256 as main icon.png for electron-builder
    const icon256Path = path.join(outputDir, 'icon-256x256.png');
    if (fs.existsSync(icon256Path)) {
      fs.copyFileSync(icon256Path, path.join(outputDir, 'icon.png'));
      console.log('✅ Copied 256x256 as main icon.png');
    }
    
    console.log('');
    console.log('🎉 Icon generation complete!');
    console.log('📁 Check the ./assets/icons directory for your generated icons.');
    console.log('');
    console.log('📋 Generated files:');
    console.log('   - icon.ico (Windows executable icon)');
    console.log('   - icon.png (256x256 for electron-builder)');
    console.log('   - icon-16x16.png to icon-1024x1024.png (various sizes)');
    console.log('');
    console.log('✅ Your Quicksnipe application is ready to build with the new icon!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 