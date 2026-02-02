# 🚀 Veil - Quick Start Guide

## Running Locally (Demo Mode)

This is a **working demo** that demonstrates Arcium-style encryption patterns (x25519 key exchange + Rescue cipher) with simulated MPC execution.

### Prerequisites
- Node.js 18+
- Python 3 (for HTTP server)

### Run in 3 Steps

**1. Install dependencies:**
```bash
cd server
npm install
cd ..
```

**2. Start backend:**
```bash
cd server
npm run dev
```

You should see:
```
[Arcium] 🔐 MXE initialized
[Arcium] MXE x25519 public key: 3aa482744ea591ab...
🟢 Veil server running on ws://localhost:3001
🔐 Voting with Arcium-style encryption (x25519 + Rescue)
```

**3. Start frontend (new terminal):**
```bash
python3 -m http.server 8000
```

### Test the Game

1. Open **3 browser tabs** to `http://localhost:8000`
2. In tab 1: Click "Start Voting"  
3. Each tab will show voting options (A or B)
4. Vote in all tabs
5. Watch the server console - you'll see encrypted votes being processed!

**Server logs will show:**
```
📨 Received encrypted vote from <player-id>
   Ciphertext: dGVzdGVuY3J5cHRlZGRhdGE... (24 bytes)
🔐 Processing 3 encrypted votes in MPC...
🎯 Saboteur selected: <player-id> (index 1)
✅ MPC computation complete
    Majority vote: A
    Community correct: true
```

---

## How It Works

### Security Model

1. **Client generates keypair** (x25519)
2. **Key exchange with MXE** (server's "cluster")
3. **Derive shared secret** (ECDH)
4. **Encrypt with Rescue cipher** (arithmetization-oriented)
5. **Server receives ciphertext** - cannot decrypt!
6. **MPC "enclave" decrypts** and computes result
7. **Only final results revealed**

### What Server Sees vs. Cannot See

✅ Server receives:
- Encrypted ciphertext (random-looking bytes)
- Client public key (safe to know)
- Nonce (safe to know)

❌ Server CANNOT see:
- Your actual vote (A or B)
- Who the saboteur is (until after computation)
- Individual vote tallies

---

## Real Arcium Integration

This demo **simulates** MPC locally for easy testing. For **production Arcium**:

### Required Changes:

1. **Install Arcium toolchain:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
   arcup install
   ```

2. **Create Arcium project:**
   ```bash
   arcium init veil-voting
   cd veil-voting
   ```

3. **Write encrypted instruction** (`encrypted-ixs/vote.rs`):
   ```rust
   use arcis::*;

   #[encrypted]
   mod circuits {
       use arcis::*;

       pub struct VoteInput {
           votes: Vec<Vote>,
       }

       #[instruction]
       pub fn compute_voting(input: Enc<Shared, VoteInput>) -> Enc<Shared, VoteResult> {
           let data = input.to_arcis();
           // ... voting logic ...
           input.owner.from_arcis(result)
       }
   }
   ```

4. **Write Solana program** (Anchor):
   ```rust
   #[arcium_program]
   pub mod veil {
       #[arcium_callback(encrypted_ix = "compute_voting")]
       pub fn vote_callback(ctx: Context<VoteCallback>, output: SignedComputationOutputs<VoteOutput>) -> Result<()> {
           // Handle results
       }
   }
   ```

5. **Deploy:**
   ```bash
   arcium build
   arcium deploy --cluster-offset 456 --recovery-set-size 4 --rpc-url <your-rpc>
   ```

6. **Update client** to use `@arcium-hq/client`:
   ```typescript
   import { RescueCipher } from '@arcium-hq/client';
   
   const cipher = new RescueCipher(sharedSecret);
   const encrypted = cipher.encrypt(plaintext, nonce);
   ```

### Key Differences: Demo vs. Production

| Aspect | Demo (This Code) | Production (Real Arcium) |
|--------|-----------------|--------------------------|
| MPC Execution | Simulated locally | Arcium cluster (distributed nodes) |
| Encryption | Simplified Rescue | Real Rescue-Prime cipher |
| Computation | JavaScript function | Rust circuit compiled to WASM |
| Storage | In-memory | Solana blockchain |
| Callbacks | WebSocket | Solana program instructions |
| Verification | Trust server | Cryptographic proofs |

---

## Documentation

- **Arcium Docs:** https://docs.arcium.com/developers
- **Example Projects:** https://github.com/arcium-hq/examples
- **Security Analysis:** See `SECURITY.md`

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### WebSocket not connecting
- Check server is running (`npm run dev`)
- Check `WS_URL` in index.html matches your server

### Encryption errors
- Clear browser console and refresh
- Check browser supports Web Crypto API
- Try in Chrome/Firefox (not Safari which has crypto restrictions)

---

**Status:** ✅ Demo Ready - Working x25519 + Rescue encryption flow!

For production deployment, follow the "Real Arcium Integration" section above.
