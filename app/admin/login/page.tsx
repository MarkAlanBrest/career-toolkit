"use client";

import Image from "next/image";
import { useState } from "react";
import { bodyFont, headingFont } from "@/lib/brand";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    window.location.href = "/admin/dashboard";
  };

  return (
    <main
      className={`${bodyFont.className} min-h-screen flex items-center justify-center px-5`}
      style={{
        background:
          "linear-gradient(135deg, rgba(0,31,82,.98), rgba(0,45,116,.92)), url(/ncst-campus.jpg) center/cover",
      }}
    >
      <div className="w-full max-w-md border border-[#d9dee7] bg-white p-8 shadow-[0_24px_60px_rgba(0,31,82,.25)]">
        <div className="mb-6 flex items-center gap-4 border-b border-[#d9dee7] pb-6">
          <Image src="/ncst-logo.png" alt="NCST" width={120} height={31} className="h-auto w-[110px]" />
          <div>
            <p className={`${headingFont.className} text-sm font-bold uppercase tracking-[.06em] text-[#002d74]`}>
              Administration
            </p>
            <p className="text-xs text-[#606b78]">Professional Training</p>
          </div>
        </div>

        <h1 className={`${headingFont.className} text-3xl font-bold uppercase text-[#002d74]`}>
          Admin Login
        </h1>

        <p className="mt-2 text-[#606b78] mb-6">
          Sign in to access the dashboard
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 border border-[#d9dee7] focus:outline-none focus:border-[#002d74]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 border border-[#d9dee7] focus:outline-none focus:border-[#002d74]"
        />

        {error && (
          <p className="mb-4 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={login}
          className={`${headingFont.className} w-full bg-[#002d74] py-3 text-sm font-bold uppercase tracking-[.06em] text-white transition hover:bg-[#001f52]`}
        >
          Login
        </button>
      </div>
    </main>
  );
}
