# App Icon Setup

Please save the beautiful SplitMate icon (the gold dollar sign with slash on dark blue background) as:

`assets/images/app_icon.png`

Required specifications:
- Size: 1024x1024 pixels (high resolution)
- Format: PNG with transparency support
- Should match the design: Dark blue/navy background with golden dollar symbol and diagonal slash

The icon will be automatically processed by flutter_launcher_icons to generate all required sizes for different platforms.

After saving the icon file, run:
```bash
flutter pub get
flutter pub run flutter_launcher_icons:main
```

This will generate the proper sized icons for web, Android, and iOS.
