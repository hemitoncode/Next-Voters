import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { protectedRegularRoutes, protectedAdminRoutes } from "./data/protected-routes";
import { NextResponse, NextRequest } from "next/server";
import { isUserAuthenticatedAndHasAdminRole } from "./lib/auth";

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Check admin routes first
  if (protectedAdminRoutes.includes(pathname)) {
    try {
      const isAdmin = await isUserAuthenticatedAndHasAdminRole(req);
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } catch (error) {
      console.error("Admin auth check error:", error);
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Check regular protected routes
  if (protectedRegularRoutes.includes(pathname)) {
    try {
      return withAuth(req);
    } catch (error) {
      console.error("Auth middleware error:", error);
      // Allow request to proceed if auth fails to prevent blocking
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything but Next internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ]
};