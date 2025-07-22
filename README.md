# Retro AI - Real-Time Collaborative Retrospective Tool

A modern, real-time collaborative retrospective tool built with Next.js, Socket.io, and PostgreSQL. Perfect for agile teams to conduct engaging retrospective meetings with drag-and-drop functionality, live updates, and secure team collaboration.

![Next.js](https://img.shields.io/badge/Next.js-15.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## Features

- 🚀 **Real-time Collaboration** - See changes instantly as team members add, edit, or move sticky notes
- 🎯 **Drag & Drop Interface** - Intuitive UI for organizing thoughts into customizable columns
- 👥 **Team Management** - Create teams, invite members, and manage permissions
- 🔒 **Secure Authentication** - Built-in authentication with NextAuth.js
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🎨 **Customizable Boards** - Create boards with different templates or custom columns
- 🔄 **Live Activity Indicators** - See who's editing what in real-time

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/) or use Docker
- **Git** - [Download](https://git-scm.com/)
- **npm** or **yarn** or **pnpm** (comes with Node.js)

Optional:
- **Docker & Docker Compose** - For easier database setup

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/davemjones/retro-ai.git
cd retro-ai
```

### 2. Navigate to Project Directory

```bash
cd retro-ai
```

### 3. Set Up Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

### 4. Configure Environment Variables

Edit `.env` file with your settings:

```bash
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://retroai:your-password@localhost:5432/retroai"

# NextAuth - Keep for local development
NEXTAUTH_URL="http://localhost:3000"

# CRITICAL: Generate a secure secret for production
NEXTAUTH_SECRET="your-generated-secret-here"

# Socket.io - Default port
SOCKET_PORT=3001
```

**Important: Generate a secure `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

### 5. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 6. Set Up Database

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d db

# Wait for database to be ready
sleep 5

# Run database migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npx prisma db seed
```

#### Option B: Manual PostgreSQL Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE retroai;
CREATE USER retroai WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE retroai TO retroai;
```

2. Update `DATABASE_URL` in `.env` with your credentials

3. Run migrations:
```bash
npx prisma migrate dev
```

### 7. Start Development Server

```bash
npm run dev
```

This starts:
- Next.js development server on http://localhost:3000
- Socket.io server on http://localhost:3001

### 8. Access the Application

Open your browser and navigate to http://localhost:3000

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NEXTAUTH_URL` | Application base URL | Yes | http://localhost:3000 |
| `NEXTAUTH_SECRET` | Secret key for JWT encryption | Yes | - |
| `SOCKET_PORT` | Port for Socket.io server | No | 3001 |
| `NODE_ENV` | Environment (development/production) | No | development |

### Security Notes

- **NEXTAUTH_SECRET**: Must be a cryptographically secure random string
- Never commit `.env` file to version control
- Use different secrets for different environments
- In production, use HTTPS for `NEXTAUTH_URL`

## Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Database commands
npx prisma studio     # Open Prisma Studio GUI
npx prisma migrate dev # Run migrations
npx prisma db seed    # Seed database
```

### Project Structure

```
retro-ai/
├── app/              # Next.js app directory (pages and API routes)
├── components/       # React components
│   ├── board/       # Board-related components
│   ├── layout/      # Layout components
│   ├── providers/   # Context providers
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configurations
├── prisma/          # Database schema and migrations
├── public/          # Static assets
├── types/           # TypeScript type definitions
└── server.js        # Socket.io server
```

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Real-time**: Socket.io
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: NextAuth.js
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form, Zod validation

## Database Schema

The application uses PostgreSQL with the following main tables:
- `User` - User accounts
- `Team` - Teams for collaboration
- `Board` - Retrospective boards
- `Column` - Board columns (e.g., "What went well?")
- `Sticky` - Sticky notes
- `UserSession` - Active user sessions

## Security Features

- **Session Security**: Advanced session fingerprinting and validation
- **CSRF Protection**: Built-in CSRF token validation
- **Secure Cookies**: HTTPOnly, Secure, SameSite cookies
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Protection**: Prisma ORM parameterized queries

## Troubleshooting

### Common Issues

#### Database Connection Failed
- Ensure PostgreSQL is running
- Check `DATABASE_URL` format and credentials
- For Docker users, ensure the container is running: `docker-compose ps`

#### Socket.io Connection Issues
- Check if port 3001 is available
- Ensure `SOCKET_PORT` matches in both `.env` and client configuration
- Check browser console for WebSocket errors

#### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version is 18 or higher

#### Authentication Issues
- Regenerate `NEXTAUTH_SECRET`
- Clear browser cookies and local storage
- Check `NEXTAUTH_URL` matches your current URL

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Production Deployment

### Environment Setup

1. Set production environment variables:
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
DATABASE_URL=your-production-database-url
```

2. Build the application:
```bash
npm run build
```

3. Start production server:
```bash
npm run start:server
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Security Checklist

- [ ] Generate new `NEXTAUTH_SECRET`
- [ ] Use HTTPS for production
- [ ] Enable database SSL
- [ ] Set secure cookie options
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring

## Contributing

Please read [CLAUDE.md](CLAUDE.md) for development guidelines and coding standards.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit with descriptive message
7. Push to your fork
8. Create a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/davemjones/retro-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davemjones/retro-ai/discussions)
- **Security**: For security issues, please email directly

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Socket.io](https://socket.io/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)