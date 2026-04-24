"use client";

import { useMemo, useState } from "react";
import { type MasteryAssignment, type ObjectiveBlock } from "./data";

type SubmissionEntry = {
  blockId: string;
  title: string;
  type: ObjectiveBlock["type"];
  isCorrect: boolean;
  response: unknown;
  submittedAt: string;
};

const BLOCK_COLORS: Record<string, { header: string; dot: string }> = {
  "multiple-choice": { header: "#5B45E0", dot: "#A899F5" },
  "true-false":      { header: "#0F9B6B", dot: "#7DE2CC" },
  "checkpoint":      { header: "#0F9B6B", dot: "#7DE2CC" },
  "reflection":      { header: "#E0780F", dot: "#FAC97A" },
  "drag-drop":       { header: "#C0185C", dot: "#F5A0BE" },
  "matching":        { header: "#1585C0", dot: "#8DD3F5" },
  "sequencing":      { header: "#7B35C0", dot: "#CCA8F5" },
  "sorting":         { header: "#0A8A5A", dot: "#72E0B0" },
  "scenario":        { header: "#C0185C", dot: "#F5A0BE" },
  "review":          { header: "#5B45E0", dot: "#A899F5" },
  "image-slide":     { header: "#1585C0", dot: "#8DD3F5" },
  "video-slide":     { header: "#1585C0", dot: "#8DD3F5" },
  "bullet-slide":    { header: "#7B35C0", dot: "#CCA8F5" },
};

function blockColor(type: ObjectiveBlock["type"]) {
  return BLOCK_COLORS[type] ?? { header: "#5B45E0", dot: "#A899F5" };
}

function themeClass(block?: ObjectiveBlock | null) {
  if (!block?.theme) return "theme-ocean";
  return `theme-${block.theme}`;
}

function blockLabel(type: ObjectiveBlock["type"]) {
  if (type === "multiple-choice") return "Multiple Choice";
  if (type === "true-false") return "True / False";
  if (type === "checkpoint") return "Checkpoint";
  if (type === "drag-drop") return "Drag / Drop";
  if (type === "matching") return "Matching";
  if (type === "sequencing") return "Sequencing";
  if (type === "sorting") return "Sorting";
  if (type === "scenario") return "Scenario";
  if (type === "review") return "Review";
  if (type === "reflection") return "Reflection";
  if (type === "image-slide") return "Image";
  if (type === "video-slide") return "Video";
  if (type === "bullet-slide") return "Key Points";
  return "Content";
}

function isInteractiveBlock(block?: ObjectiveBlock | null) {
  return Boolean(
    block &&
      (block.type === "multiple-choice" ||
        block.type === "true-false" ||
        block.type === "checkpoint" ||
        block.type === "drag-drop" ||
        block.type === "matching" ||
        block.type === "sequencing" ||
        block.type === "sorting" ||
        block.type === "scenario" ||
        block.type === "reflection")
  );
}

function hasChoices(block?: ObjectiveBlock | null) {
  return Boolean(block?.choices?.length);
}

function hasActivityItems(block?: ObjectiveBlock | null) {
  return Boolean(block?.activityItems?.length);
}

export default function MasteryPathStudentClient({
  assignment,
}: {
  assignment: MasteryAssignment | null;
}) {
  const objective = assignment?.objective ?? null;
  const blocks = useMemo(() => objective?.blocks ?? [], [objective]);
  const criteria = objective?.completionCriteria;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"correct" | "wrong" | "info">("info");
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, boolean>>({});
  const [correctInteractions, setCorrectInteractions] = useState<Record<string, number>>({});
  const [reflectionText, setReflectionText] = useState<Record<string, string>>({});
  const [activityResponses, setActivityResponses] = useState<Record<string, Record<string, string>>>({});
  const [draggedItemId, setDraggedItemId] = useState("");
  const [submissionEntries, setSubmissionEntries] = useState<Record<string, SubmissionEntry>>({});

  const currentBlock = blocks[currentIndex] ?? null;
  const hasAssignment = Boolean(assignment && objective && currentBlock);
  const completedCount = Object.values(completedBlocks).filter(Boolean).length;
  const correctCount = Object.values(correctInteractions).reduce((total, count) => total + count, 0);
  const interactiveCount = blocks.filter(isInteractiveBlock).length;
  const requiredBlocks = Math.min(criteria?.minBlocksComplete ?? blocks.length, blocks.length);
  const requiredCorrect = criteria?.minCorrectInteractions ?? interactiveCount;
  const isLastBlock = currentIndex >= blocks.length - 1;
  const objectiveComplete =
    completedCount >= requiredBlocks && correctCount >= requiredCorrect && blocks.length > 0;

  const color = blockColor(currentBlock?.type ?? "multiple-choice");

  function handleClose() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
  }

  function markBlockComplete(block: ObjectiveBlock, correct?: boolean) {
    setCompletedBlocks((previous) => ({ ...previous, [block.id]: true }));
    if (correct) {
      setCorrectInteractions((previous) => ({
        ...previous,
        [block.id]: (previous[block.id] || 0) + 1,
      }));
    }
  }

  function recordSubmission(block: ObjectiveBlock, isCorrect: boolean, response: unknown) {
    setSubmissionEntries((previous) => ({
      ...previous,
      [block.id]: {
        blockId: block.id,
        title: block.title,
        type: block.type,
        isCorrect,
        response,
        submittedAt: new Date().toISOString(),
      },
    }));
  }

  function moveToIndex(nextIndex: number) {
    setCurrentIndex(Math.max(0, Math.min(blocks.length - 1, nextIndex)));
    setSelectedChoiceId("");
    setFeedback("");
    setDraggedItemId("");
  }

  function submitChoice(block: ObjectiveBlock) {
    const choice = block.choices?.find((item) => item.id === selectedChoiceId);
    if (!choice) {
      setFeedback("Choose an answer before continuing.");
      setFeedbackType("info");
      return false;
    }
    const isCorrect = Boolean(choice.isCorrect);
    markBlockComplete(block, isCorrect);
    recordSubmission(block, isCorrect, { choiceId: choice.id, choiceText: choice.text });
    setFeedback(isCorrect ? choice.feedback || "Correct. Keep going." : "Not quite. Try again.");
    setFeedbackType(isCorrect ? "correct" : "wrong");
    return true;
  }

  function submitReflection(block: ObjectiveBlock) {
    const value = reflectionText[block.id]?.trim() || "";
    if (!value) {
      setFeedback("Add a short response before continuing.");
      setFeedbackType("info");
      return false;
    }
    markBlockComplete(block, true);
    recordSubmission(block, true, { text: value });
    setFeedback("Response saved. Keep going.");
    setFeedbackType("info");
    return true;
  }

  function setActivityResponse(blockId: string, itemId: string, value: string) {
    setActivityResponses((previous) => ({
      ...previous,
      [blockId]: { ...(previous[blockId] || {}), [itemId]: value },
    }));
  }

  function submitActivity(block: ObjectiveBlock) {
    const responses = activityResponses[block.id] || {};
    const items = block.activityItems || [];
    if (!items.length) {
      markBlockComplete(block);
      recordSubmission(block, true, {});
      setFeedback("Activity complete. Keep going.");
      setFeedbackType("info");
      return true;
    }
    const answeredAll = items.every((item) => responses[item.id]);
    if (!answeredAll) {
      setFeedback("Place every item before continuing.");
      setFeedbackType("info");
      return false;
    }
    const isCorrect = items.every((item) => {
      if (block.type === "sequencing") return responses[item.id] === String(item.order || 1);
      return responses[item.id] === item.targetId;
    });
    markBlockComplete(block, isCorrect);
    recordSubmission(block, isCorrect, {
      placements: responses,
      items: items.map((item) => ({
        id: item.id,
        text: item.text,
        expectedTargetId: item.targetId || null,
        expectedOrder: item.order || null,
        submittedValue: responses[item.id] || null,
      })),
    });
    setFeedback(isCorrect ? "Correct. Keep going." : "Not quite. Try again.");
    setFeedbackType(isCorrect ? "correct" : "wrong");
    return true;
  }

  function handlePrimaryAction() {
    if (!currentBlock) return;
    if (feedback) {
      if (!isLastBlock) { moveToIndex(currentIndex + 1); return; }
      if (!objectiveComplete) { moveToIndex(0); }
      return;
    }
    if (hasChoices(currentBlock)) { submitChoice(currentBlock); return; }
    if (hasActivityItems(currentBlock)) { submitActivity(currentBlock); return; }
    if (currentBlock.type === "reflection") { submitReflection(currentBlock); return; }
    markBlockComplete(currentBlock);
    if (!isLastBlock) { moveToIndex(currentIndex + 1); return; }
    setFeedback("Block complete. Review your progress or retake the objective.");
    setFeedbackType("info");
  }

  function handleRetake() {
    if (!criteria?.allowRetake) return;
    setCurrentIndex(0);
    setSelectedChoiceId("");
    setFeedback("");
    setCompletedBlocks({});
    setCorrectInteractions({});
    setReflectionText({});
    setActivityResponses({});
    setSubmissionEntries({});
    setDraggedItemId("");
  }

  function buildSubmissionReport() {
    const entries = blocks.map((block) => submissionEntries[block.id]).filter(Boolean);
    return {
      submittedAt: new Date().toISOString(),
      assignment: {
        id: assignment?.id || "",
        courseId: assignment?.courseId || "",
        title: assignment?.title || "",
        course: assignment?.course || "",
      },
      objective: {
        id: objective?.id || "",
        title: objective?.title || "",
        goal: objective?.goal || "",
      },
      result: {
        completed: objectiveComplete,
        completedBlocks: completedCount,
        totalBlocks: blocks.length,
        correctInteractionAttempts: correctCount,
        requiredCorrectInteractionAttempts: requiredCorrect,
      },
      responses: entries,
    };
  }

  function downloadResults() {
    const report = buildSubmissionReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filenameBase = (assignment?.title || "masterypath-results")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    link.href = url;
    link.download = `${filenameBase || "masterypath-results"}-submission.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function primaryLabel() {
    if (feedback && !isLastBlock) return "Continue";
    if (feedback && isLastBlock) return objectiveComplete ? "Objective Complete" : "Review Blocks";
    if (hasChoices(currentBlock)) return "Submit Answer";
    if (hasActivityItems(currentBlock)) return "Check Activity";
    if (currentBlock?.type === "reflection") return "Save Response";
    if (isLastBlock) return "Complete Block";
    return "Next";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif;
          background: #F0EDF8;
          color: #1A1528;
          min-height: 100vh;
        }

        .mp-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px 16px;
        }

        .mp-shell {
          width: min(680px, 100%);
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(91,69,224,0.15);
          box-shadow: 0 20px 60px rgba(91,69,224,0.12);
          background: #fff;
        }

        .mp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 20px;
          background: #fff;
          border-bottom: 1px solid #E8E2F5;
        }

        .mp-topbar-title {
          font-size: 14px;
          font-weight: 500;
          color: #1A1528;
        }

        .mp-topbar-sub {
          font-size: 12px;
          color: #7068A0;
          margin-top: 2px;
        }

        .mp-close-btn {
          font-size: 12px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #7068A0;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .mp-close-btn:hover { border-color: #B8AEDE; color: #1A1528; }

        .mp-block-header {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: background 0.3s;
        }

        .mp-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
          color: #fff;
          letter-spacing: 0.02em;
        }

        .mp-block-counter {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }

        .mp-dots {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .mp-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: inline-block;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .mp-dot.visited { background: #fff; }

        .mp-body {
          padding: 24px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mp-block-label {
          font-size: 12px;
          color: #7068A0;
        }

        .mp-question {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 20px;
          line-height: 1.4;
          color: #1A1528;
        }

        .mp-summary {
          font-size: 14px;
          line-height: 1.65;
          color: #5A5278;
        }

        .mp-choice-list { display: flex; flex-direction: column; gap: 8px; }

        .mp-choice {
          width: 100%;
          text-align: left;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #E2DCF0;
          background: #fff;
          font-size: 14px;
          color: #1A1528;
          cursor: pointer;
          font-family: inherit;
          line-height: 1.45;
          transition: border-color 0.15s, background 0.15s;
        }
        .mp-choice:hover:not(:disabled) { border-color: #B8AEDE; }
        .mp-choice.selected { background: #EDEAFC; border-color: #5B45E0; color: #3D29B8; border-width: 1.5px; }
        .mp-choice.correct  { background: #E6FAF4; border-color: #0F9B6B; color: #0A7050; border-width: 1.5px; }
        .mp-choice.wrong    { background: #FEE8ED; border-color: #E03A5B; color: #B01F3D; border-width: 1.5px; }

        .mp-tf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .mp-tf-btn {
          padding: 18px;
          border-radius: 10px;
          border: 1px solid #E2DCF0;
          background: #fff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s;
          color: #1A1528;
        }
        .mp-tf-btn:hover:not(:disabled) { border-color: #B8AEDE; }
        .mp-tf-btn.selected { background: #EDEAFC; border-color: #5B45E0; color: #3D29B8; border-width: 1.5px; }
        .mp-tf-btn.correct  { background: #E6FAF4; border-color: #0F9B6B; color: #0A7050; border-width: 1.5px; }
        .mp-tf-btn.wrong    { background: #FEE8ED; border-color: #E03A5B; color: #B01F3D; border-width: 1.5px; }

        .mp-response-box {
          min-height: 130px;
          width: 100%;
          resize: vertical;
          border-radius: 10px;
          border: 1px solid #E2DCF0;
          padding: 12px 14px;
          color: #1A1528;
          font: inherit;
          font-size: 14px;
          line-height: 1.6;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .mp-response-box:focus { border-color: #5B45E0; }
        .mp-response-box::placeholder { color: #A89EC8; }

        .mp-feedback {
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.65;
        }
        .mp-feedback.correct { background: #E6FAF4; border: 1px solid #6DDCB4; color: #0A7050; }
        .mp-feedback.wrong   { background: #FEE8ED; border: 1px solid #F8A8BB; color: #B01F3D; }
        .mp-feedback.info    { background: #FEF5E0; border: 1px solid #F5CF7A; color: #8A5200; }

        .mp-activity-board { display: flex; flex-direction: column; gap: 14px; }

        .mp-drag-source { display: flex; flex-direction: column; gap: 8px; }

        .mp-drag-item {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #F4F1FB;
          font-size: 14px;
          color: #1A1528;
          cursor: grab;
          user-select: none;
          transition: all 0.15s;
        }
        .mp-drag-item:hover { border-color: #B8AEDE; }

        .mp-drop-zones { display: flex; flex-direction: column; gap: 10px; }

        .mp-drop-zone {
          min-height: 56px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px dashed #E2DCF0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s, background 0.15s;
        }

        .mp-drop-zone-label {
          font-size: 11px;
          font-weight: 500;
          color: #7068A0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mp-placed-item {
          padding: 6px 10px;
          border-radius: 6px;
          background: #EDEAFC;
          border: 1px solid #C4BAF5;
          font-size: 13px;
          color: #3D29B8;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mp-placed-item:hover { background: #FEE8ED; border-color: #F8A8BB; color: #B01F3D; }

        .mp-sequence-row {
          display: grid;
          grid-template-columns: 52px minmax(0,1fr);
          gap: 10px;
          align-items: center;
        }

        .mp-sequence-row select {
          width: 100%;
          border: 1px solid #E2DCF0;
          border-radius: 8px;
          padding: 9px;
          background: #fff;
          color: #1A1528;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .mp-sequence-row select:focus { border-color: #5B45E0; }

        .mp-match-grid { display: flex; flex-direction: column; gap: 10px; }
        .mp-match-row  { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }

        .mp-match-left {
          padding: 10px 14px;
          border-radius: 8px;
          background: #F4F1FB;
          border: 1px solid #E2DCF0;
          font-size: 13px;
          color: #1A1528;
        }

        .mp-match-arrow { color: #A89EC8; font-size: 16px; }

        .mp-match-select {
          padding: 9px 10px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          font-family: inherit;
          font-size: 13px;
          color: #1A1528;
          cursor: pointer;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
        }
        .mp-match-select:focus { border-color: #5B45E0; }

        .mp-sort-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mp-sort-col-label { font-size: 11px; font-weight: 500; color: #7068A0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
        .mp-sort-drop {
          min-height: 90px;
          border-radius: 10px;
          border: 1.5px dashed #E2DCF0;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          transition: all 0.15s;
        }
        .mp-sort-chip {
          padding: 8px 12px;
          border-radius: 7px;
          background: #F4F1FB;
          border: 1px solid #E2DCF0;
          font-size: 13px;
          color: #1A1528;
          cursor: grab;
          user-select: none;
          transition: all 0.15s;
        }
        .mp-sort-chip:hover { border-color: #B8AEDE; }
        .mp-sort-chip.placed { background: #EDEAFC; border-color: #C4BAF5; color: #3D29B8; }

        .mp-bullet-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }
        .mp-bullet-list li {
          display: grid;
          grid-template-columns: 8px 1fr;
          gap: 12px;
          align-items: start;
          font-size: 14px;
          line-height: 1.65;
          color: #2D2548;
        }
        .mp-bullet-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5B45E0;
          margin-top: 8px;
          flex-shrink: 0;
        }

        .mp-media {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #E2DCF0;
          background: #0D0A1A;
          min-height: 200px;
        }
        .mp-media iframe, .mp-media img {
          display: block;
          width: 100%;
          min-height: 200px;
          border: 0;
          object-fit: cover;
        }
        .mp-media-caption {
          padding: 10px 14px;
          background: #fff;
          font-size: 13px;
          line-height: 1.6;
          color: #7068A0;
          border-top: 1px solid #E2DCF0;
        }

        .mp-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .mp-stat {
          border-radius: 10px;
          padding: 14px 16px;
          background: #F4F1FB;
          border: 1px solid #E2DCF0;
        }
        .mp-stat strong {
          display: block;
          font-size: 24px;
          font-weight: 500;
          color: #1A1528;
          line-height: 1.1;
        }
        .mp-stat span {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #7068A0;
          font-weight: 500;
        }

        .mp-footer {
          padding: 14px 20px;
          border-top: 1px solid #E8E2F5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #fff;
        }

        .mp-footer-left { display: flex; align-items: center; gap: 8px; }
        .mp-footer-right { display: flex; align-items: center; gap: 8px; }

        .mp-progress-text {
          font-size: 12px;
          color: #7068A0;
        }

        .mp-btn {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #7068A0;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .mp-btn:hover { border-color: #B8AEDE; color: #1A1528; }
        .mp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mp-btn.primary { color: #fff; border-color: transparent; transition: opacity 0.15s; }
        .mp-btn.primary:hover { opacity: 0.88; }

        .mp-empty {
          padding: 40px 24px;
          text-align: center;
          color: #7068A0;
          font-size: 14px;
          line-height: 1.7;
        }
        .mp-empty h3 { font-size: 16px; font-weight: 500; color: #1A1528; margin-bottom: 8px; }

        @media (max-width: 600px) {
          .mp-page { padding: 0; }
          .mp-shell { border-radius: 0; min-height: 100vh; border: none; box-shadow: none; }
          .mp-question { font-size: 17px; }
          .mp-tf-row { grid-template-columns: 1fr; }
          .mp-sort-cols { grid-template-columns: 1fr; }
          .mp-match-row { grid-template-columns: 1fr; }
          .mp-match-arrow { display: none; }
        }
      `}</style>

      <div className="mp-page">
        <div className="mp-shell">

          {/* Top bar */}
          <div className="mp-topbar">
            <div>
              <div className="mp-topbar-title">{assignment?.title || "MasteryPath"}</div>
              <div className="mp-topbar-sub">{assignment?.course || "No course loaded"}</div>
            </div>
            <button className="mp-close-btn" onClick={handleClose} type="button">Close</button>
          </div>

          {/* Empty state */}
          {!hasAssignment && (
            <div className="mp-empty">
              <h3>No Saved Course Found</h3>
              <p>Save a MasteryPath from the builder first, then open the player with a courseId in the URL.</p>
            </div>
          )}

          {/* Block content */}
          {hasAssignment && currentBlock && assignment && (
            <>
              {/* Colored block header */}
              <div
                className="mp-block-header"
                style={{ background: color.header }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mp-badge">{blockLabel(currentBlock.type)}</span>
                  <span className="mp-block-counter">Block {currentIndex + 1} of {blocks.length}</span>
                </div>
                <div className="mp-dots">
                  {blocks.map((block, i) => (
                    <span
                      key={block.id}
                      className="mp-dot"
                      style={{
                        background:
                          i < currentIndex
                            ? "#fff"
                            : i === currentIndex
                            ? color.dot
                            : "rgba(255,255,255,0.25)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="mp-body">
                <div>
                  <div className="mp-block-label">{objective.title}</div>
                  <h1 className="mp-question">{currentBlock.title}</h1>
                  {currentBlock.summary && (
                    <p className="mp-summary" style={{ marginTop: 8 }}>{currentBlock.summary}</p>
                  )}
                </div>

                {/* Question / body text */}
                {currentBlock.body && (
                  <p style={{ fontSize: 14, color: "#2D2548", lineHeight: 1.65 }}>{currentBlock.body}</p>
                )}

                {/* Multiple choice / true-false */}
                {hasChoices(currentBlock) && currentBlock.type !== "true-false" && (
                  <div className="mp-choice-list">
                    {currentBlock.choices?.map((choice) => {
                      let cls = "";
                      if (feedback) {
                        if (choice.isCorrect) cls = "correct";
                        else if (choice.id === selectedChoiceId) cls = "wrong";
                      } else if (choice.id === selectedChoiceId) {
                        cls = "selected";
                      }
                      return (
                        <button
                          key={choice.id}
                          className={`mp-choice ${cls}`}
                          onClick={() => !feedback && setSelectedChoiceId(choice.id)}
                          disabled={Boolean(feedback)}
                          type="button"
                        >
                          {choice.text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* True / False */}
                {currentBlock.type === "true-false" && hasChoices(currentBlock) && (
                  <div className="mp-tf-row">
                    {currentBlock.choices?.map((choice) => {
                      let cls = "";
                      if (feedback) {
                        if (choice.isCorrect) cls = "correct";
                        else if (choice.id === selectedChoiceId) cls = "wrong";
                      } else if (choice.id === selectedChoiceId) {
                        cls = "selected";
                      }
                      return (
                        <button
                          key={choice.id}
                          className={`mp-tf-btn ${cls}`}
                          onClick={() => !feedback && setSelectedChoiceId(choice.id)}
                          disabled={Boolean(feedback)}
                          type="button"
                        >
                          {choice.text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Drag / drop + matching + sorting */}
                {hasActivityItems(currentBlock) && (
                  <div className="mp-activity-board">
                    {currentBlock.type === "sequencing" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {currentBlock.activityItems?.map((item) => (
                          <div key={item.id} className="mp-sequence-row">
                            <select
                              value={activityResponses[currentBlock.id]?.[item.id] || ""}
                              onChange={(e) => setActivityResponse(currentBlock.id, item.id, e.target.value)}
                            >
                              <option value="">—</option>
                              {currentBlock.activityItems?.map((_, idx) => (
                                <option key={idx + 1} value={String(idx + 1)}>{idx + 1}</option>
                              ))}
                            </select>
                            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#F4F1FB", border: "1px solid #E2DCF0", fontSize: 13, color: "#1A1528" }}>
                              {item.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : currentBlock.type === "matching" ? (
                      <div className="mp-match-grid">
                        {currentBlock.activityItems?.map((item) => (
                          <div key={item.id} className="mp-match-row">
                            <div className="mp-match-left">{item.text}</div>
                            <span className="mp-match-arrow">→</span>
                            <select
                              className="mp-match-select"
                              value={activityResponses[currentBlock.id]?.[item.id] || ""}
                              onChange={(e) => setActivityResponse(currentBlock.id, item.id, e.target.value)}
                            >
                              <option value="">Select…</option>
                              {currentBlock.activityTargets?.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : currentBlock.type === "sorting" ? (
                      <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {currentBlock.activityItems
                            ?.filter((item) => !activityResponses[currentBlock.id]?.[item.id])
                            .map((item) => (
                              <div
                                key={item.id}
                                className="mp-sort-chip"
                                draggable
                                onDragStart={() => setDraggedItemId(item.id)}
                              >
                                {item.text}
                              </div>
                            ))}
                        </div>
                        <div className="mp-sort-cols">
                          {currentBlock.activityTargets?.map((target) => (
                            <div key={target.id}>
                              <div className="mp-sort-col-label">{target.label}</div>
                              <div
                                className="mp-sort-drop"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (draggedItemId) setActivityResponse(currentBlock.id, draggedItemId, target.id);
                                }}
                              >
                                {currentBlock.activityItems
                                  ?.filter((item) => activityResponses[currentBlock.id]?.[item.id] === target.id)
                                  .map((item) => (
                                    <div key={item.id} className="mp-sort-chip placed"
                                      onClick={() => setActivityResponse(currentBlock.id, item.id, "")}>
                                      {item.text}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      /* drag-drop */
                      <>
                        <div className="mp-drag-source">
                          {currentBlock.activityItems
                            ?.filter((item) => !activityResponses[currentBlock.id]?.[item.id])
                            .map((item) => (
                              <div
                                key={item.id}
                                className="mp-drag-item"
                                draggable
                                onDragStart={() => setDraggedItemId(item.id)}
                              >
                                {item.text}
                              </div>
                            ))}
                        </div>
                        <div className="mp-drop-zones">
                          {currentBlock.activityTargets?.map((target) => (
                            <div
                              key={target.id}
                              className="mp-drop-zone"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (draggedItemId) setActivityResponse(currentBlock.id, draggedItemId, target.id);
                              }}
                            >
                              <span className="mp-drop-zone-label">{target.label}</span>
                              {currentBlock.activityItems
                                ?.filter((item) => activityResponses[currentBlock.id]?.[item.id] === target.id)
                                .map((item) => (
                                  <div key={item.id} className="mp-placed-item"
                                    onClick={() => setActivityResponse(currentBlock.id, item.id, "")}>
                                    {item.text}
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Reflection */}
                {currentBlock.type === "reflection" && (
                  <textarea
                    className="mp-response-box"
                    placeholder={currentBlock.placeholder || "Type your response here…"}
                    value={reflectionText[currentBlock.id] || ""}
                    onChange={(e) =>
                      setReflectionText((prev) => ({ ...prev, [currentBlock.id]: e.target.value }))
                    }
                  />
                )}

                {/* Bullet slide */}
                {currentBlock.type === "bullet-slide" && currentBlock.bullets?.length && (
                  <ul className="mp-bullet-list">
                    {currentBlock.bullets.map((b, i) => (
                      <li key={i}>
                        <span className="mp-bullet-dot" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Image slide */}
                {currentBlock.type === "image-slide" && currentBlock.imageUrl && (
                  <div className="mp-media">
                    <img src={currentBlock.imageUrl} alt={currentBlock.imageAlt || currentBlock.title} />
                    {currentBlock.caption && <div className="mp-media-caption">{currentBlock.caption}</div>}
                  </div>
                )}

                {/* Video slide */}
                {currentBlock.type === "video-slide" && currentBlock.videoUrl && (
                  <div className="mp-media">
                    <iframe src={currentBlock.videoUrl} title={currentBlock.title} allowFullScreen />
                    {currentBlock.caption && <div className="mp-media-caption">{currentBlock.caption}</div>}
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div className={`mp-feedback ${feedbackType}`}>{feedback}</div>
                )}

                {/* Stats */}
                {objectiveComplete && (
                  <div className="mp-stats">
                    <div className="mp-stat">
                      <strong>{completedCount}/{blocks.length}</strong>
                      <span>Blocks completed</span>
                    </div>
                    <div className="mp-stat">
                      <strong>{correctCount}/{requiredCorrect}</strong>
                      <span>Correct interactions</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mp-footer">
                <div className="mp-footer-left">
                  <button
                    className="mp-btn"
                    disabled={currentIndex <= 0}
                    onClick={() => moveToIndex(currentIndex - 1)}
                    type="button"
                  >
                    Back
                  </button>
                  <span className="mp-progress-text">
                    {completedCount} of {blocks.length} done
                  </span>
                </div>

                <div className="mp-footer-right">
                  {criteria?.allowRetake && (
                    <button
                      className="mp-btn"
                      disabled={!completedCount && currentIndex === 0}
                      onClick={handleRetake}
                      type="button"
                    >
                      Retake
                    </button>
                  )}
                  <button
                    className="mp-btn"
                    disabled={!completedCount}
                    onClick={downloadResults}
                    type="button"
                  >
                    Download
                  </button>
                  <button
                    className="mp-btn primary"
                    style={{ background: color.header }}
                    disabled={isLastBlock && Boolean(feedback) && objectiveComplete}
                    onClick={handlePrimaryAction}
                    type="button"
                  >
                    {primaryLabel()}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
