export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminEmail || !adminPassword || !sessionSecret) {
    return NextResponse.json(
      { error: "Admin access is not configured." },
      { status: 503 },
    );
  }

  if (
    String(email).trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
    password === adminPassword
  ) {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("admin-auth", sessionSecret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
    });

    return res;
  }

  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}
