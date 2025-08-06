// Create demo users through Better Auth API instead of direct database seeding
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DEMO_USERS = [
  { email: 'TestUser1@example.com', name: 'Alice Johnson', password: 'demopassword' },
  { email: 'TestUser2@example.com', name: 'Bob Smith', password: 'demopassword' },
  { email: 'TestUser3@example.com', name: 'Charlie Brown', password: 'demopassword' },
  { email: 'TestUser4@example.com', name: 'Diana Prince', password: 'demopassword' },
  { email: 'TestUser5@example.com', name: 'Ethan Hunt', password: 'demopassword' },
  { email: 'TestUser6@example.com', name: 'Fiona Shaw', password: 'demopassword' },
  { email: 'TestUser7@example.com', name: 'George Wilson', password: 'demopassword' },
  { email: 'TestUser8@example.com', name: 'Hannah Lee', password: 'demopassword' },
  { email: 'TestUser9@example.com', name: 'Ian Malcolm', password: 'demopassword' },
  { email: 'TestUser10@example.com', name: 'Julia Roberts', password: 'demopassword' }
];

async function createDemoUsers() {
  console.log('Creating demo users through Better Auth API...');
  
  const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const createdUsers = [];
  
  for (const user of DEMO_USERS) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        createdUsers.push(result.user);
        console.log(`✅ Created: ${user.email} (ID: ${result.user.id})`);
      } else {
        const errorText = await response.text();
        const error = JSON.parse(errorText);
        
        if (error.code === 'USER_ALREADY_EXISTS') {
          // User exists, let's find them and add to our list
          console.log(`ℹ️  User already exists: ${user.email}`);
          // We'll need to fetch existing users after the loop
        } else {
          console.log(`❌ Failed to create ${user.email}: ${errorText}`);
        }
      }
      
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message);
    }
  }
  
  console.log(`\nSummary: Created ${createdUsers.length} out of ${DEMO_USERS.length} demo users`);
  
  // If some users already existed, fetch them from the database
  if (createdUsers.length < DEMO_USERS.length) {
    console.log('\nFetching existing demo users from database...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const existingUsers = await prisma.user.findMany({
        where: {
          email: {
            in: DEMO_USERS.map(u => u.email.toLowerCase()) // Better Auth normalizes emails
          }
        },
        orderBy: { email: 'asc' }
      });
      
      console.log(`Found ${existingUsers.length} existing demo users`);
      
      // Use existing users for team/board creation
      const allUsers = existingUsers.length > 0 ? existingUsers : createdUsers;
      
      if (allUsers.length > 0) {
        console.log('\nCreating teams and boards...');
        const { createTeamsAndBoards } = require('./create-teams-and-boards.js');
        await createTeamsAndBoards(allUsers);
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error fetching existing users:', error);
    }
  } else {
    // All users were newly created
    console.log('\nCreating teams and boards...');
    const { createTeamsAndBoards } = require('./create-teams-and-boards.js');
    await createTeamsAndBoards(createdUsers);
  }
  
  return createdUsers;
}

// Export for use in other scripts
module.exports = { createDemoUsers, DEMO_USERS };

// Run directly if called as script
if (require.main === module) {
  createDemoUsers()
    .then(() => {
      console.log('Demo user creation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}