// app/admin/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL("/admin/login", request.url);

  const response = NextResponse.redirect(url);

  response.cookies.set("admin-auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}