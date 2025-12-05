// Quick script to check database schema
import prisma from './configs/prisma.js';

async function checkSchema() {
  try {
    console.log('🔍 Checking database connection and schema...\n');
    
    // Check if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // Check if User model has password field
    try {
      const testUser = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'password';
      `;
      
      if (testUser && testUser.length > 0) {
        console.log('✅ User table has password field');
      } else {
        console.log('❌ User table is missing password field');
        console.log('   Run: npx prisma db push\n');
      }
    } catch (e) {
      console.log('⚠️  Could not check User table schema:', e.message);
    }
    
    // Check if RefreshToken table exists
    try {
      const refreshTokenTable = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'RefreshToken';
      `;
      
      if (refreshTokenTable && refreshTokenTable.length > 0) {
        console.log('✅ RefreshToken table exists');
      } else {
        console.log('❌ RefreshToken table does not exist');
        console.log('   Run: npx prisma db push\n');
      }
    } catch (e) {
      console.log('⚠️  Could not check RefreshToken table:', e.message);
    }
    
    console.log('\n✅ Schema check complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('1. DATABASE_URL is incorrect in .env file');
    console.error('2. Database is not accessible');
    console.error('3. Database credentials are wrong\n');
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();

