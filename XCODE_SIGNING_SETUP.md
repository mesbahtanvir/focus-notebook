# Xcode Signing & Capabilities Setup

## Setting Up Your Development Team

To build and run the app on iOS devices or simulators, you need to configure your development team in Xcode.

### Steps:

1. **Open the iOS Project in Xcode**
   ```bash
   cd /Users/mesbahtanvir/src/github.com/mesbahtanvir/focus-notebook
   open ios/App/App.xcworkspace
   # or if workspace doesn't exist:
   open ios/App/App.xcodeproj
   ```

2. **Navigate to Project Settings**
   - In the left sidebar, click on the blue **"App"** icon (top-level project folder)
   - This opens the project settings in the center panel

3. **Select the Target**
   - Under **TARGETS**, select **"App"** (not PROJECTS)

4. **Go to Signing & Capabilities Tab**
   - Click the **"Signing & Capabilities"** tab at the top

5. **Enable Automatically Manage Signing**
   - Check the box for **"Automatically manage signing"**

6. **Select Your Team**
   - Under **"Team"** dropdown, select your Apple ID team
   - If you don't see your team:
     - Click the **"Add Account..."** button
     - Enter your Apple ID and password
     - Click **"Sign In"**
     - Wait for Xcode to load your team
     - Return to Signing & Capabilities and select your team

7. **Note the Bundle Identifier**
   - The Bundle Identifier should be: `com.mesbah.personalnotebook`
   - Xcode will automatically manage the provisioning profile

### Troubleshooting

**"Signing requires a development team"**
- Make sure you've added your Apple ID in Xcode Settings
- Go to **Xcode > Settings** (or Preferences) > **Accounts**
- Click **+** and add your Apple ID

**"No accounts with Apple ID"**
- If you don't have an Apple Developer account, you can use a free Apple ID for development
- Free accounts can run apps on your personal devices
- Paid accounts ($99/year) are needed for App Store distribution

**"Bundle identifier is not available"**
- Xcode should automatically append your team ID to make it unique
- If issues persist, try changing it to something unique like: `com.mesbah.personalnotebook.dev`

### Next Steps

After setting up signing:
1. Build the project: Press **⌘B** (Command + B)
2. Run on simulator: Press **⌘R** (Command + R)
3. Or select a device from the device dropdown and run

### For Free Apple ID (Development Only)

With a free Apple ID:
- ✅ Can build and run on iOS Simulator
- ✅ Can build and run on your personal iPhone/iPad (with USB connection)
- ❌ Cannot distribute to TestFlight
- ❌ Cannot publish to App Store
- ❌ Apps expire after 7 days on physical devices

### For Paid Developer Account ($99/year)

With a paid account:
- ✅ All free account benefits
- ✅ Can distribute via TestFlight
- ✅ Can publish to App Store
- ✅ Apps don't expire on devices
- ✅ Access to beta iOS features

---

Need help? Open the iOS project and follow the steps above. The "Signing & Capabilities" section should show any errors that need to be resolved.

