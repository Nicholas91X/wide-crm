import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;
    const role = token?.role;

    // Settings: admin only
    if (pathname.startsWith("/settings") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    // Pipeline new + generate-report: admin and editor
    if (
      (pathname === "/pipeline/new" || pathname.startsWith("/api/generate-report")) &&
      role !== "admin" &&
      role !== "editor"
    ) {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pipeline/:path*",
    "/reports/:path*",
    "/clients/:path*",
    "/settings/:path*",
    "/api/leads/:path*",
    "/api/reports/:path*",
    "/api/clients/:path*",
    "/api/generate-report/:path*",
  ],
};
