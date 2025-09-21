const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const io = require("socket.io");

let socketServer;

// Initialize the Socket.IO server
const initializeSocketServer = (server) => {
  socketServer = io(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Store connected users
  const connectedUsers = new Map();
  const channelUsers = new Map();

  socketServer.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    let currentUserId = null;
    let currentChannelId = null;

    // User authentication and joining
    socket.on("authenticate", async (data) => {
      try {
        const {userId, channelId} = data;

        // Verify user exists in Firebase Auth/Firestore if needed
        // This is a simplified example

        currentUserId = userId;
        currentChannelId = channelId;

        // Store user connection
        connectedUsers.set(userId, socket.id);

        // Add user to channel
        if (!channelUsers.has(channelId)) {
          channelUsers.set(channelId, new Set());
        }
        channelUsers.get(channelId).add(userId);

        // Join socket room for this channel
        socket.join(channelId);

        // Notify other users in the channel
        const channelParticipants = Array.from(channelUsers.get(channelId));
        socketServer.to(channelId).emit("user-joined", {userId, channelParticipants});

        console.log(`User ${userId} authenticated and joined channel ${channelId}`);
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("error", {message: "Authentication failed"});
      }
    });

    // Hangup relay
    socket.on("hangup", (data) => {
      const { targetUserId } = data;
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        socketServer.to(targetSocketId).emit("hangup", { from: currentUserId });
      }
    });

    // Decline relay
    socket.on("call-declined", (data) => {
      const { targetUserId } = data;
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        socketServer.to(targetSocketId).emit("call-declined", { from: currentUserId });
      }
    });

    // WebRTC Signaling
    socket.on("offer", (data) => {
      const {targetUserId, sdp, renegotiate} = data;
      const targetSocketId = connectedUsers.get(targetUserId);

      if (targetSocketId) {
        socketServer.to(targetSocketId).emit("offer", {
          from: currentUserId,
          sdp,
          renegotiate: !!renegotiate,
        });
      }
    });

    socket.on("answer", (data) => {
      const {targetUserId, sdp} = data;
      const targetSocketId = connectedUsers.get(targetUserId);

      if (targetSocketId) {
        socketServer.to(targetSocketId).emit("answer", {
          from: currentUserId,
          sdp,
        });
      }
    });

    socket.on("ice-candidate", (data) => {
      const {targetUserId, candidate} = data;
      const targetSocketId = connectedUsers.get(targetUserId);

      if (targetSocketId) {
        socketServer.to(targetSocketId).emit("ice-candidate", {
          from: currentUserId,
          candidate,
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      if (currentUserId && currentChannelId) {
        // Remove user from channel
        if (channelUsers.has(currentChannelId)) {
          channelUsers.get(currentChannelId).delete(currentUserId);

          // If channel is empty, remove it
          if (channelUsers.get(currentChannelId).size === 0) {
            channelUsers.delete(currentChannelId);
          } else {
            // Notify others that user left
            const channelParticipants = Array.from(channelUsers.get(currentChannelId));
            socketServer.to(currentChannelId).emit("user-left", {
              userId: currentUserId,
              channelParticipants,
            });
          }
        }

        // Remove from connected users
        connectedUsers.delete(currentUserId);
      }
    });
  });

  return socketServer;
};

// HTTP function that will be used to initialize the Socket.IO server
exports.webrtcSignaling = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    if (!socketServer) {
      // Initialize Socket.IO server with the Express server
      initializeSocketServer(response.socket.server);
    }
    response.status(200).send("WebRTC signaling server is running");
  });
});
