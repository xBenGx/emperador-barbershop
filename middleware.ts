import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ... resto del código intacto

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/barber") && token?.role !== "BARBER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    if (path.startsWith("/client") && !token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/barber/:path*", "/client/:path*"],
};