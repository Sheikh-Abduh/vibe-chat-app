// Standalone WebRTC signaling server for Render (Express + Socket.IO)
// Namespace: /webrtcSignaling (kept to match the client in useWebRTC.ts)
// Events: authenticate, offer, answer, ice-candidate, hangup, call-declined
// Relays: renegotiate flag on offer

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// CORS: configure allowed origins via env (comma-separated), default to * for local dev
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));

app.get('/', (_req, res) => {
  res.status(200).json({ ok: true, message: 'WebRTC Signaling Server is running' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Keep namespace same as client usage
const nsp = io.of('/webrtcSignaling');

// Track users and channels
const connectedUsers = new Map(); // userId -> socketId
const channelUsers = new Map();   // channelId -> Set<userId>

nsp.on('connection', (socket) => {
  let currentUserId = null;
  let channelId = null;

  socket.on('authenticate', (data = {}) => {
    const { userId, channelId: chan } = data;
    currentUserId = userId;
    channelId = chan;

    if (!currentUserId || !channelId) {
      socket.emit('error', { message: 'Missing userId or channelId' });
      return;
    }

    connectedUsers.set(currentUserId, socket.id);

    if (!channelUsers.has(channelId)) channelUsers.set(channelId, new Set());
    channelUsers.get(channelId).add(currentUserId);
    socket.join(channelId);

    // Broadcast presence to channel
    const channelParticipants = Array.from(channelUsers.get(channelId));
    nsp.to(channelId).emit('user-joined', { userId: currentUserId, channelParticipants });
  });

  // Signaling relays
  socket.on('offer', (data = {}) => {
    const { targetUserId, sdp, renegotiate } = data;
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      nsp.to(targetSocketId).emit('offer', { from: currentUserId, sdp, renegotiate: !!renegotiate });
    }
  });

  socket.on('answer', (data = {}) => {
    const { targetUserId, sdp } = data;
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      nsp.to(targetSocketId).emit('answer', { from: currentUserId, sdp });
    }
  });

  socket.on('ice-candidate', (data = {}) => {
    const { targetUserId, candidate } = data;
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      nsp.to(targetSocketId).emit('ice-candidate', { from: currentUserId, candidate });
    }
  });

  socket.on('hangup', (data = {}) => {
    const { targetUserId } = data;
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      nsp.to(targetSocketId).emit('hangup', { from: currentUserId });
    }
  });

  socket.on('call-declined', (data = {}) => {
    const { targetUserId } = data;
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      nsp.to(targetSocketId).emit('call-declined', { from: currentUserId });
    }
  });

  socket.on('disconnect', () => {
    if (currentUserId) {
      connectedUsers.delete(currentUserId);
      if (channelId && channelUsers.has(channelId)) {
        const set = channelUsers.get(channelId);
        set.delete(currentUserId);
        if (set.size === 0) channelUsers.delete(channelId);
        nsp.to(channelId).emit('user-left', { userId: currentUserId });
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
