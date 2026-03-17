export const runtime = "nodejs";

export async function GET(request) {
  return new Response(
    JSON.stringify([{ ok: true, route: "jobboard" }]),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}