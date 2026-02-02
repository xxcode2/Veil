#!/bin/bash

# 🧪 Test Deployed Backend (Railway)

echo "🧪 Testing Deployed Veil Backend"
echo "=================================="
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./test-deployed.sh <backend-url>"
  echo "Example: ./test-deployed.sh https://veil-backend.up.railway.app"
  exit 1
fi

BACKEND_URL=$1

echo "Testing backend: $BACKEND_URL"
echo ""

echo "1️⃣ Testing health endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/stats")
if [ "$STATUS" -eq 200 ]; then
  echo "✅ Backend is UP (HTTP $STATUS)"
else
  echo "❌ Backend returned HTTP $STATUS"
fi
echo ""

echo "2️⃣ Testing /room/create..."
CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/room/create")
echo "Response: $CREATE_RESPONSE"

ROOM_ID=$(echo $CREATE_RESPONSE | grep -o '"roomId":"[^"]*"' | sed 's/"roomId":"\([^"]*\)"/\1/')
if [ -n "$ROOM_ID" ]; then
  echo "✅ Room created: $ROOM_ID"
else
  echo "❌ Failed to create room"
  exit 1
fi
echo ""

echo "3️⃣ Testing /room/join..."
JOIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/room/join" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":\"$ROOM_ID\"}")
echo "Response: $JOIN_RESPONSE"

if echo "$JOIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Room join successful"
else
  echo "❌ Room join failed"
fi
echo ""

echo "4️⃣ Testing /room/:roomId..."
GET_RESPONSE=$(curl -s "$BACKEND_URL/room/$ROOM_ID")
echo "Response: $GET_RESPONSE"

if echo "$GET_RESPONSE" | grep -q '"playerCount":2'; then
  echo "✅ Room state retrieved (2 players)"
else
  echo "⚠️  Room state may be incomplete"
fi
echo ""

echo "5️⃣ Testing /stats..."
STATS=$(curl -s "$BACKEND_URL/stats")
echo "Stats: $STATS"
echo ""

echo "=================================="
echo "✅ Backend testing complete!"
echo ""
echo "🌐 Frontend URL should be:"
echo "   https://your-app.vercel.app"
echo ""
echo "🔧 Remember to set environment variables:"
echo "   Vercel: VEIL_BACKEND_URL=$BACKEND_URL"
echo "   Vercel: VEIL_WS_URL=${BACKEND_URL/https/wss}"
echo "   Railway: FRONTEND_URL=https://your-app.vercel.app"
