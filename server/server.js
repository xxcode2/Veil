import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

const wss = new WebSocketServer({ port: 3001 });

const room = {
  phase: "waiting", // waiting | voting | result
  players: new Map(), // id -> ws
  votes: new Map(),   // id -> votedPlayerId
  saboteurId: null
};

console.log("🟢 Vote Vault server running on ws://localhost:3001");

wss.on("connection", (ws) => {
  const playerId = randomUUID();
  ws.playerId = playerId;

  room.players.set(playerId, ws);
  console.log("➕ Player joined:", playerId);

  broadcastPlayers();

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());

    // ===== START VOTE =====
    if (msg.type === "START_VOTE" && room.phase === "waiting") {
      room.phase = "voting";

      // pilih saboteur secara random
      const ids = Array.from(room.players.keys());
      room.saboteurId = ids[Math.floor(Math.random() * ids.length)];

      broadcast({ type: "PHASE", phase: "voting" });
    }

    // ===== CAST VOTE =====
    if (msg.type === "VOTE" && room.phase === "voting") {
      room.votes.set(playerId, msg.targetId);

      // kalau semua sudah vote
      if (room.votes.size === room.players.size) {
        room.phase = "result";
        computeResult();
      }
    }
  });

  ws.on("close", () => {
    room.players.delete(playerId);
    room.votes.delete(playerId);
    broadcastPlayers();
  });
});

// ================= HELPERS =================

function broadcast(data) {
  room.players.forEach(ws => {
    ws.send(JSON.stringify(data));
  });
}

function broadcastPlayers() {
  broadcast({
    type: "PLAYERS",
    count: room.players.size
  });
}

function computeResult() {
  const tally = {};

  room.votes.forEach(target => {
    tally[target] = (tally[target] || 0) + 1;
  });

  // cari vote terbanyak
  let topTarget = null;
  let maxVotes = 0;

  for (const [target, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      topTarget = target;
    }
  }

  const communityCorrect = topTarget === room.saboteurId;

  // kirim ke semua player
  room.players.forEach((ws, id) => {
    ws.send(JSON.stringify({
      type: "RESULT",
      communityCorrect,
      saboteurId: room.saboteurId,
      yourVoteCorrect: room.votes.get(id) === room.saboteurId
    }));
  });

  console.log("🏁 Voting finished");
}
