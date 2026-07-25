export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE,
  hashSessionToken,
  readCookie,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const token = readCookie(request, ADMIN_COOKIE);
  if (token) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
