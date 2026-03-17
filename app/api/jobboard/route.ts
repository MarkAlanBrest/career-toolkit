export const runtime = "nodejs";

import mysql from "mysql2/promise";

const dbConfig = process.env.DATABASE_URL!;

//
// GET — list tiles
//
export async function GET() {
  const db = await mysql.createConnection(dbConfig);

  const [rows] = await db.query(
    "SELECT * FROM JobBoard WHERE Active = 1 ORDER BY Position ASC"
  );

  await db.end();
  return Response.json(rows);
}

//
// POST — add new tile (TOP of list)
//
export async function POST(req: Request) {
  const body = await req.json();

  const db = await mysql.createConnection(dbConfig);

  // Shift positions down
  await db.query(
    "UPDATE JobBoard SET Position = Position + 1 WHERE Active = 1"
  );

  // Insert new job at position 1
  await db.query(
    `INSERT INTO JobBoard
     (Title, SubTitle, Description, ButtonLabel, Link, Type, Position, Active)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    [
      body.Title || "New Job Listing",
      body.SubTitle || "",
      body.Description || "",
      body.ButtonLabel || "Apply",
      body.Link || "#",
      body.Type || "General"
    ]
  );

  await db.end();
  return Response.json({ success: true });
}

//
// PATCH — save edits + order (FIXED — handles NEW rows)
//
export async function PATCH(req: Request) {
  const tiles = await req.json();

  const db = await mysql.createConnection(dbConfig);

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];

    // NEW TILE → INSERT
    if (!t.id || t.id === 0) {
      await db.query(
        `INSERT INTO JobBoard
        (Title, SubTitle, Description, ButtonLabel, Link, Type, Position, Active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          t.Title || "New Job Listing",
          t.SubTitle || "",
          t.Description || "",
          t.ButtonLabel || "Apply",
          t.Link || "#",
          t.Type || "General",
          i + 1
        ]
      );
    }

    // EXISTING TILE → UPDATE
    else {
      await db.query(
        `UPDATE JobBoard SET
          Title=?,
          SubTitle=?,
          Description=?,
          ButtonLabel=?,
          Link=?,
          Type=?,
          Position=?
         WHERE id=?`,
        [
          t.Title,
          t.SubTitle,
          t.Description,
          t.ButtonLabel || "Apply",
          t.Link,
          t.Type || "General",
          i + 1,
          t.id
        ]
      );
    }
  }

  await db.end();
  return Response.json({ success: true });
}

//
// DELETE — remove tile permanently
//
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const db = await mysql.createConnection(dbConfig);

  await db.query("DELETE FROM JobBoard WHERE id = ?", [id]);

  await db.end();
  return Response.json({ success: true });
}