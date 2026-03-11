"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const params = useSearchParams();
  const code = params.get("code") || "";

  return <div>Code: {code}</div>;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
