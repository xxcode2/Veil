/**
 * 🎮 VEIL ROOM MANAGER
 * 
 * Handles room creation, joining, and lifecycle.
 * NO WALLETS - Players use random IDs only.
 * Server-side only storage (in-memory).
 */

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
    this.playerToRoom = new Map(); // playerId -> roomId
    
    // Configuration
    this.MAX_PLAYERS = 8;
    this.ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    this.ROOM_CODE_LENGTH = 6;
    
    // Start cleanup task
    this.startCleanupTask();
  }

  /**
   * Generate a unique room code (e.g., VEIL-X7K2)
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
    let code = 'VEIL-';
    for (let i = 0; i < this.ROOM_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    
    return code;
  }

  /**
   * Generate a unique player ID
   */
  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new room
   * @returns {Object} { roomId, playerId, room }
   */
  createRoom() {
    const roomId = this.generateRoomCode();
    const hostId = this.generatePlayerId();
    
    const room = {
      roomId,
      players: [{
        playerId: hostId,
        joinedAt: Date.now(),
        isHost: true,
        connected: true
      }],
      status: 'lobby', // lobby | voting | processing | result
      createdAt: Date.now(),
      lastActivity: Date.now(),
      votes: new Map(), // playerId -> encryptedVote
      result: null
    };
    
    this.rooms.set(roomId, room);
    this.playerToRoom.set(hostId, roomId);
    
    console.log(`[Room] 🎮 Room created: ${roomId} by host ${hostId}`);
    
    return { roomId, playerId: hostId, room: this.getRoomState(roomId) };
  }

  /**
   * Join an existing room
   * @param {string} roomId 
   * @returns {Object} { success, playerId, room, error }
   */
  joinRoom(roomId) {
    roomId = roomId.toUpperCase().trim();
    
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    if (room.status !== 'lobby') {
      return { success: false, error: 'Room is not accepting players' };
    }
    
    if (room.players.length >= this.MAX_PLAYERS) {
      return { success: false, error: 'Room is full' };
    }
    
    const playerId = this.generatePlayerId();
    
    room.players.push({
      playerId,
      joinedAt: Date.now(),
      isHost: false,
      connected: true
    });
    
    room.lastActivity = Date.now();
    this.playerToRoom.set(playerId, roomId);
    
    console.log(`[Room] ➕ Player ${playerId} joined ${roomId} (${room.players.length}/${this.MAX_PLAYERS})`);
    
    return { 
      success: true, 
      playerId, 
      room: this.getRoomState(roomId) 
    };
  }

  /**
   * Get room state (public info only)
   */
  getRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      roomId: room.roomId,
      players: room.players.map(p => ({
        playerId: p.playerId,
        isHost: p.isHost,
        connected: p.connected
      })),
      playerCount: room.players.length,
      maxPlayers: this.MAX_PLAYERS,
      status: room.status,
      result: room.result
    };
  }

  /**
   * Get room ID for a player
   */
  getRoomForPlayer(playerId) {
    return this.playerToRoom.get(playerId);
  }

  /**
   * Check if player is in room
   */
  isPlayerInRoom(playerId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.players.some(p => p.playerId === playerId);
  }

  /**
   * Check if player is host
   */
  isPlayerHost(playerId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.playerId === playerId);
    return player && player.isHost;
  }

  /**
   * Update player connection status
   */
  setPlayerConnected(playerId, connected) {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;
    
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = connected;
      room.lastActivity = Date.now();
    }
  }

  /**
   * Start voting phase
   */
  startVoting(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    
    if (!this.isPlayerHost(playerId, roomId)) {
      return { success: false, error: 'Only host can start voting' };
    }
    
    if (room.status !== 'lobby') {
      return { success: false, error: 'Game already started' };
    }
    
    if (room.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }
    
    room.status = 'voting';
    room.votes = new Map();
    room.lastActivity = Date.now();
    
    console.log(`[Room] 🎲 Voting started in ${roomId}`);
    
    return { success: true, room: this.getRoomState(roomId) };
  }

  /**
   * Submit a vote
   */
  submitVote(roomId, playerId, encryptedVote, clientPublicKey, nonce) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    
    if (room.status !== 'voting') {
      return { success: false, error: 'Not in voting phase' };
    }
    
    if (!this.isPlayerInRoom(playerId, roomId)) {
      return { success: false, error: 'Not in this room' };
    }
    
    room.votes.set(playerId, {
      encryptedVote,
      clientPublicKey,
      nonce,
      timestamp: Date.now()
    });
    
    room.lastActivity = Date.now();
    
    console.log(`[Room] 🗳️  Vote received in ${roomId} (${room.votes.size}/${room.players.length})`);
    
    return { 
      success: true, 
      votesReceived: room.votes.size,
      totalPlayers: room.players.length
    };
  }

  /**
   * Get all votes for Arcium processing
   */
  getVotesForProcessing(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      roomId,
      votes: Array.from(room.votes.entries()).map(([playerId, voteData]) => ({
        playerId,
        ...voteData
      }))
    };
  }

  /**
   * Set room status
   */
  setRoomStatus(roomId, status) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = status;
      room.lastActivity = Date.now();
    }
  }

  /**
   * Set room result
   */
  setRoomResult(roomId, result) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.result = result;
      room.status = 'result';
      room.lastActivity = Date.now();
    }
  }

  /**
   * Remove player from room
   */
  removePlayer(playerId) {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;
    
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const playerIndex = room.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) return;
    
    const wasHost = room.players[playerIndex].isHost;
    room.players.splice(playerIndex, 1);
    this.playerToRoom.delete(playerId);
    
    console.log(`[Room] ➖ Player ${playerId} left ${roomId}`);
    
    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`[Room] 🗑️  Room ${roomId} deleted (empty)`);
      return;
    }
    
    // If host left, assign new host
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
      console.log(`[Room] 👑 New host in ${roomId}: ${room.players[0].playerId}`);
    }
    
    room.lastActivity = Date.now();
  }

  /**
   * Clean up inactive rooms
   */
  startCleanupTask() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [roomId, room] of this.rooms.entries()) {
        if (now - room.lastActivity > this.ROOM_TIMEOUT_MS) {
          // Remove all players
          for (const player of room.players) {
            this.playerToRoom.delete(player.playerId);
          }
          this.rooms.delete(roomId);
          cleaned++;
          console.log(`[Room] 🧹 Cleaned up inactive room: ${roomId}`);
        }
      }
      
      if (cleaned > 0) {
        console.log(`[Room] 🧹 Cleanup complete: ${cleaned} room(s) removed`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.playerToRoom.size,
      rooms: Array.from(this.rooms.values()).map(r => ({
        roomId: r.roomId,
        players: r.players.length,
        status: r.status,
        age: Math.floor((Date.now() - r.createdAt) / 1000)
      }))
    };
  }
}

export default RoomManager;
