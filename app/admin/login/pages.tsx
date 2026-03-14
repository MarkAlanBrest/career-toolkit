"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const r = useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");

  const login = async () => {
    const res = await fetch("/api/admin/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email,password })
    });
    if(res.ok) r.push("/admin/dashboard");
  };

  return (
    <div style={{maxWidth:400,margin:"100px auto"}}>
      <h1>Admin Login</h1>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  );
}