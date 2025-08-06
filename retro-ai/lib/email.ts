import { Resend } from "resend";

// Handle missing API key for development
const apiKey = process.env.RESEND_API_KEY;
const isDevelopment = !apiKey || apiKey === "your-resend-api-key-here";

if (isDevelopment) {
  console.warn("⚠️  RESEND_API_KEY not configured - emails will be logged instead of sent");
}

// Initialize Resend only if API key is available
const resend = !isDevelopment ? new Resend(apiKey) : null;

// Get email configuration from environment variables
const fromName = process.env.EMAIL_FROM_NAME || "Retro AI";
const fromEmail = process.env.EMAIL_FROM || "noreply@localhost.com";

// Simple HTML email templates
const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
`;

// Email verification template
const verificationEmailTemplate = (verificationUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  ${emailStyles}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${fromName}</h1>
    </div>
    
    <h2>Verify Your Email Address</h2>
    
    <p>Welcome to ${fromName}! To get started, please verify your email address by clicking the button below:</p>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verify Email Address</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
    
    <div class="warning">
      <strong>Note:</strong> This verification link will expire in 24 hours for security reasons.
    </div>
    
    <div class="footer">
      <p>If you didn't create an account with ${fromName}, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Password reset template
const passwordResetTemplate = (resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  ${emailStyles}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${fromName}</h1>
    </div>
    
    <h2>Reset Your Password</h2>
    
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
    
    <div class="warning">
      <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
    </div>
    
    <div class="footer">
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Email change verification template
const changeEmailTemplate = (verificationUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  ${emailStyles}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${fromName}</h1>
    </div>
    
    <h2>Confirm Your New Email Address</h2>
    
    <p>You've requested to change your email address. Please confirm this change by clicking the button below:</p>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="button">Confirm Email Change</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
    
    <div class="warning">
      <strong>Note:</strong> This confirmation link will expire in 24 hours. If you didn't request this change, please contact support immediately.
    </div>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Send verification email
export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
  _token: string
) {
  try {
    // In development mode without API key, just log the email
    if (isDevelopment || !resend) {
      console.log(`📧 [DEV MODE] Verification email would be sent to: ${to}`);
      console.log(`📧 [DEV MODE] Verification URL: ${verificationUrl}`);
      console.log(`📧 [DEV MODE] Subject: Verify your email for ${fromName}`);
      return { id: "dev-mode-email" };
    }

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `Verify your email for ${fromName}`,
      html: verificationEmailTemplate(verificationUrl),
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }

    console.log(`Verification email sent to ${to}`, data);
    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  _token: string
) {
  try {
    // In development mode without API key, just log the email
    if (isDevelopment || !resend) {
      console.log(`📧 [DEV MODE] Password reset email would be sent to: ${to}`);
      console.log(`📧 [DEV MODE] Reset URL: ${resetUrl}`);
      console.log(`📧 [DEV MODE] Subject: Reset your password for ${fromName}`);
      return { id: "dev-mode-email" };
    }

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `Reset your password for ${fromName}`,
      html: passwordResetTemplate(resetUrl),
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email");
    }

    console.log(`Password reset email sent to ${to}`, data);
    return data;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

// Send email change verification
export async function sendChangeEmailVerification(
  to: string,
  verificationUrl: string,
  _token: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `Confirm your new email address for ${fromName}`,
      html: changeEmailTemplate(verificationUrl),
    });

    if (error) {
      console.error("Failed to send email change verification:", error);
      throw new Error("Failed to send email change verification");
    }

    console.log(`Email change verification sent to ${to}`, data);
    return data;
  } catch (error) {
    console.error("Error sending email change verification:", error);
    throw error;
  }
}

// Utility function to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Utility function to check if email domain is allowed (for future use)
export async function isEmailDomainAllowed(_email: string): Promise<boolean> {
  // For now, allow all domains
  // In the future, you might want to implement domain allowlist/blocklist
  return true;
}