# 🚀 DEPLOY VEIL KE ARCIUM DEVNET

## ⚠️ PENTING: IKUTI URUTAN INI!

Arcium adalah framework MPC berbasis Solana. Deployment harus urut:
1. Build & deploy Solana program
2. Build & upload Arcis circuits
3. Initialize computation definitions
4. Update backend dengan program ID
5. Deploy backend ke Railway
6. Deploy frontend ke Vercel

---

## 📋 PERSIAPAN

### 1. Install Arcium CLI

```bash
npm install -g @arcium-hq/cli
arcium --version
```

### 2. Setup Solana Wallet

```bash
# Generate wallet (jika belum punya)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL devnet (untuk gas fees)
solana airdrop 2 --url devnet

# Check balance
solana balance --url devnet
```

### 3. Set Solana ke Devnet

```bash
solana config set --url devnet
arcium cluster set devnet
```

---

## 🔨 STEP 1: BUILD ARCIUM PROGRAM

```bash
cd /workspaces/Veil/arcium-program

# Build Anchor program
anchor build

# Output: target/deploy/veil.so
```

**Troubleshooting:**
- Error `anchor: command not found` → Install: `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.32.1 && avm use 0.32.1`
- Error `arcium not found` → Check Cargo.toml dependencies

---

## 🚀 STEP 2: DEPLOY KE SOLANA DEVNET

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Output akan seperti:
# Program Id: VeiL1111111111111111111111111111111111111111
# (atau ID lain yang di-generate)
```

**CATAT PROGRAM ID INI!** Contoh output:
```
Deploying workspace: https://api.devnet.solana.com
Upgrade authority: 7xKt5ZJb...
Deploying program "veil"...
Program path: /workspaces/Veil/arcium-program/target/deploy/veil.so...
Program Id: ARc1UmXPqK3FzV5yH8N9WbT2cP4kL6sR8mJ9oQ7eFgHv
```

➡️ **SIMPAN**: `ARc1UmXPqK3FzV5yH8N9WbT2cP4kL6sR8mJ9oQ7eFgHv`

---

## 🔐 STEP 3: BUILD ARCIS CIRCUITS

Circuits adalah logic yang berjalan **inside MPC enclave**.

```bash
cd /workspaces/Veil/arcium-program

# Build circuits
arcium build circuits/init_game.arcis
arcium build circuits/vote.arcis
arcium build circuits/reveal_result.arcis

# Output: build/*.arcis (compiled circuits)
```

**Troubleshooting:**
- Arcis compiler error → Check syntax di circuits/*.arcis
- Missing dependencies → `npm install @arcium-hq/client`

---

## 📤 STEP 4: INITIALIZE COMPUTATION DEFINITIONS

Computation definitions mendaftarkan circuits ke on-chain.

```bash
# Initialize dengan Anchor tests
cd /workspaces/Veil/arcium-program
anchor test --skip-local-validator -- --devnet

# Atau manual:
ts-node scripts/init-comp-defs.ts
```

**Ini akan:**
1. Call `init_game_comp_def()`
2. Call `init_vote_comp_def()`
3. Call `init_reveal_comp_def()`
4. Upload circuit bytecode

---

## ✅ STEP 5: VERIFY DEPLOYMENT

```bash
# Check program deployed
solana program show <PROGRAM_ID> --url devnet

# Should show:
# Program Id: ARc1Um...
# Owner: BPFLoaderUpgradeab...
# ProgramData Address: ...
# Authority: <your-wallet>
# Last Deployed In Slot: ...
# Data Length: ... bytes
```

---

## 🔧 STEP 6: UPDATE BACKEND

Sekarang update backend untuk menggunakan program yang baru di-deploy.

### 6.1. Update server/arcium-manager.js

```javascript
// Ganti dengan PROGRAM_ID Anda
const ARCIUM_PROGRAM_ID = "ARc1UmXPqK3FzV5yH8N9WbT2cP4kL6sR8mJ9oQ7eFgHv";
const SOLANA_RPC_URL = "https://api.devnet.solana.com";
```

### 6.2. Install Arcium Client

```bash
cd /workspaces/Veil/server
npm install @arcium-hq/client @solana/web3.js
```

### 6.3. Test Locally

```bash
cd /workspaces/Veil/server

# Set environment variables
export ARCIUM_PROGRAM_ID="ARc1UmXPqK3FzV5yH8N9WbT2cP4kL6sR8mJ9oQ7eFgHv"
export SOLANA_RPC_URL="https://api.devnet.solana.com"
export SOLANA_WALLET_PRIVATE_KEY="$(cat ~/.config/solana/id.json)"

# Run server
npm run dev
```

**Test:**
- Create room → Should work
- Submit votes → Should queue MPC computation
- Reveal result → Should decrypt and show result

---

## 🚂 STEP 7: DEPLOY BACKEND (RAILWAY)

### 7.1. Set Environment Variables di Railway

```bash
ARCIUM_PROGRAM_ID=ARc1UmXPqK3FzV5yH8N9WbT2cP4kL6sR8mJ9oQ7eFgHv
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PRIVATE_KEY=<your-wallet-array>
FRONTEND_URL=https://veil-game.vercel.app
```

**⚠️ WALLET_PRIVATE_KEY format:**
```
[123,45,67,89,...]  # Array dari solana keypair JSON
```

### 7.2. Deploy

```bash
git add .
git commit -m "Add Arcium integration"
git push origin main
```

Railway akan auto-deploy.

---

## 🌐 STEP 8: DEPLOY FRONTEND (VERCEL)

### 8.1. Set Environment Variables di Vercel

```bash
VEIL_BACKEND_URL=https://veil-backend.up.railway.app
VEIL_WS_URL=wss://veil-backend.up.railway.app
```

### 8.2. Deploy

Vercel akan auto-deploy dari GitHub push.

---

## 🧪 TESTING

### Test Full Flow:

1. **Open Frontend**: https://veil-game.vercel.app

2. **Create Room**:
   - Klik "Create New Room"
   - Server calls `create_game()` → Arcium MPC
   - Wait for MPC initialization

3. **Join Players**:
   - Open 2-3 tabs
   - Join dengan room code

4. **Vote**:
   - All players vote SAFE/UNSAFE
   - Votes encrypted client-side
   - Server calls `submit_vote()` → Arcium MPC

5. **Reveal**:
   - Host clicks reveal
   - Server calls `reveal_result()` → Arcium MPC
   - MPC:
     - Decrypts votes
     - Selects random saboteur
     - Computes result
   - Results broadcast to all players

---

## 📊 MONITORING

### Check Arcium Transactions:

```bash
# View program account
solana account <PROGRAM_ID> --url devnet

# View recent transactions
solana transaction-history <WALLET> --url devnet
```

### Check Arcium Explorer:

https://explorer.arcium.com/devnet

Search your program ID to see:
- MPC computations
- Circuit executions
- Gas fees

---

## 💰 COSTS

### Devnet (FREE):
- Program deployment: FREE (devnet SOL)
- Circuit uploads: FREE
- MPC computations: FREE (devnet)

### Mainnet (FUTURE):
- Program deployment: ~5 SOL
- MPC per computation: ~0.01-0.1 SOL
- Storage: ~0.001 SOL per game

---

## 🐛 TROUBLESHOOTING

### Error: "Program not found"
→ Check PROGRAM_ID correct
→ Verify deployment: `solana program show <ID> --url devnet`

### Error: "Computation failed"
→ Check circuit syntax
→ Verify comp defs initialized
→ Check MPC cluster status

### Error: "Invalid authority"
→ Check wallet private key correct
→ Verify wallet has SOL for gas

### Error: "Cluster not set"
→ Run: `arcium cluster set devnet`
→ Check Arcium CLI version

### MPC Computation Stuck
→ Wait 30-60s (MPC takes time)
→ Check devnet status: https://status.solana.com
→ Retry transaction

---

## 📚 RESOURCES

- Arcium Docs: https://docs.arcium.com
- Arcium GitHub: https://github.com/Arcium-hq
- Solana Devnet: https://explorer.solana.com/?cluster=devnet
- Anchor Docs: https://www.anchor-lang.com/docs

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Arcium CLI installed
- [ ] Solana wallet created & funded
- [ ] Cluster set to devnet
- [ ] Anchor program built
- [ ] Program deployed to devnet
- [ ] Program ID saved
- [ ] Arcis circuits built
- [ ] Computation definitions initialized
- [ ] Backend updated with program ID
- [ ] Backend tested locally
- [ ] Environment variables set (Railway)
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Full flow tested
- [ ] MPC computations working

---

## 🎉 SUCCESS!

Jika semua steps berhasil:
- ✅ Solana program live di devnet
- ✅ MPC circuits uploaded
- ✅ Backend connected ke Arcium
- ✅ Frontend dapat create rooms & vote
- ✅ Results computed in MPC (server blind!)

**Selamat! Veil Anda sekarang menggunakan TRUE Arcium MPC! 🔐**

---

**Next: Share link game Anda dan mainkan dengan teman!**
