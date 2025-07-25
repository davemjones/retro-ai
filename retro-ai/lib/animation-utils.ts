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
 * Records the current position of an element for FLIP animations
 */
export function recordElementPosition(stickyId: string): DOMRect | null {
  const element = document.querySelector(`[data-sticky-id="${stickyId}"]`);
  if (!element) return null;
  return element.getBoundingClientRect();
}

/**
 * FLIP Animation: Animates a sticky note using the FLIP pattern
 * This works with React by updating state first, then animating the visual transition
 */
export async function animateStickyMovementFLIP(
  stickyId: string,
  fromPosition: DOMRect,
  options: AnimationOptions = {}
): Promise<void> {
  const { duration } = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  
  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip animation
  }

  const stickyElement = document.querySelector(`[data-sticky-id="${stickyId}"]`) as HTMLElement;
  if (!stickyElement) {
    console.warn(`Sticky element not found for FLIP animation: ${stickyId}`);
    return;
  }

  // Additional safety check - ensure element is still in DOM
  if (!document.body.contains(stickyElement)) {
    console.warn(`Sticky element ${stickyId} is not in DOM, skipping animation`);
    return;
  }

  // FLIP: First, Last, Invert, Play
  
  // LAST: Get the final position (after React state update)
  const lastPosition = stickyElement.getBoundingClientRect();
  
  // INVERT: Calculate the difference and apply reverse transform
  const deltaX = fromPosition.left - lastPosition.left;
  const deltaY = fromPosition.top - lastPosition.top;
  
  // Don't animate if there's no movement
  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
    return;
  }

  // When switching to position: fixed, we need to account for coordinate system change
  const currentScrollX = window.scrollX || document.documentElement.scrollLeft;
  const currentScrollY = window.scrollY || document.documentElement.scrollTop;
  
  // Apply the inverted transform immediately (puts it back to start position visually)
  stickyElement.style.transition = 'none';
  stickyElement.style.left = `${fromPosition.left + currentScrollX}px`;
  stickyElement.style.top = `${fromPosition.top + currentScrollY}px`;
  stickyElement.style.transform = 'translate(0, 0)';
  stickyElement.classList.add('sticky-remote-moving');

  // Force a reflow to ensure the transform is applied
  void stickyElement.offsetHeight;

  // PLAY: Animate to the final position (transform: none)
  return new Promise((resolve) => {
    const cleanup = () => {
      stickyElement.classList.remove('sticky-remote-moving');
      stickyElement.style.transition = '';
      stickyElement.style.transform = '';
      stickyElement.style.left = '';
      stickyElement.style.top = '';
      stickyElement.style.position = '';
      resolve();
    };

    // Apply transition and animate to final position
    stickyElement.style.transition = `left ${duration}ms cubic-bezier(0.2, 0, 0.2, 1), top ${duration}ms cubic-bezier(0.2, 0, 0.2, 1)`;
    stickyElement.style.left = `${lastPosition.left + currentScrollX}px`;
    stickyElement.style.top = `${lastPosition.top + currentScrollY}px`;

    // Listen for transition end
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === stickyElement && (event.propertyName === 'left' || event.propertyName === 'top')) {
        cleanup();
        stickyElement.removeEventListener('transitionend', onTransitionEnd as EventListener);
      }
    };

    stickyElement.addEventListener('transitionend', onTransitionEnd as EventListener);

    // Fallback timeout
    setTimeout(cleanup, (duration || 300) + 50);
  });
}

/**
 * Legacy animation function - kept for backward compatibility
 * @deprecated Use animateStickyMovementFLIP instead
 */
export async function animateStickyMovement(): Promise<void> {
  console.warn('animateStickyMovement is deprecated, use FLIP pattern instead');
  // For now, just skip the animation to prevent conflicts
  return Promise.resolve();
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