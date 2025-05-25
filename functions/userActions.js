
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Firebase Cloud Function to export user data.
 * This version returns the data directly to the client for download,
 * as Firebase Storage is not available.
 *
 * @param {object} data - Data passed from the client.
 *                        Expected: data.clientSideData (object containing localStorage values)
 * @param {functions.https.CallableContext} context - Context of the function call.
 *                                                    Includes auth information.
 * @returns {Promise<object>} - Resolves with { dataString: string } on success,
 *                              or throws an HttpsError.
 */
exports.exportUserData = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const uid = context.auth.uid;
  const email = context.auth.token.email || "unknown_email";
  functions.logger.log(`Export initiated by UID: ${uid}, Email: ${email}`);

  const clientSideData = data.clientSideData || {};

  try {
    // 2. Fetch Firestore Data (Adapt to your schema)
    let firestoreData = {};
    const userDocRef = db.collection("users").doc(uid); // Example: user profile
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      firestoreData.profile = userDoc.data();
    } else {
      // If you want to ensure a profile is always present, you might create one here
      // or simply note its absence.
      firestoreData.profile = { message: "No profile document found in Firestore." };
    }

    // Example: Fetching another collection related to the user (e.g., 'posts')
    // const postsSnapshot = await db.collection('posts').where('authorUid', '==', uid).get();
    // firestoreData.posts = postsSnapshot.docs.map(doc => doc.data());
    // Add more Firestore data fetching as needed for your app.

    // 3. Compile All Data
    const exportData = {
      userId: uid,
      exportedAt: new Date().toISOString(),
      firestoreData: firestoreData,
      clientSideData: clientSideData, // Data from localStorage sent by client
      // Add any other data sources here
    };

    // 4. Convert to JSON String and Return
    const jsonDataString = JSON.stringify(exportData, null, 2); // null, 2 for pretty printing

    functions.logger.log(`User data for UID ${uid} compiled. Size: ${jsonDataString.length} bytes.`);

    // Check for potential payload size issues (Cloud Functions have limits)
    // This is a very rough check, actual limits are around 1MB for HTTP response.
    if (jsonDataString.length > 900000) { // Approx 900KB
        functions.logger.warn(`Export data for UID ${uid} is very large (${jsonDataString.length} bytes) and might exceed payload limits.`);
    }

    return { dataString: jsonDataString };

  } catch (error) {
    functions.logger.error(`Error exporting data for UID ${uid}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError instances
    }
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while exporting your data.",
      error.message // Optionally include more detail if safe
    );
  }
});
