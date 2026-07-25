import { notFound } from "next/navigation";
import GeneratedTrainingPage from "@/components/GeneratedTrainingPage";
import { prisma } from "@/lib/prisma";
import { demoCourse, type LessonPlan, type PublicMasonCourse } from "@/lib/mason";

export const dynamic = "force-dynamic";

export default async function TrainingCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "demo") return <GeneratedTrainingPage course={demoCourse} />;

  const record = await prisma.masonCourse.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          fileName: true,
          estimatedMinutes: true,
          lessonPlan: true,
        },
      },
    },
  });
  if (!record || record.sections.length === 0) notFound();

  const course: PublicMasonCourse = {
    ...record,
    sections: record.sections.map((section) => ({
      ...section,
      lessonPlan: section.lessonPlan as unknown as LessonPlan,
    })),
  };

  return <GeneratedTrainingPage course={course} />;
}
