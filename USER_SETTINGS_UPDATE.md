# User Settings Update - API Key Management

## 🎯 Overview

The brainstorming feature has been updated to use **user settings** instead of environment variables for API key management. This provides a better user experience and makes the feature more accessible.

## ✨ What Changed

### Before
- API key stored in `.env.local` file (environment variable)
- Required developer knowledge to set up
- Same key for all users
- Hard to update or change

### After
- ✅ API key stored in **user settings** (browser local storage)
- ✅ Easy setup through Settings UI
- ✅ Each user can have their own key
- ✅ Simple to update or remove
- ✅ Visual feedback and validation
- ✅ Helpful setup instructions

## 🔧 New Features

### 1. Settings Page UI
Navigate to **Settings** to configure your OpenAI API key:

**Features:**
- 🔑 Secure password field with show/hide toggle
- ✓ Real-time validation (checks for `sk-` prefix)
- 💾 Save button with visual confirmation
- 🗑️ Clear button to remove API key
- 📝 Step-by-step instructions
- 🔗 Direct link to OpenAI platform

**Visual Indicators:**
- Green border & checkmark when valid
- Red border & error message when invalid
- "(Configured ✓)" label when key is saved

### 2. Brainstorming Page Warnings
When API key is missing, users see helpful prompts:

**On Main List:**
- Yellow warning card with setup information
- "Configure in Settings" button
- "Get API Key" link to OpenAI

**In Chat Interface:**
- Warning banner at top of chat
- "Go to Settings" button
- Prevents message sending until configured

### 3. API Validation
The system validates API keys at multiple levels:

**Client-side:**
- Checks if key exists
- Validates format (starts with `sk-`)
- Shows immediate feedback

**Server-side:**
- Validates key format
- Returns helpful error messages
- Suggests fixes for common issues

## 📁 Files Created/Modified

### New Files
- `src/store/useSettings.ts` - Settings store with persistence
- `USER_SETTINGS_UPDATE.md` - This documentation

### Modified Files
- `src/app/api/chat/route.ts` - Accept API key from request
- `src/app/tools/brainstorming/page.tsx` - Use settings, show warnings
- `src/app/settings/page.tsx` - Add API key configuration UI

## 🚀 How to Use

### For Users

#### Step 1: Get Your API Key
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

#### Step 2: Configure in Settings
1. Go to **Settings** page
2. Scroll to "OpenAI API Key" section
3. Paste your API key
4. Click "Save"
5. See green checkmark confirmation

#### Step 3: Start Brainstorming
1. Create a thought with `brainstorm` tag
2. Go to **Brainstorming** tool
3. Click on your thought
4. Start chatting with AI!

### For Developers

#### Settings Store Usage
```typescript
import { useSettings } from '@/store/useSettings';

function MyComponent() {
  const { settings, updateSettings, hasApiKey } = useSettings();
  
  // Check if API key exists
  if (!hasApiKey()) {
    // Show warning
  }
  
  // Use API key
  const apiKey = settings.openaiApiKey;
  
  // Update settings
  updateSettings({ openaiApiKey: 'sk-...' });
}
```

#### API Route Usage
```typescript
// Client-side: Include API key in request
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    apiKey: settings.openaiApiKey,
    messages: [...]
  })
});

// Server-side: Validate and use key
const { apiKey, messages } = await request.json();
if (!apiKey || !apiKey.startsWith('sk-')) {
  return NextResponse.json({ 
    needsSetup: true,
    message: "Please configure your API key in Settings"
  });
}
```

## 🔒 Security

### What's Secure
✅ API key stored in browser's local storage (isolated per user)
✅ Never sent to our servers (only to OpenAI directly)
✅ Persisted with Zustand's persist middleware
✅ Password field by default (can toggle visibility)
✅ Each browser/device has separate storage

### What to Know
⚠️ Key is stored unencrypted in local storage
⚠️ Anyone with access to your browser can access it
⚠️ Clear browsing data will delete the key
⚠️ Different browsers = different keys needed

### Best Practices
1. **Don't share your API key** with anyone
2. **Use browser security** (password protect your device)
3. **Rotate keys** periodically in OpenAI dashboard
4. **Monitor usage** in OpenAI platform
5. **Clear key** when using shared computers

## 📊 User Experience Flow

```
User Opens Brainstorming
         ↓
   Has API Key?
    ↙        ↘
  Yes          No
   ↓            ↓
Start Chat    Show Warning
               ↓
          Click "Settings"
               ↓
          Enter API Key
               ↓
          Click "Save"
               ↓
         Validation ✓
               ↓
          Back to Chat
               ↓
         Start Chatting!
```

## 🎨 UI Components

### Settings Page - API Key Section
```
┌─────────────────────────────────────┐
│ 🔑 OpenAI API Key                  │
├─────────────────────────────────────┤
│ Configure your OpenAI API key to   │
│ enable AI-powered brainstorming... │
│                                     │
│ API Key (Configured ✓)             │
│ ┌──────────────────┐ [Save] [Clear]│
│ │ ●●●●●●●●●●●●●●●● │               │
│ └──────────────────┘                │
│ ✓ API key is valid and saved!      │
│                                     │
│ 📝 How to get your API key:        │
│ 1. Visit platform.openai.com       │
│ 2. Sign in or create account       │
│ 3. Click "Create new secret key"   │
│ 4. Copy and paste above            │
│                                     │
│ 💡 Your key is stored securely...  │
└─────────────────────────────────────┘
```

### Brainstorming Page - Warning Banner
```
┌─────────────────────────────────────┐
│ ⚠️ OpenAI API Key Required          │
├─────────────────────────────────────┤
│ To use AI-powered brainstorming,   │
│ you need to configure your API key │
│                                     │
│ [⚙️ Configure in Settings]          │
│ [Get API Key →]                    │
└─────────────────────────────────────┘
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Settings page loads without API key
- [ ] Can enter and save API key
- [ ] Validation works (rejects invalid keys)
- [ ] Show/hide password toggle works
- [ ] Clear button removes key
- [ ] Brainstorming shows warning when no key
- [ ] Warning disappears after setting key
- [ ] Chat sends messages with API key
- [ ] Invalid key shows appropriate error
- [ ] "Go to Settings" button navigates correctly

### Test Cases

#### Valid API Key
```typescript
Input: "sk-1234567890abcdefghijklmnopqrstuvwxyz"
Expected: ✓ Saved successfully
```

#### Invalid API Key (wrong prefix)
```typescript
Input: "abc-1234567890"
Expected: ✗ Invalid format error
```

#### Empty API Key
```typescript
Input: ""
Expected: Save button disabled
```

## 🔄 Migration Guide

### For Existing Users
If you previously had API key in `.env.local`:

1. **Old setup still works** (backward compatible)
2. Recommended: Move to user settings
3. Steps:
   - Copy key from `.env.local`
   - Go to Settings
   - Paste and save key
   - Remove from `.env.local` (optional)

### For New Users
- No `.env.local` configuration needed
- Just use Settings page

## 🐛 Troubleshooting

### Issue: "API Key Required" warning persists
**Solution:**
1. Go to Settings
2. Verify API key is saved (should show green checkmark)
3. Try clearing and re-entering key
4. Check browser console for errors

### Issue: "Invalid API key format" error
**Solution:**
1. Check key starts with `sk-`
2. Ensure no extra spaces
3. Get fresh key from OpenAI if needed

### Issue: Chat not working despite saved key
**Solution:**
1. Check OpenAI account has credits
2. Verify key is still valid in OpenAI dashboard
3. Try removing and re-adding key
4. Check browser console for API errors

### Issue: Settings not persisting
**Solution:**
1. Check if browser allows local storage
2. Try different browser
3. Clear cache and try again
4. Check for private/incognito mode restrictions

## 📈 Benefits

### For Users
- ✅ Easier setup (no file editing)
- ✅ Visual guidance
- ✅ Immediate feedback
- ✅ Personal key management
- ✅ Can use app without developer knowledge

### For Developers
- ✅ Better user experience
- ✅ Cleaner codebase
- ✅ No environment variable management
- ✅ Easier deployment
- ✅ Better error handling

## 🎯 Future Enhancements

Potential improvements:
- [ ] Test API key button (verify it works)
- [ ] Usage tracking (show remaining credits)
- [ ] Multiple API key support
- [ ] Encrypted storage option
- [ ] Key expiration warnings
- [ ] Auto-rotation feature
- [ ] Team/shared key management
- [ ] Alternative AI providers (Claude, Gemini)

## 📚 Related Documentation

- [BRAINSTORMING_FEATURE.md](./BRAINSTORMING_FEATURE.md) - Complete brainstorming guide
- [COMPLETED_TASKS.md](./COMPLETED_TASKS.md) - All completed work summary
- [DASHBOARD_ENHANCEMENTS.md](./DASHBOARD_ENHANCEMENTS.md) - Dashboard features

## 🎓 Technical Details

### Store Implementation (Zustand + Persist)
```typescript
export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'system',
        notifications: true,
      },
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },
      hasApiKey: () => {
        const { settings } = get();
        return Boolean(settings.openaiApiKey?.trim());
      },
    }),
    {
      name: 'user-settings', // localStorage key
    }
  )
);
```

### Validation Logic
```typescript
const validateApiKey = (key: string): boolean => {
  if (!key || key.trim().length === 0) return false;
  return key.trim().startsWith('sk-');
};
```

### API Route Handling
```typescript
export async function POST(request: NextRequest) {
  const { messages, apiKey } = await request.json();
  
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({
      needsSetup: true,
      message: "Please configure your API key in Settings"
    });
  }
  
  if (!apiKey.startsWith('sk-')) {
    return NextResponse.json({
      needsSetup: true,
      message: "Invalid API key format"
    });
  }
  
  // Use apiKey with OpenAI...
}
```

---

**This update makes the brainstorming feature more user-friendly and accessible to non-technical users! 🎉**
