# 🧪 Simple Call Test - Basic Functionality

## 🎯 **Goal**
Test the basic call flow without complex LiveKit/Firebase integration to verify:
1. Call popup appears for receiver
2. Ringtones start and stop properly
3. Basic call state management works

## 🔧 **How It Works**
- Uses **localStorage** for simple cross-tab communication
- **No external services** required (no LiveKit, no Firebase)
- **Basic media access** for testing audio/video permissions
- **Simple state management** with clear logging

## 🧪 **Testing Steps**

### **Step 1: Open Two Browser Tabs**
1. Open your app in **Tab 1** (User A)
2. Open your app in **Tab 2** (User B) 
3. Navigate to the **same DM conversation** in both tabs
4. Make sure you see different user IDs in the debug panel

### **Step 2: Test Basic Call Flow**
1. In **Tab 1**, click **"Test Voice Call"** button
2. **Expected**: Tab 1 shows "CALLING..." status
3. **Expected**: Tab 2 should show "INCOMING CALL" within 1-2 seconds
4. In **Tab 2**, click **"Accept"** button
5. **Expected**: Both tabs show "IN CALL" status
6. **Expected**: Ringtones should stop

### **Step 3: Test Ringtones**
1. Make a call from Tab 1
2. **Expected**: Tab 1 plays outgoing ringtone
3. **Expected**: Tab 2 plays incoming ringtone
4. Accept or decline the call
5. **Expected**: Both ringtones stop immediately

### **Step 4: Test Decline**
1. Make a call from Tab 1
2. In Tab 2, click **"Decline"** button
3. **Expected**: Both tabs return to "IDLE" status
4. **Expected**: Ringtones stop

## 🔍 **Debug Information**

### **Check Browser Console**
Look for these logs:
```
🚀 Starting basic call: audio
📤 Simulating call to: [userId]
📤 Call notification stored for: [userId]
📥 Found incoming call: [callData]
✅ Accepting call
❌ Declining call
📞 Hanging up
```

### **Check localStorage**
Open browser dev tools → Application → Local Storage:
- Should see `call_notification_[userId]` entries
- Data should contain caller info and call type

### **Check Debug Panel**
- **Top-left corner**: Simple Call Test panel
- Shows current status and recent logs
- Test buttons for different actions

## 🚨 **Troubleshooting**

### **Issue: No incoming call popup**
**Check:**
- Are you in the same DM conversation in both tabs?
- Do you see different user IDs in the debug panels?
- Check browser console for "Found incoming call" logs
- Check localStorage for call notifications

### **Issue: Ringtones not stopping**
**Check:**
- Does the call status change in the debug panel?
- Check console for "Accepting call" or "Declining call" logs
- Try the "Test Popup" button to verify ringtone component works

### **Issue: No ringtones at all**
**Check:**
- Browser audio permissions
- Volume settings
- Check if `/sounds/ringtone.mp3` file exists
- Try the standalone ringtone test

## ✅ **Expected Results**

If everything works correctly:
1. **Call popup appears** within 1-2 seconds
2. **Ringtones play** for both sender and receiver
3. **Ringtones stop** immediately when accepting/declining
4. **Call state updates** properly in debug panel
5. **Console logs** show clear call flow

## 🚀 **Next Steps**

Once basic functionality works:
1. **Add LiveKit integration** for real audio/video
2. **Add Firebase signaling** for cross-device calls
3. **Add push notifications** for mobile
4. **Add call history** and advanced features

This simple test verifies the core call flow before adding complex integrations! 🎯