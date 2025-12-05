# 🚨 IMPORTANT: Database Setup Required

## Your registration error is happening because the database schema needs to be synced!

### Quick Fix (3 Steps):

#### 1. Make sure you're in the server directory:
```bash
cd /Users/ayushtiwari/Desktop/PMS/server
```

#### 2. Push your schema to the database:
```bash
npx prisma db push
```

**If you get a connection error**, check your `.env` file has the correct DATABASE_URL:
```env
DATABASE_URL="your_neon_database_url"
```

#### 3. Regenerate Prisma Client:
```bash
npx prisma generate
```

#### 4. Restart your server:
```bash
npm run dev
```

### What This Does:

- Adds the `password` field to your User table
- Creates the `RefreshToken` table
- Syncs all your Prisma schema changes to the database

### After running these commands:

1. Try registering again
2. The error should be fixed!

---

## If `prisma db push` Fails:

1. **Check your DATABASE_URL** in `.env` file is correct
2. **Verify database credentials** are correct
3. **Check if database is accessible** from your network

---

## Need Help?

Check the server console - the improved error messages will show exactly what's wrong!

