# Claude Code Guidelines for Retro AI

## Git Workflow

**CRITICAL: BEFORE starting ANY issue work, ALWAYS follow this workflow first:**

When working on a new issue:
1. **ALWAYS** checkout the main branch first (unless explicitly told not to)
2. Pull the latest changes: `git pull origin main`
3. Create a new branch for the issue: `git checkout -b fix/issue-XX-description`
4. Work on the issue in the new branch
5. Commit changes and create a pull request
6. **Ensure the PR automatically closes the issue ticket**

⚠️ **MANDATORY**: Add Git workflow as the FIRST todo item for every new issue before any technical work.

Example workflow:
```bash
git checkout main
git pull origin main
git checkout -b fix/issue-47-eslint-errors
# ... make changes ...
git add .
git commit -m "Fix ESLint errors (#47)"
git push -u origin fix/issue-47-eslint-errors
```

## Linting Requirements

Before committing any changes, always run:
```bash
cd retro-ai && npm run lint
```

## Common Issues to Avoid

### 1. Unused Imports
- Remove any imports that are not used in the file
- Example: ActivityTracker in session-provider.tsx was imported but never used

### 2. TypeScript 'any' Type
- **NEVER** use `as any` to bypass type checking
- Create proper type definitions or interfaces instead
- If working with external APIs, define proper request types
- Example: In auth.ts, instead of `} as any`, create a proper type or interface

### 3. React Hook Dependencies
- Always include all variables used inside useEffect in the dependency array
- Use ESLint disable comments sparingly and only when absolutely necessary
- If a dependency causes infinite loops, refactor the code structure
- Example: socket-context.tsx useEffect uses 'socket' but doesn't include it in dependencies

### 4. Socket.io TypeScript Import Errors ⚠️ CRITICAL
- **NEVER** import TypeScript files in `server.js` - Node.js cannot handle `.ts` imports
- **ALWAYS** use `.mjs` files for server-side Socket.io authentication
- ❌ `await import('./lib/socket-auth.ts')` - WILL FAIL with ERR_MODULE_NOT_FOUND
- ✅ `await import('./lib/socket-auth-secure.mjs')` - CORRECT
- **Reference SOCKET-SERVER.md** for all real-time communication work

### 5. Socket.io Scope Management ⚠️ CRITICAL
- **ALL socket event handlers MUST be inside the authentication try block**
- ❌ Defining `socket.on()` outside try block - WILL CAUSE "ReferenceError: validateSocketSession is not defined"
- ✅ All socket handlers must be inside the try block where authentication imports are defined
- **ALWAYS** end the try block AFTER all socket event handlers

## Real-Time Communication Documentation ⚠️ MANDATORY

### ⚠️ BEFORE Touching ANY Real-Time Code: READ SOCKET-SERVER.md FIRST
- **MANDATORY**: Read `/workspaces/retro-ai/SOCKET-SERVER.md` BEFORE making ANY changes to real-time communication code
- This includes: `server.js`, socket event handlers, WebSocket code, Socket.io integration, real-time features
- **FAILURE to read SOCKET-SERVER.md first will result in critical bugs and security issues**

### Socket.io and WebSocket Development Rules
- **CRITICAL**: Any changes to real-time communication code MUST be documented in `SOCKET-SERVER.md`
- **ALWAYS** update `SOCKET-SERVER.md` when:
  - Adding new socket events (client→server or server→client)
  - Modifying existing socket event handlers
  - Changing authentication or authorization logic
  - Adding new real-time features (sticky notes, columns, editing indicators, etc.)
  - Updating security requirements or board isolation logic

### Required Documentation Updates
When working on real-time features, you MUST update these sections in `SOCKET-SERVER.md`:
1. **Socket event handlers** - Add/update code examples with proper authentication flow
2. **Authorization requirements** - Document ownership/permission requirements (e.g., board owner only)
3. **Testing checklist** - Add security and functional tests for new features
4. **Error handling** - Document new error scenarios and proper socket event responses

### Files That Require SOCKET-SERVER.md Updates
- `server.js` - Main socket server with event handlers
- `lib/socket-auth-*.mjs` - Authentication and authorization logic
- `lib/socket-context.tsx` - Client-side socket integration
- Any component emitting socket events (board-canvas.tsx, column.tsx, etc.)
- Any API route that triggers real-time updates

## Pre-issue Work Checklist
- [ ] **Git workflow completed** (checkout main, pull latest, create feature branch)
- [ ] Issue analysis and todo list created
- [ ] Technical approach planned
- [ ] **If working on real-time/Socket.io code**: Read SOCKET-SERVER.md first

## Post-Implementation Checklist
- [ ] **If real-time communication was modified**: Update SOCKET-SERVER.md documentation
- [ ] All socket events documented with proper authentication flow
- [ ] Authorization requirements clearly documented (ownership, team membership)
- [ ] Testing scenarios added to SOCKET-SERVER.md checklist

## Pre-commit Checklist
- [ ] Run `npm run lint` and fix ALL errors before committing
- [ ] No TypeScript 'any' types used
- [ ] All imports are utilized
- [ ] React hook dependencies are complete
- [ ] No ESLint errors (warnings may be acceptable if justified)

## TypeScript Best Practices
1. Define interfaces for all data structures
2. Use proper type annotations for function parameters and return values
3. Avoid type assertions unless absolutely necessary
4. When dealing with third-party libraries, create type definitions if missing

## React Best Practices
1. Clean up side effects in useEffect return functions
2. Include all dependencies in useEffect dependency arrays
3. Remove unused imports immediately
4. Use proper TypeScript types for all React components and props

## Example Fixes

### Bad: Using 'as any'
```typescript
// ❌ Don't do this
const request = { ip: '127.0.0.1', headers: new Headers() } as any;
```

### Good: Create proper types
```typescript
// ✅ Do this
interface MockRequest {
  ip: string;
  headers: Headers;
}
const request: MockRequest = { ip: '127.0.0.1', headers: new Headers() };
```

### Bad: Missing dependencies
```typescript
// ❌ Don't do this
useEffect(() => {
  if (socket) {
    socket.disconnect();
  }
}, []);  // socket is missing!
```

### Good: Include all dependencies
```typescript
// ✅ Do this
useEffect(() => {
  if (socket) {
    socket.disconnect();
  }
}, [socket]);
```

## UI/UX Issues

### Sticky Note Rendering
- The avatar on the sticky note is too small and is clipping the user initials. Increase the size of the circle.