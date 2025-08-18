# SplitMate App Icon Creation Instructions

## You need to create the PNG version of the SplitMate icon

I've created the SVG design in `app_icon.svg`, but you need to convert it to PNG format for the icon generation to work.

### Steps:
1. Open the `app_icon.svg` file in any design tool (Canva, Figma, GIMP, Inkscape, or even online SVG converters)
2. Export/save it as PNG with these specifications:
   - **Size**: 1024x1024 pixels (high resolution)
   - **Format**: PNG with transparency
   - **Background**: Keep the dark navy circle background
   - **Golden elements**: Ensure the golden dollar sign and border are visible

3. Save the PNG file as: `assets/images/app_icon.png`

### Alternative Quick Solution:
Use an online SVG to PNG converter:
- Go to https://cloudconvert.com/svg-to-png
- Upload `app_icon.svg`
- Set output size to 1024x1024
- Download and rename to `app_icon.png`

### After creating the PNG:
Run these commands to generate all platform icons:
```bash
flutter pub get
flutter pub run flutter_launcher_icons:main
```

This will automatically create all the required icon sizes for Android, iOS, Web, and Windows.

### Current Design:
The SVG shows a dark navy circle with golden dollar sign emoji (💲) and golden border - this matches your SplitMate branding perfectly!
