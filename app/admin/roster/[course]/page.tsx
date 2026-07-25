import { redirect } from "next/navigation";

export default async function LegacyRosterPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  redirect(`/admin/courses/${encodeURIComponent(course)}`);
}
