# Troubleshooting Brainstorming Errors

## 🔍 Error: "Failed to get AI response"

If you're seeing this error, let's diagnose what's happening.

### Step 1: Check Server Logs

Run your app with:
```bash
npm run dev
```

When you send a message, look for these logs in your terminal:

#### ✅ Success Looks Like:
```
🤖 Calling OpenAI API at https://api.openai.com/v1/chat/completions
📝 Using model: gpt-3.5-turbo
💬 Message count: 2
✅ OpenAI API response status: 200
💡 OpenAI response received successfully
📊 Tokens used: { prompt_tokens: 45, completion_tokens: 28, total_tokens: 73 }
```

#### ❌ Error Looks Like:
```
🤖 Calling OpenAI API at https://api.openai.com/v1/chat/completions
📝 Using model: gpt-3.5-turbo
💬 Message count: 2
✅ OpenAI API response status: 401  ← ERROR CODE HERE
❌ OpenAI API Error Details:
Status: 401
Error: {
  "error": {
    "message": "Incorrect API key provided...",
    "type": "invalid_request_error"
  }
}
```

### Step 2: Identify the Error Code

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| **401** | Invalid API Key | Check your API key in Settings |
| **429** | Rate Limit or No Credits | Check OpenAI dashboard for credits |
| **400** | Bad Request | Check the detailed error message |
| **500** | OpenAI Server Error | Wait and try again |
| **Network Error** | Can't reach OpenAI | Check internet connection |

---

## 🔧 Common Issues & Fixes

### Issue #1: Invalid API Key (Status 401)

**Error Message:**
```
"Your API key appears to be invalid. Please check your Settings..."
```

**Solutions:**

1. **Check API Key Format**
   - Should start with `sk-`
   - Should be long (48+ characters)
   - Example: `sk-proj-abc123...`

2. **Verify in Settings**
   - Go to Settings page
   - Check the API key field
   - Should show "(Configured ✓)" if saved

3. **Get a New Key**
   - Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create a new secret key
   - Copy the **entire** key
   - Paste in Settings and click Save

4. **Check for Spaces**
   - Make sure there are no spaces before/after the key
   - Should be exactly: `sk-...` with no whitespace

---

### Issue #2: No Credits / Rate Limit (Status 429)

**Error Message:**
```
"You've hit the rate limit or your OpenAI account is out of credits..."
```

**Solutions:**

1. **Check Your Balance**
   - Go to [platform.openai.com/usage](https://platform.openai.com/usage)
   - Check if you have credits remaining
   - Check your billing settings

2. **Add Credits**
   - Go to [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
   - Add payment method
   - Buy credits or set up auto-recharge

3. **Wait for Rate Limit**
   - If you're rate-limited, wait a few minutes
   - Rate limits reset after a short period

---

### Issue #3: Bad Request (Status 400)

**Error Message:**
```
"There's an issue with the request: [detailed error]"
```

**Common Causes:**

1. **Model Not Available**
   - Your account might not have access to `gpt-3.5-turbo`
   - Try changing the model in `/api/chat/route.ts`:
   ```typescript
   model: 'gpt-3.5-turbo', // Try: 'gpt-4' or other models
   ```

2. **Invalid Message Format**
   - This is less common, but check the console for details
   - The error message will tell you what's wrong

---

### Issue #4: Network Errors

**Error Message:**
```
"I'm having trouble connecting right now..."
```

**Solutions:**

1. **Check Internet Connection**
   - Can you access [openai.com](https://openai.com)?
   - Try in a different browser

2. **Check Firewall/VPN**
   - Some firewalls block OpenAI
   - Try disabling VPN temporarily

3. **Check if OpenAI is Down**
   - Visit [status.openai.com](https://status.openai.com)
   - Check if there are any outages

---

## 🧪 Quick Diagnostic Test

Run this test to check your setup:

### 1. Check API Key is Saved
- Open Settings
- Look for "API Key (Configured ✓)"
- If not there, your key isn't saved

### 2. Test in Browser Console
Open DevTools console and run:
```javascript
// Check if API key exists
const settings = JSON.parse(localStorage.getItem('user-settings') || '{}');
console.log('API Key exists:', settings.state?.settings?.openaiApiKey ? 'YES' : 'NO');
console.log('API Key starts with sk-:', settings.state?.settings?.openaiApiKey?.startsWith('sk-'));
```

### 3. Send Test Message
1. Create a thought with tag `brainstorm`
2. Open brainstorming session
3. Send message: "Hi"
4. Watch terminal for logs
5. Check what status code you get

---

## 📋 Debugging Checklist

- [ ] API key is configured in Settings
- [ ] API key starts with `sk-`
- [ ] OpenAI account has credits
- [ ] Internet connection is working
- [ ] Server is running (`npm run dev`)
- [ ] No errors in browser console
- [ ] Check server terminal for detailed errors
- [ ] Visit OpenAI usage page to confirm API is working

---

## 🎯 Specific Error Messages

### "Your API key appears to be invalid"
→ Status 401 - Invalid API key
→ **Fix**: Get new key from OpenAI platform

### "You've hit the rate limit or out of credits"
→ Status 429 - No credits or rate limited
→ **Fix**: Add credits to OpenAI account

### "There's an issue with the request"
→ Status 400 - Bad request format
→ **Fix**: Check detailed error in server logs

### "I'm having trouble connecting"
→ Network or server error
→ **Fix**: Check internet and OpenAI status

---

## 💡 Still Not Working?

If you've tried everything above:

1. **Check Server Logs Carefully**
   ```bash
   npm run dev
   ```
   Send a message and copy the **entire** error output

2. **Verify API Key Manually**
   - Try using your API key with curl:
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "model": "gpt-3.5-turbo",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```
   
   If this works, the issue is in the app
   If this fails, the issue is with your OpenAI account

3. **Check OpenAI Dashboard**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Check Usage tab
   - Check Billing tab
   - Verify API key is active

4. **Try a Different Browser**
   - Sometimes localStorage issues cause problems
   - Try in incognito/private mode

---

## 🚀 Expected Behavior

When everything works correctly:

1. You type a message
2. Terminal shows:
   ```
   🤖 Calling OpenAI API...
   ✅ OpenAI API response status: 200
   💡 OpenAI response received successfully
   ```
3. AI responds in a few seconds
4. Conversation is saved to thought notes

If you see anything different, use this guide to diagnose!
