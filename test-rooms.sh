#!/bin/bash

# 🧪 Veil Room System Test Script

echo "🎮 Testing Veil Room System API"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

echo "1️⃣ Testing CREATE ROOM..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/room/create")
echo "Response: $CREATE_RESPONSE"

# Extract roomId using grep and sed
ROOM_ID=$(echo $CREATE_RESPONSE | grep -o '"roomId":"[^"]*"' | sed 's/"roomId":"\([^"]*\)"/\1/')
PLAYER_ID=$(echo $CREATE_RESPONSE | grep -o '"playerId":"[^"]*"' | sed 's/"playerId":"\([^"]*\)"/\1/')

echo "✅ Room created: $ROOM_ID"
echo "✅ Host player ID: $PLAYER_ID"
echo ""

echo "2️⃣ Testing GET ROOM..."
GET_RESPONSE=$(curl -s "$BASE_URL/room/$ROOM_ID")
echo "Response: $GET_RESPONSE"
echo ""

echo "3️⃣ Testing JOIN ROOM..."
JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/room/join" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":\"$ROOM_ID\"}")
echo "Response: $JOIN_RESPONSE"

PLAYER2_ID=$(echo $JOIN_RESPONSE | grep -o '"playerId":"[^"]*"' | sed 's/"playerId":"\([^"]*\)"/\1/')
echo "✅ Second player joined: $PLAYER2_ID"
echo ""

echo "4️⃣ Testing GET ROOM (with 2 players)..."
GET_RESPONSE2=$(curl -s "$BASE_URL/room/$ROOM_ID")
echo "Response: $GET_RESPONSE2"
echo ""

echo "5️⃣ Testing STATS..."
STATS_RESPONSE=$(curl -s "$BASE_URL/stats")
echo "Response: $STATS_RESPONSE"
echo ""

echo "6️⃣ Testing JOIN INVALID ROOM..."
INVALID_JOIN=$(curl -s -X POST "$BASE_URL/room/join" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"INVALID"}')
echo "Response: $INVALID_JOIN"
echo ""

echo "✅ All API tests complete!"
echo ""
echo "📋 Test Summary:"
echo "  - Room ID: $ROOM_ID"
echo "  - Host: $PLAYER_ID"
echo "  - Player 2: $PLAYER2_ID"
echo ""
echo "🌐 Frontend: http://localhost:8000/index-rooms.html"
echo "🔌 WebSocket: ws://localhost:3001"
