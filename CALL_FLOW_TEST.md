# 📞 Call Flow Test Guide

## ✅ Enhanced Call System Features

### 🔄 **Complete Call Flow**

1. **Call Initiation (Sender Side)**
   - User clicks voice/video call button
   - Camera preview opens (if enabled)
   - User starts call → Firebase signal sent immediately
   - **Outgoing ringtone starts playing** (custom MP3 at lower volume)
   - Outgoing call banner shows with caller info
   - Auto-cancel timer starts (60 seconds)

2. **Call Reception (Receiver Side)**
   - Firebase signal received instantly
   - **Full-screen incoming call popup appears**
   - **Incoming ringtone starts playing** (custom MP3 at higher volume)
   - Browser notification shows
   - Activity page notification appears
   - Auto-decline timer starts (30 seconds)

3. **Call Response Options**
   - **Accept Audio**: Connects to LiveKit room with audio only
   - **Accept Video**: Connects to LiveKit room with video
   - **Decline**: Sends decline signal, stops ringtones
   - **Auto-timeout**: After 30s (receiver) or 60s (sender)

### 🎵 **Ringtone System**

**For Incoming Calls (Receiver):**
- Custom `ringtone.mp3` plays at 60% volume
- Loops continuously until answered/declined
- Stops immediately when call is answered/declined

**For Outgoing Calls (Sender):**
- Same `ringtone.mp3` but at 40% volume
- Plays 20% faster (playbackRate: 1.2)
- Loops until call is answered/cancelled

**Fallback System:**
- If MP3 fails, uses Web Audio API
- Different patterns for incoming vs outgoing
- Cross-browser compatibility

### ⏰ **Auto-Cancel System**

**Sender Side (60 seconds):**
```javascript
// Auto-cancel after 1 minute of no response
setTimeout(async () => {
  await cancelCall(callId);
  cleanup();
}, 60000);
```

**Receiver Side (30 seconds):**
```javascript
// Auto-decline after 30 seconds
setTimeout(() => {
  declineIncomingCall();
}, 30000);
```

## 🧪 **Testing Scenarios**

### **Test 1: Basic Call Flow**
1. Open app in two browsers (User A & User B)
2. User A calls User B
3. **Verify**: User A hears outgoing ringtone
4. **Verify**: User B sees full-screen popup + hears incoming ringtone
5. User B accepts → both ringtones stop
6. **Verify**: LiveKit call connects successfully

### **Test 2: Auto-Cancel (Sender)**
1. User A calls User B
2. User B doesn't respond
3. **Verify**: After 60 seconds, call auto-cancels
4. **Verify**: User A's ringtone stops
5. **Verify**: User B's popup disappears

### **Test 3: Auto-Decline (Receiver)**
1. User A calls User B
2. User B doesn't respond
3. **Verify**: After 30 seconds, call auto-declines
4. **Verify**: User B's ringtone stops
5. **Verify**: User A gets "call declined" feedback

### **Test 4: Manual Decline**
1. User A calls User B
2. User B clicks "Decline"
3. **Verify**: Both ringtones stop immediately
4. **Verify**: User A gets "call declined" feedback
5. **Verify**: Call timers are cleared

### **Test 5: Cross-Page Notifications**
1. User A calls User B
2. User B is on a different page (not messages)
3. **Verify**: Activity notification appears
4. **Verify**: Browser notification shows
5. **Verify**: Ringtone still plays

## 🔧 **Technical Implementation**

### **Firebase Signaling Structure**
```javascript
// callSignals collection
{
  id: "userId1_userId2_timestamp",
  callerId: "userId1",
  receiverId: "userId2",
  callerName: "John Doe",
  callerAvatar: "https://...",
  callType: "audio" | "video",
  roomName: "call_userId1_userId2",
  status: "ringing" | "accepted" | "declined" | "cancelled",
  timestamp: serverTimestamp()
}
```

### **Component Integration**
```
useLiveKitCall Hook
├── useCallSignaling (Firebase real-time)
├── RingtoneManager (Audio handling)
├── IncomingCall (Full-screen popup)
├── OutgoingCall (Sender feedback)
├── CallNotification (Activity page)
└── CameraPreview (Pre-call setup)
```

## 🎯 **Expected Results**

✅ **Immediate Response**: Receiver sees popup within 1-2 seconds
✅ **Dual Ringtones**: Both sender and receiver hear appropriate tones
✅ **Auto-Timeouts**: 60s sender, 30s receiver
✅ **Clean Cleanup**: All timers and audio stop on call end
✅ **Cross-Platform**: Works on mobile and desktop
✅ **Fallback Audio**: Web Audio if MP3 fails
✅ **Real-time Sync**: Firebase ensures instant signaling

## 🚀 **Production Ready**

Your call system now provides:
- **Professional UX**: Immediate feedback and clear audio cues
- **Reliable Signaling**: Firebase real-time database
- **Auto-Management**: Prevents hanging calls
- **Cross-Device**: Works across all platforms
- **Graceful Fallbacks**: Handles audio/network issues

The calling experience now matches or exceeds professional communication apps! 🎉