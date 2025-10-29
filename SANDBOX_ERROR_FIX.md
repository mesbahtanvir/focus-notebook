# Fixed: CocoaPods Sandbox Error

## Error
```
Sandbox: bash(82646) deny(1) file-read-data 
/Users/.../ios/App/Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh
```

## Solution Applied

The issue was resolved by:

1. **Cleaning the Xcode build**
   ```bash
   xcodebuild clean -workspace ios/App/App.xcworkspace -scheme App
   ```

2. **Reinstalling CocoaPods**
   ```bash
   cd ios/App
   pod deintegrate
   pod install
   ```

3. **Syncing Capacitor**
   ```bash
   cd ../..
   npx cap sync ios
   ```

## What Happened

The CocoaPods framework scripts were missing proper execute permissions or had gotten out of sync with the Xcode project. Reinstalling pods fixed:
- ✅ Framework script permissions set correctly
- ✅ All dependencies properly integrated
- ✅ Xcode project configured correctly

## Next Steps

Now you should be able to build in Xcode:

1. Open Xcode
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Configure Signing & Capabilities**
   - Select "App" project in left sidebar
   - Select "App" target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (Apple ID)

3. **Build and Run**
   - Press `⌘R` or click Play button
   - Select iPad simulator or your device from the device dropdown

## Prevention

If this happens again, simply run:
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

This ensures pods are always in sync after pulling changes or after running `npm install`.

