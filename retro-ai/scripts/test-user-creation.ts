/**
 * Script to test user creation with color assignment
 */

import { prisma } from '../lib/prisma';
import { generateRandomUserColor } from '../lib/user-colors';

async function main() {
  console.log('Testing user creation with color assignment...');
  
  try {
    // Simulate what the Better Auth hook does
    const testEmail = `test-${Date.now()}@example.com`;
    const testName = `Test User ${Math.floor(Math.random() * 1000)}`;
    const color = generateRandomUserColor();
    
    console.log(`Creating user: ${testName} (${testEmail}) with color: ${color}`);
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        color: color,
        emailVerified: false,
      },
    });
    
    console.log(`✅ User created with ID: ${user.id}`);
    console.log(`✅ Color assigned: ${user.color}`);
    
    // Clean up test user
    await prisma.user.delete({
      where: { id: user.id },
    });
    
    console.log('✅ Test user cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing user creation:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('User creation test completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });