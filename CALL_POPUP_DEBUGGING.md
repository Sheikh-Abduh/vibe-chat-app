# Call Popup Debugging Guide

This document provides a comprehensive guide for debugging issues with the incoming call popup not appearing on the receiver's end.

## Common Issues and Solutions

### 1. Firebase Realtime Database Rules
The database rules must allow proper read/write access for call signaling between users.

**Current Rules:**
```json
{
  "rules": {
    "calls": {
      "$userId": {
        ".read": "$userId === auth.uid && auth.token.email_verified == true",
        ".write": "auth.uid != null && auth.token.email_verified == true",
        "incoming": {
          ".read": "$userId === auth.uid && auth.token.email_verified == true",
          ".write": "auth.uid != null && auth.token.email_verified == true"
        },
        "outgoing": {
          ".read": "$userId === auth.uid && auth.token.email_verified == true",
          ".write": "$userId === auth.uid && auth.token.email_verified == true"
        }
      }
    }
  }
}
```

### 2. Authentication and User Verification
Both users must be authenticated and have verified email addresses for calls to work properly.

### 3. Global Call Manager Placement
The GlobalCallManager component must be properly placed in the app layout to ensure it's always active.

## Debugging Steps

### Step 1: Check Browser Console
Open the browser's developer tools and check the console for any error messages related to:
- Firebase authentication
- Database read/write permissions
- JavaScript errors in the call components

### Step 2: Verify Global Call Manager is Active
In the browser console, run:
```javascript
// Check if the call manager is active
console.log('CallCheck - Global Call Manager Active:', window.__VIBE_CALL_MANAGER_ACTIVE);
console.log('CallCheck - Window object has call manager:', window.globalCallManagerActive);

// Or use the built-in function
checkCallManager();
```

### Step 3: Test Manual Incoming Call
In the browser console, run:
```javascript
// Trigger a test incoming call
testIncomingCall();
```

### Step 4: Check Firebase Data
In the browser console, run:
```javascript
// Check RTDB data for the current user
checkRTDBData();
```

### Step 5: Verify Current User
In the browser console, run:
```javascript
// Check current user information
checkCurrentUser();
```

## Component Flow

1. **GlobalCallManager** - Listens for incoming calls via `useCallSignaling` hook
2. **useCallSignaling** - Sets up Firebase listeners for `calls/{userId}/incoming`
3. **IncomingCall** - Renders the popup UI when an incoming call is detected

## Common Error Messages

### "Permission denied"
This indicates that the Firebase database rules are not properly configured for the current user.

### "No current user"
This means the user is not properly authenticated.

### "Error sending call signal"
This indicates issues with writing to the Firebase database.

## Testing the Fix

1. Ensure both caller and receiver have verified email addresses
2. Make sure the GlobalCallManager is properly placed in the app layout
3. Verify the database rules allow proper access
4. Check the browser console for any error messages
5. Try the manual test function to verify the popup can appear

## Additional Debugging Functions

The following functions are available in the browser console for debugging:

- `testIncomingCall()` - Manually triggers an incoming call popup
- `checkRTDBData()` - Checks the current user's call data in Firebase
- `checkCurrentUser()` - Displays information about the current user
- `checkCallManager()` - Verifies the GlobalCallManager is active

## Network and Connectivity Issues

If calls are still not working:
1. Check network connectivity
2. Verify Firebase configuration
3. Ensure the database URL is correct in `firebase.ts`
4. Check for any ad blockers or browser extensions that might interfere