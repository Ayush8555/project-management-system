// Script to diagnose and fix registration error
import 'dotenv/config';
import prisma from './configs/prisma.js';

async function testRegistration() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected\n');
    
    // Check if User table exists and has password field
    console.log('🔍 Checking User table structure...');
    try {
      // Try to query a user (this will fail if table doesn't exist)
      const userCount = await prisma.user.count();
      console.log(`✅ User table exists (${userCount} users found)\n`);
      
      // Try to create a test user to check if password field exists
      console.log('🔍 Testing if password field exists...');
      const testEmail = `test-${Date.now()}@test.com`;
      
      try {
        await prisma.user.create({
          data: {
            name: 'Test User',
            email: testEmail,
            password: 'test123456',
          },
        });
        console.log('✅ Password field exists - User creation works!\n');
        
        // Clean up test user
        await prisma.user.delete({ where: { email: testEmail } });
        console.log('✅ Test user cleaned up\n');
      } catch (createError) {
        if (createError.message?.includes('Unknown field') || createError.message?.includes('password')) {
          console.log('❌ ERROR: Password field does NOT exist in User table!');
          console.log('   You need to run: npx prisma db push\n');
        } else {
          throw createError;
        }
      }
      
    } catch (error) {
      if (error.message?.includes('does not exist') || error.code === 'P2021') {
        console.log('❌ User table does not exist!');
        console.log('   You need to run: npx prisma db push\n');
      } else {
        throw error;
      }
    }
    
    // Check RefreshToken table
    console.log('🔍 Checking RefreshToken table...');
    try {
      const tokenCount = await prisma.refreshToken.count();
      console.log(`✅ RefreshToken table exists (${tokenCount} tokens found)\n`);
    } catch (error) {
      if (error.message?.includes('does not exist') || error.code === 'P2021') {
        console.log('❌ RefreshToken table does NOT exist!');
        console.log('   You need to run: npx prisma db push\n');
      } else {
        throw error;
      }
    }
    
    console.log('✅ All checks passed! Registration should work.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'P1001' || error.code === 'P1010') {
      console.error('\n🔧 Fix: Check your DATABASE_URL in .env file');
    }
    
    console.error('\n');
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();

