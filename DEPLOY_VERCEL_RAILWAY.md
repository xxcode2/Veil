# 🚀 Panduan Deployment Veil ke Vercel + Railway

> **Frontend**: Vercel  
> **Backend**: Railway

---

## 📋 Persiapan

### Yang Anda Butuhkan:
- ✅ Akun Vercel (gratis di [vercel.com](https://vercel.com))
- ✅ Akun Railway (gratis di [railway.app](https://railway.app))
- ✅ Repository GitHub (sudah ada: `xxcode2/Veil`)

---

## 🔧 LANGKAH 1: Deploy Backend ke Railway

### 1.1. Buat Project di Railway

1. Buka [railway.app](https://railway.app)
2. Klik **"New Project"**
3. Pilih **"Deploy from GitHub repo"**
4. Pilih repository **`xxcode2/Veil`**
5. Railway akan auto-detect Node.js

### 1.2. Configure Build Settings

Railway akan otomatis mendeteksi, tapi pastikan:

```
Root Directory: server/
Start Command: npm start
Build Command: npm install
```

### 1.3. Set Environment Variables

Di Railway Dashboard → Variables, tambahkan:

```bash
# Tidak perlu set PORT (Railway auto-set)

# Set frontend URL (akan diisi setelah deploy Vercel)
FRONTEND_URL=https://your-veil-app.vercel.app

# Optional (untuk production Arcium)
# ARCIUM_WALLET_PRIVATE_KEY=...
# ARCIUM_PROGRAM_ID=...
# ARCIUM_NETWORK=devnet
```

### 1.4. Deploy!

1. Klik **"Deploy"**
2. Tunggu build selesai (~2-3 menit)
3. Catat URL Railway Anda, contoh:
   ```
   https://veil-backend-production.up.railway.app
   ```

### 1.5. Test Backend

```bash
curl https://your-backend.up.railway.app/room/create -X POST
```

Harus return JSON dengan `roomId` dan `playerId`.

---

## 🌐 LANGKAH 2: Deploy Frontend ke Vercel

### 2.1. Buat Project di Vercel

1. Buka [vercel.com](https://vercel.com)
2. Klik **"Add New"** → **"Project"**
3. Import repository **`xxcode2/Veil`**
4. Vercel akan auto-detect

### 2.2. Configure Project Settings

**Framework Preset**: Other (atau pilih None)

**Root Directory**: `.` (root)

**Build Command**: (kosongkan atau `npm run build`)

**Output Directory**: `.` (root)

**Install Command**: `npm install` (optional)

### 2.3. Set Environment Variables

Di Vercel → Project Settings → Environment Variables:

```bash
# Backend URL dari Railway (PENTING!)
VEIL_BACKEND_URL=https://your-backend.up.railway.app

# WebSocket URL (sama dengan backend, tapi pakai wss://)
VEIL_WS_URL=wss://your-backend.up.railway.app
```

**⚠️ PENTING**: Ganti `your-backend.up.railway.app` dengan URL Railway Anda yang asli!

### 2.4. Deploy!

1. Klik **"Deploy"**
2. Tunggu build selesai (~1-2 menit)
3. Vercel akan memberikan URL, contoh:
   ```
   https://veil-game.vercel.app
   ```

### 2.5. Update Railway Environment

Kembali ke Railway, update variable:

```bash
FRONTEND_URL=https://veil-game.vercel.app
```

Kemudian **Redeploy** backend Railway agar perubahan diterapkan.

---

## ✅ LANGKAH 3: Test Deployment

### 3.1. Test Frontend

Buka URL Vercel Anda:
```
https://veil-game.vercel.app
```

Anda harus melihat halaman home Veil.

### 3.2. Test Room Creation

1. Klik **"Create New Room"**
2. Periksa Console browser (F12)
3. Anda harus melihat:
   ```
   🔧 Veil Config: {HTTP_API: "https://...", WS_URL: "wss://...", ...}
   ```

4. Jika berhasil, room code akan muncul

### 3.3. Test Multiplayer

1. Buka 2-3 tab browser dengan URL Vercel
2. Tab 1: Create room
3. Tab 2-3: Join dengan room code
4. Test voting flow

---

## 🐛 Troubleshooting

### Error: "Connection failed"

**Penyebab**: Frontend tidak bisa connect ke backend

**Solusi**:
1. Periksa environment variables di Vercel
2. Pastikan URL Railway benar (tanpa trailing slash `/`)
3. Test backend langsung:
   ```bash
   curl https://your-backend.up.railway.app/room/create -X POST
   ```

### Error: "CORS policy"

**Penyebab**: CORS tidak dikonfigurasi dengan benar

**Solusi**:
1. Pastikan `FRONTEND_URL` di Railway sudah benar
2. Redeploy backend Railway
3. Clear browser cache

### Error: "WebSocket connection failed"

**Penyebab**: WebSocket URL salah atau Railway tidak support WS

**Solusi**:
1. Pastikan menggunakan `wss://` (bukan `ws://`)
2. Test dengan:
   ```javascript
   const ws = new WebSocket('wss://your-backend.up.railway.app');
   ws.onopen = () => console.log('Connected!');
   ```

### Error: "Room not found" setelah refresh

**Penyebab**: Railway restart otomatis (rooms hilang karena in-memory)

**Solusi**: Ini normal untuk development. Untuk production:
- Tambahkan Redis untuk persistence
- Atau gunakan database

### Backend tidak bisa diakses

**Penyebab**: Railway mungkin sedang sleeping (free plan)

**Solusi**:
1. Buka URL Railway di browser untuk "wake up"
2. Upgrade ke Railway Pro untuk always-on

---

## 📊 Post-Deployment Checklist

- [ ] Backend Railway running (cek dashboard)
- [ ] Frontend Vercel deployed
- [ ] Environment variables sudah benar
- [ ] CORS bekerja (test di browser)
- [ ] WebSocket connect berhasil
- [ ] Room creation works
- [ ] Room joining works
- [ ] Voting flow works
- [ ] Multiple players dapat bermain

---

## 🔒 Security Checklist (Production)

- [ ] Update CORS ke frontend URL spesifik
- [ ] Tambahkan rate limiting
- [ ] Set up SSL/TLS (otomatis di Vercel & Railway)
- [ ] Hide sensitive logs
- [ ] Add request validation
- [ ] Set up monitoring (Railway Dashboard)

---

## 📈 Scaling & Optimization

### Jika Traffic Tinggi:

**Railway (Backend)**:
- Upgrade ke Railway Pro ($5/month)
- Enable auto-scaling
- Add Redis untuk session management

**Vercel (Frontend)**:
- Gratis plan sudah sangat cukup
- Auto-scaling otomatis
- CDN global included

---

## 🆘 Support

### Railway Logs
```bash
# Di Railway Dashboard → Deployments → View Logs
# Lihat error real-time
```

### Vercel Logs
```bash
# Di Vercel Dashboard → Project → Logs
# Atau gunakan Vercel CLI:
vercel logs
```

### Test Locally Before Deploy
```bash
# Backend
cd server && npm run dev

# Frontend  
python3 -m http.server 8000
```

---

## 📝 Environment Variables Cheat Sheet

### Railway (Backend)
```bash
FRONTEND_URL=https://veil-game.vercel.app  # ← Ganti dengan URL Vercel Anda
```

### Vercel (Frontend)
```bash
VEIL_BACKEND_URL=https://veil-backend.up.railway.app  # ← Ganti dengan URL Railway Anda
VEIL_WS_URL=wss://veil-backend.up.railway.app         # ← Sama, tapi wss://
```

---

## 🎯 Quick Deploy Commands

### Redeploy Backend (Railway)
```bash
# Otomatis via GitHub push
git push origin main
```

### Redeploy Frontend (Vercel)
```bash
# Otomatis via GitHub push, atau manual:
vercel --prod
```

---

## ✨ Selesai!

Aplikasi Anda sekarang:
- ✅ Deploy di Vercel (frontend)
- ✅ Deploy di Railway (backend)
- ✅ HTTPS/WSS otomatis
- ✅ Global CDN (Vercel)
- ✅ Auto-scaling
- ✅ Zero downtime deployments

**URL Anda**: `https://veil-game.vercel.app` (atau nama domain custom)

---

## 🔗 Useful Links

- [Railway Dashboard](https://railway.app/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)

---

**Selamat! Aplikasi Veil Anda sudah online! 🎉**
