# 🚀 QUICK START CARD

**Veil - Arcium MPC Private Voting**

---

## ⚡ 30-Second Setup

```bash
# 1. Install dependencies
cd server && npm install && cd ..

# 2. Build MPC program
cd arcium-program
cargo build --release --target wasm32-unknown-unknown
cd ..

# 3. Deploy to Arcium (get PROGRAM_ID)
cd arcium-program
arcium deploy \
  --program target/wasm32-unknown-unknown/release/veil_voting_mpc.wasm \
  --keypair ~/.config/solana/arcium-deployer.json \
  --network devnet

# 4. Configure
cd ../server
cp .env.example .env
nano .env  # Add your PROGRAM_ID and API_KEY

# 5. Run
npm run dev
```

---

## 🔑 Essential Commands

### Arcium CLI
```bash
arcium --version                    # Check installation
arcium deploy --program <wasm>      # Deploy MPC program
arcium program show --program-id    # Verify deployment
arcium logs --computation-id        # View computation logs
```

### Solana CLI
```bash
solana config set --url devnet      # Use devnet
solana airdrop 2                    # Get test SOL
solana balance                      # Check wallet
```

### Server
```bash
npm install                         # Install dependencies
npm run dev                         # Start server
```

### Frontend
```bash
python3 -m http.server 8000         # Serve files
# Or: npx http-server -p 8000
```

---

## 📋 Pre-Deployment Checklist

- [ ] Rust installed (`rustc --version`)
- [ ] Solana CLI installed (`solana --version`)
- [ ] Arcium CLI installed (`arcium --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Wallet created (`solana-keygen new`)
- [ ] Wallet funded (`solana balance > 0`)

---

## 🎯 Test Flow

1. **Deploy Program** → Get PROGRAM_ID
2. **Configure Server** → Add PROGRAM_ID + API_KEY to `.env`
3. **Start Server** → `npm run dev` in `server/`
4. **Start Frontend** → `python3 -m http.server 8000`
5. **Open 3 Browser Tabs** → `http://localhost:8000`
6. **Start Vote** → Click "Start Voting" in one tab
7. **Cast Votes** → Each tab votes
8. **Watch Logs** → Server shows encrypted votes, MPC computes

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "arcium not found" | `cargo install arcium-cli` |
| "insufficient funds" | `solana airdrop 2` |
| "connection failed" | Check API key in `.env` |
| "program not found" | Verify PROGRAM_ID is correct |

---

## 📱 Demo Script (90 seconds)

**[0:00-0:20] The Problem**
> "Traditional voting systems: server sees everything. Privacy breach, manipulation risk."

**[0:20-0:50] The Solution**
> "Veil uses Arcium MPC. Votes encrypted in browser, decrypted ONLY inside secure enclave. Server literally cannot read votes."

**[0:50-1:20] Live Demo**
> [Open 3 tabs, start voting, show server logs with encrypted data]
> "See? Server receives only encrypted blobs. Computation happens in Arcium."

**[1:20-1:30] The Result**
> "Results revealed, but individual votes stay private forever. Zero-knowledge voting."

**Key phrase:** *"The server never decrypts votes - mathematically impossible."*

---

## 🔗 Important URLs

- **Arcium Dashboard:** https://app.arcium.com
- **Arcium Docs:** https://docs.arcium.com
- **Solana Faucet:** https://faucet.solana.com
- **Project Repo:** [Your GitHub URL]

---

## 📞 Emergency Contacts

- **Arcium Discord:** discord.gg/arcium
- **Documentation:** See README.md
- **Troubleshooting:** See DEPLOYMENT_GUIDE.md
- **Security:** See SECURITY.md

---

## 🏆 Judge Talking Points

1. **Real MPC** - Not a simulation, actual Arcium integration
2. **Server Blind** - Cryptographically proven, not trust-based
3. **Verifiable** - Can audit MPC logs, inspect encrypted data
4. **Practical** - Works today, not a concept
5. **Documented** - 1500+ lines of documentation

---

## 💡 One-Liner Pitch

> "Veil is a social deduction game where **the server cannot cheat because it never sees your vote** - powered by Arcium's Multi-Party Computation."

---

**Print this card and keep it handy during the hackathon! 🎉**
