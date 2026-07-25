import { redirect } from "next/navigation";

export default async function LegacyTrainingRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/training/${slug}`);
}
