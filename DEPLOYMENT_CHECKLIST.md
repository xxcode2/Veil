# ✅ Deployment Checklist

## Pre-Deployment

### Backend (Railway)
- [ ] File `server/server.js` sudah support dynamic PORT
- [ ] File `server/package.json` punya script `start`
- [ ] Dependencies di `server/package.json` lengkap
- [ ] CORS dikonfigurasi dengan benar
- [ ] File `railway.json` ada

### Frontend (Vercel)
- [ ] File `index.html` ada (copy dari `index-rooms.html`)
- [ ] Auto-detect environment sudah benar
- [ ] File `vercel.json` ada
- [ ] File `package.json` di root ada

---

## Deployment Steps

### 1. Railway (Backend)
- [ ] Project dibuat di Railway
- [ ] Repository GitHub connected
- [ ] Root directory set: `server/`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Deploy triggered
- [ ] Build success (check logs)
- [ ] Backend URL copied

### 2. Vercel (Frontend)
- [ ] Project dibuat di Vercel
- [ ] Repository GitHub connected
- [ ] Root directory set: `.` (root)
- [ ] Environment variables diset:
  - [ ] `VEIL_BACKEND_URL` = Railway URL
  - [ ] `VEIL_WS_URL` = Railway URL (wss://)
- [ ] Deploy triggered
- [ ] Build success
- [ ] Frontend URL copied

### 3. Update Railway
- [ ] Kembali ke Railway dashboard
- [ ] Set environment variable:
  - [ ] `FRONTEND_URL` = Vercel URL
- [ ] Redeploy backend
- [ ] Deployment success

---

## Post-Deployment Testing

### Backend Tests
- [ ] Test endpoint: `curl https://your-backend.up.railway.app/stats`
- [ ] Test create room: `curl -X POST https://your-backend.up.railway.app/room/create`
- [ ] Response code 200
- [ ] JSON response valid
- [ ] Room ID returned

### Frontend Tests
- [ ] Open Vercel URL in browser
- [ ] No console errors
- [ ] Config logged correctly
- [ ] Click "Create New Room"
- [ ] Room code appears
- [ ] Copy room code works

### Integration Tests
- [ ] Open 2 browser tabs
- [ ] Tab 1: Create room
- [ ] Tab 2: Join room
- [ ] Both tabs show same player list
- [ ] Host can start voting
- [ ] Both players can vote
- [ ] Results appear correctly

---

## Common Issues Checklist

### If "Connection Failed"
- [ ] Check backend URL di Vercel environment variables
- [ ] Test backend langsung dengan curl
- [ ] Check Railway logs untuk errors
- [ ] Pastikan backend tidak sleeping (Railway free plan)

### If "CORS Error"
- [ ] Cek FRONTEND_URL di Railway
- [ ] Redeploy Railway backend
- [ ] Clear browser cache
- [ ] Check network tab untuk exact error

### If "WebSocket Failed"
- [ ] Pastikan pakai `wss://` (bukan `ws://`)
- [ ] Check VEIL_WS_URL di Vercel
- [ ] Test WebSocket dengan browser console
- [ ] Check Railway logs

### If "Room Not Found After Refresh"
- [ ] Normal behavior (in-memory storage)
- [ ] Room hilang jika Railway restart
- [ ] Buat room baru
- [ ] (Production: tambahkan Redis)

---

## Performance Checklist

### Railway
- [ ] Backend responding < 1s
- [ ] No memory leaks in logs
- [ ] CPU usage normal
- [ ] Auto-restart working

### Vercel
- [ ] Page load < 2s
- [ ] Assets cached
- [ ] No console errors
- [ ] CDN working globally

---

## Security Checklist

### Production Ready
- [ ] CORS limited ke frontend URL spesifik
- [ ] No sensitive data di logs
- [ ] Environment variables secure
- [ ] SSL/TLS enabled (auto)
- [ ] No API keys exposed

### Optional Improvements
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add monitoring (Sentry, etc)
- [ ] Add analytics
- [ ] Add error tracking

---

## Monitoring Checklist

### Railway
- [ ] Check deployment status
- [ ] Monitor logs real-time
- [ ] Check metrics (CPU, RAM)
- [ ] Set up alerts (optional)

### Vercel
- [ ] Check deployment status
- [ ] Monitor analytics
- [ ] Check function logs
- [ ] Review performance insights

---

## Final Checks

### URLs Documented
```
Backend (Railway):  https://_____________________.up.railway.app
Frontend (Vercel):  https://_____________________.vercel.app
```

### Environment Variables Set
```
Railway:
  FRONTEND_URL = ✅

Vercel:
  VEIL_BACKEND_URL = ✅
  VEIL_WS_URL = ✅
```

### Testing Complete
```
Backend API:      ✅
Frontend Load:    ✅
Room Creation:    ✅
Room Joining:     ✅
Voting Flow:      ✅
WebSocket:        ✅
```

---

## 🎉 Deployment Complete!

Semua checklist di atas harus ✅ sebelum launch!

**Share your game**: `https://your-veil-app.vercel.app`

---

## Next Steps

1. [ ] Share link dengan teman untuk testing
2. [ ] Monitor errors di Railway/Vercel dashboard
3. [ ] Collect feedback
4. [ ] Plan improvements
5. [ ] (Optional) Add custom domain

---

**Good luck! 🚀**
