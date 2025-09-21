import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function canUsersInteract(userId1: string, userId2: string): Promise<boolean> {
  try {
    // Get both users' blocked and disconnected lists
    const user1Doc = await getDoc(doc(db, 'users', userId1));
    const user2Doc = await getDoc(doc(db, 'users', userId2));

    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();

    const user1BlockedUsers = user1Data?.blockedUsers || [];
    const user2BlockedUsers = user2Data?.blockedUsers || [];
    const user1DisconnectedUsers = user1Data?.disconnectedUsers || [];
    const user2DisconnectedUsers = user2Data?.disconnectedUsers || [];

    // Treat blocking and disconnecting as the same - both prevent interaction
    const isBlockedOrDisconnected = 
      user1BlockedUsers.includes(userId2) || 
      user2BlockedUsers.includes(userId1) ||
      user1DisconnectedUsers.includes(userId2) || 
      user2DisconnectedUsers.includes(userId1);

    // Prevent all direct interaction if blocked or disconnected
    return !isBlockedOrDisconnected;
  } catch (error) {
    console.error('Error checking user interaction permissions:', error);
    return false;
  }
}

export function isUserBlocked(blockedUsers: string[], userId: string): boolean {
  return blockedUsers.includes(userId);
}

export function isUserDisconnected(disconnectedUsers: string[], userId: string): boolean {
  return disconnectedUsers.includes(userId);
}

export async function getUserInteractionStatus(userId1: string, userId2: string): Promise<{
  canInteract: boolean;
  isBlocked: boolean;
  isDisconnected: boolean;
  canInteractInCommunity: boolean;
}> {
  try {
    // Force fresh data by using server source
    const user1Doc = await getDoc(doc(db, 'users', userId1));
    const user2Doc = await getDoc(doc(db, 'users', userId2));

    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();

    const user1BlockedUsers = user1Data?.blockedUsers || [];
    const user2BlockedUsers = user2Data?.blockedUsers || [];
    const user1DisconnectedUsers = user1Data?.disconnectedUsers || [];
    const user2DisconnectedUsers = user2Data?.disconnectedUsers || [];

    const isBlocked = user1BlockedUsers.includes(userId2) || user2BlockedUsers.includes(userId1);
    const isDisconnected = user1DisconnectedUsers.includes(userId2) || user2DisconnectedUsers.includes(userId1);
    
    // Treat blocking and disconnecting as the same
    const isBlockedOrDisconnected = isBlocked || isDisconnected;
    
    // Debug logging
    console.log(`Interaction status check for ${userId1} -> ${userId2}:`, {
      isBlocked,
      isDisconnected,
      isBlockedOrDisconnected,
      canInteract: !isBlockedOrDisconnected,
      user1DisconnectedUsers,
      user2DisconnectedUsers
    });
    
    return {
      canInteract: !isBlockedOrDisconnected,
      isBlocked: isBlockedOrDisconnected, // Return true if either blocked or disconnected
      isDisconnected: isBlockedOrDisconnected, // Return true if either blocked or disconnected
      canInteractInCommunity: false // Community interactions removed - focusing on one-on-one calls only
    };
  } catch (error) {
    console.error('Error getting user interaction status:', error);
    return {
      canInteract: false,
      isBlocked: false,
      isDisconnected: false,
      canInteractInCommunity: false // Community interactions removed - focusing on one-on-one calls only
    };
  }
}
