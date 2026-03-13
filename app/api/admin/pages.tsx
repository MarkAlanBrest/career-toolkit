"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Invalid login");
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h1>Admin Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={login} style={{ width: "100%" }}>
        Login
      </button>
    </div>
  );
}
