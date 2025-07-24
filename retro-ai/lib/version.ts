import packageJson from '../package.json';

/**
 * Interface for build information generated at build time
 */
interface BuildInfo {
  version: string;
  baseVersion: string;
  buildTimestamp: string;
  commitHash: string;
  buildDate: string;
  nodeVersion: string;
}

/**
 * Load build information from static build-info.json file
 * Returns null if file doesn't exist (development mode)
 */
function loadBuildInfo(): BuildInfo | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const buildInfo = require('./build-info.json');
    return buildInfo;
  } catch {
    // Build info file doesn't exist (local development)
    return null;
  }
}

/**
 * Generate alpha version dynamically (fallback for development)
 */
function generateDynamicAlphaVersion(): string {
  const baseVersion = packageJson.version;
  
  try {
    // Generate build timestamp (YYYYMMDDHHMM format)
    const now = new Date();
    const build = now.toISOString()
      .replace(/[-:T]/g, '')
      .substring(0, 12);
    
    // Try to get git commit hash (fallback to 'dev' if not available)
    let commit = 'dev';
    try {
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
    // Fallback to dev version if anything goes wrong
    return `${baseVersion}-dev`;
  }
}

/**
 * Get the application version with environment-appropriate formatting
 * 
 * Production: MAJOR.MINOR.PATCH (e.g., "1.2.3")
 * Staging/Dev: MAJOR.MINOR.PATCH-alpha.BUILD+COMMIT (e.g., "0.1.0-alpha.202507240930+a7c3e09")
 * 
 * Uses APP_ENV environment variable for application environment detection,
 * separate from NODE_ENV which is used for Node.js runtime behavior.
 * 
 * In production builds, reads version from static build-info.json generated at build time.
 * In development, falls back to dynamic version generation.
 */
export function getAppVersion(): string {
  const baseVersion = packageJson.version;
  const appEnv = process.env.APP_ENV || 'development';
  
  // Show simple version only for true production environment
  if (appEnv === 'production') {
    return baseVersion;
  }
  
  // For staging, development, or any non-production APP_ENV
  // Try to load build info first (production builds)
  const buildInfo = loadBuildInfo();
  if (buildInfo) {
    // Use pre-generated build info (stable version per build)
    return buildInfo.version;
  }
  
  // Fallback to dynamic generation (development mode)
  return generateDynamicAlphaVersion();
}

/**
 * Get a formatted version string with 'v' prefix for display
 */
export function getDisplayVersion(): string {
  return `v${getAppVersion()}`;
}