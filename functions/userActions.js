
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
 * @param {object} data - Data passed from the client (not used in this version).
 * @param {functions.https.CallableContext} context - Context of the call.
 * @returns {Promise<object>} - Resolves with { success: true } on success.
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
    // 2. Delete user data from Firestore
    // IMPORTANT: This is a simplified example. In a real application, you must
    // delete ALL data associated with the user across all collections.
    // This might involve batched writes or more complex recursive deletion logic.
    const userDocRef = db.collection("users").doc(uid);
    await userDocRef.delete();
    functions.logger.log(`Firestore document for UID ${uid} deleted.`);

    // 3. (Placeholder) Delete user files from Cloudinary (or other storage)
    // This requires Cloudinary Admin API and your API Secret, handled securely
    // on the backend.
    // Example conceptual steps:
    // const cloudinary = require('cloudinary').v2;
    // cloudinary.config({
    //   cloud_name: 'YOUR_CLOUD_NAME',
    //   api_key: 'YOUR_API_KEY',
    //   api_secret: 'YOUR_API_SECRET'
    // });
    // await cloudinary.api.delete_resources_by_prefix(`avatars/${uid}/`);
    // Or if you store public_ids:
    // const userAvatarPublicId = ... (fetch from userDoc or other source)
    // if (userAvatarPublicId) {
    //   await cloudinary.uploader.destroy(userAvatarPublicId);
    // }
    functions.logger.log(
        `Placeholder: Cloudinary assets for UID ${uid} would be deleted here.`,
    );


    // 4. Delete the user from Firebase Authentication
    await admin.auth().deleteUser(uid);
    functions.logger.log(`Firebase Auth user for UID ${uid} deleted.`);

    return {success: true, message: "Account successfully deleted."};
  } catch (error) {
    functions.logger.error(
        `Error deleting account for UID ${uid}:`,
        error,
    );
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError instances
    }
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while deleting your account.",
        error.message,
    );
  }
});
