
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {RtcTokenBuilder, RtcRole} = require("agora-access-token");

// Import your new user actions
const userActions = require("./userActions");

// Export the callable function
exports.deleteUserAccount = userActions.deleteUserAccount;

const APP_ID = "530ba273ad0847019e4e48e70135e345";
const APP_CERTIFICATE = "11b76d5a76324fe5b4c616db8e786333";

exports.generateAgoraToken = onRequest((request, response) => {
  const channelName = request.body.channelName;
  const uid = request.body.uid;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // Token expires in 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
  );
  response.send({token});
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

