# Claude Memory - Retro AI Project

## Project Overview
We are building a web-based retrospective application for agile teams with drag-and-drop functionality similar to Miro or Microsoft Whiteboard.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Shadcn UI
- **Backend**: Next.js API Routes  
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with email/password
- **Real-time**: Socket.io for collaborative features
- **Drag & Drop**: React DnD Kit
- **Containerization**: Docker & Docker Compose

## Current Project Status

### Completed Tasks:
1. ✅ Created comprehensive PLAN.md with project architecture
2. ✅ Set up git repository with initial commit
3. ✅ Configured dev container with Node.js 20, PostgreSQL, and Claude Code
4. ✅ Removed initial Docker files and recreated proper dev container setup

### Pending Tasks:
1. 📋 Initialize Next.js project with TypeScript inside dev container
2. 📋 Set up Prisma and database schema
3. 📋 Configure NextAuth.js for authentication
4. 📋 Implement drag-and-drop board functionality
5. 📋 Create sticky note components
6. 📋 Add real-time collaboration with Socket.io

## Key Requirements
- Users can select board templates or create custom boards
- Each retro event has its own board
- Sticky notes can be dragged and dropped
- Email/password authentication
- Previous retros are easily accessible
- Real-time collaboration support

## Database Schema (Planned)
The database schema is defined in PLAN.md and includes:
- User (email, password, teams)
- Team (name, members, boards)
- Board (title, team, template, columns, stickies)
- Sticky (content, color, position, author)
- Column (title, order, board)
- Template (name, description, default columns)

## Dev Container Configuration
- Base image: mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye
- PostgreSQL database service included
- Claude Code installed globally via npm
- VS Code extensions pre-configured
- Database connection: postgresql://retroai:password@db:5432/retroai

## Next Steps Inside Dev Container

1. Initialize the Next.js project:
```bash
npx create-next-app@latest . --typescript --tailwind --app --use-npm --no-src-dir --import-alias "@/*"
```

2. Install additional dependencies:
```bash
npm install @prisma/client prisma @next-auth/prisma-adapter next-auth
npm install -D @types/node
```

3. Set up Prisma:
```bash
npx prisma init
```

4. Update the postCreateCommand in devcontainer.json:
- Uncomment the line: `"postCreateCommand": "npm install && npx prisma generate",`

## Instructions to Continue

When you start Claude inside the devcontainer, provide this context:

```
I'm continuing work on a retrospective web app for agile teams. The project uses Next.js, TypeScript, Shadcn UI, and PostgreSQL. The dev container is set up with the database running. 

Please read CLAUDE-MEMORY.md and PLAN.md to understand the project context. The next task is to initialize the Next.js project inside this dev container and set up the basic project structure.

The database connection string is: postgresql://retroai:password@db:5432/retroai

Let's continue from where we left off.
```

## File References
- **PLAN.md**: Contains the complete project plan and architecture
- **README.md**: Basic project documentation
- **.devcontainer/**: Dev container configuration
- **.gitignore**: Git ignore rules configured for Next.js