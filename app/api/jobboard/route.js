export const runtime = "nodejs";

import fs from "fs/promises";
import path from "path";

const filePath = path.join(process.cwd(), "data", "jobboard.json");

// GET — read tiles
export async function GET() {
  const data = await fs.readFile(filePath, "utf8");
  return Response.json(JSON.parse(data));
}

// POST — add tile
export async function POST(req) {
  const body = await req.json();

  const data = JSON.parse(await fs.readFile(filePath, "utf8"));

  const newTile = {
    id: Date.now(),
    Title: body.Title || "New Listing",
    SubTitle: body.SubTitle || "",
    Description: body.Description || "",
    ButtonLabel: body.ButtonLabel || "View",
    Link: body.Link || "#",
    Type: body.Type || "General",
    Position: data.length + 1
  };

  data.unshift(newTile);

  await fs.writeFile(filePath, JSON.stringify(data, null, 2));

  return Response.json({ success: true });
}

// PATCH — save all edits
export async function PATCH(req) {
  const tiles = await req.json();

  await fs.writeFile(filePath, JSON.stringify(tiles, null, 2));

  return Response.json({ success: true });
}

// DELETE — remove tile
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  const data = JSON.parse(await fs.readFile(filePath, "utf8"));

  const updated = data.filter(t => t.id !== id);

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

  return Response.json({ success: true });
}