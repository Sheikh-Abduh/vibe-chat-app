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
 * Check if a user can send messages in a community channel
 * @param community - The community object with member arrays and permissions
 * @param user - The current user
 * @param channelId - The ID of the channel to check permissions for
 * @param messageType - The type of message being sent (optional)
 * @returns boolean - True if user can send messages, false otherwise
 */
export const canUserSendMessage = (
  community: {
    id?: string;
    ownerId?: string;
    admins?: string[];
    moderators?: string[];
    members?: string[];
    permissions?: {
      channels?: {
        [channelId: string]: {
          allowedRoles?: string[];
          allowedMessageTypes?: string[];
        };
      };
    };
  } | null,
  user: User | null,
  channelId?: string,
  messageType: string = 'text'
): boolean => {
  // For the vibe community, all users can send messages
  if (community?.id === 'vibe-community-main') return true;
  
  // If no user, they can't send messages
  if (!user || !community) return false;
  
  // Determine user's role in the community
  let userRole = 'none';
  if (community.ownerId === user.uid) userRole = 'owner';
  else if (community.admins?.includes(user.uid)) userRole = 'admin';
  else if (community.moderators?.includes(user.uid)) userRole = 'moderator';
  else if (community.members?.includes(user.uid)) userRole = 'member';
  
  // If not a member, can't send messages
  if (userRole === 'none') return false;
  
  // If no specific channel is provided, just check if they're a member
  if (!channelId) return true;
  
  // Check channel-specific permissions
  const channelPermissions = community.permissions?.channels?.[channelId];
  
  // If no channel-specific permissions are set, default to allowing members
  if (!channelPermissions) return true;
  
  // Check if user's role is allowed to send messages in this channel
  const roleAllowed = !channelPermissions.allowedRoles || 
                      channelPermissions.allowedRoles.length === 0 || 
                      channelPermissions.allowedRoles.includes(userRole);
  
  // Check if the message type is allowed in this channel
  const typeAllowed = !channelPermissions.allowedMessageTypes || 
                      channelPermissions.allowedMessageTypes.length === 0 || 
                      channelPermissions.allowedMessageTypes.includes(messageType);
  
  return roleAllowed && typeAllowed;
};