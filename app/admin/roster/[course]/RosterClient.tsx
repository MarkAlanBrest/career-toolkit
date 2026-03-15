"use client";

import React from "react";

type StudentRecord = {
  id: number;
  CourseName: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Progress: number;
};

type CourseItem = {
  CourseName: string;
};

type RosterClientProps = {
  courseParam: string;
  courses: CourseItem[];
  initialStudents: StudentRecord[];
};

const RosterClient: React.FC<RosterClientProps> = ({ courseParam, courses, initialStudents }) => {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Roster for {courseParam}</h1>
      <section className="mb-4">
        <h2 className="font-semibold">Courses</h2>
        <ul className="list-disc list-inside">
          {courses.map((course) => (
            <li key={course.CourseName}>{course.CourseName}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">Students ({initialStudents.length})</h2>
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Progress</th>
            </tr>
          </thead>
          <tbody>
            {initialStudents.map((student) => (
              <tr key={student.id}>
                <td className="border px-2 py-1">{student.FirstName} {student.LastName}</td>
                <td className="border px-2 py-1">{student.Email}</td>
                <td className="border px-2 py-1">{student.Progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default RosterClient;
