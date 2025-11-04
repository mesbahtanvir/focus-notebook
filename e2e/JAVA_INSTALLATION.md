# Java Installation for Firebase Emulators

Firebase Local Emulator Suite requires **Java** to run. If Java is not installed, the tests will automatically fall back to using mocked Firebase (which still works fine, just less realistic).

## Check if Java is Installed

```bash
java -version
```

If you see version information, Java is installed. If you see an error, you need to install it.

## Installing Java

### macOS (Homebrew)

```bash
# Install OpenJDK 17 (recommended)
brew install openjdk@17

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
java -version
```

### macOS (Official Installer)

1. Visit https://www.oracle.com/java/technologies/downloads/
2. Download Java 17 or later for macOS
3. Run the installer
4. Verify: `java -version`

### Linux (apt)

```bash
sudo apt update
sudo apt install openjdk-17-jdk
java -version
```

### Linux (yum)

```bash
sudo yum install java-17-openjdk
java -version
```

### Windows

1. Visit https://www.oracle.com/java/technologies/downloads/
2. Download Java 17 or later for Windows
3. Run the installer
4. Add Java to PATH:
   - Search for "Environment Variables"
   - Add Java bin directory to PATH
5. Restart terminal
6. Verify: `java -version`

## After Installing Java

Once Java is installed, the Firebase emulators will start automatically when you run tests:

```bash
npm run test:screenshots
```

You should see:
```
🚀 Starting Firebase emulators...
✅ Firebase emulators ready!
```

## If You Don't Want to Install Java

That's fine! The tests will automatically fall back to using **mocked Firebase**, which:
- ✅ Still works for screenshot testing
- ✅ Doesn't require Java
- ✅ Faster to start (no emulator startup time)
- ❌ Less realistic (mocked behavior instead of real Firebase SDK)

You'll see this message when tests run:
```
❌ Java is not installed. Firebase emulators require Java.
📦 Install Java: brew install openjdk@17
⚠️  Skipping emulator setup. Tests will use mocked Firebase instead.
```

Your tests will still run successfully!

## Troubleshooting

### "Java not found" after installation

Make sure Java is in your PATH:

```bash
# Check Java location
which java

# If empty, add to PATH (macOS with Homebrew)
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Emulators still not starting

```bash
# Check if Firebase CLI is installed
firebase --version

# If not installed
npm install -g firebase-tools

# Try starting manually
firebase emulators:start --only auth,firestore
```

### Port conflicts

If ports 9099, 8080, or 4000 are in use:

```bash
# Check what's using the ports
lsof -i :9099
lsof -i :8080
lsof -i :4000

# Kill processes if needed
kill -9 <PID>
```

## Summary

| Scenario | What Happens |
|----------|--------------|
| **Java installed** | ✅ Firebase emulators start automatically<br>Tests use real Firebase SDK locally |
| **Java not installed** | ⚠️ Tests fall back to mocked Firebase<br>Everything still works, just less realistic |

**Recommendation**: Install Java for more realistic testing, but it's optional.
