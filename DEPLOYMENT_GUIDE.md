# 🚀 Arcium Deployment Guide

This guide provides **EXACT commands** for deploying Veil to Arcium MPC network.

---

## Prerequisites Installed

Before starting, ensure you have:
- ✅ Rust 1.70+
- ✅ Solana CLI 1.14+
- ✅ Arcium CLI
- ✅ Node.js 18+

---

## Step-by-Step Deployment

### 1. Setup Solana Wallet

```bash
# Create new keypair for Arcium program
solana-keygen new --outfile ~/.config/solana/arcium-deployer.json

# Check your address
solana-keygen pubkey ~/.config/solana/arcium-deployer.json

# Configure CLI to use this keypair
solana config set --keypair ~/.config/solana/arcium-deployer.json

# Set network (devnet for testing)
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get
```

### 2. Fund Your Wallet

```bash
# Request devnet SOL (for deployment fees)
solana airdrop 2

# Check balance (should show ~2 SOL)
solana balance

# If airdrop fails, use faucet:
# https://faucet.solana.com/
```

### 3. Build MPC Program

```bash
cd arcium-program

# Add wasm target (if not already added)
rustup target add wasm32-unknown-unknown

# Build for MPC (Arcium-specific)
cargo build --release --target wasm32-unknown-unknown

# Output: target/wasm32-unknown-unknown/release/veil_voting_mpc.wasm
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

### 4. Deploy to Arcium Network

```bash
# Deploy the MPC program
arcium deploy \
  --program target/wasm32-unknown-unknown/release/veil_voting_mpc.wasm \
  --keypair ~/.config/solana/arcium-deployer.json \
  --network devnet \
  --name "veil-voting-mpc" \
  --compute-function compute_voting_result

# Expected output:
# ✅ Program built successfully
# 📤 Deploying to Arcium devnet...
# ✅ Program deployed!
# 
# 📋 Program Details:
# Program ID: A7c1umExAmpl3Pr0gr4mID58Ch4r4ct3rs...
# Network: devnet
# Compute Function: compute_voting_result
# Public Key: (for client encryption)
```

### 5. Verify Deployment

```bash
# Check program is deployed and active
arcium program show --program-id <YOUR_PROGRAM_ID>

# Expected output:
# Program ID: A7c1um...
# Status: Active
# Network: devnet
# Compute Functions: compute_voting_result
# Deployed: 2024-02-02 12:34:56 UTC
```

### 6. Get Encryption Public Key

```bash
# Get the public key for client-side encryption
arcium program key --program-id <YOUR_PROGRAM_ID>

# Save this for client configuration
# Output: 
# Public Key: 0x1234567890abcdef...
```

### 7. Configure Server

```bash
cd ../server

# Copy environment template
cp .env.example .env

# Edit .env file with your values
nano .env

# Fill in:
# ARCIUM_PROGRAM_ID=<your-program-id-from-step-4>
# ARCIUM_API_KEY=<get-from-arcium-dashboard>
# ARCIUM_NETWORK=devnet
```

### 8. Get Arcium API Key

1. Visit: https://app.arcium.com
2. Sign up / Log in
3. Go to: **Dashboard → API Keys**
4. Click: **Create New API Key**
5. Name: "veil-voting-dev"
6. Copy the key
7. Paste into `server/.env` as `ARCIUM_API_KEY`

### 9. Install & Test Server

```bash
# Still in server/ directory
npm install

# Test Arcium connection
npm run dev

# Expected output:
# 🟢 Veil server running on ws://localhost:3001
# 🔐 All votes encrypted end-to-end via Arcium MPC
# [Arcium] ✅ Connected to Arcium MPC network
# [Arcium] Program ID: A7c1um...
```

If you see "❌ Failed to connect", check:
- API key is correct in `.env`
- Program ID matches deployed program
- Network is set to `devnet`

### 10. Configure Frontend

```bash
cd ..

# Edit index.html to set program ID
nano index.html

# Find this line (near bottom):
# const ARCIUM_PROGRAM_ID = window.ARCIUM_PROGRAM_ID || 'veil-voting-mpc-v1';

# Change to:
# const ARCIUM_PROGRAM_ID = window.ARCIUM_PROGRAM_ID || 'YOUR_PROGRAM_ID_HERE';
```

Or create a config file:

```bash
cat > config.js << EOF
window.ARCIUM_PROGRAM_ID = 'YOUR_PROGRAM_ID_HERE';
EOF
```

Then add to `index.html` before other scripts:
```html
<script src="/config.js"></script>
```

### 11. Run Frontend

```bash
# From project root
python3 -m http.server 8000

# Or use Node.js
npx http-server -p 8000

# Open browser to: http://localhost:8000
```

### 12. Test Full Flow

1. Open **3 browser tabs** to `http://localhost:8000`
2. In tab 1: Click "Start Voting"
3. All tabs: Vote for different players
4. Watch server console for Arcium logs
5. Results appear after all votes submitted

**Server logs should show:**
```
📨 Received encrypted vote from player-abc
📨 Received encrypted vote from player-def  
📨 Received encrypted vote from player-ghi
🔐 All votes collected, sending to Arcium MPC...
[Arcium] 📤 Submitting 3 encrypted votes to MPC
[Arcium] ✅ Computation submitted: comp_x1y2z3
[Arcium] ⏳ Waiting for computation...
[Arcium] ✅ Computation complete!
   Saboteur: player-def
   Community correct: false
```

---

## Production Deployment (Mainnet)

### 1. Switch to Mainnet

```bash
# Configure for mainnet-beta
solana config set --url https://api.mainnet-beta.solana.com

# Fund wallet with REAL SOL
# (No airdrop on mainnet - need to transfer from exchange)

# Check balance
solana balance
```

### 2. Deploy to Mainnet

```bash
cd arcium-program

# Build release (same as before)
cargo build --release --target wasm32-unknown-unknown

# Deploy to MAINNET
arcium deploy \
  --program target/wasm32-unknown-unknown/release/veil_voting_mpc.wasm \
  --keypair ~/.config/solana/arcium-deployer.json \
  --network mainnet-beta \
  --name "veil-voting-mpc-prod" \
  --compute-function compute_voting_result

# Save the new MAINNET program ID
```

### 3. Update Server Config

```bash
cd ../server

# Update .env for mainnet
nano .env

# Change:
# ARCIUM_NETWORK=mainnet-beta
# ARCIUM_PROGRAM_ID=<new-mainnet-program-id>
```

### 4. Deploy Server

```bash
# Option 1: Deploy to Railway.app
railway up

# Option 2: Deploy to Fly.io
fly deploy

# Option 3: Deploy to your VPS
# Copy files, install deps, run with PM2
pm2 start server.js --name veil-server
```

### 5. Deploy Frontend

```bash
# Option 1: Vercel
vercel deploy

# Option 2: Netlify
netlify deploy --prod

# Option 3: GitHub Pages
git subtree push --prefix . origin gh-pages
```

---

## Troubleshooting

### Issue: "insufficient funds for transaction"

**Solution:**
```bash
# Check balance
solana balance

# Get more SOL
solana airdrop 1  # (devnet only)

# Or transfer from exchange (mainnet)
```

### Issue: "program already exists"

**Solution:**
```bash
# Generate new program ID
solana-keygen new --outfile ~/.config/solana/program-keypair.json

# Deploy with explicit program keypair
arcium deploy \
  --program target/wasm32-unknown-unknown/release/veil_voting_mpc.wasm \
  --program-keypair ~/.config/solana/program-keypair.json \
  --keypair ~/.config/solana/arcium-deployer.json
```

### Issue: "arcium command not found"

**Solution:**
```bash
# Install from crates.io
cargo install arcium-cli

# Or download binary
wget https://github.com/elusiv-privacy/arcium-cli/releases/latest/download/arcium-cli-linux-x64
chmod +x arcium-cli-linux-x64
sudo mv arcium-cli-linux-x64 /usr/local/bin/arcium

# Verify
which arcium
arcium --version
```

### Issue: "failed to connect to Arcium network"

**Solution:**
```bash
# Test network connectivity
curl -v https://api.arcium.com/health

# Check firewall
sudo ufw status

# Try different endpoint
# In .env: ARCIUM_ENDPOINT=https://api2.arcium.com

# Check API key validity
# Regenerate from dashboard if needed
```

---

## Monitoring & Logs

### View Computation Logs

```bash
# Get computation ID from server logs, then:
arcium logs --computation-id comp_abc123

# Real-time monitoring
arcium logs --computation-id comp_abc123 --follow
```

### Program Analytics

```bash
# View program stats
arcium program stats --program-id <YOUR_PROGRAM_ID>

# Output:
# Total Computations: 142
# Success Rate: 99.3%
# Avg Computation Time: 1.8s
# Last Active: 2 minutes ago
```

### Network Status

```bash
# Check Arcium network health
arcium status

# Check Solana network
solana cluster-version
```

---

## Cost Estimation

### Devnet (Free)
- Deployment: 0 SOL (free airdrops)
- Per computation: 0 SOL
- API calls: Free tier (1000/day)

### Mainnet
- Deployment: ~0.5 SOL (~$50)
- Per computation: ~0.001 SOL (~$0.10)
- API calls: Free tier, then $0.001/call

**For 1000 games/day:**
- Computation cost: ~1 SOL/day (~$100)
- API costs: Free tier covers it
- **Total: ~$100/day**

---

## Security Checklist

Before production:

- [ ] Use hardware wallet for program authority
- [ ] Enable 2FA on Arcium dashboard
- [ ] Rotate API keys regularly
- [ ] Set up monitoring alerts
- [ ] Audit program code
- [ ] Test with real users on devnet first
- [ ] Set up key backup procedures
- [ ] Document incident response plan

---

## Support Resources

- **Arcium Docs:** https://docs.arcium.com
- **Arcium Discord:** https://discord.gg/arcium
- **Solana Docs:** https://docs.solana.com
- **GitHub Issues:** Open an issue for bugs

---

## Quick Reference

### Most Used Commands

```bash
# Deploy
arcium deploy --program <wasm> --keypair <key> --network devnet

# Check status
arcium program show --program-id <id>

# View logs
arcium logs --computation-id <id>

# Test connection
curl https://api.arcium.com/health

# Fund wallet (devnet)
solana airdrop 2

# Check balance
solana balance
```

---

**Ready to deploy? Start with Step 1 above! 🚀**
