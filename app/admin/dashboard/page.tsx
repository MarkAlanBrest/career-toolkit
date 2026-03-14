import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Dashboard() {


 const cookieStore = await cookies();
const auth = cookieStore.get("admin-auth")?.value;




  if (auth !== "true") redirect("/admin/login");

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/dashboard`, {
    cache: "no-store",
  });

  const data = await res.json();

  return (
    <main style={{ padding: 40 }}>
      <h1 className="text-3xl font-bold text-blue-950">Admin Dashboard</h1>

      <div className="mt-6">
        <p className="text-lg">Total Records: {data.totalRecords}</p>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">All Records</h2>
        <pre className="mt-4 bg-slate-100 p-4 rounded-xl">
          {JSON.stringify(data.records, null, 2)}
        </pre>
      </div>
    </main>
  );
}
