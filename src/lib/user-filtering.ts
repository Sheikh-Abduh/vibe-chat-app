/**
 * User Filtering Utilities
 * 
 * This module provides utilities to filter out deleted users across the application.
 * Deleted users are identified by having a 'deleted: true' field in their user document.
 */

import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

// Types for user filtering
export interface UserDocument {
  id: string;
  data: DocumentData;
  deleted?: boolean;
  deletedAt?: Date;
}

export interface FilteredUserData {
  id: string;
  [key: string]: any;
}

/**
 * Checks if a user document represents a deleted account
 * @param userData - The user document data from Firestore
 * @returns true if the user is deleted, false otherwise
 */
export function isUserDeleted(userData: DocumentData | undefined | null): boolean {
  if (!userData) return false;
  return userData.deleted === true;
}

/**
 * Filters out deleted users from a QueryDocumentSnapshot array
 * @param userDocs - Array of Firestore document snapshots
 * @returns Filtered array with deleted users removed
 */
export function filterDeletedUsers(userDocs: QueryDocumentSnapshot<DocumentData>[]): QueryDocumentSnapshot<DocumentData>[] {
  return userDocs.filter(doc => {
    const userData = doc.data();
    return !isUserDeleted(userData);
  });
}

/**
 * Filters out deleted users from a user data array
 * @param users - Array of user objects with id and data properties
 * @returns Filtered array with deleted users removed
 */
export function filterDeletedUserData<T extends { id: string; [key: string]: any }>(users: T[]): T[] {
  return users.filter(user => {
    // If the user object has a direct 'deleted' property
    if (user.deleted === true) {
      return false;
    }
    
    // If the user object has nested data with 'deleted' property
    if (user.data && user.data.deleted === true) {
      return false;
    }
    
    return true;
  });
}

/**
 * Checks if a specific user ID represents a deleted account
 * This is useful when you only have a user ID and need to verify deletion status
 * Note: This function requires an additional Firestore query, so use sparingly
 * @param userId - The user ID to check
 * @param getUserData - Function that returns the user's Firestore document data
 * @returns Promise<boolean> - true if user is deleted, false otherwise
 */
export async function isUserIdDeleted(
  userId: string, 
  getUserData: (userId: string) => Promise<DocumentData | null>
): Promise<boolean> {
  try {
    const userData = await getUserData(userId);
    return isUserDeleted(userData);
  } catch (error) {
    console.error(`Error checking deletion status for user ${userId}:`, error);
    // If we can't fetch the user data, assume they might be deleted for safety
    return true;
  }
}

/**
 * Filters out deleted user IDs from an array
 * This performs batch checks for multiple user IDs
 * @param userIds - Array of user IDs to filter
 * @param getUserData - Function that returns the user's Firestore document data
 * @returns Promise<string[]> - Filtered array with deleted users removed
 */
export async function filterDeletedUserIds(
  userIds: string[],
  getUserData: (userId: string) => Promise<DocumentData | null>
): Promise<string[]> {
  const filteredIds: string[] = [];
  
  for (const userId of userIds) {
    try {
      const isDeleted = await isUserIdDeleted(userId, getUserData);
      if (!isDeleted) {
        filteredIds.push(userId);
      }
    } catch (error) {
      console.error(`Error filtering user ID ${userId}:`, error);
      // Skip this user ID if we can't verify their status
    }
  }
  
  return filteredIds;
}

/**
 * Creates a user data getter function for use with ID-based filtering functions
 * @param getDoc - Firestore getDoc function
 * @param doc - Firestore doc function  
 * @param db - Firestore database instance
 * @returns Function that can fetch user data by ID
 */
export function createUserDataGetter(
  getDoc: any,
  doc: any, 
  db: any
) {
  return async (userId: string): Promise<DocumentData | null> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      return userDocSnap.exists() ? userDocSnap.data() : null;
    } catch (error) {
      console.error(`Error fetching user data for ${userId}:`, error);
      return null;
    }
  };
}

/**
 * Utility function to safely extract user data and check deletion status
 * @param userDoc - Firestore document snapshot or user data object
 * @returns Object with user data and deletion status
 */
export function extractUserInfo(userDoc: QueryDocumentSnapshot<DocumentData> | DocumentData): {
  id?: string;
  data: DocumentData;
  isDeleted: boolean;
} {
  let id: string | undefined;
  let data: DocumentData;
  
  // Handle QueryDocumentSnapshot
  if (userDoc && typeof userDoc === 'object' && 'data' in userDoc && typeof userDoc.data === 'function') {
    const snapshot = userDoc as QueryDocumentSnapshot<DocumentData>;
    id = snapshot.id;
    data = snapshot.data();
  } else {
    // Handle plain data object
    data = userDoc as DocumentData;
    id = data.id;
  }
  
  return {
    id,
    data,
    isDeleted: isUserDeleted(data)
  };
}

/**
 * Debug utility to log filtered users (for development)
 * @param originalCount - Original number of users before filtering
 * @param filteredCount - Number of users after filtering
 * @param context - Context string for the log (e.g., "dashboard", "messages")
 */
export function logFilteringStats(originalCount: number, filteredCount: number, context: string): void {
  const deletedCount = originalCount - filteredCount;
  if (deletedCount > 0) {
    console.log(`[User Filtering - ${context}] Filtered out ${deletedCount} deleted users (${originalCount} → ${filteredCount})`);
  }
}

/**
 * Validates that a user object has required fields and is not deleted
 * @param user - User object to validate
 * @param requiredFields - Array of required field names
 * @returns true if user is valid and not deleted, false otherwise
 */
export function isValidActiveUser(user: any, requiredFields: string[] = []): boolean {
  if (!user || typeof user !== 'object') {
    return false;
  }
  
  // Check if user is deleted
  if (isUserDeleted(user)) {
    return false;
  }
  
  // Check required fields
  for (const field of requiredFields) {
    if (!user[field] && user[field] !== 0 && user[field] !== false) {
      return false;
    }
  }
  
  return true;
}
