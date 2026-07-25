import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE = "admin-session";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const item of cookieHeader.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export async function getAdminSession(request: Request) {
  const token = readCookie(request, ADMIN_COOKIE);
  if (!token) return null;

  return prisma.adminSession.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      expiresAt: { gt: new Date() },
      admin: { active: true },
    },
    include: {
      admin: {
        select: { id: true, email: true, name: true },
      },
    },
  });
}

export async function requireAdmin(request: Request) {
  const session = await getAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
