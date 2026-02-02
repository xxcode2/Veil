# 🚀 SIAP DEPLOY KE VERCEL + RAILWAY!

## ✅ Apa yang Sudah Saya Lakukan

Saya sudah mempersiapkan aplikasi Veil Anda agar siap di-hosting ke:
- **Vercel** (untuk frontend)
- **Railway** (untuk backend)

### File-File yang Dibuat/Diupdate:

#### 1. **Backend (Server) - Railway**
- ✅ [server/server.js](server/server.js) - Update untuk support Railway
  - Dynamic PORT (otomatis dari Railway)
  - CORS dikonfigurasi untuk Vercel
  - Bind ke `0.0.0.0` agar bisa diakses
  
- ✅ [server/package.json](server/package.json) - Update scripts
  - `npm start` untuk production
  - Node.js version requirement

#### 2. **Frontend - Vercel**
- ✅ [index.html](index.html) - Main entry point
  - Auto-detect production/development
  - Dynamic API URLs
  
- ✅ [vercel.json](vercel.json) - Konfigurasi Vercel
  - Static file serving
  - CORS headers
  
- ✅ [package.json](package.json) - Root package untuk Vercel

#### 3. **Configuration Files**
- ✅ [railway.json](railway.json) - Konfigurasi Railway
- ✅ [.env.example](.env.example) - Template environment variables
- ✅ [client/config.js](client/config.js) - Frontend config helper

#### 4. **Dokumentasi**
- ✅ [DEPLOY_VERCEL_RAILWAY.md](DEPLOY_VERCEL_RAILWAY.md) - Panduan lengkap (detailed)
- ✅ [DEPLOY_QUICK.md](DEPLOY_QUICK.md) - Panduan singkat (5 menit)
- ✅ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Checklist step-by-step

#### 5. **Testing Tools**
- ✅ [test-deployed.sh](test-deployed.sh) - Script untuk test backend yang sudah deploy

---

## 🎯 Cara Deploy (Ringkas)

### 1️⃣ Deploy Backend ke Railway (~3 menit)

```
1. Buka https://railway.app
2. Login dengan GitHub
3. Klik "New Project" → "Deploy from GitHub repo"
4. Pilih repository "xxcode2/Veil"
5. Railway otomatis detect Node.js
6. Tunggu build selesai
7. COPY URL Railway (contoh: https://veil-xxx.up.railway.app)
```

**Set Environment Variable di Railway:**
```
FRONTEND_URL=(nanti diisi setelah deploy Vercel)
```

### 2️⃣ Deploy Frontend ke Vercel (~2 menit)

```
1. Buka https://vercel.com
2. Login dengan GitHub
3. Klik "Add New" → "Project"
4. Import repository "xxcode2/Veil"
5. Framework: Other/None
6. Root Directory: . (default)
```

**Set Environment Variables di Vercel:**
```
VEIL_BACKEND_URL=https://veil-xxx.up.railway.app
VEIL_WS_URL=wss://veil-xxx.up.railway.app
```

⚠️ **GANTI** `veil-xxx.up.railway.app` dengan URL Railway Anda!

```
7. Klik "Deploy"
8. Tunggu selesai
9. COPY URL Vercel (contoh: https://veil-yyy.vercel.app)
```

### 3️⃣ Update Railway dengan URL Vercel

```
1. Kembali ke Railway dashboard
2. Go to Variables
3. Update/tambahkan:
   FRONTEND_URL=https://veil-yyy.vercel.app
4. Redeploy backend (klik "Redeploy")
```

### ✅ Selesai!

Buka URL Vercel Anda dan test create room!

---

## 🧪 Testing Setelah Deploy

### Test Backend:
```bash
# Ganti dengan URL Railway Anda
curl -X POST https://veil-xxx.up.railway.app/room/create

# Atau gunakan script
./test-deployed.sh https://veil-xxx.up.railway.app
```

### Test Frontend:
```
1. Buka https://veil-yyy.vercel.app
2. Tekan F12 (Developer Console)
3. Lihat log: "🔧 Veil Config: ..."
4. Pastikan HTTP_API dan WS_URL benar
5. Klik "Create New Room"
6. Jika berhasil, room code muncul!
```

### Test Multiplayer:
```
1. Buka 2-3 tab browser
2. Tab 1: Create room
3. Tab 2-3: Join dengan room code
4. Test voting flow
```

---

## 🐛 Troubleshooting Cepat

### ❌ "Connection failed"
**Solusi:**
1. Cek environment variables di Vercel dashboard
2. Pastikan URL Railway benar (no trailing `/`)
3. Test backend langsung dengan curl
4. Cek Railway logs untuk error

### ❌ "CORS policy error"
**Solusi:**
1. Cek `FRONTEND_URL` di Railway
2. Redeploy backend Railway
3. Clear browser cache (Ctrl+Shift+Del)

### ❌ "WebSocket connection failed"
**Solusi:**
1. Pastikan pakai `wss://` (BUKAN `ws://`)
2. Cek `VEIL_WS_URL` di Vercel
3. Test di browser console:
   ```javascript
   const ws = new WebSocket('wss://your-backend.up.railway.app');
   ws.onopen = () => console.log('OK!');
   ```

### ❌ Backend tidak bisa diakses
**Solusi:**
1. Railway free tier bisa "sleep" setelah tidak digunakan
2. Buka URL Railway di browser untuk "wake up"
3. Tunggu 10-15 detik
4. Refresh frontend

---

## 📊 Apa yang Berubah dari Kode Anda?

### Server Changes:
```javascript
// SEBELUM:
const HTTP_PORT = 3000;
const WS_PORT = 3001;

// SESUDAH:
const HTTP_PORT = process.env.PORT || 3000;  // ← Railway set PORT otomatis
const WS_PORT = process.env.WS_PORT || ...;

// CORS SEBELUM:
res.setHeader('Access-Control-Allow-Origin', '*');

// CORS SESUDAH:
// Cek origin dari environment variable untuk security
```

### Frontend Changes:
```javascript
// SEBELUM:
const HTTP_API = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';

// SESUDAH:
const isProduction = window.location.hostname !== 'localhost';
const HTTP_API = isProduction 
  ? window.VEIL_BACKEND_URL  // ← Dari Vercel env var
  : 'http://localhost:3000';
```

**Semua perubahan backward compatible!** Aplikasi masih jalan normal di localhost.

---

## 💰 Biaya Hosting

### Railway (Backend)
- **Free Tier**: $5 credit/bulan
- Backend Veil: ~$5/bulan
- **Total**: GRATIS untuk bulan pertama!

### Vercel (Frontend)
- **Hobby Plan**: GRATIS selamanya
- Unlimited bandwidth
- Global CDN included

**Total biaya: $0-5/bulan** (backend saja yang bayar setelah free trial)

---

## 📚 Dokumentasi Lengkap

Pilih sesuai kebutuhan:

1. **[DEPLOY_QUICK.md](DEPLOY_QUICK.md)** ← Mulai di sini! (5 menit)
2. **[DEPLOY_VERCEL_RAILWAY.md](DEPLOY_VERCEL_RAILWAY.md)** ← Detail lengkap
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** ← Step-by-step checklist

---

## ✅ Pre-Deployment Checklist

Sebelum deploy, pastikan:
- [x] Git commit semua perubahan
- [x] Push ke GitHub (`git push origin main`)
- [x] Punya akun Railway (gratis)
- [x] Punya akun Vercel (gratis)

---

## 🎉 Setelah Deploy Berhasil

Anda akan punya:
- ✅ URL frontend: `https://veil-xxx.vercel.app`
- ✅ URL backend: `https://veil-yyy.up.railway.app`
- ✅ HTTPS otomatis (SSL gratis)
- ✅ Global CDN (Vercel)
- ✅ Auto-scaling
- ✅ Zero-downtime deployment

**Share link dengan teman dan mainkan Veil online! 🎮**

---

## 🆘 Butuh Bantuan?

1. Cek [DEPLOY_VERCEL_RAILWAY.md](DEPLOY_VERCEL_RAILWAY.md) untuk troubleshooting detail
2. Cek Railway/Vercel logs untuk error messages
3. Test locally dulu: `npm run dev` di server folder

---

## 🚀 Siap Deploy?

```bash
# 1. Commit changes
git add .
git commit -m "Prepare for Vercel + Railway deployment"
git push origin main

# 2. Go to Railway & Vercel
# 3. Follow DEPLOY_QUICK.md

# 4. Celebrate! 🎉
```

---

**Sukses untuk deployment Anda! 🚀**

*Dibuat khusus untuk deployment Vercel (frontend) + Railway (backend)*
