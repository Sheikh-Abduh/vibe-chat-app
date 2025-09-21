# Disconnect Functionality

This document describes the disconnect functionality implemented in the application.

## Overview

The disconnect functionality allows users to disconnect from each other, preventing direct messaging and calling while still allowing interaction in community channels. This is different from blocking, which prevents all interaction.

## Key Features

### 1. Disconnect vs Block

- **Disconnect**: Prevents direct messages and calls, but allows interaction in community channels
- **Block**: Prevents all interaction, including in community channels

### 2. Mutual Disconnection

When a user disconnects from another user, both users are added to each other's disconnected lists. This ensures that neither user can initiate direct contact with the other.

### 3. Community Interaction

Disconnected users can still:
- See each other's messages in community channels
- Reply to each other in community channels
- Participate in community voice/video channels together

### 4. Interactions Page

A new settings page (`/settings/interactions`) allows users to:
- View connected users
- View disconnected users
- Disconnect from connected users
- Reconnect with disconnected users

## Implementation Details

### Database Structure

Users have two new fields in their Firestore documents:
- `disconnectedUsers`: Array of user IDs that this user has disconnected from
- `blockedUsers`: Array of user IDs that this user has blocked (existing)

### Core Functions

#### `canUsersInteract(userId1, userId2, isCommunityContext)`
- Returns `false` if users are blocked (regardless of context)
- Returns `true` if in community context and users are only disconnected
- Returns `false` if in direct context and users are disconnected

#### `getUserInteractionStatus(userId1, userId2)`
Returns an object with:
- `canInteract`: Can interact directly
- `isBlocked`: One user has blocked the other
- `isDisconnected`: One user has disconnected from the other
- `canInteractInCommunity`: Can interact in community channels

### UI Components

#### DisconnectButton
A reusable component that:
- Shows a confirmation dialog
- Handles the disconnect process
- Updates both users' disconnected lists
- Provides feedback to the user

#### Interactions Page
- Tabbed interface showing connected and disconnected users
- Ability to disconnect from connected users
- Ability to reconnect with disconnected users

### Message Filtering

- Connected users list in messages page filters out disconnected users
- Disconnected users don't appear in the direct messages sidebar
- Attempting to send a message to a disconnected user shows an appropriate error

### Call Prevention

- Call controls are disabled for disconnected users
- Attempting to call a disconnected user shows an appropriate error message
- Community voice/video channels still work normally

## Usage

### To Disconnect from a User

1. Go to the messages page and select the user
2. Click the "Disconnect" button in the user profile panel
3. Confirm the action in the dialog

Or:

1. Go to Settings > Interactions
2. Find the user in the "Connected" tab
3. Click "Disconnect"

### To Reconnect with a User

1. Go to Settings > Interactions
2. Find the user in the "Disconnected" tab
3. Click "Reconnect"

## Testing

The disconnect functionality is tested in `src/__tests__/disconnect-functionality.test.tsx` with the following test cases:

- Correct status for disconnected users
- Correct status for blocked users
- Correct status for normal users
- Community interaction allowed for disconnected users
- Direct interaction prevented for disconnected users
- All interaction prevented for blocked users

## Files Modified/Created

### New Files
- `src/app/(app)/settings/interactions/page.tsx` - Interactions management page
- `src/components/common/disconnect-button.tsx` - Reusable disconnect button
- `src/__tests__/disconnect-functionality.test.tsx` - Test suite
- `docs/disconnect-functionality.md` - This documentation

### Modified Files
- `src/lib/user-blocking.ts` - Added disconnect functionality
- `src/app/(app)/settings/page.tsx` - Added interactions page to settings
- `src/app/(app)/messages/page.tsx` - Added disconnect button and filtering
- `src/components/messages/call-controls.tsx` - Added disconnect checking
- `src/app/(app)/settings/blocked-users/page.tsx` - Updated description

## Future Enhancements

- Add timestamps for when users were disconnected
- Add bulk disconnect/reconnect operations
- Add notification when someone disconnects from you
- Add analytics for disconnect patterns