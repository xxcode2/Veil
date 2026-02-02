import { WebSocketServer } from "ws";
import { createServer } from "http";
import { arciumManager, VEIL_PROGRAM_ID, SOLANA_RPC_URL } from "./arcium-manager.js";
import RoomManager from "./roomManager.js";

// ================= SETUP =================

// Solana Program Configuration
console.log(`🔗 Veil Program: ${VEIL_PROGRAM_ID}`);
console.log(`🌐 Solana RPC: ${SOLANA_RPC_URL}`);

// Dynamic ports for Railway deployment
const HTTP_PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || (process.env.PORT ? parseInt(process.env.PORT) + 1 : 3001);

// CORS configuration
const ALLOWED_ORIGINS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  process.env.FRONTEND_URL || 'http://localhost:8000'
].filter(Boolean);

const roomManager = new RoomManager();
const playerConnections = new Map(); // playerId -> WebSocket

// Create HTTP server for REST API
const httpServer = createServer((req, res) => {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace(/^https?:\/\//, '')))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
  const path = url.pathname;

  // ===== POST /room/create =====
  if (path === '/room/create' && req.method === 'POST') {
    const { roomId, playerId, room } = roomManager.createRoom();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      roomId,
      playerId,
      room
    }));
    return;
  }

  // ===== POST /room/join =====
  if (path === '/room/join' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { roomId } = JSON.parse(body);
        const result = roomManager.joinRoom(roomId);
        
        res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }

  // ===== GET /room/:roomId =====
  if (path.startsWith('/room/') && req.method === 'GET') {
    const roomId = path.split('/')[2];
    const room = roomManager.getRoomState(roomId);
    
    if (room) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, room }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Room not found' }));
    }
    return;
  }

  // ===== GET /stats =====
  if (path === '/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(roomManager.getStats()));
    return;
  }

  // ===== 404 =====
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP API running on port ${HTTP_PORT}`);
  console.log(`   POST /room/create`);
  console.log(`   POST /room/join`);
  console.log(`   GET  /room/:roomId`);
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`   🚂 Running on Railway`);
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`🟢 WebSocket server running on ws://localhost:${WS_PORT}`);
console.log("🔐 Voting with Arcium-style encryption (x25519 + Rescue)");

// ================= WEBSOCKET HANDLERS =================

wss.on("connection", (ws) => {
  let currentPlayerId = null;
  let currentRoomId = null;

  // Send MXE public key immediately
  ws.send(JSON.stringify({
    type: "MXE_KEY",
    mxePublicKey: Buffer.from(arciumManager.getMXEPublicKey()).toString('base64'),
  }));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // ===== AUTHENTICATE (JOIN ROOM) =====
      if (msg.type === "AUTH") {
        const { playerId, roomId } = msg;
        
        if (!roomManager.isPlayerInRoom(playerId, roomId)) {
          ws.send(JSON.stringify({
            type: "ERROR",
            message: "Not authorized for this room"
          }));
          ws.close();
          return;
        }

        currentPlayerId = playerId;
        currentRoomId = roomId;
        playerConnections.set(playerId, ws);
        roomManager.setPlayerConnected(playerId, true);

        console.log(`✅ Player ${playerId} authenticated for room ${roomId}`);

        // Send current room state
        const roomState = roomManager.getRoomState(roomId);
        ws.send(JSON.stringify({
          type: "ROOM_STATE",
          room: roomState
        }));

        // Notify room of updated player list
        broadcastToRoom(roomId, {
          type: "ROOM_STATE",
          room: roomState
        });
      }

      // ===== START VOTING =====
      else if (msg.type === "START_VOTE") {
        if (!currentPlayerId || !currentRoomId) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Not authenticated" }));
          return;
        }

        const result = roomManager.startVoting(currentRoomId, currentPlayerId);
        
        if (!result.success) {
          ws.send(JSON.stringify({ type: "ERROR", message: result.error }));
          return;
        }

        console.log(`🗳️  Voting started in room ${currentRoomId}`);
        
        broadcastToRoom(currentRoomId, {
          type: "ROOM_STATE",
          room: result.room
        });
      }

      // ===== CAST ENCRYPTED VOTE =====
      else if (msg.type === "VOTE") {
        if (!currentPlayerId || !currentRoomId) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Not authenticated" }));
          return;
        }

        if (!msg.encryptedVote || !msg.clientPublicKey || !msg.nonce) {
          ws.send(JSON.stringify({
            type: "ERROR",
            message: "Missing encryption data"
          }));
          return;
        }

        const voteResult = roomManager.submitVote(
          currentRoomId,
          currentPlayerId,
          Buffer.from(msg.encryptedVote, 'base64'),
          Buffer.from(msg.clientPublicKey, 'base64'),
          Buffer.from(msg.nonce, 'base64')
        );

        if (!voteResult.success) {
          ws.send(JSON.stringify({ type: "ERROR", message: voteResult.error }));
          return;
        }

        console.log(`📨 Vote ${voteResult.votesReceived}/${voteResult.totalPlayers} received in ${currentRoomId}`);

        // Notify room of vote count
        broadcastToRoom(currentRoomId, {
          type: "VOTE_COUNT",
          votesReceived: voteResult.votesReceived,
          totalPlayers: voteResult.totalPlayers
        });

        // If all votes in, process with MPC
        if (voteResult.votesReceived === voteResult.totalPlayers) {
          roomManager.setRoomStatus(currentRoomId, 'processing');
          
          broadcastToRoom(currentRoomId, {
            type: "ROOM_STATE",
            room: roomManager.getRoomState(currentRoomId)
          });

          console.log(`🔐 All votes in for ${currentRoomId}, processing with MPC...`);

          try {
            const votesData = roomManager.getVotesForProcessing(currentRoomId);
            const result = await arciumManager.executeVoting(votesData.votes);

            roomManager.setRoomResult(currentRoomId, result);

            console.log(`✅ MPC complete for ${currentRoomId}`);

            // Send results to each player in room
            const roomState = roomManager.getRoomState(currentRoomId);
            roomState.players.forEach(player => {
              const playerWs = playerConnections.get(player.playerId);
              if (playerWs) {
                const playerResult = result.playerResults.find(pr => pr.playerId === player.playerId);
                
                playerWs.send(JSON.stringify({
                  type: "RESULT",
                  communityCorrect: result.communityCorrect,
                  saboteurId: result.saboteurId,
                  saboteurVote: result.saboteurVote,
                  majorityVote: result.majorityVote,
                  yourVoteCorrect: playerResult?.wasCorrect || false,
                  isSaboteur: playerResult?.isSaboteur || false,
                }));
              }
            });

            broadcastToRoom(currentRoomId, {
              type: "ROOM_STATE",
              room: roomManager.getRoomState(currentRoomId)
            });

          } catch (error) {
            console.error(`❌ MPC failed for ${currentRoomId}:`, error);
            roomManager.setRoomStatus(currentRoomId, 'lobby');
            broadcastToRoom(currentRoomId, {
              type: "ERROR",
              message: "Computation failed"
            });
          }
        }
      }

      // ===== RESET GAME =====
      else if (msg.type === "RESET") {
        if (!currentPlayerId || !currentRoomId) return;

        if (!roomManager.isPlayerHost(currentPlayerId, currentRoomId)) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Only host can reset" }));
          return;
        }

        roomManager.setRoomStatus(currentRoomId, 'lobby');
        roomManager.setRoomResult(currentRoomId, null);
        
        console.log(`🔄 Room ${currentRoomId} reset`);
        
        broadcastToRoom(currentRoomId, {
          type: "ROOM_STATE",
          room: roomManager.getRoomState(currentRoomId)
        });
      }

    } catch (err) {
      console.error("❌ Message error:", err);
      ws.send(JSON.stringify({
        type: "ERROR",
        message: "Invalid message"
      }));
    }
  });

  ws.on("close", () => {
    if (currentPlayerId) {
      playerConnections.delete(currentPlayerId);
      roomManager.setPlayerConnected(currentPlayerId, false);
      
      if (currentRoomId) {
        // Don't remove immediately - give them time to reconnect
        setTimeout(() => {
          const stillConnected = playerConnections.has(currentPlayerId);
          if (!stillConnected) {
            roomManager.removePlayer(currentPlayerId);
            const roomState = roomManager.getRoomState(currentRoomId);
            if (roomState) {
              broadcastToRoom(currentRoomId, {
                type: "ROOM_STATE",
                room: roomState
              });
            }
          }
        }, 5000); // 5 second grace period
      }
      
      console.log(`➖ Player ${currentPlayerId} disconnected`);
    }
  });
});

// ================= HELPERS =================

function broadcastToRoom(roomId, data) {
  const roomState = roomManager.getRoomState(roomId);
  if (!roomState) return;

  const message = JSON.stringify(data);
  roomState.players.forEach(player => {
    const ws = playerConnections.get(player.playerId);
    if (ws && ws.readyState === ws.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        console.error(`Failed to send to ${player.playerId}:`, err);
      }
    }
  });
}

