/**
 * Animation utilities for smooth remote sticky note movements
 */

export interface AnimationOptions {
  duration?: number;
  easing?: string;
}

export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  duration: 300,
  easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
};

/**
 * Calculates the optimal transform to animate a sticky note from its current position
 * to the target column position
 */
export function calculateTargetTransform(
  stickyElement: Element,
  targetColumnId: string | null
): string {
  if (!targetColumnId) {
    // Moving to unassigned area
    const unassignedArea = document.querySelector('[data-area="unassigned"]');
    if (!unassignedArea) return 'translate(0, 0)';
    
    const targetRect = unassignedArea.getBoundingClientRect();
    const currentRect = stickyElement.getBoundingClientRect();
    
    const deltaX = targetRect.left - currentRect.left + 20; // Add some padding
    const deltaY = targetRect.top - currentRect.top + 20;
    
    return `translate(${deltaX}px, ${deltaY}px)`;
  }
  
  // Moving to a specific column
  const targetColumn = document.querySelector(`[data-column-id="${targetColumnId}"]`);
  if (!targetColumn) return 'translate(0, 0)';
  
  const targetRect = targetColumn.getBoundingClientRect();
  const currentRect = stickyElement.getBoundingClientRect();
  
  const deltaX = targetRect.left - currentRect.left + 20; // Add padding to avoid edge
  const deltaY = targetRect.top - currentRect.top + 60; // Account for column header
  
  return `translate(${deltaX}px, ${deltaY}px)`;
}

/**
 * Animates a sticky note movement to its target position using CSS transforms
 */
export async function animateStickyMovement(
  stickyId: string,
  targetColumnId: string | null,
  options: AnimationOptions = {}
): Promise<void> {
  const { duration, easing } = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  const stickyElement = document.querySelector(`[data-sticky-id="${stickyId}"]`) as HTMLElement;
  if (!stickyElement) {
    console.warn(`Sticky element not found: ${stickyId}`);
    return;
  }

  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip animation
  }

  const targetTransform = calculateTargetTransform(stickyElement, targetColumnId);
  
  // Apply the moving class for visual feedback
  stickyElement.classList.add('sticky-remote-moving');
  
  // Apply the transform
  stickyElement.style.transform = targetTransform;
  
  // Return a promise that resolves when the animation completes
  return new Promise((resolve) => {
    const cleanup = () => {
      stickyElement.classList.remove('sticky-remote-moving');
      stickyElement.style.transform = '';
      resolve();
    };
    
    // Use transition end event or fallback timeout
    const onTransitionEnd = () => {
      cleanup();
      stickyElement.removeEventListener('transitionend', onTransitionEnd);
    };
    
    stickyElement.addEventListener('transitionend', onTransitionEnd);
    
    // Fallback timeout in case transitionend doesn't fire
    setTimeout(cleanup, (duration || 300) + 50);
  });
}

/**
 * Applies entering animation to a newly created sticky note
 */
export function animateStickyEntering(stickyId: string): void {
  const stickyElement = document.querySelector(`[data-sticky-id="${stickyId}"]`) as HTMLElement;
  if (!stickyElement) return;

  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip animation
  }

  stickyElement.classList.add('sticky-remote-entering');
  
  // Remove the class after animation completes
  setTimeout(() => {
    stickyElement.classList.remove('sticky-remote-entering');
  }, 250);
}

/**
 * Applies leaving animation before removing a sticky note
 */
export async function animateStickyLeaving(stickyId: string): Promise<void> {
  const stickyElement = document.querySelector(`[data-sticky-id="${stickyId}"]`) as HTMLElement;
  if (!stickyElement) return;

  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip animation
  }

  stickyElement.classList.add('sticky-remote-leaving');
  
  // Return promise that resolves when animation completes
  return new Promise((resolve) => {
    setTimeout(() => {
      stickyElement.classList.remove('sticky-remote-leaving');
      resolve();
    }, 200);
  });
}

/**
 * Utility to check if an element is currently animating
 */
export function isElementAnimating(stickyId: string): boolean {
  const stickyElement = document.querySelector(`[data-sticky-id="${stickyId}"]`);
  if (!stickyElement) return false;
  
  return stickyElement.classList.contains('sticky-remote-moving') ||
         stickyElement.classList.contains('sticky-remote-entering') ||
         stickyElement.classList.contains('sticky-remote-leaving');
}

/**
 * Queue for managing multiple animations to prevent conflicts
 */
class AnimationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(animationFn: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await animationFn();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const animation = this.queue.shift();
      if (animation) {
        try {
          await animation();
        } catch (error) {
          console.error('Animation error:', error);
        }
      }
    }
    
    this.processing = false;
  }
}

// Global animation queue instance
export const animationQueue = new AnimationQueue();