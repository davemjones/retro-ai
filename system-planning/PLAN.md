# Retro AI - Agile Retrospective Platform

## Project Overview

Retro AI is a web-based platform designed for agile teams to conduct retrospectives with an intuitive drag-and-drop interface similar to Miro or Microsoft Whiteboard. Teams can create boards from templates, add sticky notes with their feedback, and review past retrospectives to track progress over time.

## Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Components**: Shadcn UI
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Email/Password)
- **Real-time Updates**: Socket.io
- **Drag & Drop**: React DnD Kit
- **Containerization**: Docker & Docker Compose
- **Styling**: Tailwind CSS

## Core Features

### 1. User Authentication
- Email and password-based authentication
- User registration and login
- Session management with NextAuth.js
- Protected routes for authenticated users

### 2. Team Management
- Create and join teams
- Invite team members via email
- Team-based access control

### 3. Board System
- Create boards from predefined templates:
  - Start/Stop/Continue
  - Mad/Sad/Glad
  - 4Ls (Liked/Learned/Lacked/Longed For)
  - Custom blank board
- Board history and archives
- Easy navigation between past retrospectives

### 4. Interactive Whiteboard
- Drag-and-drop sticky notes
- Real-time collaboration
- Color-coded sticky notes
- Customizable board columns
- Zoom and pan functionality

### 5. Sticky Notes
- Create, edit, and delete notes
- Assign colors for categorization
- Author attribution
- Markdown support for formatting

## Database Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String
  name          String?
  teams         TeamMember[]
  stickies      Sticky[]
  createdBoards Board[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Team {
  id        String         @id @default(cuid())
  name      String
  code      String         @unique
  members   TeamMember[]
  boards    Board[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model TeamMember {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  role      Role     @default(MEMBER)
  joinedAt  DateTime @default(now())
  
  @@unique([userId, teamId])
}

model Board {
  id          String     @id @default(cuid())
  title       String
  description String?
  teamId      String
  team        Team       @relation(fields: [teamId], references: [id])
  templateId  String?
  template    Template?  @relation(fields: [templateId], references: [id])
  columns     Column[]
  stickies    Sticky[]
  createdById String
  createdBy   User       @relation(fields: [createdById], references: [id])
  isArchived  Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Template {
  id          String   @id @default(cuid())
  name        String   @unique
  description String
  columns     Json     // JSON array of column definitions
  boards      Board[]
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Column {
  id       String   @id @default(cuid())
  title    String
  order    Int
  boardId  String
  board    Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  stickies Sticky[]
  color    String?
  
  @@unique([boardId, order])
}

model Sticky {
  id        String   @id @default(cuid())
  content   String
  color     String   @default("#FFE066")
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  columnId  String?
  column    Column?  @relation(fields: [columnId], references: [id])
  positionX Float
  positionY Float
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

## Project Structure

```
retro-ai/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── teams/
│   │   │   ├── boards/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── boards/
│   │   │   ├── teams/
│   │   │   └── socket/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── board/
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── StickyNote.tsx
│   │   │   └── BoardCanvas.tsx
│   │   ├── ui/
│   │   │   └── (shadcn components)
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── socket.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   ├── useBoard.ts
│   │   └── useDragAndDrop.ts
│   ├── types/
│   │   ├── board.ts
│   │   └── auth.ts
│   └── middleware.ts
├── public/
│   ├── images/
│   └── icons/
├── .env.local
├── .env.example
├── .dockerignore
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Development Workflow

### Docker Setup

The application will run entirely in Docker containers for consistent development:

1. **Application Container**: Next.js development server
2. **Database Container**: PostgreSQL database
3. **Redis Container** (optional): For session storage

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://retroai:password@localhost:5432/retroai"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Socket.io
SOCKET_PORT=3001
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Set up Docker development environment
2. Initialize Next.js project with TypeScript
3. Configure Prisma and database schema
4. Implement authentication system
5. Create basic UI layout with Shadcn

### Phase 2: Core Features (Week 2)
1. Implement team creation and management
2. Build board creation from templates
3. Create drag-and-drop board interface
4. Implement sticky note CRUD operations
5. Add column management

### Phase 3: Real-time Collaboration (Week 3)
1. Set up Socket.io server
2. Implement real-time board updates
3. Add presence indicators
4. Handle conflict resolution
5. Optimize performance

### Phase 4: Polish & Deploy (Week 4)
1. Add board history and archives
2. Implement search and filters
3. Add export functionality
4. Write tests
5. Prepare for deployment

## API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

### Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `POST /api/teams/:id/invite` - Invite member
- `DELETE /api/teams/:id/members/:userId` - Remove member

### Boards
- `GET /api/boards` - List team's boards
- `POST /api/boards` - Create new board
- `GET /api/boards/:id` - Get board details
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board
- `POST /api/boards/:id/archive` - Archive board

### Sticky Notes
- `GET /api/boards/:boardId/stickies` - Get board's stickies
- `POST /api/boards/:boardId/stickies` - Create sticky
- `PUT /api/stickies/:id` - Update sticky
- `DELETE /api/stickies/:id` - Delete sticky

### Templates
- `GET /api/templates` - List available templates
- `GET /api/templates/:id` - Get template details

## Security Considerations

1. **Authentication**: Secure password hashing with bcrypt
2. **Authorization**: Role-based access control for teams
3. **Data Validation**: Input validation on all API endpoints
4. **Rate Limiting**: Prevent abuse of API endpoints
5. **CORS**: Proper CORS configuration for production
6. **Environment Variables**: Secure storage of sensitive data

## Performance Optimizations

1. **Database Queries**: Optimize with proper indexing
2. **Real-time Updates**: Efficient Socket.io room management
3. **Frontend State**: Use React Query for caching
4. **Image Optimization**: Next.js Image component
5. **Code Splitting**: Dynamic imports for large components

## Future Enhancements

1. **Integrations**:
   - Slack notifications
   - Jira integration
   - Calendar scheduling

2. **Advanced Features**:
   - AI-powered insights
   - Action item tracking
   - Sentiment analysis
   - Custom board layouts

3. **Export Options**:
   - PDF reports
   - CSV exports
   - Share via link

4. **Mobile Support**:
   - Progressive Web App
   - Native mobile apps

## Deployment Strategy

1. **Production Environment**:
   - Vercel for Next.js hosting
   - Supabase or Railway for PostgreSQL
   - Docker images for self-hosting option

2. **CI/CD Pipeline**:
   - GitHub Actions for automated testing
   - Automated deployments on merge to main
   - Environment-specific configurations

## Success Metrics

1. **User Engagement**:
   - Active teams per month
   - Average session duration
   - Sticky notes created per board

2. **Performance**:
   - Page load time < 2 seconds
   - Real-time update latency < 100ms
   - 99.9% uptime

3. **User Satisfaction**:
   - User feedback surveys
   - Feature adoption rates
   - Support ticket volume