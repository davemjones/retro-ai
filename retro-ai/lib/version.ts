import packageJson from '../package.json';

/**
 * Get the application version with environment-appropriate formatting
 * 
 * Production: MAJOR.MINOR.PATCH (e.g., "1.2.3")
 * Staging/Dev: MAJOR.MINOR.PATCH-alpha.BUILD+COMMIT (e.g., "0.1.0-alpha.202507240930+a7c3e09")
 * 
 * Uses APP_ENV environment variable for application environment detection,
 * separate from NODE_ENV which is used for Node.js runtime behavior.
 */
export function getAppVersion(): string {
  const baseVersion = packageJson.version;
  const appEnv = process.env.APP_ENV || 'development';
  
  // Show simple version only for true production environment
  if (appEnv === 'production') {
    return baseVersion;
  }
  
  // For staging, development, or any non-production APP_ENV, generate alpha version
  // This includes: staging, development, qa, demo, etc.
  try {
    // Generate build timestamp (YYYYMMDDHHMM format)
    const now = new Date();
    const build = now.toISOString()
      .replace(/[-:T]/g, '')
      .substring(0, 12);
    
    // Try to get git commit hash (fallback to 'dev' if not available)
    let commit = 'dev';
    try {
      // This would work in build environments with git
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require('child_process');
      commit = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
    } catch {
      // Git not available or not in git repo, use fallback
      commit = 'dev';
    }
    
    return `${baseVersion}-alpha.${build}+${commit}`;
  } catch {
    // Fallback to base version if anything goes wrong
    return `${baseVersion}-dev`;
  }
}

/**
 * Get a formatted version string with 'v' prefix for display
 */
export function getDisplayVersion(): string {
  return `v${getAppVersion()}`;
}