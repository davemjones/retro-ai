import { render, screen } from '@testing-library/react';

// Simple test to verify Jest setup
describe('Jest Setup', () => {
  it('should be able to run tests', () => {
    render(<div>Test Component</div>);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});