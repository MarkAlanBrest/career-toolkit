import type { Metadata } from "next";
import ResumeIntake from "./ResumeIntake";
import "./resumes.css";

export const metadata: Metadata = {
  title: "Resume Intake | Career Services",
  description: "Review and file student resumes in SharePoint.",
};

export default function ResumesPage() {
  return <ResumeIntake />;
}
