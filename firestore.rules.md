
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Rules for user profiles
    // Allows any authenticated user to read profile data.
    // Users can only create and update their own profile.
    // Deletion should be handled by a Cloud Function.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false; // Deletion typically handled by a Cloud Function
    }

    // Rules for communities
    // For now, assuming communities are largely public to authenticated users for reading.
    // Client-side creation/modification of communities or channels is disabled.
    match /communities/{communityId} {
      allow read: if request.auth != null;
      allow write: if false; // No client-side creation/update/delete of communities

      // Rules for channels within communities
      match /channels/{channelId} {
        allow read: if request.auth != null;
        allow write: if false; // No client-side creation/update/delete of channels

        // Rules for messages within community channels
        match /messages/{messageId} {
          allow read: if request.auth != null;
          allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;
          allow update: if request.auth != null &&
                         ( // User can update text of their own message
                           (resource.data.senderId == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['text'])) ||
                           // Any authenticated user can update isPinned or reactions
                           (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isPinned'])) ||
                           (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions']))
                         );
          allow delete: if request.auth != null && resource.data.senderId == request.auth.uid;
        }
      }
    }

    // Rules for Direct Messages
    match /direct_messages/{conversationId} {
      // Helper function to check if the requesting user is listed in the participants array
      // of the conversation document being accessed or created.
      function isAuthUserParticipantInRequest() {
        return request.auth.uid in request.resource.data.participants;
      }

      // Helper function to check if the requesting user is listed in the participants array
      // of an *existing* conversation document.
      function isAuthUserParticipantInExistingDoc() {
        return request.auth.uid in resource.data.participants;
      }

      // Allow creating a conversation document if:
      // 1. The user is authenticated.
      // 2. The 'participants' array in the new document includes the user's UID.
      // 3. The 'participants' array has exactly two members.
      allow create: if request.auth != null &&
                       isAuthUserParticipantInRequest() &&
                       request.resource.data.participants.size() == 2;

      // Allow reading or updating (e.g., lastMessage, lastMessageTimestamp)
      // the conversation document if the user is a participant.
      allow read, update: if request.auth != null && isAuthUserParticipantInExistingDoc();

      // Generally, don't allow clients to delete entire conversation docs easily.
      allow delete: if false;

      match /messages/{messageId} {
        // Allow read if the user is a participant in the parent conversation
        allow read: if request.auth != null &&
                       get(/databases/$(database)/documents/direct_messages/$(conversationId)).data.participants.hasAny([request.auth.uid]);

        // Allow create if user is a participant and the senderId is their own UID
        allow create: if request.auth != null &&
                       get(/databases/$(database)/documents/direct_messages/$(conversationId)).data.participants.hasAny([request.auth.uid]) &&
                       request.resource.data.senderId == request.auth.uid;

        // Allow update for pinning and reactions if user is a participant
        allow update: if request.auth != null &&
                       get(/databases/$(database)/documents/direct_messages/$(conversationId)).data.participants.hasAny([request.auth.uid]) &&
                       (
                         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isPinned']) ||
                         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions'])
                       );

        // Allow delete if user is a participant and is the sender of the message
        allow delete: if request.auth != null &&
                       get(/databases/$(database)/documents/direct_messages/$(conversationId)).data.participants.hasAny([request.auth.uid]) &&
                       resource.data.senderId == request.auth.uid;
      }
    }
    
    // Rules for user-specific activity items (notifications)
    // Users can only read their own activity items.
    // Activity items are typically created by backend functions, not directly by clients.
    match /users/{userId}/activityItems/{activityId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Assume backend creates these
    }

    // Optional: Default deny for any paths not explicitly matched for extra safety
    // match /{document=**} {
    //  allow read, write: if false;
    // }
  }
}
