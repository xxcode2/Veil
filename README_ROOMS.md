# 🎮 Veil - Private Voting Multiplayer Game

> **A hidden-information multiplayer game powered by Arcium MPC**  
> Players vote anonymously. Only the result is public. No wallets required.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd server && npm install

# 2. Start server
npm run dev

# 3. In another terminal, start frontend
cd .. && python3 -m http.server 8000

# 4. Open browser
# http://localhost:8000/index-rooms.html
```

---

## ✨ Features

### 🎯 For Players
- ✅ **No Wallet** - Just click and play
- ✅ **Private Votes** - Encrypted before leaving your browser
- ✅ **Fair Results** - MPC ensures correct computation
- ✅ **Instant** - No blockchain transactions to wait for

### 🏗️ For Developers
- ✅ **Room System** - Multiple games can run simultaneously
- ✅ **Real Crypto** - x25519 ECDH + Rescue cipher
- ✅ **WebSocket** - Real-time updates
- ✅ **REST API** - Simple HTTP endpoints
- ✅ **TypeScript** - Fully typed (optional)

---

## 🎮 How to Play

### Create a Room
1. Open [http://localhost:8000/index-rooms.html](http://localhost:8000/index-rooms.html)
2. Click **"Create New Room"**
3. Share the room code with friends (e.g., `VEIL-ABC123`)

### Join a Room
1. Get room code from host
2. Open [http://localhost:8000/index-rooms.html](http://localhost:8000/index-rooms.html)
3. Enter room code and click **"Join Room"**

### Play the Game
1. Wait for host to click **"Start Voting"**
2. Choose **SAFE** or **UNSAFE**
3. Vote is encrypted and sent to server
4. After all players vote, Arcium MPC computes result
5. Results revealed to all players

---

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │  ← Players (no wallet needed)
│  (Client)   │
└──────┬──────┘
       │ WebSocket (encrypted votes)
       │ HTTP (room management)
       │
┌──────▼──────┐
│   Server    │  ← Room manager + MPC orchestrator
│  (Node.js)  │
└──────┬──────┘
       │
       │ (Future: Arcium client)
       │
┌──────▼──────┐
│   Arcium    │  ← MPC computation (devnet)
│   Cluster   │
└─────────────┘
```

### Components

| Component | Purpose | Port |
|-----------|---------|------|
| **HTTP API** | Room creation/joining | 3000 |
| **WebSocket** | Real-time game updates | 3001 |
| **Frontend** | Player UI | 8000 |
| **Room Manager** | Multi-room coordination | - |
| **Arcium Manager** | MPC simulation/integration | - |

---

## 📁 Project Structure

```
veil/
├── server/
│   ├── server.js           ← HTTP + WebSocket server
│   ├── roomManager.js      ← Room lifecycle management
│   ├── arcium-manager.js   ← MPC encryption/decryption
│   └── package.json
│
├── client/
│   └── arcium-client.js    ← Browser-side encryption
│
├── arcium-program/
│   ├── src/lib.rs          ← Rust MPC program (future)
│   └── Cargo.toml
│
├── index-rooms.html        ← Main game UI
├── QUICKSTART_ROOMS.md     ← Detailed guide
└── README.md               ← This file
```

---

## 🔐 Security Model

### Current (Demo Mode)
```javascript
Client: Generate vote
       ↓
Client: Encrypt with x25519 ECDH
       ↓
Server: Receive ciphertext (cannot read plaintext)
       ↓
Server: Simulate MPC decryption locally
       ↓
Server: Broadcast results
```

### Production (Full Arcium)
```javascript
Client: Generate vote
       ↓
Client: Encrypt with x25519 ECDH
       ↓
Server: Receive ciphertext
       ↓
Server: Submit to Arcium MPC cluster
       ↓
Arcium: Decrypt and compute in secure enclave
       ↓
Server: Receive only final result
       ↓
Server: Broadcast results
```

**Key difference**: In production, server NEVER has ability to decrypt individual votes.

---

## 🔌 API Reference

### HTTP Endpoints

#### `POST /room/create`
Create a new room.

**Response:**
```json
{
  "success": true,
  "roomId": "VEIL-ABC123",
  "playerId": "player_1234567890_abc",
  "room": {
    "roomId": "VEIL-ABC123",
    "players": [...],
    "playerCount": 1,
    "maxPlayers": 8,
    "status": "lobby"
  }
}
```

#### `POST /room/join`
Join an existing room.

**Request:**
```json
{
  "roomId": "VEIL-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "playerId": "player_9876543210_xyz",
  "room": { ... }
}
```

#### `GET /room/:roomId`
Get current room state.

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "VEIL-ABC123",
    "players": [
      { "playerId": "...", "isHost": true, "connected": true }
    ],
    "playerCount": 2,
    "status": "lobby"
  }
}
```

### WebSocket Messages

#### Client → Server

**AUTH** - Authenticate player
```json
{
  "type": "AUTH",
  "playerId": "player_...",
  "roomId": "VEIL-ABC123"
}
```

**START_VOTE** - Start voting (host only)
```json
{
  "type": "START_VOTE"
}
```

**VOTE** - Submit encrypted vote
```json
{
  "type": "VOTE",
  "encryptedVote": "base64...",
  "clientPublicKey": "base64...",
  "nonce": "base64..."
}
```

**RESET** - Reset game (host only)
```json
{
  "type": "RESET"
}
```

#### Server → Client

**ROOM_STATE** - Room updated
```json
{
  "type": "ROOM_STATE",
  "room": { ... }
}
```

**VOTE_COUNT** - Vote progress
```json
{
  "type": "VOTE_COUNT",
  "votesReceived": 2,
  "totalPlayers": 3
}
```

**RESULT** - Game results
```json
{
  "type": "RESULT",
  "majorityVote": "SAFE",
  "saboteurVote": "UNSAFE",
  "yourVoteCorrect": true,
  "isSaboteur": false
}
```

---

## 🧪 Testing

### Manual Testing
```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start frontend
python3 -m http.server 8000

# Browser:
# 1. Open http://localhost:8000/index-rooms.html in 3 tabs
# 2. Create room in tab 1
# 3. Join room in tabs 2 & 3
# 4. Start voting in tab 1
# 5. All tabs vote
# 6. Verify results
```

### API Testing
```bash
# Create room
curl -X POST http://localhost:3000/room/create

# Join room (replace ROOM_ID)
curl -X POST http://localhost:3000/room/join \
  -H "Content-Type: application/json" \
  -d '{"roomId":"VEIL-ABC123"}'

# Get room state
curl http://localhost:3000/room/VEIL-ABC123

# Server stats
curl http://localhost:3000/stats
```

---

## 🚀 Production Deployment

### 1. Deploy Arcium Program
```bash
cd arcium-program
arcium init
arcium build
arcium deploy --network devnet
```

### 2. Configure Environment
```bash
# server/.env
ARCIUM_WALLET_PRIVATE_KEY=<your-wallet-key>
ARCIUM_PROGRAM_ID=<deployed-program-id>
ARCIUM_NETWORK=devnet
```

### 3. Update Server Code
```javascript
// Replace demo MPC with real Arcium client
import { ArciumClient } from '@arcium-hq/client';

const arciumClient = new ArciumClient({
  network: process.env.ARCIUM_NETWORK,
  programId: process.env.ARCIUM_PROGRAM_ID
});

// In voting handler:
const result = await arciumClient.executeMpcComputation(votes);
```

### 4. Deploy Server
```bash
# Deploy to your preferred hosting
# Examples: Railway, Fly.io, Heroku, AWS, etc.

# Build
npm run build

# Start production
npm start
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full instructions.

---

## ❓ FAQ

### Why no wallets for players?
**Friction-free onboarding.** Players shouldn't need to:
- Install browser extensions
- Create accounts
- Buy crypto
- Sign transactions

The game should be **instantly playable**.

### How is privacy maintained?
1. **Client-side encryption**: Votes encrypted before leaving browser
2. **Server-blind**: Server receives only ciphertext
3. **MPC computation**: Arcium processes encrypted data
4. **Result-only output**: Only final tally revealed

### What about cheating?
With full Arcium integration:
- Server cannot see individual votes
- Server cannot manipulate computation
- Cryptographic proof of correctness
- Players trust math, not the operator

### Can I use this for real voting?
**Not yet!** This is a demo/hackathon project. For production:
- Add identity verification
- Add sybil resistance
- Add dispute resolution
- Audit smart contracts
- Get security review

---

## 🛠️ Development

### Run in Development
```bash
npm run dev        # Server with auto-reload
python3 -m http.server 8000  # Frontend
```

### Environment Variables
```bash
# Optional (for production Arcium)
ARCIUM_WALLET_PRIVATE_KEY=...
ARCIUM_PROGRAM_ID=...
ARCIUM_NETWORK=devnet
```

### Tech Stack
- **Backend**: Node.js + WebSocket (ws)
- **Frontend**: Vanilla JS + Tailwind CSS
- **Crypto**: @noble/curves (x25519 ECDH)
- **MPC**: Arcium (Solana devnet)

---

## 📚 Documentation

- [QUICKSTART_ROOMS.md](./QUICKSTART_ROOMS.md) - Detailed setup guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [SECURITY.md](./SECURITY.md) - Security architecture

---

## 🤝 Contributing

This is a hackathon/demo project. Contributions welcome!

### Ideas for Improvement
- [ ] Better UI/UX
- [ ] Mobile responsive design
- [ ] More game modes
- [ ] Lobby chat
- [ ] Player avatars
- [ ] Leaderboards
- [ ] Replay system
- [ ] Admin panel

---

## 📝 License

MIT License - feel free to use for hackathons, demos, and learning!

---

## 🎯 Why This Project Exists

### The Problem
Hidden-information games require:
1. **Privacy**: Players shouldn't see each other's moves
2. **Fairness**: No player/server can cheat
3. **Trust**: Players must trust the system

Traditional solutions:
- **Trusted server**: Players trust operator not to cheat
- **Blockchain**: Privacy is hard, everything is public
- **Client-side only**: Easy to hack/inspect

### The Arcium Solution
MPC (Multi-Party Computation) enables:
- ✅ Private inputs (votes encrypted)
- ✅ Public output (results revealed)
- ✅ Verifiable computation (cryptographic proof)
- ✅ Server cannot cheat (even if it wants to)

**This is the killer use case for Arcium: games, voting, auctions, and any scenario requiring hidden information.**

---

## 👨‍💻 Built With

- [Node.js](https://nodejs.org/) - Server runtime
- [WebSocket](https://github.com/websockets/ws) - Real-time communication
- [Noble Curves](https://github.com/paulmillr/noble-curves) - Elliptic curve crypto
- [Tailwind CSS](https://tailwindcss.com/) - UI styling
- [Arcium](https://arcium.com/) - MPC computation

---

**Made with ❤️ for hackathons and hidden-information games**
