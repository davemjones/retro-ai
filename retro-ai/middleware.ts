import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { 
  validateCookieSecurity, 
  detectSessionHijacking, 
  clearAuthCookies 
} from "./lib/cookie-security";
import { SessionManager } from "./lib/session-manager";

export default withAuth(
  async function middleware(req) {
    // Skip security checks for auth pages
    if (req.nextUrl.pathname.startsWith("/login") || 
        req.nextUrl.pathname.startsWith("/register") ||
        req.nextUrl.pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    // Only perform security checks for authenticated requests
    if (req.nextauth.token) {
      try {
        // Validate cookie security
        const securityResult = await validateCookieSecurity(req, {
          enableCSRFProtection: true,
          enableSessionRotation: true,
          enableCookieTamperingDetection: true,
          sessionRotationInterval: 120, // 2 hours
        });

        // Check for session hijacking
        const hijackingCheck = detectSessionHijacking(req);

        // Handle high-risk scenarios
        if (!securityResult.isValid || hijackingCheck.riskLevel === 'high') {
          console.warn('Security threat detected:', {
            securityResult,
            hijackingCheck,
            url: req.url,
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
          });

          // Clear cookies and redirect to login
          const response = NextResponse.redirect(new URL('/login?error=SecurityThreat', req.url));
          return clearAuthCookies(response);
        }

        // Handle session rotation
        if (securityResult.shouldRotateSession) {
          console.log('Session rotation required for security');
          // Set flag for session rotation (handled by NextAuth)
          const response = NextResponse.next();
          response.headers.set('X-Session-Rotation-Required', 'true');
          return response;
        }

        // Log medium-risk scenarios for monitoring
        if (hijackingCheck.riskLevel === 'medium') {
          console.warn('Medium security risk detected:', {
            indicators: hijackingCheck.indicators,
            url: req.url,
            userAgent: req.headers.get('user-agent')
          });
        }

        // Log recommendations
        if (securityResult.recommendations && securityResult.recommendations.length > 0) {
          console.info('Security recommendations:', securityResult.recommendations);
        }

        // Track session activity for valid sessions
        if (req.nextauth.token?.sessionId) {
          try {
            const action = req.method === 'GET' ? 'page_view' : 'api_call';
            await SessionManager.updateSessionActivity(
              req.nextauth.token.sessionId as string,
              req,
              action
            );
          } catch (error) {
            console.error('Failed to track session activity:', error);
          }
        }

      } catch (error) {
        console.error('Middleware security check failed:', error);
        // On error, allow request but log for investigation
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/login") || 
            req.nextUrl.pathname.startsWith("/register")) {
          return true;
        }
        // Require token for all other protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teams/:path*",
    "/boards/:path*",
    "/login",
    "/register",
  ],
};