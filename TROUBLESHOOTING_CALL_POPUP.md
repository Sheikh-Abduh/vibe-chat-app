# 🐛 Troubleshooting Call Popup Issues

## Quick Diagnosis Steps

### 1. Check Browser Console
Open browser developer tools (F12) and look for:
- `🌍 GlobalCallManager: Component mounted`
- `🌍 GlobalCallManager: User state: [user-id]`
- `👂 Setting up call listener for user: [user-id]`

If you don't see these logs, the global call manager isn't initializing properly.

### 2. Test Firebase Connection
1. Open `test-firebase-connection.html` in your browser
2. Click "Test Connection" - should show success
3. Click "Test Write" - if this fails, check Firebase rules
4. Click "Test Read" - should read back the test data

### 3. Test Call Signaling
1. Go to `/test-calls` page in your app
2. Enter another user's ID
3. Click "Send Test Call"
4. Check if logs show the call being sent

### 4. Check Firebase Realtime Database Rules
Make sure `database.rules.json` exists with proper permissions:
```json
{
  "rules": {
    "calls": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid || auth.uid != null",
        "incoming": {
          ".read": "$userId === auth.uid",
          ".write": "auth.uid != null"
        },
        "outgoing": {
          ".read": "$userId === auth.uid",
          ".write": "$userId === auth.uid"
        }
      }
    }
  }
}
```

## Common Issues & Solutions

### Issue 1: No Global Call Manager Logs
**Symptoms**: No console logs starting with `🌍 GlobalCallManager`
**Cause**: Component not mounted or user not authenticated
**Solution**: 
- Check if user is logged in
- Verify GlobalCallManager is in app layout
- Check for React errors in console

### Issue 2: Firebase Connection Errors
**Symptoms**: `❌ Firebase listener error` in console
**Cause**: Firebase Realtime Database not configured or rules blocking access
**Solutions**:
- Deploy database rules: `firebase deploy --only database`
- Check Firebase project has Realtime Database enabled
- Verify database URL in firebase config

### Issue 3: Call Signals Not Sending
**Symptoms**: `❌ Error sending call signal` in console
**Cause**: Firebase rules blocking writes or network issues
**Solutions**:
- Check Firebase rules allow writes to `calls/{userId}/incoming`
- Verify user is authenticated
- Check network connectivity

### Issue 4: Call Signals Not Received
**Symptoms**: Sender sees success but receiver gets no popup
**Cause**: Receiver not listening or different user IDs
**Solutions**:
- Verify both users are using correct user IDs
- Check receiver has GlobalCallManager running
- Ensure both users are authenticated

### Issue 5: Popup Appears But No Caller Info
**Symptoms**: Popup shows "Unknown Caller"
**Cause**: Caller info not being fetched from database
**Solutions**:
- Check Firestore user document structure
- Verify profileDetails.displayName exists
- Check network requests in browser dev tools

## Debug Tools

### 1. Call Debug Component
- Go to `/test-calls` page
- Shows real-time call signaling status
- Can send test calls to specific user IDs

### 2. Browser Console Logs
Look for these log patterns:
- `🌍` - Global call manager logs
- `👂` - Call listener setup
- `📤` - Outgoing call signals
- `📥` - Incoming call signals
- `📞` - Call status changes

### 3. Firebase Console
- Check Realtime Database for `calls/{userId}/incoming` data
- Verify rules are deployed
- Check authentication status

## Manual Testing Steps

### Two-Browser Test:
1. Open app in two different browsers/incognito windows
2. Log in as different users (User A and User B)
3. In Browser A: Go to messages, start call with User B
4. In Browser B: Should see popup regardless of current page
5. Test accept/decline functionality

### Network Test:
1. Open browser dev tools → Network tab
2. Start a call
3. Look for Firebase Realtime Database requests
4. Check for any failed requests or errors

## Firebase Setup Checklist

- [ ] Firebase project has Realtime Database enabled
- [ ] Database URL is correct in firebase config
- [ ] `database.rules.json` exists and is deployed
- [ ] Users are properly authenticated
- [ ] Firestore has user documents with profile data

## Code Checklist

- [ ] `GlobalCallManager` is imported in app layout
- [ ] `useCallSignaling` hook is properly initialized
- [ ] Firebase Realtime Database is imported and configured
- [ ] User authentication is working
- [ ] No React errors in console

## Still Not Working?

1. **Check Firebase Project Settings**:
   - Verify Realtime Database is enabled
   - Check database URL matches config
   - Ensure authentication is working

2. **Test with Simple HTML File**:
   - Use `test-firebase-connection.html`
   - Test basic read/write operations
   - Verify Firebase credentials

3. **Check Network**:
   - Disable ad blockers
   - Check firewall settings
   - Try different network/browser

4. **Verify User Data**:
   - Check Firestore user documents exist
   - Verify user IDs are correct
   - Ensure profileDetails are populated

## Getting Help

If still having issues, provide:
1. Browser console logs (especially errors)
2. Firebase project configuration
3. Steps to reproduce the issue
4. Expected vs actual behavior