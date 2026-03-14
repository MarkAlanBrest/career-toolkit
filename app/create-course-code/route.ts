import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseFolder, firstName, lastName, email } = body;

    if (!courseFolder || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a unique course code
    const courseCode = randomUUID().slice(0, 8).toUpperCase();

    // TODO: Save to database or file here
    console.log("Saving course code:", {
      courseFolder,
      firstName,
      lastName,
      email,
      courseCode,
    });

    // TODO: Send email here
    console.log("Sending email to:", email);

    return NextResponse.json({ courseCode });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
