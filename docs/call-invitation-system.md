# Call Invitation System

## Overview
The call invitation system enables real-time voice and video calling between users in direct messages. When one user initiates a call, the other user receives an immediate notification and can accept or decline the call.

## How It Works

### 1. Call Initiation
- User clicks "Voice Call" or "Video Call" button in a direct message
- System sends a call invitation to the other user
- Caller sees "Calling..." status and can cancel the invitation
- Invitation automatically expires after 60 seconds

### 2. Real-time Notifications
- Recipient receives immediate notification via Firestore real-time listeners
- Incoming call popup appears with caller information
- Audio notification plays (generated tones, no external files needed)
- Notification includes caller name, avatar, and call type

### 3. Call Response
- **Accept**: Both users join the same WebRTC call room
- **Decline**: Invitation is declined and caller is notified
- **Ignore**: Invitation expires after 60 seconds

### 4. Call Room
- Both users connect to the same WebRTC session
- Professional call interface with controls
- Real-time audio/video streaming
- Call duration tracking

## Technical Implementation

### Core Components

#### 1. Call Invitations (`src/lib/call-invitations.ts`)
```typescript
// Send invitation
await sendCallInvitation(callerId, callerName, recipientId, callType, conversationId);

// Listen for incoming invitations
listenForIncomingCalls(userId, onInvitation, onInvitationUpdate);

// Accept/decline invitation
await acceptCallInvitation(invitationId);
await declineCallInvitation(invitationId);
```

#### 2. Call Notifications Context (`src/contexts/call-notifications-context.tsx`)
- Manages incoming call notifications globally
- Shows incoming call popup automatically
- Handles audio notifications
- Integrates with call context for seamless joining

#### 3. Updated Call Controls (`src/components/messages/call-controls.tsx`)
- Sends invitations instead of directly starting calls
- Shows "Calling..." status while waiting for response
- Provides cancel functionality
- Handles invitation status updates

#### 4. Incoming Call Popup (`src/components/common/incoming-call-popup.tsx`)
- Professional incoming call interface
- Shows caller information and call type
- Accept/decline buttons
- Auto-decline timer

### Database Structure

#### Call Invitations Collection (`/callInvitations/{invitationId}`)
```typescript
{
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string; // Optional - only included if caller has avatar
  recipientId: string;
  callType: 'voice' | 'video';
  conversationId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

**Note**: The `callerAvatar` field is only included in the document if the caller has an avatar. This prevents Firestore errors with `undefined` values.

### Security Rules
- Users can only create invitations where they are the caller
- Users can only read/update invitations they sent or received
- Status updates are restricted to the `status` field only
- Automatic cleanup of expired invitations

## User Experience Flow

### Caller Experience
1. Click "Voice Call" or "Video Call"
2. See "Calling..." status with cancel option
3. Wait for recipient response (max 60 seconds)
4. Get notified of acceptance/decline/timeout
5. If accepted, automatically join call room

### Recipient Experience
1. Receive real-time notification
2. Hear audio notification sound
3. See incoming call popup with caller info
4. Choose to accept or decline
5. If accepted, automatically join call room

## Features

### Real-time Notifications
- Instant delivery via Firestore listeners
- No polling or delays
- Works across multiple devices/tabs

### Audio Notifications
- Generated tones using Web Audio API
- No external sound files required
- Customizable notification patterns
- Automatic stop when call ends

### Auto-expiration
- Invitations expire after 60 seconds
- Automatic cleanup of expired data
- Prevents stale invitations

### Integration with Blocking System
- Respects user blocking/disconnection status
- Blocked users cannot send call invitations
- Proper error messages for blocked interactions

### Professional UI
- Modern incoming call interface
- Caller avatar and name display
- Clear accept/decline buttons
- Visual countdown timer

## Error Handling

### Common Scenarios
- **Media permissions denied**: Graceful fallback with error message
- **Network issues**: Retry logic and timeout handling
- **User offline**: Invitation expires naturally
- **Blocked users**: Prevented at UI level with clear messaging

### Cleanup
- Automatic cleanup of expired invitations
- Proper listener cleanup on component unmount
- Memory leak prevention

## Testing

### Demo Page (`/voice-demo`)
- Comprehensive showcase of all features
- Interactive demos of call invitations
- Technical implementation details
- Feature overview and benefits

### Integration Tests
- Call invitation flow testing
- Real-time notification testing
- Error scenario handling
- UI component testing

## Future Enhancements

### Potential Improvements
1. **Group calls**: Extend to support multiple participants
2. **Call history**: Track and display call history
3. **Call quality indicators**: Show connection quality
4. **Screen sharing**: Add screen sharing capabilities
5. **Call recording**: Optional call recording feature
6. **Push notifications**: Mobile push notifications for calls
7. **Busy status**: Handle when user is already in a call

### Performance Optimizations
1. **Connection pooling**: Reuse WebRTC connections
2. **Bandwidth optimization**: Adaptive bitrate based on connection
3. **Battery optimization**: Reduce CPU usage during calls
4. **Memory management**: Better cleanup of media streams

## Deployment Notes

### Firestore Rules
- Deploy updated security rules for call invitations
- Ensure proper indexing for invitation queries
- Monitor rule performance and usage

### Environment Variables
- No additional environment variables required
- Uses existing Firebase configuration
- WebRTC uses public STUN servers

### Monitoring
- Monitor invitation success/failure rates
- Track call connection quality
- Monitor cleanup job performance
- Alert on high error rates

The call invitation system provides a complete, professional calling experience that rivals modern messaging apps while maintaining security and performance.