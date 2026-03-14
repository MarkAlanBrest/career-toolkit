import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === "admin@example.com" && password === "admin123") {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("admin-auth", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}