/**
 * Custom React hook for FLIP (First, Last, Invert, Play) animations
 * This ensures animations work correctly with React's rendering lifecycle
 */

import { useLayoutEffect, useRef } from 'react';
import { animateStickyMovementFLIP, recordElementPosition } from '@/lib/animation-utils';

interface FlipAnimationConfig {
  enabled?: boolean;
  duration?: number;
}

/**
 * Hook to manage FLIP animations for sticky note movements
 */
export function useFlipAnimation(config: FlipAnimationConfig = {}) {
  const { enabled = true, duration = 300 } = config;
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingAnimationsRef = useRef<Set<string>>(new Set());

  /**
   * Records the initial position of an element before state changes
   */
  const recordPosition = (stickyId: string) => {
    if (!enabled) return;
    
    const position = recordElementPosition(stickyId);
    if (position) {
      positionsRef.current.set(stickyId, position);
    }
  };

  /**
   * Animates the element from its recorded position to its new position
   * Should be called after React state has been updated
   */
  const playAnimation = async (stickyId: string): Promise<void> => {
    if (!enabled) return;
    
    const fromPosition = positionsRef.current.get(stickyId);
    if (!fromPosition) {
      console.warn(`No recorded position found for sticky ${stickyId}`);
      return;
    }

    // Prevent duplicate animations for the same sticky
    if (pendingAnimationsRef.current.has(stickyId)) {
      console.log(`Animation already in progress for sticky ${stickyId}`);
      return;
    }

    try {
      pendingAnimationsRef.current.add(stickyId);
      await animateStickyMovementFLIP(stickyId, fromPosition, { duration });
    } catch (error) {
      console.error(`FLIP animation failed for sticky ${stickyId}:`, error);
    } finally {
      positionsRef.current.delete(stickyId);
      pendingAnimationsRef.current.delete(stickyId);
    }
  };

  /**
   * Records position and plays animation in the correct React lifecycle phase
   */
  const animateMovement = (stickyId: string, afterStateUpdate: () => void) => {
    if (!enabled) {
      afterStateUpdate();
      return;
    }

    // Cancel any existing animation for this sticky
    if (pendingAnimationsRef.current.has(stickyId)) {
      console.log(`Cancelling existing animation for ${stickyId}`);
      pendingAnimationsRef.current.delete(stickyId);
      positionsRef.current.delete(stickyId);
    }

    // FIRST: Record the initial position
    recordPosition(stickyId);
    
    // Update React state
    afterStateUpdate();
    
    // LAST, INVERT, PLAY: Schedule animation for after DOM updates
    // Use double RAF for more reliable timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        playAnimation(stickyId);
      });
    });
  };

  /**
   * Batch animation for multiple stickies moving at once
   */
  const animateBatchMovement = (
    stickyIds: string[], 
    afterStateUpdate: () => void
  ) => {
    if (!enabled) {
      afterStateUpdate();
      return;
    }

    // Record all positions first
    stickyIds.forEach(recordPosition);
    
    // Update React state
    afterStateUpdate();
    
    // Animate all stickies
    requestAnimationFrame(() => {
      stickyIds.forEach(stickyId => {
        playAnimation(stickyId);
      });
    });
  };

  /**
   * Cleanup function to cancel pending animations
   */
  const cleanup = () => {
    positionsRef.current.clear();
    pendingAnimationsRef.current.clear();
  };

  /**
   * Check if a sticky is currently animating
   */
  const isAnimating = (stickyId: string): boolean => {
    return pendingAnimationsRef.current.has(stickyId);
  };

  return {
    recordPosition,
    playAnimation,
    animateMovement,
    animateBatchMovement,
    cleanup,
    isAnimating,
  };
}

/**
 * Layout effect hook for FLIP animations that need to run before paint
 */
export function useFlipLayoutEffect(
  callback: () => void | (() => void),
  deps: React.DependencyList
) {
  useLayoutEffect(callback, deps);
}