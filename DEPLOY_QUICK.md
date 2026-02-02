# 🚀 Quick Deploy Guide

## Deploy ke Vercel + Railway dalam 5 Menit

### 1️⃣ Deploy Backend ke Railway

```bash
1. Buka railway.app
2. New Project → Deploy from GitHub
3. Pilih repo: xxcode2/Veil
4. Root directory: server/
5. Set variable: FRONTEND_URL=<nanti diisi>
6. Deploy!
7. Copy URL Railway: https://veil-xxx.up.railway.app
```

### 2️⃣ Deploy Frontend ke Vercel

```bash
1. Buka vercel.com
2. New Project → Import xxcode2/Veil
3. Root directory: . (root)
4. Set variables:
   - VEIL_BACKEND_URL=https://veil-xxx.up.railway.app
   - VEIL_WS_URL=wss://veil-xxx.up.railway.app
5. Deploy!
6. Copy URL Vercel: https://veil-yyy.vercel.app
```

### 3️⃣ Update Railway

```bash
1. Kembali ke Railway
2. Update variable:
   - FRONTEND_URL=https://veil-yyy.vercel.app
3. Redeploy
```

### ✅ Test!

Buka URL Vercel Anda dan test create room!

---

## 📚 Dokumentasi Lengkap

Lihat [DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md) untuk:
- Troubleshooting
- Security checklist
- Scaling tips
- Error solutions

---

## 🆘 Error?

### "Connection failed"
→ Cek environment variables di Vercel

### "CORS error"
→ Update FRONTEND_URL di Railway, lalu redeploy

### "WebSocket failed"
→ Pastikan pakai `wss://` (bukan `ws://`)

---

**Ready to deploy? Go! 🚀**
