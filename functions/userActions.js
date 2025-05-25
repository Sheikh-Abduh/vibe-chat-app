
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Firebase Cloud Function to export user data.
 *
 * This function will:
 * 1. Verify the user is authenticated.
 * 2. Fetch user data from Firestore.
 * 3. Include client-side data passed from the frontend (e.g., localStorage content).
 * 4. Compile all data into a JSON object.
 * 5. Upload this JSON to a private area in Firebase Storage.
 * 6. Generate a short-lived signed URL for the user to download their data.
 *
 * @param {object} data - Data passed from the client.
 *                        Expected: data.clientSideData (object containing localStorage values)
 * @param {functions.https.CallableContext} context - Context of the function call.
 *                                                    Includes auth information.
 * @returns {Promise<object>} - Resolves with { downloadUrl: string } on success,
 *                              or throws an error.
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
      firestoreData.profile = { message: "No profile document found in Firestore." };
    }

    // Example: Fetching another collection related to the user (e.g., 'posts')
    // const postsSnapshot = await db.collection('posts').where('authorUid', '==', uid).get();
    // firestoreData.posts = postsSnapshot.docs.map(doc => doc.data());


    // 3. Compile All Data
    const exportData = {
      userId: uid,
      exportedAt: new Date().toISOString(),
      firestoreData: firestoreData,
      clientSideData: clientSideData, // Data from localStorage sent by client
      // Add any other data sources here
    };

    // 4. Prepare and Upload JSON to Firebase Storage
    const jsonDataString = JSON.stringify(exportData, null, 2);
    const fileName = `user_exports/${uid}/export_${Date.now()}.json`;
    const file = storage.bucket().file(fileName);

    await file.save(jsonDataString, {
      contentType: "application/json",
      // Optional: Add metadata, e.g., to control caching or for your own tracking
      // metadata: {
      //   customMetadata: {
      //     exportedBy: uid,
      //   }
      // }
    });
    functions.logger.log(`User data for UID ${uid} saved to ${fileName}`);

    // 5. Generate a Signed URL for Download
    // URL will be valid for a limited time (e.g., 15 minutes)
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    functions.logger.log(`Generated signed URL for UID ${uid}: ${signedUrl}`);

    // For potentially long-running exports, you might send an email here instead
    // and return a success message like { status: "processing" }
    // For this example, we return the URL directly.
    return { downloadUrl: signedUrl };

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
