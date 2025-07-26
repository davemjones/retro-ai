import {
  calculateStickyOrder,
  needsRebalancing,
  rebalanceOrders,
  generateInitialOrders,
  type StickyOrderInfo
} from './lexicographic-order';

describe('Lexicographic Order Utilities', () => {
  const createSticky = (id: string, order: number): StickyOrderInfo => ({ id, order });

  describe('calculateStickyOrder', () => {
    it('should return 1000 for empty column', () => {
      const result = calculateStickyOrder([], { targetColumnId: 'col1' });
      expect(result).toBe(1000.0);
    });

    it('should insert at the beginning when insertAtPosition is start', () => {
      const stickies = [createSticky('1', 1000), createSticky('2', 2000)];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertAtPosition: 'start' 
      });
      expect(result).toBe(500.0); // 1000 / 2
    });

    it('should insert at the end when insertAtPosition is end', () => {
      const stickies = [createSticky('1', 1000), createSticky('2', 2000)];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertAtPosition: 'end' 
      });
      expect(result).toBe(3000.0); // 2000 + 1000
    });

    it('should insert after specific sticky in middle', () => {
      const stickies = [
        createSticky('1', 1000), 
        createSticky('2', 2000), 
        createSticky('3', 3000)
      ];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertAfterStickyId: '2' 
      });
      expect(result).toBe(2500.0); // (2000 + 3000) / 2
    });

    it('should insert after last sticky', () => {
      const stickies = [createSticky('1', 1000), createSticky('2', 2000)];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertAfterStickyId: '2' 
      });
      expect(result).toBe(3000.0); // 2000 + 1000
    });

    it('should insert before specific sticky in middle', () => {
      const stickies = [
        createSticky('1', 1000), 
        createSticky('2', 2000), 
        createSticky('3', 3000)
      ];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertBeforeStickyId: '2' 
      });
      expect(result).toBe(1500.0); // (1000 + 2000) / 2
    });

    it('should insert before first sticky', () => {
      const stickies = [createSticky('1', 1000), createSticky('2', 2000)];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertBeforeStickyId: '1' 
      });
      expect(result).toBe(500.0); // 1000 / 2
    });

    it('should throw error when insertAfterStickyId not found', () => {
      const stickies = [createSticky('1', 1000)];
      expect(() => {
        calculateStickyOrder(stickies, { 
          targetColumnId: 'col1', 
          insertAfterStickyId: 'nonexistent' 
        });
      }).toThrow('Sticky with id nonexistent not found in target column');
    });

    it('should throw error when insertBeforeStickyId not found', () => {
      const stickies = [createSticky('1', 1000)];
      expect(() => {
        calculateStickyOrder(stickies, { 
          targetColumnId: 'col1', 
          insertBeforeStickyId: 'nonexistent' 
        });
      }).toThrow('Sticky with id nonexistent not found in target column');
    });

    it('should handle unsorted input by sorting first', () => {
      const stickies = [
        createSticky('2', 2000), 
        createSticky('1', 1000), 
        createSticky('3', 3000)
      ];
      const result = calculateStickyOrder(stickies, { 
        targetColumnId: 'col1', 
        insertAfterStickyId: '1' 
      });
      expect(result).toBe(1500.0); // Should insert between 1000 and 2000
    });
  });

  describe('needsRebalancing', () => {
    it('should return false for empty array', () => {
      expect(needsRebalancing([])).toBe(false);
    });

    it('should return false for single item', () => {
      expect(needsRebalancing([createSticky('1', 1000)])).toBe(false);
    });

    it('should return false when gaps are sufficient', () => {
      const stickies = [createSticky('1', 1000), createSticky('2', 2000)];
      expect(needsRebalancing(stickies)).toBe(false);
    });

    it('should return true when gaps are too small', () => {
      const stickies = [
        createSticky('1', 1000), 
        createSticky('2', 1000.0000001) // Very small gap
      ];
      expect(needsRebalancing(stickies)).toBe(true);
    });
  });

  describe('rebalanceOrders', () => {
    it('should return empty array for empty input', () => {
      expect(rebalanceOrders([])).toEqual([]);
    });

    it('should rebalance orders evenly', () => {
      const stickies = [
        createSticky('1', 1000.1), 
        createSticky('2', 1000.2), 
        createSticky('3', 1000.3)
      ];
      const result = rebalanceOrders(stickies);
      
      expect(result).toEqual([
        { id: '1', order: 1000.0 },
        { id: '2', order: 2000.0 },
        { id: '3', order: 3000.0 }
      ]);
    });

    it('should maintain original order when rebalancing', () => {
      const stickies = [
        createSticky('3', 3000), 
        createSticky('1', 1000), 
        createSticky('2', 2000)
      ];
      const result = rebalanceOrders(stickies);
      
      // Should be sorted by order, not by input order
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2'); 
      expect(result[2].id).toBe('3');
    });
  });

  describe('generateInitialOrders', () => {
    it('should generate correct number of orders', () => {
      const orders = generateInitialOrders(3);
      expect(orders).toHaveLength(3);
    });

    it('should generate orders with default values', () => {
      const orders = generateInitialOrders(3);
      expect(orders).toEqual([1000.0, 2000.0, 3000.0]);
    });

    it('should generate orders with custom start and increment', () => {
      const orders = generateInitialOrders(2, 500.0, 250.0);
      expect(orders).toEqual([500.0, 750.0]);
    });

    it('should return empty array for zero count', () => {
      const orders = generateInitialOrders(0);
      expect(orders).toEqual([]);
    });
  });
});