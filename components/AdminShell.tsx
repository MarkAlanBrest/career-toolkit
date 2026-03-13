"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/create-course", label: "Create Course" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 to-slate-500">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-blue-950 text-white shadow-2xl">
          <div className="border-b border-white/10 px-6 py-6">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="mt-1 text-sm text-blue-100">Training Platform</p>
          </div>

          <nav className="flex flex-col gap-2 p-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-blue-950"
                      : "text-white hover:bg-blue-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="mt-6 rounded-xl bg-red-600 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="rounded-3xl bg-white p-6 shadow-xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
