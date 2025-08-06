import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth-better";
import { 
  validateCookieSecurity, 
  detectSessionHijacking, 
  clearAuthCookies 
} from "./lib/cookie-security";

export default async function middleware(req: NextRequest) {
  // Skip security checks for auth pages and API routes
  if (req.nextUrl.pathname === "/" ||
      req.nextUrl.pathname.startsWith("/register") ||
      req.nextUrl.pathname.startsWith("/forgot-password") ||
      req.nextUrl.pathname.startsWith("/reset-password") ||
      req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  try {
    // Get Better Auth session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      console.log('No Better Auth session found, redirecting to login');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Check email verification
    if (!session.user.emailVerified) {
      console.warn('User email not verified, redirecting to login');
      const response = NextResponse.redirect(new URL('/?error=EmailNotVerified', req.url));
      return clearAuthCookies(response);
    }

    // SECURITY CHECKS - Critical for preventing session sharing vulnerability
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
        // Set flag for session rotation (handled by Better Auth)
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

    } catch (error) {
      console.error('❌ Middleware security check failed:', error);
      // On error, allow request but log for investigation
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        url: req.url
      });
    }

    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};