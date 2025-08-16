import { NextRequest, NextResponse } from "next/server";
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
      req.nextUrl.pathname.startsWith("/api/auth") ||
      req.nextUrl.pathname.startsWith("/api/debug")) {
    return NextResponse.next();
  }

  try {
    // Check for session cookie (try both possible names)
    const sessionCookie = req.cookies.get("better-auth.session-token") || req.cookies.get("better-auth.session_token");
    
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // For now, just trust the presence of the session cookie
    // Individual pages will do proper session validation using Better Auth
    // TODO: Re-implement security checks for Better Auth

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