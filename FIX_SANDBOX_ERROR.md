# Fix: CocoaPods Sandbox "Operation not permitted" Error

## The Problem

```
/bin/sh: .../Pods-App-frameworks.sh: Operation not permitted
```

This is a macOS security/permissions issue preventing the CocoaPods script from running.

## Solution Options

### Option 1: Use Xcode GUI (Recommended)

The easiest way to avoid this issue is to build directly from Xcode:

```bash
open ios/App/App.xcworkspace
```

Then in Xcode:
1. Select a device/simulator from the device dropdown
2. Press **⌘R** to build and run
3. Xcode handles permissions automatically

### Option 2: Fix Script Permissions

Try making the script explicitly executable:

```bash
cd ios/App
chmod +x "Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh"
cd ../..
npx cap sync ios
```

### Option 3: Reset Xcode Derived Data

The error might be in Xcode's derived data:

```bash
# Close Xcode first!
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Option 4: Use Full Disk Access (Last Resort)

If you need to build from terminal:

1. **Open System Settings** (System Preferences on older macOS)
2. Go to **Privacy & Security**
3. Click **Full Disk Access**
4. Click the **+** button
5. Navigate to: `/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/sandbox-exec`
6. Add it and restart Terminal

**Warning:** This reduces security. Only do this if absolutely necessary.

### Option 5: Build Without Code Signing

If you just need to test the app structure:

```bash
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO
```

## Recommended Approach

**Just use Xcode GUI:**
1. Open the workspace: `open ios/App/App.xcworkspace`
2. Configure signing (see XCODE_SIGNING_SETUP.md)
3. Build and run with **⌘R**

Xcode handles all sandbox permissions automatically when you build from the IDE.

---

**Note:** This is a common issue with CocoaPods and command-line builds on macOS. Using Xcode's GUI is the standard approach and avoids these permission issues.

