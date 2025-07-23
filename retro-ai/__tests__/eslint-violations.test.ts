import { execSync } from 'child_process';

describe.skip('ESLint Violations', () => {
  it('should have no ESLint errors or warnings', () => {
    try {
      // Run ESLint check
      const output = execSync('npm run lint', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // If we get here without an error, linting passed
      expect(output).not.toContain('Warning');
      expect(output).not.toContain('Error');
    } catch (error: any) {
      // ESLint found issues - this is what we expect before the fix
      const output = error.stdout || error.message;
      console.log('ESLint output:', output);
      
      // Initially, we expect this test to fail (demonstrating the bug)
      // After fixing, this test should pass
      throw new Error(`ESLint violations found: ${output}`);
    }
  });

  it('should build successfully without warnings', () => {
    try {
      const output = execSync('npm run build', { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      
      // Build should succeed without warnings
      expect(output).not.toContain('Warning');
      expect(output).toContain('Compiled successfully');
    } catch (error: any) {
      const output = error.stdout || error.message;
      console.log('Build output:', output);
      throw new Error(`Build failed or has warnings: ${output}`);
    }
  });
});