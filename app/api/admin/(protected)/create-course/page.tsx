"use client";

import { useState } from "react";

export default function CreateCoursePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Draft");
  const [slidesJson, setSlidesJson] = useState(`{
  "slides": [
    {
      "type": "content",
      "title": "Introduction",
      "text": "Welcome to the course."
    },
    {
      "type": "quiz",
      "question": "What should you do first?",
      "options": ["Guess", "Follow safety rules", "Skip training"],
      "correct": 1
    }
  ]
}`);

  const handleSave = () => {
    try {
      JSON.parse(slidesJson);
      alert("Course is valid. Next step is saving this to your database.");
    } catch {
      alert("Your JSON is not valid.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-950">Create Course</h1>
      <p className="mt-2 text-slate-600">
        Add a new course using title, details, and slide JSON.
      </p>

      <div className="mt-6 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Course Title
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ladder Safety"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Draft</option>
              <option>Active</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short course description"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Slides JSON
          </label>
          <textarea
            className="min-h-[340px] w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
            value={slidesJson}
            onChange={(e) => setSlidesJson(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="rounded-xl bg-blue-950 px-5 py-3 font-semibold text-white"
          >
            Save Course
          </button>

          <button
            onClick={() => {
              setTitle("");
              setDescription("");
            }}
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
