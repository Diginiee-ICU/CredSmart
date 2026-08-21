
# Publishing CredSmart to Google Play Store

## Overview
We'll use **Capacitor** to wrap your existing web app into a native Android app that can be published on the Google Play Store. Your app code stays the same — Capacitor packages it into a native shell.

## What Lovable Will Do
1. **Install Capacitor dependencies** into the project:
   - @capacitor/core
   - @capacitor/cli
   - @capacitor/android
   - @capacitor/ios (for future use)

2. **Initialize Capacitor** with your project settings:
   - App ID: `app.lovable.6b46e85aeb19415ca921683cfc1804a3`
   - App Name: `credsmart`
   - Configure live-reload server for development testing

## What You'll Need to Do on Your Computer

After Lovable sets things up, you'll follow these steps locally:

1. **Export to GitHub** — Use the "Export to GitHub" button in Lovable settings to push the code to your own GitHub repository
2. **Clone and install** — Pull the repo to your computer and run `npm install`
3. **Add Android platform** — Run `npx cap add android`
4. **Build and sync** — Run `npm run build` then `npx cap sync`
5. **Open in Android Studio** — Run `npx cap open android`

### Requirements
- **Android Studio** must be installed on your computer (free download from developer.android.com)
- A **Google Play Developer account** ($25 one-time fee) to publish

### Publishing Steps (in Android Studio)
- Generate a signed APK or App Bundle
- Create your Play Store listing (screenshots, description, icon)
- Upload the bundle and submit for review

## Helpful Resource
For a detailed walkthrough, check out the Lovable blog post on building native mobile apps with Capacitor.
