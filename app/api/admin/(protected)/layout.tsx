import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin-auth");

  if (!auth) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
