# 🎨 Icon Setup Guide for Quicksnipe

## 📋 Requirements for Your Source PNG

### **Image Specifications:**
- **Format**: PNG with transparency support
- **Size**: **1024x1024 pixels** (minimum recommended)
- **Background**: Transparent or solid color
- **Design**: Simple, recognizable design that works at small sizes
- **Colors**: High contrast for visibility at small sizes

### **Design Tips:**
- ✅ Keep it simple - avoid complex details
- ✅ Use high contrast colors
- ✅ Test how it looks at 16x16 pixels
- ✅ Ensure it's recognizable in grayscale
- ✅ Leave some padding around the edges

## 🚀 How to Generate Icons

### **Step 1: Prepare Your PNG**
1. Create or edit your icon in an image editor
2. Save as `icon.png` in the `assets/` folder
3. Ensure it's 1024x1024 pixels for best results

### **Step 2: Generate All Icon Sizes**
```bash
npm run generate-icons
```

This will create:
- `assets/icons/icon.ico` - Windows executable icon
- `assets/icons/icon.png` - Various PNG sizes
- `assets/icons/icon.icns` - macOS icon (if needed)

### **Step 3: Build Your Application**
```bash
npm run build
npm run dist
```

## 📁 Generated Files

After running the icon generator, you'll have:
- **16x16** - Taskbar icons
- **32x32** - Windows taskbar
- **48x48** - Windows desktop
- **64x64** - Windows desktop
- **128x128** - Windows desktop
- **256x256** - Windows desktop
- **512x512** - High DPI displays
- **1024x1024** - App store

## 🔧 Troubleshooting

### **Common Issues:**
- **"Source file not found"**: Make sure `icon.png` exists in `assets/` folder
- **"Invalid image format"**: Ensure your PNG is valid and not corrupted
- **"Build failed"**: Check that the icon path in package.json is correct

### **Manual Icon Creation:**
If you prefer to create icons manually, you can use online tools like:
- [Favicon.io](https://favicon.io/favicon-converter/)
- [IcoConvert](https://icoconvert.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## 📱 Icon Usage

The generated icons will be used for:
- **Windows executable** (.exe file icon)
- **Taskbar icon** (when app is running)
- **Desktop shortcut** (if created)
- **Start menu** (if pinned) 