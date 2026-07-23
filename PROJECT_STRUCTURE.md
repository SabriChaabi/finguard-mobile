# Project structure

- `src/App.jsx` – complete application logic and screens
- `src/styles.css` – responsive mobile and desktop design
- `public/manifest.webmanifest` – installable web app metadata
- `public/sw.js` – offline service worker
- `public/icon.svg` – application icon
- `capacitor.config.json` – Android application configuration
- `.github/workflows/build-android.yml` – automatic APK build
- `README.md` – upload, build and installation instructions

The generated `android/` directory is intentionally not committed. GitHub Actions creates it during every build, keeping the repository smaller and easier to upload.
