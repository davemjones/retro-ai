import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-better";

export async function GET(request: NextRequest) {
  try {
    // Check all cookies
    const cookies = request.cookies.getAll();
    console.log("All cookies:", cookies);

    // Try to get session using Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    console.log("Session data:", session);

    return NextResponse.json({
      cookies: cookies,
      session: session,
      headers: Object.fromEntries(request.headers.entries()),
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      cookies: request.cookies.getAll(),
    }, { status: 500 });
  }
}