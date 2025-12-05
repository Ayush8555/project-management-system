# Fix Registration 500 Internal Server Error

## The Problem

You're getting a 500 error when trying to register. This is most likely because:

1. **Database schema is out of sync** - The `password` field or `RefreshToken` table doesn't exist in your database
2. **Prisma client needs regeneration** - The generated Prisma client doesn't match the schema

## Quick Fix Steps

### Step 1: Make sure your DATABASE_URL is correct in `.env`

```env
DATABASE_URL="your_neon_postgresql_connection_string"
```

### Step 2: Push the schema to your database

```bash
cd server
npx prisma db push
```

If this fails, try using the direct connection URL:
```bash
npx prisma db push --schema=./prisma/schema.prisma
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 4: Restart your server

```bash
npm run dev
```

## Alternative: Manual Schema Check

If `prisma db push` doesn't work, you can manually verify:

1. Open your Neon database dashboard
2. Check if the `User` table has a `password` column
3. Check if the `RefreshToken` table exists

If not, you'll need to either:
- Run the migrations manually
- Or use Prisma Studio to check: `npx prisma studio`

## Common Error Messages

- **"Unknown column 'password'"** → Schema not pushed, run `npx prisma db push`
- **"Table 'RefreshToken' doesn't exist"** → Schema not pushed, run `npx prisma db push`
- **"P1001: Can't reach database"** → Check DATABASE_URL in .env
- **"P1010: User was denied access"** → Check database credentials

## Still Having Issues?

Check the server console logs - the improved error handling will now show detailed error messages to help identify the exact problem.
