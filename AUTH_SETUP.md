# 🔐 JWT Authentication System - Complete Setup Guide

## ✅ What's Been Implemented

A complete JWT authentication system with the following features:

- ✅ **Access Token** (15 minutes expiry) - stored in localStorage
- ✅ **Refresh Token** (7 days expiry) - stored as HttpOnly cookie
- ✅ **Automatic token refresh** when access token expires
- ✅ **Protected routes** on both server and client
- ✅ **Login/Register** pages
- ✅ **Password hashing** with bcrypt
- ✅ **Secure logout** that clears refresh token from DB and cookie

---

## 📁 File Structure

### Server (`/server/`)

```
server/
├── routes/
│   └── auth.js              # Auth routes (register, login, refresh, logout, me)
├── middleware/
│   └── auth.js              # Authentication middleware
├── utils/
│   └── jwt.js               # JWT token generation and verification
├── configs/
│   └── prisma.js            # Prisma client configuration
├── prisma/
│   └── schema.prisma        # Database schema (updated with password & RefreshToken)
└── server.js                # Main server file (updated)
```

### Client (`/Client/`)

```
Client/
├── src/
│   ├── pages/
│   │   └── Login.jsx        # Login/Register page
│   ├── components/
│   │   └── ProtectedRoute.jsx  # Route protection component
│   ├── contexts/
│   │   └── AuthContext.jsx  # Auth context provider
│   ├── utils/
│   │   └── api.js           # API client with token refresh
│   ├── App.jsx              # Updated with auth routes
│   └── main.jsx             # Updated with AuthProvider
```

---

## 🚀 Setup Instructions

### 1. Server Setup

#### Update `.env` file in `/server/`:

```env
# Database
DATABASE_URL="your_neon_postgresql_connection_string"
DIRECT_URL="your_neon_direct_connection_string"

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_ACCESS_SECRET="your-super-secret-access-key-change-this"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"

# Server
PORT=5009
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL="http://localhost:5173"
```

#### Install dependencies (if needed):

```bash
cd server
npm install
```

#### Update Prisma schema:

The schema already includes:
- `password` field in User model
- `RefreshToken` model

#### Generate Prisma client and push schema:

```bash
cd server
npx prisma generate
npx prisma db push
```

#### Start the server:

```bash
npm run dev
# or
npm start
```

---

### 2. Client Setup

#### Update `.env` file in `/Client/` (create if doesn't exist):

```env
VITE_API_URL=http://localhost:5009/api
```

#### Install dependencies (if needed):

```bash
cd Client
npm install
```

#### Start the client:

```bash
npm run dev
```

---

## 🔄 How It Works

### Authentication Flow

1. **User logs in/registers** → Server generates:
   - Access token (15 min) → sent in response, stored in localStorage
   - Refresh token (7 days) → stored as HttpOnly cookie

2. **User makes API request** → Client sends:
   - Access token in `Authorization: Bearer <token>` header

3. **If access token expires** (401 error):
   - Client automatically calls `/api/auth/refresh`
   - Server validates refresh token (from cookie)
   - Server generates new access token
   - Client retries original request with new token

4. **User logs out** → Server:
   - Deletes refresh token from database
   - Clears refresh token cookie
   - Client clears access token from localStorage

---

## 📡 API Endpoints

### Public Endpoints

#### `POST /api/auth/register`
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "accessToken": "..."
}
```

#### `POST /api/auth/login`
Login user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "..."
}
```

### Protected Endpoints (require access token)

#### `POST /api/auth/refresh`
Refresh access token (uses refresh token from cookie).

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "..."
}
```

#### `POST /api/auth/logout`
Logout user (clears refresh token).

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### `GET /api/auth/me`
Get current user info.

**Response:**
```json
{
  "user": {
    "id": "...",
    "name": "...",
    "email": "..."
  }
}
```

---

## 🛡️ Protecting Routes

### Server-Side

Use the `authenticateToken` middleware:

```javascript
import { authenticateToken } from './middleware/auth.js';

router.get('/protected-route', authenticateToken, (req, res) => {
  // req.user contains { id, email }
  res.json({ message: 'Protected data', user: req.user });
});
```

### Client-Side

Wrap routes with `ProtectedRoute`:

```javascript
import ProtectedRoute from './components/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

---

## 🎨 Using Auth in Components

### Access user data:

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user.name}!</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Make authenticated API calls:

```javascript
import apiClient from '../utils/api.js';

// The API client automatically:
// 1. Adds access token to headers
// 2. Refreshes token if expired
// 3. Retries failed requests

const data = await apiClient.get('/some-protected-endpoint');
```

---

## 🔒 Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Refresh tokens stored as HttpOnly cookies (XSS protection)
- ✅ Access tokens with short expiry (15 minutes)
- ✅ Automatic token refresh on expiry
- ✅ Refresh token validation in database
- ✅ Secure cookie settings (httpOnly, sameSite, secure in production)

---

## 🐛 Troubleshooting

### "Failed to refresh token"
- Check that refresh token cookie is being sent (check browser DevTools → Application → Cookies)
- Verify CORS is configured correctly in `server.js`
- Check that `credentials: 'include'` is set in API requests

### "CORS error"
- Ensure `CLIENT_URL` in server `.env` matches your client URL
- Verify `credentials: true` is set in CORS config

### "Token expired" errors
- Check JWT secrets are set in `.env`
- Verify token expiry times in `utils/jwt.js`
- Check system time is correct

---

## 📝 Next Steps

1. **Add your Neon database credentials** to server `.env`
2. **Change JWT secrets** to strong random strings
3. **Run database migrations**: `npx prisma db push`
4. **Start server**: `npm run dev` (in server folder)
5. **Start client**: `npm run dev` (in Client folder)
6. **Test the flow**: 
   - Visit `http://localhost:5173`
   - You'll be redirected to `/login`
   - Register a new account
   - You'll be redirected to the protected main page

---

## 🎉 You're All Set!

Your JWT authentication system is ready to use. All routes are protected, tokens refresh automatically, and logout works securely!

For questions or issues, check the error messages in the console or server logs.

