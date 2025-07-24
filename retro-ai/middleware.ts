import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { 
  validateCookieSecurity, 
  detectSessionHijacking, 
  clearAuthCookies 
} from "./lib/cookie-security";

export default withAuth(
  async function middleware(req) {
    // Skip security checks for auth pages
    if (req.nextUrl.pathname === "/" ||
        req.nextUrl.pathname.startsWith("/register") ||
        req.nextUrl.pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    // SECURITY CHECKS RE-ENABLED - Critical for preventing session sharing vulnerability
    if (req.nextauth.token) {
      console.log('User authenticated, performing security validation for:', req.url);
      
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
          console.warn('🚨 SECURITY THREAT DETECTED:', {
            securityResult,
            hijackingCheck,
            url: req.url,
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
          });

          // Clear cookies and redirect to homepage
          const response = NextResponse.redirect(new URL('/?error=SecurityThreat', req.url));
          return clearAuthCookies(response);
        }

        // Handle session rotation
        if (securityResult.shouldRotateSession) {
          console.log('🔄 Session rotation required for security');
          // Set flag for session rotation (handled by NextAuth)
          const response = NextResponse.next();
          response.headers.set('X-Session-Rotation-Required', 'true');
          return response;
        }

        // Log medium-risk scenarios for monitoring
        if (hijackingCheck.riskLevel === 'medium') {
          console.warn('⚠️  Medium security risk detected:', {
            indicators: hijackingCheck.indicators,
            url: req.url,
            userAgent: req.headers.get('user-agent')
          });
        }

        // Log recommendations
        if (securityResult.recommendations && securityResult.recommendations.length > 0) {
          console.info('💡 Security recommendations:', securityResult.recommendations);
        }

        // Note: Session activity tracking moved to client-side and API routes
        // due to Edge Runtime limitations with Prisma

      } catch (error) {
        console.error('❌ Middleware security check failed:', error);
        // On error, allow request but log for investigation
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          url: req.url
        });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        console.log('Authorized callback called for:', req.nextUrl.pathname);
        console.log('Token exists:', !!token);
        console.log('Token details:', token ? { id: token.id, email: token.email, sessionId: token.sessionId } : 'null');
        
        // Allow access to auth pages without token
        if (req.nextUrl.pathname === "/" || 
            req.nextUrl.pathname.startsWith("/register")) {
          console.log('Allowing access to auth page');
          return true;
        }
        // Require token for all other protected routes
        const hasValidToken = !!token;
        console.log('Access decision for', req.nextUrl.pathname, ':', hasValidToken ? 'ALLOWED' : 'DENIED');
        return hasValidToken;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teams/:path*",
    "/teams",
    "/boards/:path*", 
    "/boards",
    "/register",
  ],
};