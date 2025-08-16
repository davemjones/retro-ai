/**
 * Script to check user colors in the database
 */

import { prisma } from '../lib/prisma';

async function main() {
  console.log('Checking user colors...');
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
      },
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.name || user.email}: ${user.color || 'NO COLOR'}`);
    });
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('User color check completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });