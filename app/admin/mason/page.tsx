import { redirect } from "next/navigation";

export default function LegacyStudioRedirect() {
  redirect("/admin/courses");
}
