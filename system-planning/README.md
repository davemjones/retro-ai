# Retro AI - Agile Retrospective Platform

A collaborative retrospective board application for agile teams with drag-and-drop functionality.

## Development Setup

This project uses VS Code Dev Containers for a consistent development environment.

### Prerequisites

- Docker Desktop
- Visual Studio Code with the "Dev Containers" extension

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd retro-ai
   ```

2. Open in VS Code:
   ```bash
   code .
   ```

3. When prompted, click "Reopen in Container" or use the command palette:
   - Press `F1` or `Cmd+Shift+P`
   - Select "Dev Containers: Reopen in Container"

4. VS Code will build the dev container and set up the environment. This includes:
   - Node.js 20
   - PostgreSQL database
   - All required VS Code extensions

5. Once inside the container, the Next.js project will be initialized and dependencies installed.

### Development Commands

Inside the dev container terminal:

```bash
# Start the development server
npm run dev

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Run linting
npm run lint

# Run tests
npm test
```

### Database Access

- PostgreSQL is available at `localhost:5432`
- Database: `retroai`
- Username: `retroai`
- Password: `password`

### Production Deployment

For production deployment, use the root `docker-compose.yml`:

```bash
docker-compose up -d
```

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Shadcn UI
- PostgreSQL
- Prisma ORM
- NextAuth.js
- Socket.io (for real-time collaboration)
- React DnD Kit (for drag-and-drop)