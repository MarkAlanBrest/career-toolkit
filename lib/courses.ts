// lib/courses.ts
import fs from "fs";
import path from "path";

export type CourseMeta = {
  folder: string;
  courseName: string;
  description?: string;
  duration?: string;
};

const DATA_DIR = path.join(process.cwd(), "data/courses");

export function getAllCourses(): CourseMeta[] {
  const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });

  const courses: CourseMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const folderName = entry.name;
    const modulePath = path.join(DATA_DIR, folderName, "module.json");

    if (!fs.existsSync(modulePath)) continue;

    try {
      const raw = fs.readFileSync(modulePath, "utf-8");
      const json = JSON.parse(raw);

      const courseName: string = json.courseName ?? folderName;
      const description: string | undefined = json.description;
      const duration: string | undefined = json.duration;

      courses.push({
        folder: folderName,
        courseName,
        description,
        duration,
      });
    } catch (err) {
      console.error(`Failed to read module.json for ${folderName}`, err);
    }
  }

  courses.sort((a, b) => a.courseName.localeCompare(b.courseName));

  return courses;
}
