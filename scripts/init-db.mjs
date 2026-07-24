import Database from "better-sqlite3";
import path from "node:path";
import process from "node:process";

const databasePath = path.join(process.cwd(), "prisma", "dev.db");
const db = new Database(databasePath);

const requiredColumns = [
  ["EndDate", "DATETIME"],
  ["Test1", "INTEGER NOT NULL DEFAULT 0"],
  ["Test2", "INTEGER NOT NULL DEFAULT 0"],
  ["Test3", "INTEGER NOT NULL DEFAULT 0"],
  ["Test4", "INTEGER NOT NULL DEFAULT 0"],
  ["Test5", "INTEGER NOT NULL DEFAULT 0"],
  ["Test6", "INTEGER NOT NULL DEFAULT 0"],
  ["Test7", "INTEGER NOT NULL DEFAULT 0"],
  ["Test8", "INTEGER NOT NULL DEFAULT 0"],
  ["SlidesPath", "TEXT"],
];

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS CourseRecords (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      FirstName TEXT NOT NULL,
      LastName TEXT NOT NULL,
      Email TEXT NOT NULL,
      CourseName TEXT NOT NULL,
      Code TEXT NOT NULL,
      StartDate DATETIME NOT NULL,
      EndDate DATETIME,
      Test1 INTEGER NOT NULL DEFAULT 0,
      Test2 INTEGER NOT NULL DEFAULT 0,
      Test3 INTEGER NOT NULL DEFAULT 0,
      Test4 INTEGER NOT NULL DEFAULT 0,
      Test5 INTEGER NOT NULL DEFAULT 0,
      Test6 INTEGER NOT NULL DEFAULT 0,
      Test7 INTEGER NOT NULL DEFAULT 0,
      Test8 INTEGER NOT NULL DEFAULT 0,
      Progress INTEGER NOT NULL DEFAULT 0,
      SlidesPath TEXT
    );
  `);

  const existingColumns = new Set(
    db.prepare("PRAGMA table_info(CourseRecords)").all().map((column) => column.name),
  );

  for (const [name, definition] of requiredColumns) {
    if (!existingColumns.has(name)) {
      db.exec(`ALTER TABLE CourseRecords ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS CourseRecords_Code_key ON CourseRecords(Code)",
  );

  const count = db
    .prepare("SELECT COUNT(*) AS count FROM CourseRecords")
    .get().count;

  console.log(`Training database ready (${count} learner record${count === 1 ? "" : "s"}).`);
} finally {
  db.close();
}
