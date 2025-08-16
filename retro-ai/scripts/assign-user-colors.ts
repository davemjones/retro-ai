/**
 * Script to assign random colors to existing users who don't have one.
 * Run this script after implementing the user color feature to update existing users.
 */

import { assignColorsToExistingUsers } from '../lib/user-colors';

async function main() {
  console.log('Starting user color assignment...');
  
  try {
    const updatedCount = await assignColorsToExistingUsers();
    console.log(`✅ Successfully assigned colors to ${updatedCount} users.`);
    
    if (updatedCount === 0) {
      console.log('ℹ️ All users already have colors assigned.');
    }
  } catch (error) {
    console.error('❌ Error assigning user colors:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('User color assignment completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });