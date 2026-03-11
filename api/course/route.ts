export async function GET() {
  return Response.json({
    FirstName: "Test",
    LastName: "User",
    CourseName: "Ladder Safety",
    Progress: 0,
    Email: "test@test.com"
  });
}
