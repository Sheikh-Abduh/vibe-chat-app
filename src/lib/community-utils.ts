import type { User } from 'firebase/auth';

/**
 * Check if a user is a member of a community
 * @param community - The community object with member arrays
 * @param user - The current user
 * @returns boolean - True if user is a member, false otherwise
 */
export const isCommunityMember = (
  community: {
    ownerId?: string;
    admins?: string[];
    moderators?: string[];
    members?: string[];
  } | null,
  user: User | null
): boolean => {
  if (!community || !user) return false;
  
  // Check if user is the owner
  if (community.ownerId === user.uid) return true;
  
  // Check if user is in any of the role arrays
  if (community.admins?.includes(user.uid)) return true;
  if (community.moderators?.includes(user.uid)) return true;
  if (community.members?.includes(user.uid)) return true;
  
  return false;
};

/**
 * Check if a user can send messages in a community
 * @param community - The community object with member arrays
 * @param user - The current user
 * @returns boolean - True if user can send messages, false otherwise
 */
export const canUserSendMessage = (
  community: {
    ownerId?: string;
    admins?: string[];
    moderators?: string[];
    members?: string[];
  } | null,
  user: User | null
): boolean => {
  // For the vibe community, all users can send messages
  if (community?.id === 'vibe-community-main') return true;
  
  // For other communities, only members can send messages
  return isCommunityMember(community, user);
};