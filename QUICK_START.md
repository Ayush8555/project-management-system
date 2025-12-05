# 🚀 Quick Start Guide - JWT Authentication System

## ✅ Complete Authentication System Ready!

A full JWT authentication system has been implemented with:

- ✅ Access Token (15 min) + Refresh Token (7 days)
- ✅ HttpOnly cookies for refresh tokens
- ✅ Automatic token refresh
- ✅ Protected routes
- ✅ Login/Register pages
- ✅ Secure logout

---

## 🎯 Quick Setup (3 Steps)

### Step 1: Configure Environment Variables

#### Server (`/server/.env`):
```env
DATABASE_URL="your_neon_postgresql_url"
JWT_ACCESS_SECRET="change-this-secret-key"
JWT_REFRESH_SECRET="change-this-refresh-secret"
PORT=5009
CLIENT_URL="http://localhost:5173"
```

#### Client (`/Client/.env`):
```env
VITE_API_URL=http://localhost:5009/api
```

---

### Step 2: Setup Database

```bash
cd server
npx prisma generate
npx prisma db push
```

---

### Step 3: Start Servers

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Client:**
```bash
cd Client
npm run dev
```

---

## 🎉 That's It!

1. Visit `http://localhost:5173`
2. You'll see the Login page
3. Register a new account or login
4. You'll be redirected to the protected main page

---

## 📚 Full Documentation

See `AUTH_SETUP.md` for complete documentation.

---

## 🔧 Files Created

### Server:
- `routes/auth.js` - Auth endpoints
- `middleware/auth.js` - Auth middleware
- `utils/jwt.js` - JWT utilities
- Updated `server.js` - Added auth routes & CORS
- Updated `prisma/schema.prisma` - Added password & RefreshToken

### Client:
- `pages/Login.jsx` - Login/Register page
- `components/ProtectedRoute.jsx` - Route protection
- `contexts/AuthContext.jsx` - Auth context
- `utils/api.js` - API client with auto-refresh
- Updated `App.jsx` - Added auth routes
- Updated `main.jsx` - Added AuthProvider
- Updated `components/Navbar.jsx` - Added logout button

---

## 🎨 Features

- **Automatic Token Refresh**: When access token expires, it's automatically refreshed
- **HttpOnly Cookies**: Refresh tokens are secure from XSS attacks
- **Protected Routes**: All routes except `/login` are protected
- **Beautiful UI**: Modern login page with Tailwind CSS
- **Error Handling**: Proper error messages and validation

---

Ready to go! 🚀

