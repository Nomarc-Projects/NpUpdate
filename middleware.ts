import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Guards the dashboard app. Better Auth sets an httpOnly session cookie
 * (prefix "nomarc"); we do a fast cookie presence check at the edge and
 * redirect unauthenticated users to /login with a return path. Full session
 * validation still happens server-side in the route handlers / pages.
 */
const PROTECTED = ["/dashboard", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsAuth) return NextResponse.next();

  // Edge check = session presence only (role is enforced server-side in the
  // /admin layout + role-guarded pages, since the cookie is opaque).
  const session = getSessionCookie(request, { cookiePrefix: "nomarc" });
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  // The cookie is present but may be stale — only the layout can tell. Forward
  // the path so it can build an accurate return link when it has to bounce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nm-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
