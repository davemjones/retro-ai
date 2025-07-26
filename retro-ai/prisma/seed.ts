import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Check environment - only seed test data in development or staging
  const nodeEnv = process.env.NODE_ENV || 'development';
  // For now, we'll consider any non-production environment as suitable for test data
  const isNonProduction = nodeEnv !== 'production';
  
  console.log('Current environment:', nodeEnv);

  // Always seed templates regardless of environment
  // Create default templates
  const templates = [
    {
      name: "Start/Stop/Continue",
      description: "Classic retrospective format to identify what to start doing, stop doing, and continue doing",
      columns: [
        { title: "Start", order: 0, color: "#10B981" },
        { title: "Stop", order: 1, color: "#EF4444" },
        { title: "Continue", order: 2, color: "#3B82F6" },
      ],
      isDefault: true,
    },
    {
      name: "Mad/Sad/Glad",
      description: "Emotional retrospective to express feelings about the sprint",
      columns: [
        { title: "Mad", order: 0, color: "#EF4444" },
        { title: "Sad", order: 1, color: "#F59E0B" },
        { title: "Glad", order: 2, color: "#10B981" },
      ],
      isDefault: true,
    },
    {
      name: "4Ls",
      description: "Reflect on what you Liked, Learned, Lacked, and Longed For",
      columns: [
        { title: "Liked", order: 0, color: "#10B981" },
        { title: "Learned", order: 1, color: "#3B82F6" },
        { title: "Lacked", order: 2, color: "#F59E0B" },
        { title: "Longed For", order: 3, color: "#8B5CF6" },
      ],
      isDefault: true,
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: {},
      create: {
        name: template.name,
        description: template.description,
        columns: template.columns,
        isDefault: template.isDefault,
      },
    });
  }

  console.log("Templates seeded successfully");

  // Seed test data only in non-production environments
  if (!isNonProduction) {
    console.log('Skipping test data seeding in production environment');
    return;
  }

  console.log('Seeding test data for development/staging environment...');

  // Create test users
  const testUsers = [
    { name: "Alice Johnson", email: "TestUser1@example.com", color: "#FFE066" },
    { name: "Bob Smith", email: "TestUser2@example.com", color: "#FF6B9D" },
    { name: "Charlie Brown", email: "TestUser3@example.com", color: "#4ECDC4" },
    { name: "Diana Prince", email: "TestUser4@example.com", color: "#95E1D3" },
    { name: "Ethan Hunt", email: "TestUser5@example.com", color: "#FFA07A" },
    { name: "Fiona Shaw", email: "TestUser6@example.com", color: "#C3A6FF" },
    { name: "George Wilson", email: "TestUser7@example.com", color: "#FFE066" },
    { name: "Hannah Lee", email: "TestUser8@example.com", color: "#FF6B9D" },
    { name: "Ian Malcolm", email: "TestUser9@example.com", color: "#4ECDC4" },
    { name: "Julia Roberts", email: "TestUser10@example.com", color: "#95E1D3" },
  ];

  const hashedPassword = await bcrypt.hash("password", 10);
  const createdUsers: User[] = [];

  for (const user of testUsers) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
      },
    });
    createdUsers.push(createdUser);
  }

  console.log(`Created ${createdUsers.length} test users`);

  // Create teams
  const teamData = [
    { name: "Alpha Team", code: "ALPHA001", members: [0, 1, 2, 3, 4] }, // Users 1-5
    { name: "Beta Team", code: "BETA001", members: [5, 6, 7, 8, 9] },  // Users 6-10
    { name: "Gamma Team", code: "GAMMA001", members: [1, 2, 3, 6, 8] }, // Users 2,3,4,7,9
  ];

  const createdTeams = [];

  for (const team of teamData) {
    const createdTeam = await prisma.team.upsert({
      where: { code: team.code },
      update: {},
      create: {
        name: team.name,
        code: team.code,
        members: {
          create: team.members.map((index, memberIndex) => ({
            userId: createdUsers[index].id,
            role: memberIndex === 0 ? "OWNER" : "MEMBER"
          }))
        }
      },
    });
    createdTeams.push(createdTeam);
  }

  console.log(`Created ${createdTeams.length} teams`);

  // Create boards with 4Ls template
  const fourLsTemplate = await prisma.template.findUnique({
    where: { name: "4Ls" }
  });

  if (!fourLsTemplate) {
    throw new Error("4Ls template not found");
  }

  const boardData = [
    { title: "Alpha Team Retrospective", teamId: createdTeams[0].id },
    { title: "Beta Team Retrospective", teamId: createdTeams[1].id },
    { title: "Gamma Team Retrospective", teamId: createdTeams[2].id },
  ];

  const createdBoards = [];

  for (let i = 0; i < boardData.length; i++) {
    const board = boardData[i];
    
    // Check if board already exists
    const existingBoard = await prisma.board.findFirst({
      where: {
        title: board.title,
        teamId: board.teamId
      }
    });

    if (existingBoard) {
      const boardWithColumns = await prisma.board.findUnique({
        where: { id: existingBoard.id },
        include: { columns: true }
      });
      if (boardWithColumns) {
        createdBoards.push(boardWithColumns);
      }
    } else {
      const createdBoard = await prisma.board.create({
        data: {
          title: board.title,
          teamId: board.teamId,
          templateId: fourLsTemplate.id,
          createdById: createdUsers[0].id, // Use first user as creator
          columns: {
            create: [
              { title: "Liked", order: 0, color: "#10B981" },
              { title: "Learned", order: 1, color: "#3B82F6" },
              { title: "Lacked", order: 2, color: "#F59E0B" },
              { title: "Longed For", order: 3, color: "#8B5CF6" },
            ]
          }
        },
        include: {
          columns: true
        }
      });
      createdBoards.push(createdBoard);
    }
  }

  console.log(`Created ${createdBoards.length} boards`);

  // Witty AI/Claude Code related sticky note content
  const stickyNoteContent = [
    "Claude turned my spaghetti code into a five-star meal 🍝",
    "AI pair programming: Like having a senior dev who never needs coffee",
    "Debugging with Claude is faster than explaining the bug to a rubber duck",
    "Finally, an AI that understands my variable names are perfect as is",
    "Claude Code: Making me look smarter since 2024",
    "Who needs Stack Overflow when you have an AI that actually understands context?",
    "AI-assisted coding: Because my keyboard deserves a break too",
    "Claude helped me refactor code I wrote at 3 AM and didn't understand at 9 AM",
    "Claude writes better comments than I do, and I'm not even mad about it",
    "My code reviews are now just me nodding along to Claude's suggestions",
    "Claude found bugs I didn't know existed in code I didn't remember writing",
    "Thanks to Claude, my imposter syndrome now has imposter syndrome",
    "Claude: Turning 'it works on my machine' into 'it works everywhere'",
    "AI coding assistant: Because copy-pasting from Stack Overflow is so 2023",
    "Claude explains my code better than I explain my code",
    "With Claude, every day is a code review where I actually learn something",
    "Claude made me realize my 'clever' one-liners weren't that clever",
    "My git commits are now 50% my code, 50% Claude's improvements",
    "Claude: The only code reviewer that doesn't judge my naming conventions",
    "AI pair programming: Now I can blame someone else for my bugs",
    "Claude turned my hacky workaround into an actual solution",
    "Thanks to Claude, my TODO comments are actually getting done",
    "Claude writes unit tests that actually test things",
    "My code is now Claude-approved and mother-approved",
    "Claude: Making regex readable since never (but at least it tries)",
    "With Claude, refactoring is no longer a four-letter word",
    "Claude found performance issues I was strategically ignoring",
    "AI coding: Because my rubber duck needed a PhD",
    "Claude makes me feel like I know what I'm doing",
    "My code now has fewer bugs than features, thanks Claude!",
    "Claude: Turning coffee into clean code faster than ever",
    "AI pair programming: Like having a mentor who never gets tired",
    "Claude helped me understand my own code from last week",
    "Thanks to Claude, my code now has a coherent architecture",
    "Claude: Making technical debt payments since 2024",
    "With Claude, every bug is a learning opportunity I actually understand",
    "Claude turned my prototype into production-ready code",
    "AI coding assistant: Because Google-fu only gets you so far",
    "Claude makes me write documentation, and I'm grateful for it",
    "My pull requests now get approved on the first try, thanks Claude!",
    "Claude: The code whisperer we all needed",
    "With Claude, I finally understand what SOLID principles mean",
    "Claude helped me delete more code than I wrote, and that's a win",
    "AI pair programming: Making me a 10x developer, 1x at a time",
    "Claude found edge cases I didn't know had edges",
  ];

  // Create sticky notes
  let stickyNoteIndex = 0;
  let totalStickies = 0;

  for (let boardIndex = 0; boardIndex < createdBoards.length; boardIndex++) {
    const board = createdBoards[boardIndex];
    const team = createdTeams[boardIndex];
    
    // Get team members for this board
    const teamMembers = await prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: team.id
          }
        }
      }
    });

    // Each user creates 3 sticky notes
    for (const user of teamMembers) {
      const userIndex = createdUsers.findIndex(u => u.id === user.id);
      const userColor = testUsers[userIndex].color;
      
      for (let noteCount = 0; noteCount < 3; noteCount++) {
        const column = board.columns![noteCount % board.columns!.length];
        const content = stickyNoteContent[stickyNoteIndex % stickyNoteContent.length];
        stickyNoteIndex++;
        
        // Calculate position within column (distribute notes)
        const positionX = column.order * 300 + 50 + (noteCount * 20); // Spread horizontally
        const positionY = 100 + (stickyNoteIndex * 30) % 400; // Spread vertically
        
        await prisma.sticky.create({
          data: {
            content,
            color: userColor,
            columnId: column.id,
            boardId: board.id,
            authorId: user.id,
            positionX,
            positionY,
          }
        });
        totalStickies++;
      }
    }
  }

  console.log(`Created ${totalStickies} sticky notes`);
  console.log("Test data seeded successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });