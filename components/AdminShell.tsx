"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import {
  BookOpen,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { headingFont } from "@/lib/brand";

type Props = {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Training programs", icon: BookOpen },
  { href: "/admin/courses/new", label: "New program", icon: Plus },
];

export default function AdminShell({
  children,
  title = "Training administration",
  eyebrow = "Course operations",
  actions,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname || "";

  async function logout() {
    await fetch("/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#25303d]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#001f52] text-white lg:flex">
          <div className="border-b border-white/10 px-6 py-7">
            <div className="flex items-center gap-3">
              <Image
                src="/ncst-logo.png"
                alt="NCST"
                width={110}
                height={29}
                className="h-auto w-[100px] brightness-0 invert"
              />
              <div>
                <p className={`${headingFont.className} text-sm font-bold uppercase tracking-[.06em]`}>
                  Training
                </p>
                <p className="text-xs text-white/55">Administration</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                currentPath === item.href ||
                (item.href === "/admin/courses" &&
                  currentPath.startsWith("/admin/courses/") &&
                  currentPath !== "/admin/courses/new");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#f5a800] text-[#001f52]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink size={17} /> View learner site
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={17} /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-[#d9dee7] bg-white">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
              <div>
                <p className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#f5a800]`}>
                  {eyebrow}
                </p>
                <h1 className={`${headingFont.className} mt-1 text-3xl font-bold uppercase text-[#002d74]`}>
                  {title}
                </h1>
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
          </header>

          <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
