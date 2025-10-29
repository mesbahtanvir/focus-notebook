# iPad App Guide

Complete guide for building, running, and distributing your Focus Notebook iPad app.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Building for iPad](#building-for-ipad)
3. [Running on Simulator](#running-on-simulator)
4. [Installing on Physical iPad](#installing-on-physical-ipad)
5. [Publishing to App Store](#publishing-to-app-store)
6. [Troubleshooting](#troubleshooting)
7. [Rebuilding After Changes](#rebuilding-after-changes)

---

## Quick Start

### Prerequisites

✅ **macOS** with Xcode installed  
✅ **Apple ID** (free account works for testing)  
✅ **iPad** or iPad Simulator  

### First Time Setup

```bash
# 1. Install CocoaPods (if not already installed)
brew install cocoapods

# 2. Navigate to iOS project
cd ios/App

# 3. Install dependencies
pod install

# 4. Return to project root
cd ../..

# 5. Build and sync
npm run build
npx cap sync ios

# 6. Open in Xcode
open ios/App/App.xcworkspace
```

That's it! Xcode should open with your project ready.

---

## Building for iPad

### Option 1: Using Xcode (Recommended)

1. **Open the workspace**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Configure signing**
   - Click blue "App" icon (top of left sidebar)
   - Select "App" target
   - Go to "Signing & Capabilities" tab
   - Choose your Team (Apple ID)

3. **Select build target**
   - Use device dropdown (top bar)
   - Choose iPad Simulator or your physical iPad

4. **Build and run**
   - Press `⌘R` or click Play button

### Option 2: Command Line

```bash
# Build the Next.js app
npm run build

# Sync with Capacitor
npx cap sync ios

# Build from command line (requires Xcode)
xcodebuild -workspace ios/App/App.xcworkspace \
           -scheme App \
           -configuration Debug \
           -sdk iphonesimulator \
           -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch)'
```

---

## Running on Simulator

### First Time Setup

1. **Open Xcode workspace**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Select simulator**
   - Top bar → Device dropdown → Choose iPad simulator
   - Recommended: "iPad Pro (12.9-inch)"

3. **Build and run**
   - Press `⌘R` or click Play button
   - Simulator launches automatically
   - App installs and opens

### Quick Commands

```bash
# List available simulators
xcrun simctl list devices

# Open specific simulator
open -a Simulator --args -CurrentDeviceUDID <UUID>

# Reset simulator
xcrun simctl erase all
```

### Simulator Controls

- **Rotate**: `⌘←` / `⌘→` (or menu: Device → Rotate)
- **Home**: `⌘⇧H`
- **Take screenshot**: `⌘S`
- **Close**: `⌘Q`

---

## Installing on Physical iPad

### Requirements

- iPad running iOS 14.0 or later
- USB cable (Lightning or USB-C)
- Free Apple ID or paid Developer account

### Installation Steps

#### 1. Connect iPad

1. **Plug iPad** into your Mac
2. **Unlock iPad** (enter passcode)
3. **Trust computer** (popup appears → tap "Trust")

#### 2. Configure Signing in Xcode

1. **In Xcode**, click blue "App" icon
2. **Select "App" target**
3. **Go to "Signing & Capabilities" tab**
4. **Select Team** (your Apple ID)
5. **Enable "Automatically manage signing"**

#### 3. Enable Developer Mode (iOS 16+)

On your iPad:
- Settings → Privacy & Security → Developer Mode → ON
- Restart iPad

#### 4. Build and Install

1. **Select iPad** from device dropdown (top bar in Xcode)
2. **Press `⌘R`** to build and install
3. **Wait for build** to complete

#### 5. Trust Developer (First Time Only)

On your iPad:
1. Go to Settings → General → VPN & Device Management
2. Find your Apple ID under "Developer App"
3. Tap "Trust [Your Name]"
4. Confirm by tapping "Trust" again

#### 6. Launch App

- Find app icon on iPad home screen
- Tap to open
- App should launch!

### Wireless Installation (iOS 9+)

After first USB install:

1. **In Xcode**: Window → Devices and Simulators
2. **Select your iPad**
3. **Check "Connect via network"**
4. **Disconnect USB cable**
5. **iPad appears** in device menu with wifi icon
6. **Build wirelessly** with `⌘R`

### Free vs Paid Developer Account

| Feature | Free Apple ID | Paid ($99/year) |
|---------|--------------|-----------------|
| Install on own devices | ✅ | ✅ |
| App validity | 7 days | 1 year |
| Max apps on device | 3 | Unlimited |
| TestFlight | ❌ | ✅ |
| App Store | ❌ | ✅ |
| Install on any device | ❌ | ✅ |

---

## Publishing to App Store

### Prerequisites

- **Paid Developer Account** ($99/year)
- App Store Connect access
- App icons (1024x1024px PNG)
- App Store screenshots
- App Store listing information
- Privacy policy URL (required for Firebase apps)

### Step 1: Enroll in Developer Program

1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with Apple ID
4. Pay $99/year subscription
5. Wait 24-48 hours for approval

### Step 2: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: Focus Notebook
   - Language: English
   - Bundle ID: `com.mesbah.personalnotebook`
   - SKU: Unique identifier (e.g., FOCUS001)

### Step 3: Prepare App Assets

#### App Icon
- **Size**: 1024x1024px
- **Format**: PNG (no transparency)
- **Location in Xcode**: AppIcon asset

#### Screenshots
- **iPad Pro 12.9" (2nd gen)**
  - Portrait: 2048 x 2732px
  - Landscape: 2732 x 2048px
- Take in simulator: `⌘S` while running
- Need at least 1, recommended 3-10

### Step 4: Archive and Upload

1. **In Xcode**: Product → Archive
2. **Wait for archiving** to complete (5-10 minutes)
3. **Organizer opens** automatically
4. **Click "Distribute App"**
5. **Select "App Store Connect"** → Next
6. **Click "Upload"** → Next → Upload
7. **Wait for upload** (10-30 minutes)

### Step 5: Complete App Store Listing

1. **Go to App Store Connect** → Your App → "App Store" tab
2. **Fill in**:
   - App Information (name, category, age rating)
   - Pricing (free or paid)
   - Version Information (description, keywords)
   - Screenshots (upload and arrange)
   - Support URL
   - Privacy Policy URL (required)

### Step 6: Submit for Review

1. **Click "Submit for Review"**
2. **Add review notes** (optional but helpful)
3. **Submit**

### Review Timeline

- **Initial review**: 24-48 hours
- **Updates**: 24-48 hours
- **Status updates**: Email notifications

---

## Troubleshooting

### Build Errors

#### "No such module 'Capacitor'"
```bash
cd ios/App
pod install
cd ../..
```

#### "Signing for 'App' requires a development team"
- **Solution**: Select your Team in Signing & Capabilities tab

#### "CocoaPods not installed"
```bash
brew install cocoapods
cd ios/App && pod install
```

### Simulator Issues

#### Simulator won't launch
- Wait for build to complete
- Ensure iPad simulator is selected (not iPhone)

#### App crashes on launch
- Check Xcode console for errors (⌘⇧Y)
- Verify Firebase configuration
- Try Clean Build Folder (⌘⇧K)

### Device Installation Issues

#### iPad not showing in Xcode
- Unlock iPad
- Disconnect and reconnect cable
- Try different USB port or cable
- Check: Window → Devices and Simulators

#### "Unable to verify app"
- Settings → General → VPN & Device Management → Trust

#### "Developer mode is required"
- Settings → Privacy & Security → Developer Mode → ON
- Restart iPad

### Sync Issues

#### Capacitor sync fails
```bash
npx cap sync ios --force
```

#### Changes not appearing
```bash
npm run build
npx cap sync ios
# Then rebuild in Xcode (⌘R)
```

---

## Rebuilding After Changes

### Workflow

Whenever you make changes to your web app:

```bash
# 1. Make your changes
# Edit files in src/

# 2. Build the Next.js app
npm run build

# 3. Sync with Capacitor
npx cap sync ios

# 4. Rebuild in Xcode (if already open)
# Press ⌘R
```

### Important Notes

#### Dynamic Routes

The following dynamic route pages are temporarily disabled:
- `/tools/friends/[id]` → Moved to `_ignore-id/antes`
- `/tools/goals/[id]` → Moved to `_ignore-id/` directory
- `/tools/projects/[id]` → Moved to `_ignore-id/` directory
- `/tools/relationships/[id]` → Moved to `_ignore-id/` directory
- `/tools/thoughts/[id]` → Moved to `_ignore-id/` directory

These were moved to enable static export for Capacitor. The list pages still work. To restore, implement as client-side only routes.

#### Configuration Files

- **Capacitor**: `capacitor.config.ts`
- **iOS Settings**: `ios/App/App/Info.plist`
- **Build Config**: `ios/App/Podfile`
- **Xcode Project**: `ios/App/App.xcodeproj` / `App.xcworkspace`

---

## Quick Reference

### Xcode Shortcuts

- `⌘R` - Build and Run
- `⌘.` - Stop
- `⌘B` - Build
- `⌘⇧K` - Clean Build Folder
- `⌘0` - Toggle Navigator
- `⌘⇧Y` - Toggle Console
- `⌘1-9` - Various panels

### Command Line

```bash
# Build web app
npm run build

# Sync Capacitor
npx cap sync ios

# Open Xcode
open ios/App/App.xcworkspace

# Install pods
cd ios/App && pod install

# List simulators
xcrun simctl list devices
```

### Key Directories

```
focus-notebook/
├── ios/
│   └── App/
│       ├── App.xcworkspace     ← Open this in Xcode
│       ├── Podfile             ← CocoaPods configuration
│       └── App/                ← iOS app code
└── src/                        ← Your web app code
```

---

## Support & Resources

### Documentation

- **Capacitor**: https://capacitorjs.com/docs/ios
- **Apple Developer**: https://developer.apple.com/documentation
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/

### Getting Help

1. Check Xcode console for error messages
2. Review Capacitor docs
3. Check Apple Developer Forums
4. Review project's existing documentation

---

## Success Checklist

- [ ] CocoaPods installed
- [ ] Dependencies installed (`pod install`)
- [ ] App builds in Xcode
- [ ] Runs on iPad simulator
- [ ] Installs on physical iPad
- [ ] Code signing configured
- [ ] All features tested
- [ ] App icons added
- [ ] Ready for App Store (optional)

---

**Need help?** Check the console in Xcode for detailed error messages, or refer to the troubleshooting section above.

