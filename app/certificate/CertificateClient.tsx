"use client";

import { useEffect, useState } from "react";

type StudentRecord = {
  id: number;
  FirstName: string;
  LastName: string;
  Test1?: number;
};

export default function CertificateClient() {
  const [record, setRecord] = useState<StudentRecord | null>(null);

  useEffect(() => {
    // Get code from URL (no Next hooks)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";

    if (!code) return;

    fetch(`/api/course?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data: StudentRecord) => setRecord(data))
      .catch(() => setRecord(null));
  }, []);

  if (!record) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading certificate...
      </main>
    );
  }

  const today = new Date().toLocaleDateString();

  return (
    <>
      {/* ⭐ PRINT-ONLY STYLES */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #certificate,
          #certificate * {
            visibility: visible;
          }

          #certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            margin: 0;
            box-shadow: none;
            border: none;
          }

          button {
            display: none !important;
          }

          body {
            background: white !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-6">

          {/* CERTIFICATE */}
          <div
            id="certificate"
            className="bg-white p-12 rounded-2xl shadow-xl max-w-4xl mx-auto text-slate-900"
          >
            <h1 className="text-5xl font-bold mb-6">
              CERTIFICATE OF COMPLETION
            </h1>

            <p>This certifies that</p>

            <h2 className="text-4xl font-semibold my-6">
              {record.FirstName} {record.LastName}
            </h2>

            <p>has successfully completed</p>

            <h2 className="text-3xl font-bold my-6">
              Ladder Safety Training
            </h2>

            <p>Date: {today}</p>

            {record.Test1 !== undefined && (
              <p>Score: {record.Test1}%</p>
            )}

            <p className="mt-6 text-sm text-slate-600">
              Certificate ID: CERT-{record.id}
            </p>
          </div>

          {/* BUTTONS (won’t print) */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl"
            >
              Print / Save as PDF
            </button>

            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-3 bg-slate-600 text-white rounded-xl"
            >
              Exit
            </button>
          </div>

        </div>
      </main>
    </>
  );
}