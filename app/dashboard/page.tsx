import { useEffect, useState } from "react";

function DashboardContent() {
  const params = useSearchParams();
  const code = params.get("code") || "";

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    fetch(`/api/course?code=${code}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }, [code]);

  if (error) return <div>{error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-300">
      <div className="bg-white p-10 rounded-xl shadow-xl w-[520px]">

        <h1 className="text-2xl font-bold text-center mb-6 text-blue-900">
          Course Information
        </h1>

        <div className="space-y-5">

          <div>
            <p className="text-sm text-gray-500">Student Name</p>
            <p className="font-semibold">
              {data.FirstName} {data.LastName}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{data.Email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Course ID</p>
            <p className="font-semibold">{data.CourseID}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Progress</p>
            <p className="font-semibold">{data.Progress}%</p>
          </div>

        </div>

        <button className="mt-8 w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-800">
          Start Course
        </button>

      </div>
    </main>
  );
}
