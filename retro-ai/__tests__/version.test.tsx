import { getAppVersion, getDisplayVersion } from '@/lib/version';

// Mock child_process for git command testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Note: These tests run with actual build-info.json file present
// The key behavior we're testing is that version.ts uses build info when available

const mockExecSync = require('child_process').execSync;

describe('Version Utilities', () => {
  const originalAppEnv = process.env.APP_ENV;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset APP_ENV to undefined for each test
    delete process.env.APP_ENV;
  });

  afterEach(() => {
    // Restore original APP_ENV
    if (originalAppEnv !== undefined) {
      process.env.APP_ENV = originalAppEnv;
    } else {
      delete process.env.APP_ENV;
    }
  });

  describe('getAppVersion', () => {
    it('should return simple version for APP_ENV=production', () => {
      process.env.APP_ENV = 'production';
      
      const version = getAppVersion();
      
      expect(version).toBe('0.1.0'); // Base version from package.json
    });

    it('should return alpha version from build info for APP_ENV=staging', () => {
      process.env.APP_ENV = 'staging';
      
      const version = getAppVersion();
      
      // Should use build info - check it's an alpha version with proper format
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      // Should not call git because build info is available
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should return alpha version from build info for APP_ENV=development', () => {
      process.env.APP_ENV = 'development';
      
      const version = getAppVersion();
      
      // Should use build info - check it's an alpha version with proper format
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      // Should not call git because build info is available
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should default to alpha version from build info when APP_ENV is not set', () => {
      // APP_ENV is undefined (default case)
      
      const version = getAppVersion();
      
      // Should use build info - check it's an alpha version with proper format
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      // Should not call git because build info is available
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should return alpha version from build info for any non-production APP_ENV', () => {
      process.env.APP_ENV = 'qa';
      
      const version = getAppVersion();
      
      // Should use build info - check it's an alpha version with proper format
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      // Should not call git because build info is available
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should use build info even when git would not be available', () => {
      process.env.APP_ENV = 'staging';
      mockExecSync.mockImplementation(() => {
        throw new Error('Git not found');
      });
      
      const version = getAppVersion();
      
      // Should still use build info, not attempt git
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      // Should not call git because build info is available
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should use build info even when dynamic generation would fail', () => {
      process.env.APP_ENV = 'staging';
      // Mock Date constructor to throw (this should not be called)
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      
      const version = getAppVersion();
      
      // Should use build info, not attempt dynamic generation
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      
      // Restore Date
      global.Date = originalDate;
    });

    it('should return stable version from build info (not dynamic timestamp)', () => {
      process.env.APP_ENV = 'staging';
      
      const version1 = getAppVersion();
      const version2 = getAppVersion();
      
      // Versions should be identical (from build info, not dynamic)
      expect(version1).toBe(version2);
      expect(version1).toMatch(/^0\.1\.0-alpha\.\d{12}\+[0-9a-f]+$/i);
    });
  });

  describe('getDisplayVersion', () => {
    it('should add v prefix to production version', () => {
      process.env.APP_ENV = 'production';
      
      const displayVersion = getDisplayVersion();
      
      expect(displayVersion).toBe('v0.1.0');
    });

    it('should add v prefix to alpha version', () => {
      process.env.APP_ENV = 'staging';
      
      const displayVersion = getDisplayVersion();
      
      expect(displayVersion).toMatch(/^v0\.1\.0-alpha\.\d{12}\+[a-f0-9A-F]+$/);
    });
  });

  describe('Environment Variable Independence', () => {
    it('should work correctly regardless of NODE_ENV value', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Test with NODE_ENV=production and APP_ENV=staging
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'staging';
      mockExecSync.mockReturnValue('test123\n');
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+[a-f0-9]+$/);
      
      // Restore NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });
});