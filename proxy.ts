import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (
    (isAdminPage || isAdminApi) &&
    !request.cookies.get("admin-session")?.value
  ) {
    if (isAdminApi) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
