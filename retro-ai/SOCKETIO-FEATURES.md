# Socket.io Real-Time Collaboration Features

This document describes the real-time collaboration features implemented using Socket.io in the Retro AI application.

## 🚀 Features Overview

### 1. Real-Time Sticky Note Movement
- **Description**: When one user moves a sticky note, all other users on the same board see the movement instantly
- **Implementation**: Uses `sticky-moved` socket events to broadcast position changes
- **Supports**: Column-to-column moves and moves to/from unassigned area

### 2. Active Editing Indicators  
- **Description**: Shows pulsating dots when someone else is editing a sticky note
- **Implementation**: Uses `editing-started` and `editing-stopped` socket events
- **Visual**: Three animated dots with user initial indicator

### 3. Board Room Management
- **Description**: Users automatically join board-specific rooms for isolated communication
- **Implementation**: Each board has its own Socket.io room (`board:${boardId}`)
- **Benefits**: Prevents cross-board event pollution

### 4. User Presence
- **Description**: Tracks when users join/leave boards
- **Implementation**: `user-connected` and `user-disconnected` events
- **Future**: Can be extended to show active user list

## 🔧 Technical Implementation

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser 1     │    │  Next.js Server │    │   Browser 2     │
│                 │    │   + Socket.io   │    │                 │
│  Socket Client  │◄──►│     Server      │◄──►│  Socket Client  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

#### 1. Custom Server (`server.js`)
- Extends Next.js with Socket.io server
- Handles WebSocket connections
- Manages board rooms and event broadcasting

#### 2. Socket Context (`lib/socket-context.tsx`)
- React context for Socket.io client
- Provides hooks for socket operations
- Handles connection state management

#### 3. Board Canvas Integration (`components/board/board-canvas.tsx`)
- Emits movement events after successful API calls
- Listens for remote movement events
- Prevents echo (own movements)

#### 4. Sticky Note Integration (`components/board/sticky-note.tsx`)
- Emits editing start/stop events
- Shows editing indicators for remote users
- Manages editing state

## 📡 Socket Events

### Client → Server Events
| Event | Data | Description |
|-------|------|-------------|
| `join-board` | `boardId: string` | Join a board room |
| `leave-board` | `boardId: string` | Leave a board room |
| `sticky-moved` | `{stickyId, columnId, boardId}` | Sticky note moved |
| `editing-start` | `{stickyId, boardId}` | Started editing a sticky |
| `editing-stop` | `{stickyId, boardId}` | Stopped editing a sticky |

### Server → Client Events
| Event | Data | Description |
|-------|------|-------------|
| `user-connected` | `{userId, userName, timestamp}` | User joined board |
| `user-disconnected` | `{userId, userName, timestamp}` | User left board |
| `sticky-moved` | `{stickyId, columnId, userId, timestamp}` | Remote sticky movement |
| `editing-started` | `{stickyId, userId, userName, action, timestamp}` | Remote editing started |
| `editing-stopped` | `{stickyId, userId, userName, action, timestamp}` | Remote editing stopped |

## 🧪 Testing

### Manual Testing with Script
```bash
# Start the development server
npm run dev

# In another terminal, run the Socket.io test
node test-socketio.js
```

### Automated Tests
- `__tests__/socketio-collaboration.test.tsx` - Unit tests for Socket.io integration
- `__tests__/drag-drop-integration.test.tsx` - Integration tests with drag-and-drop

### Browser Testing
1. Open the application in multiple browser tabs/windows
2. Navigate to the same board in each tab
3. Move sticky notes in one tab → see real-time updates in others
4. Edit sticky notes → see editing indicators appear

## 🐳 Docker Deployment

### Development
```bash
# Start with Socket.io enabled
npm run dev
```

### Production with Docker
```bash
# Build and run with docker-compose
docker-compose up --build

# Or build Docker image manually
docker build -t retro-ai .
docker run -p 3000:3000 retro-ai
```

### Environment Variables
```env
# Required for Socket.io CORS
NEXTAUTH_URL=http://localhost:3000

# Database connection
DATABASE_URL=postgresql://retroai:password@db:5432/retroai

# NextAuth secret
NEXTAUTH_SECRET=your-secret-key-change-this
```

## 🔧 Configuration

### Socket.io Client Options
- **Path**: `/api/socket`
- **Auto-connect**: `true`
- **Reconnection**: `true` (5 attempts with 1s delay)

### Socket.io Server Options
- **CORS**: Configured for development and production
- **Path**: `/api/socket`
- **Engine**: WebSocket with polling fallback

## 🚦 Connection States

### Connection Flow
1. User authenticates with NextAuth
2. Socket context initializes connection
3. Socket connects to server
4. User joins board room automatically
5. Real-time events start flowing

### Error Handling
- **Connection failures**: Automatic reconnection with exponential backoff
- **Authentication**: Socket disconnects if user is not authenticated
- **Malformed events**: Server validates and ignores invalid data
- **Echo prevention**: Client tracks own movements to prevent loops

## 🎯 Performance Considerations

### Optimization Features
- **Room isolation**: Events only sent to users on the same board
- **Echo prevention**: Own movements don't trigger updates
- **Debouncing**: Rapid movements are handled efficiently
- **Connection pooling**: Reuses connections for multiple board switches

### Scalability Notes
- Current implementation uses in-memory state
- For multi-server deployment, consider Redis adapter
- WebSocket connections scale with server resources

## 🔮 Future Enhancements

### Planned Features
1. **Live cursors**: Show where other users are pointing
2. **User avatars**: Display user avatars on sticky notes
3. **Chat integration**: Real-time messaging during retrospectives
4. **Voice notes**: Audio annotations on sticky notes
5. **Collaborative drawing**: Shared whiteboard features

### Technical Improvements
1. **Redis adapter**: For multi-server deployment
2. **Rate limiting**: Prevent spam/abuse
3. **Compression**: Reduce bandwidth usage
4. **Analytics**: Track collaboration metrics

## 📚 References

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)
- [React Context API](https://reactjs.org/docs/context.html)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)