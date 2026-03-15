// app/admin/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Clear the admin-auth cookie
  cookies().set("admin-auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  // Redirect to the admin login page
  return NextResponse.redirect("/admin/login");
}
