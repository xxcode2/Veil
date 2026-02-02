#!/bin/bash

# Veil - Quick Start Script
# This script automates the setup process

set -e

echo "🔐 Veil Setup - Arcium MPC Private Voting"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo not found. Please install from https://rustup.rs${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Rust found: $(rustc --version)${NC}"

if ! command -v solana &> /dev/null; then
    echo -e "${YELLOW}⚠️  Solana CLI not found. Installing...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi
echo -e "${GREEN}✅ Solana CLI found: $(solana --version)${NC}"

# Install Arcium CLI if not present
if ! command -v arcium &> /dev/null; then
    echo -e "${YELLOW}⚠️  Arcium CLI not found. Installing...${NC}"
    cargo install arcium-cli || {
        echo -e "${YELLOW}Note: If cargo install fails, download from GitHub releases${NC}"
    }
fi

if command -v arcium &> /dev/null; then
    echo -e "${GREEN}✅ Arcium CLI found: $(arcium --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Arcium CLI installation pending - check manually${NC}"
fi

echo ""
echo "📦 Installing dependencies..."

# Install server dependencies
cd server
echo "Installing server packages..."
npm install
cd ..

echo ""
echo "🏗️  Building Arcium MPC program..."

cd arcium-program
cargo build --release || {
    echo -e "${YELLOW}Note: Arcium-specific build may need manual configuration${NC}"
    echo -e "${YELLOW}See README.md Step 4 for details${NC}"
}
cd ..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Deploy Arcium program:"
echo "   cd arcium-program"
echo "   arcium deploy --program target/release/libveil_voting_mpc.so --keypair ~/.config/solana/arcium-keypair.json"
echo ""
echo "2. Configure server with program ID:"
echo "   cd server"
echo "   cp .env.example .env"
echo "   # Edit .env with your ARCIUM_PROGRAM_ID and ARCIUM_API_KEY"
echo ""
echo "3. Start server:"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "4. Open frontend:"
echo "   python3 -m http.server 8000"
echo "   # Then open http://localhost:8000"
echo ""
echo "📖 See README.md for detailed instructions"
