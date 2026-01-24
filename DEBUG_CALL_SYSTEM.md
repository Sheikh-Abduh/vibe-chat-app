# 🔧 Debug Call System - Step by Step

## 🚨 **Current Issues**
- Call popup not showing for receiver
- Calls not connecting properly

## 🔍 **Debugging Steps**

### **Step 1: Test Basic Popup**
1. Open your app in development mode
2. Look for the **"Test Popup"** button in the top-right corner
3. Click it to test if the IncomingCall component renders correctly
4. **Expected**: Full-screen popup should appear with test caller info

### **Step 2: Check Debug Panel**
1. Look for the **"Call Debug & Test"** panel in the bottom-right corner
2. Check the current status and connection state
3. Try clicking **"Test Voice Call"** button
4. Watch the debug logs for any errors

### **Step 3: Browser Console Debugging**
Open browser console and look for:

```javascript
// Expected logs when making a call:
"Starting voice call..."
"Call notification sent via localStorage: [callId]"
"Connected to room"

// Expected logs when receiving a call:
"Found incoming call: [callData]"
"IncomingCall component props: { visible: true, callerName: '...' }"
```

### **Step 4: Check LiveKit Token Generation**
1. Open Network tab in browser dev tools
2. Try making a call
3. Look for request to `/api/livekit-token`
4. **Expected**: 200 response with token

### **Step 5: Verify Environment Variables**
Check that these are set correctly:
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://vibe-4mwm9qhe.livekit.cloud
LIVEKIT_API_KEY=APIaKFYU3u3XzLZ
LIVEKIT_API_SECRET=WHJhmNNCyAaWrXXb8zjyEgMu6KhU3kpCubV4yH5VzYH
```

## 🛠️ **Common Issues & Solutions**

### **Issue: Popup Not Showing**
**Possible Causes:**
- `incomingFromUserId` state not being set
- Component visibility logic incorrect
- CSS z-index issues

**Debug Steps:**
1. Check console for "IncomingCall component props" logs
2. Verify `webrtc.incomingFromUserId` is not null
3. Test with the "Test Popup" button

### **Issue: Calls Not Connecting**
**Possible Causes:**
- LiveKit token generation failing
- Network connectivity issues
- Incorrect room names

**Debug Steps:**
1. Check Network tab for `/api/livekit-token` requests
2. Verify LiveKit URL is accessible
3. Check console for WebRTC errors

### **Issue: No Audio/Video**
**Possible Causes:**
- Browser permissions not granted
- HTTPS required for WebRTC
- Device access issues

**Debug Steps:**
1. Check browser permissions for microphone/camera
2. Ensure app is served over HTTPS
3. Test device enumeration

## 🔧 **Quick Fixes**

### **Fix 1: Force Popup Test**
Add this to browser console:
```javascript
// Force show incoming call popup
window.testIncomingCall = () => {
  const event = new CustomEvent('test-incoming-call', {
    detail: { callerId: 'test', callerName: 'Test User' }
  });
  window.dispatchEvent(event);
};
window.testIncomingCall();
```

### **Fix 2: Check LocalStorage**
```javascript
// Check for call notifications in localStorage
console.log('Incoming calls:', localStorage.getItem('incoming_call_' + 'YOUR_USER_ID'));
console.log('All localStorage:', Object.keys(localStorage).filter(k => k.includes('call')));
```

### **Fix 3: Manual State Update**
In React DevTools, find the LiveKit hook state and manually set:
```javascript
// Set incoming call state manually
setIncomingFromUserId('test-caller-id');
```

## 📋 **Testing Checklist**

- [ ] Test popup button shows/hides popup correctly
- [ ] Debug panel shows current call state
- [ ] Console shows call notification logs
- [ ] Network tab shows token requests
- [ ] Browser permissions granted
- [ ] HTTPS enabled
- [ ] LiveKit credentials correct
- [ ] Room creation successful
- [ ] Audio/video permissions working

## 🚀 **Next Steps**

1. **Start with basic popup test** - Use the "Test Popup" button
2. **Check console logs** - Look for errors or missing logs
3. **Verify token generation** - Check Network tab
4. **Test with two browsers** - Open same conversation in both
5. **Check localStorage** - Verify call notifications are stored

## 📞 **Expected Working Flow**

1. User A clicks call button
2. Debug panel shows "Calling..." status
3. localStorage stores call notification for User B
4. User B's app detects notification (within 1 second)
5. User B sees full-screen popup
6. User B accepts → LiveKit room connects
7. Both users hear audio/see video

If any step fails, check the corresponding debug section above! 🔍