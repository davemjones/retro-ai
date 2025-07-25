/**
 * Socket Events Helper Module
 * 
 * This module provides helper functions to emit socket events from API routes.
 * Uses ES6 modules (.mjs) for compatibility with Node.js server.
 * 
 * CRITICAL: This must be a .mjs file - Node.js cannot import .ts files in server.js
 */

// Socket events helper - uses global socket instance from server.js

/**
 * Get the global socket.io instance
 * This assumes the socket server is running and globally accessible
 */
function getSocketInstance() {
  // In development/production, the socket instance should be available globally
  if (global.io) {
    return global.io;
  }
  
  console.warn('⚠️ Socket.io instance not found. Real-time events will not be emitted.');
  return null;
}

/**
 * Emit a column created event to all board members
 * @param {string} boardId - The board ID
 * @param {Object} columnData - The column data
 * @param {string} userId - The user who created the column
 * @param {string} userName - The name of the user who created the column
 */
export function emitColumnCreated(boardId, columnData, userId, userName) {
  const io = getSocketInstance();
  if (!io) return;

  const eventData = {
    columnId: columnData.id,
    title: columnData.title,
    boardId: columnData.boardId,
    order: columnData.order,
    color: columnData.color,
    userId,
    userName,
    timestamp: Date.now()
  };

  console.log(`📋 Emitting column:created for board ${boardId}, column ${columnData.id}`);
  io.to(`board:${boardId}`).emit('column:created', eventData);
}

/**
 * Emit a column updated event to all board members
 * @param {string} boardId - The board ID
 * @param {Object} columnData - The updated column data
 * @param {string} userId - The user who updated the column
 * @param {string} userName - The name of the user who updated the column
 */
export function emitColumnUpdated(boardId, columnData, userId, userName) {
  const io = getSocketInstance();
  if (!io) return;

  const eventData = {
    columnId: columnData.id,
    title: columnData.title,
    boardId: columnData.boardId,
    order: columnData.order,
    color: columnData.color,
    userId,
    userName,
    timestamp: Date.now()
  };

  console.log(`📋 Emitting column:updated for board ${boardId}, column ${columnData.id}`);
  io.to(`board:${boardId}`).emit('column:updated', eventData);
}

/**
 * Emit a column deleted event to all board members
 * @param {string} boardId - The board ID
 * @param {string} columnId - The deleted column ID
 * @param {string} userId - The user who deleted the column
 * @param {string} userName - The name of the user who deleted the column
 */
export function emitColumnDeleted(boardId, columnId, userId, userName) {
  const io = getSocketInstance();
  if (!io) return;

  const eventData = {
    columnId,
    boardId,
    userId,
    userName,
    timestamp: Date.now()
  };

  console.log(`📋 Emitting column:deleted for board ${boardId}, column ${columnId}`);
  io.to(`board:${boardId}`).emit('column:deleted', eventData);
}