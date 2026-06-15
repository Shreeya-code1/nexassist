import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";


export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (pathname.startsWith("/auth") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}


export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"]
};
