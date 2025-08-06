const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTeamsAndBoards(createdUsers) {
  try {
    // Create teams
    const teamData = [
      { name: "Alpha Team", code: "ALPHA001", members: [0, 1, 2, 3, 4] }, // Users 1-5
      { name: "Beta Team", code: "BETA001", members: [5, 6, 7, 8, 9] }, // Users 6-10
      { name: "Gamma Team", code: "GAMMA001", members: [1, 2, 3, 6, 8] }, // Users 2,3,4,7,9
    ];

    const createdTeams = [];

    for (const teamInfo of teamData) {
      console.log(`Creating team: ${teamInfo.name}`);
      
      // First, create or find the team (without members)
      const team = await prisma.team.upsert({
        where: { code: teamInfo.code },
        update: {
          name: teamInfo.name, // Update name in case it changed
        },
        create: {
          name: teamInfo.name,
          code: teamInfo.code,
        },
      });

      // Then handle each team member individually to ensure proper role assignment
      for (
        let memberIndex = 0;
        memberIndex < teamInfo.members.length;
        memberIndex++
      ) {
        const userIndex = teamInfo.members[memberIndex];
        const userId = createdUsers[userIndex].id;
        const role = memberIndex === 0 ? "OWNER" : "MEMBER";

        await prisma.teamMember.upsert({
          where: {
            userId_teamId: {
              userId: userId,
              teamId: team.id,
            },
          },
          update: {
            role: role, // Update the role even if the member already exists
          },
          create: {
            userId: userId,
            teamId: team.id,
            role: role,
          },
        });
      }

      createdTeams.push(team);
    }

    console.log(`✅ Created ${createdTeams.length} teams`);

    // Create boards
    const boardData = [
      {
        title: "Sprint Planning",
        description: "Planning for the next sprint",
        teamIndex: 0,
        ownerIndex: 0,
        templateName: "Start/Stop/Continue",
      },
      {
        title: "Retrospective Meeting",
        description: "Review of the completed sprint",
        teamIndex: 1,
        ownerIndex: 5,
        templateName: "Mad/Sad/Glad",
      },
      {
        title: "Project Kickoff",
        description: "Initial planning and setup",
        teamIndex: 2,
        ownerIndex: 1,
        templateName: "4Ls",
      },
    ];

    const createdBoards = [];

    for (const boardInfo of boardData) {
      console.log(`Creating board: ${boardInfo.title}`);
      
      // Find template by name
      const template = await prisma.template.findUnique({
        where: { name: boardInfo.templateName },
      });

      if (!template) {
        console.log(`⚠️  Template ${boardInfo.templateName} not found, skipping board`);
        continue;
      }

      const board = await prisma.board.create({
        data: {
          title: boardInfo.title,
          description: boardInfo.description,
          teamId: createdTeams[boardInfo.teamIndex].id,
          createdById: createdUsers[boardInfo.ownerIndex].id,
          templateId: template.id,
        },
      });

      // Create columns for this board based on template
      const templateColumns = template.columns;
      for (const [index, columnData] of templateColumns.entries()) {
        await prisma.column.create({
          data: {
            title: columnData.title,
            order: columnData.order || index,
            boardId: board.id,
            color: columnData.color,
          },
        });
      }

      createdBoards.push(board);
    }

    console.log(`✅ Created ${createdBoards.length} boards`);

    // Create sticky notes
    const stickyData = [
      // Alpha Team - Sprint Planning Board
      { content: "Implement user authentication", boardIndex: 0, columnIndex: 0, authorIndex: 0 },
      { content: "Fix critical bugs", boardIndex: 0, columnIndex: 1, authorIndex: 1 },
      { content: "Daily standup meetings", boardIndex: 0, columnIndex: 2, authorIndex: 2 },
      { content: "Code review process", boardIndex: 0, columnIndex: 2, authorIndex: 3 },
      { content: "Update documentation", boardIndex: 0, columnIndex: 0, authorIndex: 4 },
      
      // Beta Team - Retrospective Meeting Board
      { content: "Deployment issues", boardIndex: 1, columnIndex: 0, authorIndex: 5 },
      { content: "Communication gaps", boardIndex: 1, columnIndex: 1, authorIndex: 6 },
      { content: "Great teamwork!", boardIndex: 1, columnIndex: 2, authorIndex: 7 },
      { content: "Quick bug fixes", boardIndex: 1, columnIndex: 2, authorIndex: 8 },
      { content: "Slow test suite", boardIndex: 1, columnIndex: 0, authorIndex: 9 },
      
      // Gamma Team - Project Kickoff Board (4Ls: Liked, Learned, Lacked, Longed For)
      { content: "Clear project vision", boardIndex: 2, columnIndex: 0, authorIndex: 1 },
      { content: "New framework skills", boardIndex: 2, columnIndex: 1, authorIndex: 2 },
      { content: "More time for research", boardIndex: 2, columnIndex: 2, authorIndex: 3 },
      { content: "Better tooling", boardIndex: 2, columnIndex: 3, authorIndex: 6 },
      { content: "Good requirements", boardIndex: 2, columnIndex: 0, authorIndex: 8 },
    ];

    let stickyCount = 0;
    for (const stickyInfo of stickyData) {
      if (stickyInfo.boardIndex < createdBoards.length) {
        const board = createdBoards[stickyInfo.boardIndex];
        
        // Get columns for this board
        const columns = await prisma.column.findMany({
          where: { boardId: board.id },
          orderBy: { order: 'asc' }
        });
        
        if (stickyInfo.columnIndex < columns.length) {
          const column = columns[stickyInfo.columnIndex];
          const author = createdUsers[stickyInfo.authorIndex];
          
          // Generate position within the column
          const positionX = Math.random() * 200 + 10; // Random X within column width
          const positionY = Math.random() * 300 + 10; // Random Y within reasonable height
          
          await prisma.sticky.create({
            data: {
              content: stickyInfo.content,
              boardId: board.id,
              columnId: column.id,
              authorId: author.id,
              positionX: positionX,
              positionY: positionY,
              order: stickyCount * 1000, // Simple ordering
            },
          });
          
          stickyCount++;
        }
      }
    }

    console.log(`✅ Created ${stickyCount} sticky notes`);
    console.log('✅ Teams and boards setup completed!');

  } catch (error) {
    console.error('❌ Error creating teams and boards:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { createTeamsAndBoards };