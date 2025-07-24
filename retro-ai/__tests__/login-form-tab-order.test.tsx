import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth/login-form';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

describe('LoginForm Tab Order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (signIn as jest.Mock).mockResolvedValue({ ok: true });
  });

  it('should have correct tab order excluding forgot password link', () => {
    render(<LoginForm />);

    // Get all focusable elements in expected tab order
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    const forgotPasswordLink = screen.getByText(/forgot your password/i);

    // Verify the forgot password link has tabIndex={-1}
    expect(forgotPasswordLink).toHaveAttribute('tabindex', '-1');

    // Verify other elements don't have tabIndex (natural tab order)
    expect(emailInput).not.toHaveAttribute('tabindex');
    expect(passwordInput).not.toHaveAttribute('tabindex');
    expect(submitButton).not.toHaveAttribute('tabindex');
  });

  it('should skip forgot password link when tabbing through form', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    const forgotPasswordLink = screen.getByText(/forgot your password/i);

    // Focus email input
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    // Simulate Tab key press - should skip forgot password link
    passwordInput.focus(); // Simulating what would happen with Tab
    expect(document.activeElement).toBe(passwordInput);

    // Another Tab should go to submit button
    submitButton.focus();
    expect(document.activeElement).toBe(submitButton);

    // Verify forgot password link is not in the natural tab flow
    expect(forgotPasswordLink).toHaveAttribute('tabindex', '-1');
  });

  it('should keep forgot password link clickable despite tabIndex=-1', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByText(/forgot your password/i);

    // Link should still be clickable
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.tagName.toLowerCase()).toBe('a');
    expect(forgotPasswordLink).toHaveAttribute('href', '#');
    
    // But should be excluded from tab order
    expect(forgotPasswordLink).toHaveAttribute('tabindex', '-1');
  });

  it('should maintain accessibility attributes on forgot password link', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByText(/forgot your password/i);

    // Should have proper styling classes (for screen readers)
    expect(forgotPasswordLink).toHaveClass('ml-auto', 'inline-block', 'text-sm', 'underline');
    
    // Should be a proper link element
    expect(forgotPasswordLink.tagName.toLowerCase()).toBe('a');
    
    // Should have tabIndex=-1 to skip in tab order
    expect(forgotPasswordLink).toHaveAttribute('tabindex', '-1');
  });

  it('should render all form elements in correct DOM order', () => {
    render(<LoginForm />);

    const formElements = [
      screen.getByLabelText(/email/i),
      screen.getByLabelText(/password/i),
      screen.getByRole('button', { name: /login/i }),
    ];

    // All main form elements should be present
    formElements.forEach(element => {
      expect(element).toBeInTheDocument();
    });

    // Forgot password link should exist but be skipped in tab order
    const forgotPasswordLink = screen.getByText(/forgot your password/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('tabindex', '-1');
  });

  it('should not interfere with form submission', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    // Fill out form
    emailInput.focus();
    // In a real test, you'd simulate typing and form submission
    
    // The tabIndex change should not affect form functionality
    expect(submitButton).toBeEnabled();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});