const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled function to clean up messages older than 30 days
 * Runs daily at 2 AM UTC
 */
exports.cleanupOldMessages = onSchedule("0 2 * * *", async (event) => {
  logger.info("Starting scheduled message cleanup for vibe community");
  
  try {
    const result = await cleanupVibeMessages();
    logger.info("Scheduled cleanup completed", result);
    return result;
  } catch (error) {
    logger.error("Scheduled cleanup failed", error);
    throw error;
  }
});

/**
 * Callable function to manually trigger message cleanup
 * Can be called by admins/owners for immediate cleanup
 */
exports.manualMessageCleanup = onCall(async (request) => {
  const { auth } = request;
  
  if (!auth) {
    throw new Error("Authentication required");
  }

  logger.info(`Manual cleanup requested by user: ${auth.uid}`);
  
  try {
    // Verify user has permission to trigger cleanup
    const userDoc = await db.collection('users').doc(auth.uid).get();
    const userData = userDoc.data();
    
    // Check if user is vibe community owner/admin or has special cleanup permission
    const isVibeOwner = userData?.email === 'sheikhabduh6@gmail.com';
    const hasCleanupPermission = userData?.permissions?.canCleanupMessages === true;
    
    if (!isVibeOwner && !hasCleanupPermission) {
      throw new Error("Insufficient permissions to trigger message cleanup");
    }
    
    const result = await cleanupVibeMessages();
    logger.info("Manual cleanup completed", result);
    return result;
  } catch (error) {
    logger.error("Manual cleanup failed", error);
    throw error;
  }
});

/**
 * Core function to clean up messages older than 30 days from vibe community
 */
async function cleanupVibeMessages() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  logger.info(`Cleaning up messages older than: ${thirtyDaysAgo.toISOString()}`);
  
  const vibeCommunityId = 'vibe-community-main';
  let totalDeleted = 0;
  const channelStats = {};
  
  try {
    // Get all channels in the vibe community
    const channelsSnapshot = await db
      .collection(`communities/${vibeCommunityId}/channels`)
      .get();
    
    // If no channels exist in Firestore, use the hardcoded channel IDs
    const channelIds = channelsSnapshot.empty ? [
      'vibe-general',
      'vibe-announcements',
      'vibe-passion-art-design',
      'vibe-passion-movies-tv',
      'vibe-passion-music',
      'vibe-passion-reading',
      'vibe-passion-technology',
      'vibe-passion-travel',
      'vibe-passion-gaming',
      'vibe-passion-sports-fitness',
      'vibe-passion-food-cooking',
      'vibe-passion-other-hobbies'
    ] : channelsSnapshot.docs.map(doc => doc.id);
    
    logger.info(`Found ${channelIds.length} channels to clean up`);
    
    // Clean up messages in each channel
    for (const channelId of channelIds) {
      try {
        const channelDeleted = await cleanupChannelMessages(vibeCommunityId, channelId, thirtyDaysAgo);
        channelStats[channelId] = channelDeleted;
        totalDeleted += channelDeleted;
        
        logger.info(`Cleaned up ${channelDeleted} messages from channel: ${channelId}`);
      } catch (error) {
        logger.error(`Error cleaning up channel ${channelId}:`, error);
        channelStats[channelId] = { error: error.message };
      }
    }
    
    const result = {
      success: true,
      totalDeleted,
      channelStats,
      cutoffDate: thirtyDaysAgo.toISOString(),
      timestamp: new Date().toISOString()
    };
    
    // Log cleanup activity
    await logCleanupActivity(result);
    
    return result;
  } catch (error) {
    logger.error("Error in cleanupVibeMessages:", error);
    throw error;
  }
}

/**
 * Clean up messages in a specific channel
 */
async function cleanupChannelMessages(communityId, channelId, cutoffDate) {
  const messagesRef = db.collection(`communities/${communityId}/channels/${channelId}/messages`);
  
  // Query messages older than cutoff date
  const oldMessagesQuery = messagesRef
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
    .orderBy('timestamp')
    .limit(500); // Process in batches to avoid timeout
  
  let deletedCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    const snapshot = await oldMessagesQuery.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }
    
    // Create batch for deletion
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Execute batch deletion
    await batch.commit();
    deletedCount += snapshot.docs.length;
    
    logger.info(`Deleted batch of ${snapshot.docs.length} messages from ${channelId}`);
    
    // If we got fewer than the limit, we're done
    if (snapshot.docs.length < 500) {
      hasMore = false;
    }
  }
  
  return deletedCount;
}

/**
 * Log cleanup activity for audit purposes
 */
async function logCleanupActivity(result) {
  try {
    await db.collection('system_logs').add({
      type: 'message_cleanup',
      action: 'vibe_community_cleanup',
      result: result,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error("Error logging cleanup activity:", error);
    // Don't throw here as cleanup was successful
  }
}

/**
 * Get cleanup statistics
 */
exports.getCleanupStats = onCall(async (request) => {
  const { auth } = request;
  
  if (!auth) {
    throw new Error("Authentication required");
  }
  
  try {
    // Get recent cleanup logs
    const logsSnapshot = await db
      .collection('system_logs')
      .where('type', '==', 'message_cleanup')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    const cleanupHistory = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()?.toISOString()
    }));
    
    return {
      success: true,
      cleanupHistory
    };
  } catch (error) {
    logger.error("Error getting cleanup stats:", error);
    throw error;
  }
});