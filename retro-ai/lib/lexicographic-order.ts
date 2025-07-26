/**
 * Lexicographic ordering utility for sticky notes within columns
 * 
 * This utility provides functions to calculate order values for sticky notes
 * when they are moved within columns. It uses floating-point arithmetic to
 * enable insertion between any two positions without requiring renumbering
 * of existing items.
 */

export interface StickyOrderInfo {
  id: string;
  order: number;
}

export interface MoveIntent {
  targetColumnId: string | null;
  insertAfterStickyId?: string;
  insertBeforeStickyId?: string;
  insertAtPosition?: 'start' | 'end';
}

/**
 * Calculate the order value for a sticky note based on its target position
 * @param existingStickies Array of existing stickies in the target column, ordered by their order field
 * @param moveIntent Description of where to insert the sticky
 * @returns The calculated order value
 */
export function calculateStickyOrder(
  existingStickies: StickyOrderInfo[],
  moveIntent: MoveIntent
): number {
  // Sort existing stickies by order to ensure proper positioning
  const sortedStickies = [...existingStickies].sort((a, b) => a.order - b.order);
  
  // Handle empty column
  if (sortedStickies.length === 0) {
    return 1000.0; // Start with a reasonable base value
  }

  // Handle insertion at the start
  if (moveIntent.insertAtPosition === 'start' || moveIntent.insertBeforeStickyId === sortedStickies[0].id) {
    const firstOrder = sortedStickies[0].order;
    return firstOrder / 2.0; // Insert before first item
  }

  // Handle insertion at the end
  if (moveIntent.insertAtPosition === 'end' || moveIntent.insertAfterStickyId === sortedStickies[sortedStickies.length - 1].id) {
    const lastOrder = sortedStickies[sortedStickies.length - 1].order;
    return lastOrder + 1000.0; // Insert after last item
  }

  // Handle insertion after a specific sticky
  if (moveIntent.insertAfterStickyId) {
    const targetIndex = sortedStickies.findIndex(s => s.id === moveIntent.insertAfterStickyId);
    
    if (targetIndex === -1) {
      throw new Error(`Sticky with id ${moveIntent.insertAfterStickyId} not found in target column`);
    }

    const currentOrder = sortedStickies[targetIndex].order;
    
    // If this is the last item, add to the end
    if (targetIndex === sortedStickies.length - 1) {
      return currentOrder + 1000.0;
    }
    
    // Insert between current and next item
    const nextOrder = sortedStickies[targetIndex + 1].order;
    return (currentOrder + nextOrder) / 2.0;
  }

  // Handle insertion before a specific sticky
  if (moveIntent.insertBeforeStickyId) {
    const targetIndex = sortedStickies.findIndex(s => s.id === moveIntent.insertBeforeStickyId);
    
    if (targetIndex === -1) {
      throw new Error(`Sticky with id ${moveIntent.insertBeforeStickyId} not found in target column`);
    }

    const currentOrder = sortedStickies[targetIndex].order;
    
    // If this is the first item, insert before it
    if (targetIndex === 0) {
      return currentOrder / 2.0;
    }
    
    // Insert between previous and current item
    const prevOrder = sortedStickies[targetIndex - 1].order;
    return (prevOrder + currentOrder) / 2.0;
  }

  // Default: append to end
  const lastOrder = sortedStickies[sortedStickies.length - 1].order;
  return lastOrder + 1000.0;
}

/**
 * Check if the order values in a column need rebalancing
 * This happens when the precision becomes too small for reliable insertion
 * @param stickies Array of stickies in the column
 * @returns true if rebalancing is needed
 */
export function needsRebalancing(stickies: StickyOrderInfo[]): boolean {
  if (stickies.length < 2) return false;
  
  const sortedStickies = [...stickies].sort((a, b) => a.order - b.order);
  
  // Check for minimum gap between consecutive items
  const minimumGap = 0.000001; // 1e-6
  
  for (let i = 0; i < sortedStickies.length - 1; i++) {
    const gap = sortedStickies[i + 1].order - sortedStickies[i].order;
    if (gap < minimumGap) {
      return true;
    }
  }
  
  return false;
}

/**
 * Rebalance order values for stickies in a column
 * This spreads them out evenly to allow for future insertions
 * @param stickies Array of stickies to rebalance
 * @returns Array of updated stickies with new order values
 */
export function rebalanceOrders(stickies: StickyOrderInfo[]): StickyOrderInfo[] {
  if (stickies.length === 0) return [];
  
  const sortedStickies = [...stickies].sort((a, b) => a.order - b.order);
  const baseOrder = 1000.0;
  const increment = 1000.0;
  
  return sortedStickies.map((sticky, index) => ({
    ...sticky,
    order: baseOrder + (index * increment)
  }));
}

/**
 * Generate initial order values for a batch of new stickies
 * @param count Number of stickies to generate orders for
 * @param startOrder Starting order value (default: 1000.0)
 * @param increment Increment between orders (default: 1000.0)
 * @returns Array of order values
 */
export function generateInitialOrders(
  count: number, 
  startOrder: number = 1000.0, 
  increment: number = 1000.0
): number[] {
  return Array.from({ length: count }, (_, index) => startOrder + (index * increment));
}