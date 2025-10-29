# Build from Xcode (Easiest Solution)

## Quick Fix for PhaseScriptExecution Error

The error you're seeing is caused by macOS sandbox restrictions when building from the terminal. **The easiest solution is to build directly from Xcode**.

### Steps:

1. **Open Xcode**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Configure Signing**
   - Click the blue "App" icon in the left sidebar
   - Select "App" under TARGETS (not PROJECTS)
   - Click "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team from the dropdown
     - If you don't see your team, click "Add Account..." and sign in with your Apple ID

3. **Select Device/Simulator**
   - In the top toolbar, use the device dropdown
   - Select "iPad Pro 11-inch (M4)" or any iPad simulator
   - Or select "Mesbah's M1 iPad Pro" if you want to run on your physical device

4. **Build and Run**
   - Press **⌘R** (Command + R)
   - Or click the Play button ▶️ in the top-left

That's it! Xcode will handle everything automatically and bypass the sandbox restrictions.

---

## Why Command Line Builds Fail

Command line builds use Xcode's build system but don't have the same permission context as the Xcode app itself. The CocoaPods "Embed Pods Frameworks" script needs to execute in a sandboxed environment, and only Xcode has the proper entitlements GPu

## Alternative: Disable the Framework Embed Phase

If you MUST build from command line (not recommended), you can:

1. Open Xcode: `open ios/App/App.xcworkspace`
2. Select "App" project → "App" target → Build Phases
3. Expand "[CP] Embed Pods Frameworks"
4. Click the search icon 🔍 and select "None" for input files
5. Change "Shell" to: `/bin/sh`

But **building from Xcode GUI is strongly recommended** as it's the standard approach and avoids all these issues.

---

Need help? Open Xcode and try building - it should work immediately!

