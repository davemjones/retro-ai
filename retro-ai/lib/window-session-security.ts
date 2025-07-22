/**
 * Window-specific session security utilities
 * Prevents session sharing between different browser windows/tabs including incognito
 */

/**
 * Generate a unique window session identifier
 * This is stored in sessionStorage which is isolated per browser window/tab
 */
export function generateWindowSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get or create window session ID
 * Each browser window/tab gets its own unique identifier
 */
export function getWindowSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side: return placeholder that will be validated client-side
    return 'server-side-placeholder';
  }

  const STORAGE_KEY = 'retro-ai-window-session-id';
  
  // Try to get existing window session ID
  let windowSessionId = sessionStorage.getItem(STORAGE_KEY);
  
  if (!windowSessionId) {
    // Generate new window session ID for this window/tab
    windowSessionId = generateWindowSessionId();
    sessionStorage.setItem(STORAGE_KEY, windowSessionId);
    console.log('🔒 Generated new window session ID:', windowSessionId);
  }
  
  return windowSessionId;
}

/**
 * Clear window session ID (for logout)
 */
export function clearWindowSessionId(): void {
  if (typeof window !== 'undefined') {
    // Clear window session ID
    sessionStorage.removeItem('retro-ai-window-session-id');
    
    // Clear all bound session data
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('retro-ai-bound-session-')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('🧹 Cleared window session ID and bound session data');
  }
}

/**
 * Validate that the current window session ID matches the expected one
 */
export function validateWindowSession(expectedWindowSessionId: string): boolean {
  if (typeof window === 'undefined') {
    // Server-side: always allow (validation happens client-side)
    return true;
  }

  const currentWindowSessionId = getWindowSessionId();
  const isValid = currentWindowSessionId === expectedWindowSessionId;
  
  if (!isValid) {
    console.warn('🚨 Window session validation failed:', {
      expected: expectedWindowSessionId,
      current: currentWindowSessionId
    });
  }
  
  return isValid;
}

/**
 * Check if window session security is supported
 */
export function isWindowSessionSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Test sessionStorage availability
    const testKey = '__retro_ai_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('Window session security not supported:', error);
    return false;
  }
}

/**
 * Session security level based on window isolation capability
 */
export function getSessionSecurityLevel(): 'high' | 'medium' | 'low' {
  if (!isWindowSessionSupported()) {
    return 'low';
  }
  
  // Check if we're in an isolated context (like incognito)
  if (typeof window !== 'undefined' && window.navigator.webdriver) {
    return 'medium'; // Automated browser
  }
  
  return 'high'; // Full window session isolation available
}