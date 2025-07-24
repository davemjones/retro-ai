import { getAppVersion, getDisplayVersion } from '@/lib/version';

// Mock child_process for git command testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

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

    it('should return alpha version for APP_ENV=staging', () => {
      process.env.APP_ENV = 'staging';
      mockExecSync.mockReturnValue('a7c3e09\n');
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+a7c3e09$/);
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --short HEAD', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    it('should return alpha version for APP_ENV=development', () => {
      process.env.APP_ENV = 'development';
      mockExecSync.mockReturnValue('abc1234\n');
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+abc1234$/);
    });

    it('should default to alpha version when APP_ENV is not set', () => {
      // APP_ENV is undefined (default case)
      mockExecSync.mockReturnValue('def5678\n');
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+def5678$/);
    });

    it('should return alpha version for any non-production APP_ENV', () => {
      process.env.APP_ENV = 'qa';
      mockExecSync.mockReturnValue('xyz9999\n');
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+xyz9999$/);
    });

    it('should use fallback commit when git is not available', () => {
      process.env.APP_ENV = 'staging';
      mockExecSync.mockImplementation(() => {
        throw new Error('Git not found');
      });
      
      const version = getAppVersion();
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+dev$/);
    });

    it('should return dev fallback version when alpha generation fails', () => {
      process.env.APP_ENV = 'staging';
      // Mock Date constructor to throw (simulating timestamp generation failure)
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      
      const version = getAppVersion();
      
      expect(version).toBe('0.1.0-dev');
      
      // Restore Date
      global.Date = originalDate;
    });

    it('should generate correct timestamp format', () => {
      process.env.APP_ENV = 'staging';
      mockExecSync.mockReturnValue('abc1234\n');
      
      // Mock specific date for predictable timestamp
      const mockDate = new Date('2025-07-24T18:30:45.123Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const version = getAppVersion();
      
      expect(version).toBe('0.1.0-alpha.202507241830+abc1234');
      
      // Restore Date
      (global.Date as jest.Mock).mockRestore();
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
      mockExecSync.mockReturnValue('a7c3e09\n');
      
      const displayVersion = getDisplayVersion();
      
      expect(displayVersion).toMatch(/^v0\.1\.0-alpha\.\d{12}\+a7c3e09$/);
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
      
      expect(version).toMatch(/^0\.1\.0-alpha\.\d{12}\+test123$/);
      
      // Restore NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });
});