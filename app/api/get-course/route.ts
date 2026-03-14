import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");

  if (!folder) {
    return Response.json({ error: "Missing folder" });
  }

  const modulePath = path.join(process.cwd(), "data/courses", folder, "module.json");

  if (!fs.existsSync(modulePath)) {
    return Response.json({ error: "Module not found" });
  }

  const raw = fs.readFileSync(modulePath, "utf-8");
  const json = JSON.parse(raw);

  return Response.json({ course: json });
}
