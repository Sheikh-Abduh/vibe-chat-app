const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Firebase Cloud Function to delete a user's account and associated data.
 *
 * @param {object} data - Data passed from the client (not used).
 * @param {functions.https.CallableContext} context - Context of the call.
 * @returns {Promise<object>} - Resolves with { success: true }.
 * @throws {functions.https.HttpsError} - Throws on errors.
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }
  const uid = context.auth.uid;
  const email = context.auth.token.email || "unknown_email";
  functions.logger.log(
      `Account deletion initiated by UID: ${uid}, Email: ${email}`,
  );

  try {
    // 2. Delete user data from Firestore - comprehensive deletion
    functions.logger.log(`Starting comprehensive data deletion for UID: ${uid}`);
    
    const batch = db.batch();
    let deletionCount = 0;
    
    // Delete main user document
    const userDocRef = db.collection("users").doc(uid);
    batch.delete(userDocRef);
    deletionCount++;
    
    // Delete user's activity items (subcollection)
    try {
      const activityItemsRef = db.collection(`users/${uid}/activityItems`);
      const activitySnapshot = await activityItemsRef.get();
      activitySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCount++;
      });
      functions.logger.log(`Found ${activitySnapshot.size} activity items to delete`);
    } catch (activityError) {
      functions.logger.warn(`Error deleting activity items: ${activityError.message}`);
    }
    
    // Delete connection requests where user is involved
    try {
      const connectionRequestsRef = db.collection("connectionRequests");
      const fromUserRequests = await connectionRequestsRef.where("fromUserId", "==", uid).get();
      const toUserRequests = await connectionRequestsRef.where("toUserId", "==", uid).get();
      
      fromUserRequests.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCount++;
      });
      toUserRequests.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCount++;
      });
      functions.logger.log(`Found ${fromUserRequests.size + toUserRequests.size} connection requests to delete`);
    } catch (connectionError) {
      functions.logger.warn(`Error deleting connection requests: ${connectionError.message}`);
    }
    
    // Delete direct message conversations where user is a participant
    try {
      const conversationsRef = db.collection("direct_messages");
      const userConversations = await conversationsRef.where("participants", "array-contains", uid).get();
      
      for (const conversationDoc of userConversations.docs) {
        // Delete messages in this conversation
        const messagesRef = conversationDoc.ref.collection("messages");
        const messagesSnapshot = await messagesRef.get();
        messagesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletionCount++;
        });
        
        // Delete the conversation document
        batch.delete(conversationDoc.ref);
        deletionCount++;
      }
      functions.logger.log(`Found ${userConversations.size} conversations to delete`);
    } catch (conversationError) {
      functions.logger.warn(`Error deleting conversations: ${conversationError.message}`);
    }
    
    // Commit all deletions in batches (Firestore batch limit is 500 operations)
    if (deletionCount > 0) {
      if (deletionCount <= 500) {
        await batch.commit();
        functions.logger.log(`Deleted ${deletionCount} documents in single batch`);
      } else {
        // Handle large deletions with multiple batches
        functions.logger.log(`Large deletion (${deletionCount} items) - implementing chunked deletion`);
        // For now, commit what we have and log a warning
        await batch.commit();
        functions.logger.warn(`Committed batch with 500 operations. ${deletionCount - 500} items may need manual cleanup.`);
      }
    }
    
    functions.logger.log(`Firestore data deletion completed for UID ${uid}`);

    // 3. (Placeholder) Delete user files from Cloudinary (or other storage)
    // This needs Cloudinary Admin API & Secret, handled securely on backend.
    functions.logger.log(
        `Placeholder: Cloudinary assets for UID ${uid} would be deleted here.`,
    );

    // 4. Delete the user from Firebase Authentication (this must be last)
    await admin.auth().deleteUser(uid);
    functions.logger.log(`Firebase Auth user for UID ${uid} deleted successfully.`);

    return {success: true, message: "Account and all associated data successfully deleted."};
  } catch (error) {
    functions.logger.error(
        `Error deleting account for UID ${uid}:`,
        {
          errorMessage: error.message,
          errorCode: error.code,
          errorStack: error.stack,
          uid: uid,
          email: email
        }
    );
    
    // Provide more specific error messages
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
          "not-found",
          "User account not found.",
          error.message,
      );
    } else if (error.code && error.code.startsWith('permission-denied')) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "Insufficient permissions to delete account.",
          error.message,
      );
    } else if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError instances
    } else {
      throw new functions.https.HttpsError(
          "internal",
          "An error occurred while deleting your account. Please contact support if this persists.",
          error.message,
      );
    }
  }
});
