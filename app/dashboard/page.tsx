import { Suspense } from 'react';
import DashboardShell from './DashboardShell';

export default function CareerServicesDashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardShell />
    </Suspense>
  );
}
