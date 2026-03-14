"use client";

import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
const res = await fetch("/api/login", {
        method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    window.location.href = "/admin/dashboard"; // force redirect
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          Admin Login
        </h1>

        <p className="text-slate-600 mb-6">
          Sign in to access the dashboard
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-900"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-900"
        />

        <button
          onClick={login}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold"
        >
          Login
        </button>
      </div>
    </main>
  );
}