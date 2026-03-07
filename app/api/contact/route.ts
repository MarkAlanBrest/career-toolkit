import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {

  try {

    const body = await req.json();

    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();
    const timeSpent = body.timeSpent || 0;

    /* basic validation */

    if (!name || !email || !message) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    /* message length validation */

    if (message.length < 10 || message.length > 2000) {
      return Response.json({ error: "Invalid message length" }, { status: 400 });
    }

    /* basic email validation */

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    /* bot detection (submitted too quickly) */

    if (timeSpent < 3000) {
      return Response.json({ error: "Spam detected" }, { status: 400 });
    }

    /* get IP address */

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "Unknown IP";

    /* send email */

    await resend.emails.send({
      from: "Career Services <onboarding@resend.dev>",
      to: "markalanbrest@gmail.com",
      reply_to: email,
      subject: "Career Services Contact Form",
      text: `
Name: ${name}
Email: ${email}

Message:
${message}

IP Address: ${ip}
Time: ${new Date().toLocaleString()}
`
    });

    return Response.json({ success: true });

  } catch (error) {

    console.error("CONTACT FORM ERROR:", error);

    return Response.json(
      { error: "Server error sending email" },
      { status: 500 }
    );

  }

}