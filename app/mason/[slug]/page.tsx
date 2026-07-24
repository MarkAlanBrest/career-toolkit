import { notFound } from "next/navigation";
import MasonClassroom from "@/components/MasonClassroom";
import { prisma } from "@/lib/prisma";
import { demoCourse, type LessonPlan, type PublicMasonCourse } from "@/lib/mason";

export const dynamic = "force-dynamic";

export default async function MasonCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "demo") return <MasonClassroom course={demoCourse} />;

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

  return <MasonClassroom course={course} />;
}
