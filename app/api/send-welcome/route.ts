import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { name, email, code } = await req.json();

  if (!name || !email || !code) {
    return new Response("Missing data", { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "Certifications <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Your Certification Course",
      html: `
        <h2>Welcome to the Course!</h2>
        <p>Hello ${name},</p>
        <p>Your course code has been generated.</p>

        <p><strong>Course Code:</strong> ${code}</p>

        <p>Enter this code on the website to begin your training.</p>

        <p>We wish you success!</p>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    return new Response("Email failed", { status: 500 });
  }
} 