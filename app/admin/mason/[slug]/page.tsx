import { redirect } from "next/navigation";

export default async function LegacyCourseEditorRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/admin/courses/${slug}`);
}
