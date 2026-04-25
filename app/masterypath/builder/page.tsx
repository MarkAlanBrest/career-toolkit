"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ObjectiveBlock, type SlideTheme } from "../data";

type Step = 1 | 2 | 3;
type InteractionType = ObjectiveBlock["type"];
type ActivityCounts = Partial<Record<InteractionType, number>>;
type SlideCounts = Partial<Record<ObjectiveBlock["type"], number>>;
type DeckStyle = "trade" | "clinical" | "bold" | "minimal";

const interactionTypes: Array<{
  type: InteractionType;
  title: string;
  description: string;
}> = [
  {
    type: "multiple-choice",
    title: "Multiple choice checks",
    description: "Use answer choices to check whether students recognize the right idea.",
  },
  {
    type: "true-false",
    title: "True / false checks",
    description: "Use quick statements to catch misconceptions and trigger review tips.",
  },
  {
    type: "checkpoint",
    title: "Scenario checkpoints",
    description: "Ask students to apply the content to a small real-world decision.",
  },
  {
    type: "drag-drop",
    title: "Drag and drop",
    description: "Students move terms, tools, or ideas into the correct category.",
  },
  {
    type: "matching",
    title: "Matching",
    description: "Students connect related terms, definitions, examples, or rules.",
  },
  {
    type: "sequencing",
    title: "Sequencing",
    description: "Students place steps, events, or procedures in the correct order.",
  },
  {
    type: "sorting",
    title: "Sorting",
    description: "Students classify examples into the right group.",
  },
  {
    type: "scenario",
    title: "Scenario decisions",
    description: "Students choose what to do in a realistic situation.",
  },
  {
    type: "reflection",
    title: "Reflection prompts",
    description: "Ask students to explain the concept in their own words before mastery.",
  },
];

const themes: Array<{
  id: SlideTheme;
  label: string;
  description: string;
  color: string;
}> = [
  { id: "ocean", label: "Ocean", description: "Clean blue classroom style.", color: "#1585C0" },
  { id: "sunset", label: "Sunset", description: "Warm activity style.", color: "#E0780F" },
  { id: "forest", label: "Forest", description: "Calm focused practice style.", color: "#0F9B6B" },
  { id: "slate", label: "Slate", description: "Neutral assessment style.", color: "#5B45E0" },
];

const contentSlideTypes: Array<{
  type: ObjectiveBlock["type"];
  title: string;
  description: string;
}> = [
  {
    type: "content-slide",
    title: "Teaching slides",
    description: "A polished concept slide with a clear explanation and callout.",
  },
  {
    type: "bullet-slide",
    title: "Key-point slides",
    description: "A scan-friendly slide with short bullets students can remember.",
  },
  {
    type: "review",
    title: "Review slides",
    description: "A recap slide that reinforces the most important takeaway.",
  },
  {
    type: "image-slide",
    title: "Visual slides",
    description: "A media-style slide. Uses image URLs found in the source when available.",
  },
];

const deckStyles: Array<{
  id: DeckStyle;
  title: string;
  description: string;
}> = [
  { id: "trade", title: "Trade school", description: "Bold headings, practical callouts, strong contrast." },
  { id: "clinical", title: "Clean classroom", description: "Calm spacing, clear hierarchy, restrained colors." },
  { id: "bold", title: "High energy", description: "Large type, vivid panels, punchy activity moments." },
  { id: "minimal", title: "Minimal", description: "Simple slides with less decoration and tighter reading flow." },
];

function contentTopics(content: string, title: string) {
  const sentences = content
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (sentences.length) return sentences;
  return [title || "the uploaded content"];
}

function shortTopic(topic: string) {
  return topic.length > 90 ? `${topic.slice(0, 87)}...` : topic;
}

function defaultSlideCounts(): SlideCounts {
  return {
    "content-slide": 1,
    "bullet-slide": 1,
    review: 1,
    "image-slide": 0,
  };
}

function imageUrlsFromContent(content: string) {
  return content.match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)/gi) || [];
}

function buildContentBlocks({
  title,
  content,
  slideCounts,
}: {
  title: string;
  content: string;
  slideCounts: SlideCounts;
}) {
  const topics = contentTopics(content, title);
  const images = imageUrlsFromContent(content);
  const blocks: ObjectiveBlock[] = [];

  contentSlideTypes.forEach(({ type }) => {
    const count = Math.max(0, slideCounts[type] || 0);
    Array.from({ length: count }).forEach((_, index) => {
      const topic = topics[index % topics.length] || title || "the uploaded content";
      const topicLabel = shortTopic(topic);
      const id = `${type}-${index + 1}`;

      if (type === "content-slide") {
        blocks.push({
          id,
          type,
          title: `Learn: ${topicLabel}`,
          summary: "A short teaching slide that frames the idea before practice.",
          body: topic,
          callout: {
            label: "Remember",
            text: "Use the source content as the rule for the activity questions.",
          },
          stats: [
            { label: "Focus", value: "Key idea" },
            { label: "Use", value: "Practice" },
          ],
          theme: "ocean",
          layoutStyle: "split",
        });
      }

      if (type === "bullet-slide") {
        blocks.push({
          id,
          type,
          title: `Key points: ${topicLabel}`,
          summary: "A fast review of what students should notice.",
          body: "Use these points to check your understanding.",
          bullets: [
            topicLabel,
            "Look for the rule, term, tool, or step being described.",
            "Apply the idea before moving into the activity.",
          ],
          theme: "slate",
          layoutStyle: "bullet-focus",
        });
      }

      if (type === "review") {
        blocks.push({
          id,
          type,
          title: `Review: ${topicLabel}`,
          summary: "A recap slide before the scored activities.",
          body: `The key idea is: ${topic}`,
          bullets: [
            "Check the wording carefully.",
            "Connect the idea to the examples in the activity.",
          ],
          theme: "forest",
          layoutStyle: "callout",
        });
      }

      if (type === "image-slide") {
        blocks.push({
          id,
          type,
          title: `Visual: ${topicLabel}`,
          summary: "A visual support slide for the concept.",
          body: topic,
          imageUrl: images[index % images.length] || "",
          caption: images.length ? "Source visual from the provided content." : "Add an image URL to the source content for this slide.",
          theme: "sunset",
          layoutStyle: "media-left",
        });
      }
    });
  });

  return blocks;
}

function buildInteractionBlocks({
  title,
  content,
  activityCounts,
  includeContentSlides,
  includeMissedExplanationSlides,
}: {
  title: string;
  content: string;
  activityCounts: ActivityCounts;
  includeContentSlides: boolean;
  includeMissedExplanationSlides: boolean;
}) {
  const topics = contentTopics(content, title);
  const blocks: ObjectiveBlock[] = [];

  interactionTypes.forEach(({ type }) => {
    const count = Math.max(0, activityCounts[type] || 0);
    Array.from({ length: count }).forEach((_, index) => {
      const topic = topics[index % topics.length] || title || "the uploaded content";
      const topicLabel = shortTopic(topic);
      const id = `${type}-${index + 1}`;
      const activityStartIndex = blocks.length;

      if (includeContentSlides) {
        blocks.push({
          id: `${id}-content`,
          type: "content-slide",
          title: `Review first: ${topicLabel}`,
          summary: "Students review the key idea before the activity.",
          body: topic,
          bullets: [
            "Read the key idea carefully.",
            "Use it to answer the activity that follows.",
          ],
          theme: "ocean",
          layoutStyle: "bullet-focus",
        });
      }

      if (type === "multiple-choice") {
        blocks.push({
          id,
          type,
          title: `Check: ${topicLabel}`,
          summary: "Students choose the strongest answer.",
          body: `Which answer best matches this content: ${topicLabel}`,
          choices: [
            {
              id: "correct",
              text: "The answer that matches the uploaded content.",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
            {
              id: "review",
              text: "A common misunderstanding of the content.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
            {
              id: "not-yet",
              text: "An answer that does not fit this content.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "ocean",
          layoutStyle: "spotlight",
        });
      }

      if (type === "true-false") {
        blocks.push({
          id,
          type,
          title: `Quick check: ${topicLabel}`,
          summary: "Students confirm whether the statement matches the content.",
          body: `True or false: this statement is supported by the uploaded content: ${topicLabel}`,
          choices: [
            { id: "true", text: "True", isCorrect: true, feedback: "Correct. Keep going." },
            {
              id: "false",
              text: "False",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "sunset",
          layoutStyle: "spotlight",
        });
      }

      if (type === "checkpoint" || type === "scenario") {
        blocks.push({
          id,
          type,
          title: `${type === "checkpoint" ? "Scenario" : "Decision"}: ${topicLabel}`,
          summary: "Students apply the content to a decision.",
          body: `You are using this content in a real situation: ${topicLabel}. What should you do next?`,
          choices: [
            {
              id: "best",
              text: "Use the rule or process described in the content.",
              isCorrect: true,
              feedback: "Correct. Keep going.",
            },
            {
              id: "review",
              text: "Skip the content and guess.",
              feedback: `Please review ${topicLabel} again; you could improve here.`,
            },
          ],
          theme: "forest",
          layoutStyle: "spotlight",
        });
      }

      if (type === "drag-drop" || type === "matching" || type === "sorting") {
        blocks.push({
          id,
          type,
          title: `${type === "drag-drop" ? "Drag" : type === "matching" ? "Match" : "Sort"}: ${topicLabel}`,
          summary: "Students place each item in the correct target.",
          body: `Move each item to the best target based on this content: ${topicLabel}`,
          activityItems: [
            { id: "item-1", text: "Key idea from the content", targetId: "target-1" },
            { id: "item-2", text: "Common distractor or related idea", targetId: "target-2" },
          ],
          activityTargets: [
            { id: "target-1", label: "Best match", accepts: ["item-1"] },
            { id: "target-2", label: "Review again", accepts: ["item-2"] },
          ],
          theme: "forest",
          layoutStyle: "spotlight",
        });
      }

      if (type === "sequencing") {
        blocks.push({
          id,
          type,
          title: `Order the steps: ${topicLabel}`,
          summary: "Students place steps in the correct sequence.",
          body: `Put these steps in the best order for this content: ${topicLabel}`,
          activityItems: [
            { id: "step-1", text: "First important step", order: 1 },
            { id: "step-2", text: "Second important step", order: 2 },
            { id: "step-3", text: "Final check or result", order: 3 },
          ],
          theme: "slate",
          layoutStyle: "spotlight",
        });
      }

      if (type === "reflection") {
        blocks.push({
          id,
          type,
          title: `Explain: ${topicLabel}`,
          summary: "Students explain the content in their own words.",
          body: `Explain this idea in your own words: ${topicLabel}`,
          placeholder: "Type your explanation here...",
          theme: "slate",
          layoutStyle: "split",
        });
      }

      if (includeMissedExplanationSlides && blocks.length > activityStartIndex) {
        blocks.push({
          id: `${id}-explanation`,
          type: "review",
          title: `Explanation: ${topicLabel}`,
          summary: "This explanation appears when the previous activity is missed.",
          body: `Review this idea before continuing: ${topic}`,
          bullets: [
            "Compare your answer to the source content.",
            "Look for the specific rule, term, or step the question was checking.",
          ],
          theme: "forest",
          layoutStyle: "bullet-focus",
          showWhenPreviousIncorrect: true,
        });
      }
    });
  });

  return blocks;
}

function defaultActivityCounts(): ActivityCounts {
  return interactionTypes.reduce((counts, interaction) => {
    counts[interaction.type] =
      interaction.type === "multiple-choice" ||
      interaction.type === "drag-drop" ||
      interaction.type === "matching" ||
      interaction.type === "reflection"
        ? 1
        : 0;
    return counts;
  }, {} as ActivityCounts);
}

function countGradableInteractions(blocks: ObjectiveBlock[]) {
  return blocks.filter((block) =>
    block.type === "multiple-choice" ||
    block.type === "true-false" ||
    block.type === "checkpoint" ||
    block.type === "drag-drop" ||
    block.type === "matching" ||
    block.type === "sequencing" ||
    block.type === "sorting" ||
    block.type === "scenario"
  ).length;
}

function isAllowedBlockType(type: unknown): type is ObjectiveBlock["type"] {
  return (
    type === "content-slide" ||
    type === "bullet-slide" ||
    type === "image-slide" ||
    type === "video-slide" ||
    type === "multiple-choice" ||
    type === "true-false" ||
    type === "checkpoint" ||
    type === "drag-drop" ||
    type === "matching" ||
    type === "sequencing" ||
    type === "sorting" ||
    type === "scenario" ||
    type === "review" ||
    type === "reflection"
  );
}

function normalizeAiBlocks(blocks: unknown): ObjectiveBlock[] {
  if (!Array.isArray(blocks)) return [];

  return blocks
    .map((block: any, index: number) => ({
      id: typeof block?.id === "string" && block.id.trim() ? block.id.trim() : `ai-activity-${index + 1}`,
      type: isAllowedBlockType(block?.type) ? block.type : "checkpoint",
      title:
        typeof block?.title === "string" && block.title.trim()
          ? block.title.trim()
          : `Activity ${index + 1}`,
      summary: typeof block?.summary === "string" ? block.summary.trim() : "",
      body: typeof block?.body === "string" ? block.body.trim() : "",
      bullets: Array.isArray(block?.bullets)
        ? block.bullets.filter((item: unknown) => typeof item === "string" && item.trim())
        : [],
      callout:
        block?.callout && typeof block.callout === "object"
          ? {
              label: typeof block.callout.label === "string" ? block.callout.label.trim() : "Key idea",
              text: typeof block.callout.text === "string" ? block.callout.text.trim() : "",
            }
          : null,
      stats: Array.isArray(block?.stats)
        ? block.stats
            .map((stat: any) => ({
              label: typeof stat?.label === "string" ? stat.label.trim() : "",
              value: typeof stat?.value === "string" ? stat.value.trim() : "",
            }))
            .filter((stat: { label: string; value: string }) => stat.label || stat.value)
        : [],
      choices: Array.isArray(block?.choices)
        ? block.choices
            .map((choice: any, choiceIndex: number) => ({
              id:
                typeof choice?.id === "string" && choice.id.trim()
                  ? choice.id.trim()
                  : `choice-${choiceIndex + 1}`,
              text: typeof choice?.text === "string" ? choice.text.trim() : "",
              isCorrect: Boolean(choice?.isCorrect),
              feedback: typeof choice?.feedback === "string" ? choice.feedback.trim() : "",
            }))
            .filter((choice: { text: string }) => choice.text)
        : [],
      activityItems: Array.isArray(block?.activityItems)
        ? block.activityItems
            .map((item: any, itemIndex: number) => ({
              id:
                typeof item?.id === "string" && item.id.trim()
                  ? item.id.trim()
                  : `item-${itemIndex + 1}`,
              text: typeof item?.text === "string" ? item.text.trim() : "",
              targetId: typeof item?.targetId === "string" ? item.targetId.trim() : "",
              order: typeof item?.order === "number" ? item.order : itemIndex + 1,
            }))
            .filter((item: { text: string }) => item.text)
        : [],
      activityTargets: Array.isArray(block?.activityTargets)
        ? block.activityTargets
            .map((target: any, targetIndex: number) => ({
              id:
                typeof target?.id === "string" && target.id.trim()
                  ? target.id.trim()
                  : `target-${targetIndex + 1}`,
              label: typeof target?.label === "string" ? target.label.trim() : "",
              accepts: Array.isArray(target?.accepts)
                ? target.accepts.filter((item: unknown) => typeof item === "string")
                : [],
            }))
            .filter((target: { label: string }) => target.label)
        : [],
      placeholder: typeof block?.placeholder === "string" ? block.placeholder.trim() : "",
      imageUrl:
        typeof block?.imageUrl === "string"
          ? block.imageUrl.trim()
          : typeof block?.media?.url === "string" && block.media.type === "image"
            ? block.media.url.trim()
            : "",
      imageAlt: typeof block?.imageAlt === "string" ? block.imageAlt.trim() : "",
      videoUrl:
        typeof block?.videoUrl === "string"
          ? block.videoUrl.trim()
          : typeof block?.media?.url === "string" && block.media.type === "video"
            ? block.media.url.trim()
            : "",
      caption:
        typeof block?.caption === "string"
          ? block.caption.trim()
          : typeof block?.media?.caption === "string"
            ? block.media.caption.trim()
            : "",
      showWhenPreviousIncorrect: Boolean(block?.showWhenPreviousIncorrect),
      theme: "ocean" as const,
      layoutStyle:
        block?.layoutStyle === "split" ||
        block?.layoutStyle === "spotlight" ||
        block?.layoutStyle === "bullet-focus" ||
        block?.layoutStyle === "media-left" ||
        block?.layoutStyle === "stat-grid" ||
        block?.layoutStyle === "callout" ||
        block?.layoutStyle === "process"
          ? block.layoutStyle
          : ("spotlight" as const),
    }))
    .filter((block: ObjectiveBlock) => block.title || block.body);
}

function slugify(value: string, fallback = "masterypath-scorm") {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function write16(value: number) {
  return [value & 255, (value >>> 8) & 255];
}

function write32(value: number) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function createZip(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  Object.entries(files).forEach(([filename, content]) => {
    const nameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array([
      ...write32(0x04034b50),
      ...write16(20),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write32(checksum),
      ...write32(contentBytes.length),
      ...write32(contentBytes.length),
      ...write16(nameBytes.length),
      ...write16(0),
    ]);
    localParts.push(localHeader, nameBytes, contentBytes);

    const centralHeader = new Uint8Array([
      ...write32(0x02014b50),
      ...write16(20),
      ...write16(20),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write32(checksum),
      ...write32(contentBytes.length),
      ...write32(contentBytes.length),
      ...write16(nameBytes.length),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write16(0),
      ...write32(0),
      ...write32(offset),
    ]);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const centralOffset = offset;
  const endRecord = new Uint8Array([
    ...write32(0x06054b50),
    ...write16(0),
    ...write16(0),
    ...write16(Object.keys(files).length),
    ...write16(Object.keys(files).length),
    ...write32(centralDirectory.length),
    ...write32(centralOffset),
    ...write16(0),
  ]);

  return new Blob([concatBytes([...localParts, centralDirectory, endRecord])], {
    type: "application/zip",
  });
}

function buildManifest(title: string) {
  const safeTitle = xmlEscape(title || "MasteryPath SCORM Activity");
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="masterypath-scorm" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="masterypath-org">
    <organization identifier="masterypath-org">
      <title>${safeTitle}</title>
      <item identifier="masterypath-item" identifierref="masterypath-resource">
        <title>${safeTitle}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="masterypath-resource" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
    </resource>
  </resources>
</manifest>`;
}

function buildScormHtml({
  title,
  course,
  blocks,
  deckStyle,
}: {
  title: string;
  course: string;
  blocks: ObjectiveBlock[];
  deckStyle: DeckStyle;
}) {
  const data = JSON.stringify({ title, course, blocks }).replace(/</g, "\\u003c");
  const accent =
    deckStyle === "bold" ? "#C0185C" : deckStyle === "clinical" ? "#1585C0" : deckStyle === "minimal" ? "#2D2548" : "#5B45E0";
  const background =
    deckStyle === "minimal" ? "#F7F7FA" : deckStyle === "clinical" ? "#EEF7FA" : deckStyle === "bold" ? "#FFF0F5" : "#F0EDF8";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${xmlEscape(title || "MasteryPath SCORM Activity")}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:${background};color:#1a1528}.wrap{min-height:100vh;display:grid;place-items:center;padding:18px}.card{width:min(860px,100%);background:#fff;border:1px solid #e2dcf0;border-radius:10px;overflow:hidden;box-shadow:0 18px 50px rgba(91,69,224,.12)}.top{padding:16px 18px;border-bottom:1px solid #e8e2f5;display:flex;justify-content:space-between;gap:12px}.title{font-weight:700}.course{font-size:12px;color:#7068a0;margin-top:3px}.head{background:${accent};color:#fff;padding:16px 18px;display:flex;justify-content:space-between;gap:12px}.badge{font-size:11px;background:rgba(255,255,255,.2);border-radius:999px;padding:4px 10px}.body{padding:24px 22px;display:grid;gap:16px}.body h1{font-size:28px;line-height:1.12;margin:0}.summary,.body p{font-size:15px;line-height:1.65;color:#51496e;margin:0}.choices,.stack{display:grid;gap:8px}.choice,.btn{border:1px solid #e2dcf0;background:#fff;border-radius:8px;padding:12px 14px;font:inherit;cursor:pointer;text-align:left}.choice.selected{border-color:${accent};background:#edeafc}.choice.correct{border-color:#0f9b6b;background:#e6faf4}.choice.wrong{border-color:#e03a5b;background:#fee8ed}.select-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center}.select-row select,textarea{width:100%;border:1px solid #e2dcf0;border-radius:8px;padding:10px;font:inherit}textarea{min-height:120px}.feedback{padding:12px;border-radius:8px;background:#fef5e0;color:#8a5200}.final{background:#e6faf4;color:#0a7050;padding:14px;border-radius:8px}.footer{padding:14px 18px;border-top:1px solid #e8e2f5;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.btn{font-weight:700;color:${accent};text-align:center}.btn.primary{background:${accent};border-color:${accent};color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.muted{font-size:12px;color:#7068a0}.pill{display:inline-flex;padding:4px 9px;border-radius:999px;background:#f4f1fb;color:${accent};font-size:12px;font-weight:700}ul{margin:0;padding-left:20px;line-height:1.7}.callout{border-left:5px solid ${accent};background:#f8f6fd;padding:14px;border-radius:8px}.callout b{display:block;margin-bottom:4px}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.stat{background:#f4f1fb;border:1px solid #e2dcf0;border-radius:8px;padding:12px}.stat strong{display:block;font-size:22px}.media{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center}.media img{width:100%;border-radius:8px;border:1px solid #e2dcf0}.caption{font-size:12px;color:#7068a0}@media(max-width:600px){.select-row,.media,.stats{grid-template-columns:1fr}.wrap{padding:0}.card{min-height:100vh;border-radius:0}.body h1{font-size:23px}}
  </style>
</head>
<body>
<div class="wrap"><main class="card">
  <div class="top"><div><div class="title" id="appTitle"></div><div class="course" id="appCourse"></div></div><div class="pill" id="scorePill">Score 0%</div></div>
  <div id="screen"></div>
</main></div>
<script>
const DATA = ${data};
let index = 0;
let feedback = "";
let selected = "";
let responses = {};
let completed = {};
let correct = {};
let initialized = false;

function findAPI(win){let tries=0;while(win&&tries<8){if(win.API)return win.API;tries++;win=win.parent}return null}
const API = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
function scormInit(){if(API&&!initialized){API.LMSInitialize("");initialized=true}}
function scormSet(k,v){if(API){API.LMSSetValue(k,String(v));}}
function scormCommit(){if(API){API.LMSCommit("");}}
function scormFinish(score){scormInit();scormSet("cmi.core.score.raw",score);scormSet("cmi.core.score.min",0);scormSet("cmi.core.score.max",100);scormSet("cmi.core.lesson_status",score>=70?"passed":"completed");scormCommit();}

function isInteractive(block){return ["multiple-choice","true-false","checkpoint","drag-drop","matching","sequencing","sorting","scenario","reflection"].includes(block.type)}
function hasChoices(block){return Array.isArray(block.choices)&&block.choices.length}
function hasItems(block){return Array.isArray(block.activityItems)&&block.activityItems.length}
function label(type){return ({ "multiple-choice":"Multiple Choice","true-false":"True / False","checkpoint":"Checkpoint","drag-drop":"Drag / Drop","matching":"Matching","sequencing":"Sequencing","sorting":"Sorting","scenario":"Scenario","review":"Review","reflection":"Reflection","content-slide":"Content","bullet-slide":"Key Points" }[type]||"Activity")}
function shouldSkip(i){const block=DATA.blocks[i];if(!block||!block.showWhenPreviousIncorrect)return false;const previous=DATA.blocks[i-1];return Boolean(previous&&correct[previous.id])}
function reachable(i,dir){let next=i;while(next>=0&&next<DATA.blocks.length&&shouldSkip(next)){next+=dir}return next>=0&&next<DATA.blocks.length?next:null}
function score(){const graded=DATA.blocks.filter(b=>isInteractive(b)&&b.type!=="reflection").length;const got=Object.values(correct).filter(Boolean).length;return graded?Math.round((got/graded)*100):100}
function finish(){const s=score();scormFinish(s);screen.innerHTML='<div class="body"><div class="final"><strong>Complete</strong><p>Your score has been sent to the LMS.</p></div><p>Score: '+s+'%</p><button class="btn primary" onclick="retry()">Retry</button></div>'}
function retry(){index=0;feedback="";selected="";responses={};completed={};correct={};render()}
function move(dir){const next=reachable(index+dir,dir);if(next==null){finish();return}index=next;feedback="";selected="";render()}
function mark(block,isCorrect){completed[block.id]=true;if(isCorrect)correct[block.id]=true}
function submit(block){
 if(feedback){move(1);return}
 if(hasChoices(block)){const choice=(block.choices||[]).find(c=>c.id===selected);if(!choice){feedback="Choose an answer before continuing.";render();return}const ok=Boolean(choice.isCorrect);mark(block,ok);feedback=ok?(choice.feedback||"Correct. Keep going."):"Not quite. Review and continue.";render();return}
 if(block.type==="reflection"){const text=(responses[block.id]||"").trim();if(!text){feedback="Add a short response before continuing.";render();return}mark(block,true);feedback="Response saved. Keep going.";render();return}
 if(hasItems(block)){const values=responses[block.id]||{};if(!(block.activityItems||[]).every(item=>values[item.id])){feedback="Answer every item before continuing.";render();return}const ok=(block.activityItems||[]).every(item=>block.type==="sequencing"?values[item.id]===String(item.order||1):values[item.id]===item.targetId);mark(block,ok);feedback=ok?"Correct. Keep going.":"Not quite. Review and continue.";render();return}
 mark(block,true);move(1);
}
function renderActivity(block){
 if(hasChoices(block)){return '<div class="choices">'+block.choices.map(choice=>'<button class="choice '+(selected===choice.id?'selected':'')+'" onclick="selected=\\''+choice.id+'\\';render()">'+choice.text+'</button>').join('')+'</div>'}
 if(block.type==="reflection"){return '<textarea placeholder="'+(block.placeholder||"Type your response here...")+'" oninput="responses[\\''+block.id+'\\']=this.value">'+(responses[block.id]||"")+'</textarea>'}
 if(hasItems(block)){const targets=block.activityTargets||[];const values=responses[block.id]||{};return '<div class="stack">'+block.activityItems.map(item=>'<div class="select-row"><div>'+item.text+'</div><select onchange="responses[\\''+block.id+'\\']={...(responses[\\''+block.id+'\\']||{}),[\\''+item.id+'\\']:this.value};render()"><option value="">Select...</option>'+(block.type==="sequencing"?block.activityItems.map((_,i)=>'<option '+(values[item.id]===String(i+1)?'selected':'')+' value="'+(i+1)+'">'+(i+1)+'</option>').join(''):targets.map(t=>'<option '+(values[item.id]===t.id?'selected':'')+' value="'+t.id+'">'+t.label+'</option>').join(''))+'</select></div>').join('')+'</div>'}
 let html='';
 if(block.imageUrl){html+='<div class="media"><img src="'+block.imageUrl+'" alt="'+(block.imageAlt||block.title)+'"><div>'+(block.caption?'<p class="caption">'+block.caption+'</p>':'')+'</div></div>'}
 if(Array.isArray(block.bullets)&&block.bullets.length){html+='<ul>'+block.bullets.map(b=>'<li>'+b+'</li>').join('')+'</ul>'}
 if(block.callout&&block.callout.text){html+='<div class="callout"><b>'+block.callout.label+'</b><span>'+block.callout.text+'</span></div>'}
 if(Array.isArray(block.stats)&&block.stats.length){html+='<div class="stats">'+block.stats.map(s=>'<div class="stat"><strong>'+s.value+'</strong><span>'+s.label+'</span></div>').join('')+'</div>'}
 if(html)return html;
 return ''
}
function render(){
 scormInit();
 const block=DATA.blocks[index];
 appTitle.textContent=DATA.title||"MasteryPath SCORM";
 appCourse.textContent=DATA.course||"SCORM package";
 scorePill.textContent="Score "+score()+"%";
 const next=reachable(index+1,1);
 const primary=feedback?(next==null?"Finish":"Continue"):(isInteractive(block)?"Submit":"Next");
 screen.innerHTML='<div class="head"><span class="badge">'+label(block.type)+'</span><span>Step '+(index+1)+' of '+DATA.blocks.length+'</span></div><div class="body"><div><h1>'+block.title+'</h1>'+(block.summary?'<p class="summary">'+block.summary+'</p>':'')+'</div>'+(block.body?'<p>'+block.body+'</p>':'')+renderActivity(block)+(feedback?'<div class="feedback">'+feedback+'</div>':'')+'</div><div class="footer"><button class="btn" '+(reachable(index-1,-1)==null?'disabled':'')+' onclick="move(-1)">Back</button><span class="muted">'+Object.keys(completed).length+' completed</span><button class="btn primary" onclick="submit(DATA.blocks[index])">'+primary+'</button></div>';
}
render();
window.addEventListener("beforeunload",()=>{if(API&&initialized){API.LMSFinish("");}});
</script>
</body>
</html>`;
}

export default function MasteryPathBuilderPage() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [content, setContent] = useState("");
  const [slideCounts, setSlideCounts] = useState<SlideCounts>(() => defaultSlideCounts());
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>(() => defaultActivityCounts());
  const [includeContentSlides, setIncludeContentSlides] = useState(false);
  const [includeMissedExplanationSlides, setIncludeMissedExplanationSlides] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<SlideTheme>("ocean");
  const [deckStyle, setDeckStyle] = useState<DeckStyle>("trade");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [aiBlocks, setAiBlocks] = useState<ObjectiveBlock[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const interactionBlocks = useMemo(
    () =>
      buildInteractionBlocks({
        title,
        content,
        activityCounts,
        includeContentSlides,
        includeMissedExplanationSlides,
      }),
    [activityCounts, content, includeContentSlides, includeMissedExplanationSlides, title]
  );
  const contentBlocks = useMemo(
    () => buildContentBlocks({ title, content, slideCounts }),
    [content, slideCounts, title]
  );
  const finalBlocks = useMemo(
    () =>
      (aiBlocks.length ? aiBlocks : [...contentBlocks, ...interactionBlocks]).map((block) => ({
        ...block,
        theme: selectedTheme,
      })),
    [aiBlocks, contentBlocks, interactionBlocks, selectedTheme]
  );
  const requiredCorrectInteractions = Math.max(1, countGradableInteractions(finalBlocks));

  function setActivityCount(type: InteractionType, count: number) {
    setAiBlocks([]);
    setActivityCounts((previous) => ({
      ...previous,
      [type]: Math.max(0, Math.min(12, count)),
    }));
  }

  function setSlideCount(type: ObjectiveBlock["type"], count: number) {
    setAiBlocks([]);
    setSlideCounts((previous) => ({
      ...previous,
      [type]: Math.max(0, Math.min(12, count)),
    }));
  }

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setContent(await file.text());
  }

  async function generateWithAi() {
    setAiBusy(true);
    setAiError("");

    try {
      const response = await fetch("/api/masterypath/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "blocks",
          title,
          course,
          sourceMode: "paste",
          content,
          desiredBlockCount: Object.values(activityCounts).reduce((sum, count) => sum + count, 0),
          activityCounts,
          slideCounts,
          deckStyle,
          includeContentSlides,
          includeMissedExplanationSlides,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate activities.");
      }

      const nextBlocks = normalizeAiBlocks(payload.blocks);
      if (!nextBlocks.length) throw new Error("AI did not return activities.");
      setAiBlocks(nextBlocks);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to generate activities.");
    } finally {
      setAiBusy(false);
    }
  }

  async function exportScormPackage() {
    setExporting(true);
    setExportMessage("");
    setExportError("");
    try {
      const packageTitle = title.trim() || "MasteryPath SCORM Activity";
      const zip = createZip({
        "imsmanifest.xml": buildManifest(packageTitle),
        "index.html": buildScormHtml({
          title: packageTitle,
          course: course.trim() || "Course",
          blocks: finalBlocks,
          deckStyle,
        }),
      });
      const url = URL.createObjectURL(zip);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(packageTitle)}-scorm.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage("SCORM package exported. Upload the ZIP to Canvas as a SCORM assignment.");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export SCORM package.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #F0EDF8;
          color: #1A1528;
        }
        .page { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
        .topbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #E8E2F5;
        }
        h1, h2, p { margin: 0; }
        .brand { display: grid; gap: 6px; }
        .brand h1 { font-size: 22px; font-weight: 700; }
        .brand p { color: #7068A0; font-size: 13px; line-height: 1.5; }
        .toolbar, .footer, .chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #3D29B8;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: inherit;
        }
        .btn.primary { background: #5B45E0; border-color: #5B45E0; color: #fff; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }
        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px;
          display: grid;
          gap: 16px;
        }
        .steps, .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .step, .card {
          border: 1px solid #E2DCF0;
          background: #fff;
          border-radius: 8px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
        }
        .step.active, .card.selected { border-color: #5B45E0; background: #EDEAFC; }
        .step strong, .card strong { display: block; color: #1A1528; font-size: 14px; margin-bottom: 5px; }
        .step span, .card p { color: #7068A0; font-size: 12px; line-height: 1.55; }
        .activity-count-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          cursor: default;
        }
        .counter {
          display: grid;
          grid-template-columns: 32px 42px 32px;
          gap: 6px;
          align-items: center;
        }
        .counter button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          background: #fff;
          color: #3D29B8;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }
        .counter input {
          height: 32px;
          padding: 0;
          text-align: center;
          font-weight: 700;
        }
        .toggle-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .toggle-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          cursor: pointer;
        }
        .toggle-switch {
          width: 46px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid #D5CDEC;
          background: #F4F1FB;
          padding: 3px;
          transition: background .15s, border-color .15s;
        }
        .toggle-switch span {
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 4px rgba(26,21,40,.18);
          transition: transform .15s;
        }
        .toggle-card.selected .toggle-switch { background: #5B45E0; border-color: #5B45E0; }
        .toggle-card.selected .toggle-switch span { transform: translateX(20px); }
        .panel { border: 1px solid #E8E2F5; border-radius: 8px; background: #fff; overflow: hidden; }
        .panel-head { padding: 18px; border-bottom: 1px solid #E8E2F5; display: grid; gap: 8px; }
        .panel-head h2 { font-size: 22px; }
        .panel-head p { color: #7068A0; font-size: 13px; line-height: 1.55; }
        .panel-body { padding: 18px; display: grid; gap: 16px; }
        .field { display: grid; gap: 8px; }
        .field label { color: #4D456C; font-size: 12px; font-weight: 700; }
        input, textarea {
          width: 100%;
          border: 1px solid #E2DCF0;
          border-radius: 8px;
          padding: 11px 12px;
          font: inherit;
          color: #1A1528;
          background: #fff;
        }
        textarea { min-height: 260px; resize: vertical; }
        .theme-swatch {
          width: 32px;
          height: 6px;
          border-radius: 999px;
          margin-bottom: 8px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          color: #4D456C;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .chip {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          background: #F4F1FB;
          color: #5B45E0;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid #E2DCF0;
        }
        .footer {
          padding: 16px 18px;
          border-top: 1px solid #E8E2F5;
          background: #fff;
          justify-content: space-between;
        }
        .save-ok, .save-error {
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
        }
        .save-ok { background: #E6FAF4; color: #0A7050; }
        .save-error { background: #FEE8ED; color: #B01F3D; }
        @media (max-width: 760px) {
          .topbar { align-items: flex-start; flex-direction: column; }
          .shell { padding: 12px; }
          .steps, .grid, .toggle-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <h1>SCORM Package Builder</h1>
            <p>Use AI to build an interactive SCORM package that Canvas can score automatically.</p>
          </div>
          <div className="toolbar">
            <Link className="btn" href="/">Dashboard</Link>
          </div>
        </header>

        <main className="shell">
          <div className="steps">
            {[
              ["1", "Content", "Title and source material"],
              ["2", "Activities", "Set activity counts"],
              ["3", "Export", "Download SCORM ZIP"],
            ].map(([id, label, description]) => (
              <button
                className={`step ${step === Number(id) ? "active" : ""}`}
                key={id}
                onClick={() => setStep(Number(id) as Step)}
                type="button"
              >
                <strong>{id}. {label}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>
                {step === 1
                  ? "Add Assignment Content"
                  : step === 2
                    ? "Activity Counts"
                    : "Export SCORM Package"}
              </h2>
              <p>
                {step === 1
                  ? "The teacher writes the title and provides the material."
                  : step === 2
                    ? "Set how many of each activity type this assignment should include."
                    : "Review the activity mix, then download the SCORM ZIP for Canvas."}
              </p>
            </div>

            <div className="panel-body">
              {step === 1 ? (
                <>
                  <div className="grid">
                    <div className="field">
                      <label>Assignment title</label>
                      <input
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Example: Residential Wiring Review"
                        value={title}
                      />
                    </div>
                    <div className="field">
                      <label>Course</label>
                      <input
                        onChange={(event) => setCourse(event.target.value)}
                        placeholder="Example: Electrical Technology"
                        value={course}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Upload content</label>
                    <input
                      accept=".txt,.md,.csv"
                      onChange={(event) => handleFileUpload(event.target.files?.[0])}
                      type="file"
                    />
                  </div>

                  <div className="field">
                    <label>Paste or edit content</label>
                    <textarea
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Paste the source content students should be checked on."
                      value={content}
                    />
                  </div>

                  <div className="field">
                    <label>Deck theme</label>
                    <div className="grid">
                      {themes.map((theme) => (
                        <button
                          className={`card ${selectedTheme === theme.id ? "selected" : ""}`}
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme.id)}
                          type="button"
                        >
                          <span className="theme-swatch" style={{ background: theme.color }} />
                          <strong>{theme.label}</strong>
                          <p>{theme.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label>Slide style</label>
                    <div className="grid">
                      {deckStyles.map((style) => (
                        <button
                          className={`card ${deckStyle === style.id ? "selected" : ""}`}
                          key={style.id}
                          onClick={() => setDeckStyle(style.id)}
                          type="button"
                        >
                          <strong>{style.title}</strong>
                          <p>{style.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="card">
                    <strong>AI activity builder</strong>
                    <p>
                      Let AI build a polished slide deck with teaching slides, visual moments,
                      checks, matching, sequencing, scenario, reflection, and review slides.
                    </p>
                    <button
                      className="btn primary"
                      disabled={aiBusy || !title.trim() || !content.trim()}
                      onClick={generateWithAi}
                      type="button"
                    >
                      {aiBusy ? "Building activities..." : "Build activities with AI"}
                    </button>
                    {aiBlocks.length ? (
                      <p>Using {aiBlocks.length} AI-built activities. Manual cards remain available as a fallback.</p>
                    ) : null}
                    {aiError ? <div className="save-error">{aiError}</div> : null}
                  </div>

                  <div className="section-label">Content slides</div>
                  <div className="grid">
                    {contentSlideTypes.map((slide) => (
                      <div
                        className={`card activity-count-card ${slideCounts[slide.type] ? "selected" : ""}`}
                        key={slide.type}
                      >
                        <div>
                          <strong>{slide.title}</strong>
                          <p>{slide.description}</p>
                        </div>
                        <div className="counter" aria-label={`${slide.title} count`}>
                          <button
                            onClick={() => setSlideCount(slide.type, (slideCounts[slide.type] || 0) - 1)}
                            type="button"
                          >
                            -
                          </button>
                          <input
                            aria-label={`${slide.title} count`}
                            min={0}
                            max={12}
                            onChange={(event) => setSlideCount(slide.type, Number(event.target.value) || 0)}
                            type="number"
                            value={slideCounts[slide.type] || 0}
                          />
                          <button
                            onClick={() => setSlideCount(slide.type, (slideCounts[slide.type] || 0) + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="toggle-row">
                    <button
                      className={`card toggle-card ${includeContentSlides ? "selected" : ""}`}
                      onClick={() => {
                        setAiBlocks([]);
                        setIncludeContentSlides((previous) => !previous);
                      }}
                      type="button"
                    >
                      <div>
                        <strong>Content slide before each activity</strong>
                        <p>Add a quick teaching slide before every generated question or activity.</p>
                      </div>
                      <span className="toggle-switch" aria-hidden="true"><span /></span>
                    </button>
                    <button
                      className={`card toggle-card ${includeMissedExplanationSlides ? "selected" : ""}`}
                      onClick={() => {
                        setAiBlocks([]);
                        setIncludeMissedExplanationSlides((previous) => !previous);
                      }}
                      type="button"
                    >
                      <div>
                        <strong>Explanation slide after a missed activity</strong>
                        <p>Show a short explanation only when the student misses the previous activity.</p>
                      </div>
                      <span className="toggle-switch" aria-hidden="true"><span /></span>
                    </button>
                  </div>

                  <div className="section-label">Activity slides</div>
                  <div className="grid">
                    {interactionTypes.map((interaction) => (
                      <div
                        className={`card activity-count-card ${activityCounts[interaction.type] ? "selected" : ""}`}
                        key={interaction.type}
                      >
                        <div>
                          <strong>{interaction.title}</strong>
                          <p>{interaction.description}</p>
                        </div>
                        <div className="counter" aria-label={`${interaction.title} count`}>
                          <button
                            onClick={() => setActivityCount(interaction.type, (activityCounts[interaction.type] || 0) - 1)}
                            type="button"
                          >
                            -
                          </button>
                          <input
                            aria-label={`${interaction.title} count`}
                            min={0}
                            max={12}
                            onChange={(event) =>
                              setActivityCount(interaction.type, Number(event.target.value) || 0)
                            }
                            type="number"
                            value={activityCounts[interaction.type] || 0}
                          />
                          <button
                            onClick={() => setActivityCount(interaction.type, (activityCounts[interaction.type] || 0) + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <strong>Generated activity preview</strong>
                    <p>
                      {finalBlocks.length} student-facing blocks will be created from{" "}
                      {contentTopics(content, title).length} content topics.
                    </p>
                    <div className="chips">
                      {finalBlocks.slice(0, 16).map((block) => (
                        <span className="chip" key={block.id}>{block.type}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="card">
                    <strong>Export summary</strong>
                    <p>
                      {title || "Untitled assignment"} will export with {finalBlocks.length}{" "}
                      student-facing slides, the {selectedTheme} theme, the {deckStyle} style, and {requiredCorrectInteractions} scored interactions.
                    </p>
                    <div className="chips">
                      {contentSlideTypes
                        .filter((slide) => slideCounts[slide.type] > 0)
                        .map((slide) => (
                          <span className="chip" key={slide.type}>
                            {slideCounts[slide.type]} {slide.title}
                          </span>
                        ))}
                      {interactionTypes
                        .filter((interaction) => activityCounts[interaction.type] > 0)
                        .map((interaction) => (
                          <span className="chip" key={interaction.type}>
                            {activityCounts[interaction.type]} {interaction.title}
                          </span>
                        ))}
                    </div>
                  </div>

                  <button
                    className="btn primary"
                    disabled={exporting || !title.trim() || !content.trim() || !finalBlocks.length}
                    onClick={exportScormPackage}
                    type="button"
                  >
                    {exporting ? "Exporting..." : "Export SCORM ZIP"}
                  </button>

                  {exportMessage ? <div className="save-ok">{exportMessage}</div> : null}

                  {exportError ? <div className="save-error">{exportError}</div> : null}
                </>
              ) : null}
            </div>

            <div className="footer">
              <button
                className="btn"
                disabled={step === 1}
                onClick={() => setStep((previous) => Math.max(1, previous - 1) as Step)}
                type="button"
              >
                Back
              </button>
              <button
                className="btn primary"
                disabled={step === 3}
                onClick={() => setStep((previous) => Math.min(3, previous + 1) as Step)}
                type="button"
              >
                Continue
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
