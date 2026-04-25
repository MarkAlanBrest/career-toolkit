"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ObjectiveBlock, type SlideTheme } from "../data";

type Step = 1 | 2 | 3;
type InteractionType = ObjectiveBlock["type"];
type ActivityCounts = Partial<Record<InteractionType, number>>;
type SlideCounts = Partial<Record<ObjectiveBlock["type"], number>>;
type DeckStyle = "trade" | "clinical" | "bold" | "minimal";
type TileHelp = {
  purpose: string;
  fields: string[];
  scoring: string;
  example: string;
};

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

const tileTypes: Array<{
  type: ObjectiveBlock["type"];
  title: string;
  description: string;
}> = [
  ...contentSlideTypes,
  { type: "video-slide", title: "Video", description: "Embed a video with a link and caption." },
  ...interactionTypes,
];

const tileHelp: Partial<Record<ObjectiveBlock["type"], TileHelp>> = {
  "content-slide": {
    purpose: "Teach one concept before students practice it.",
    fields: ["Title: the concept name", "Body: the explanation", "Callout: the key rule or takeaway", "Layout: choose how the slide is presented"],
    scoring: "Not scored.",
    example: "Use this for a safety rule, tool introduction, vocabulary concept, or process overview.",
  },
  "bullet-slide": {
    purpose: "Summarize key points in a fast, readable slide.",
    fields: ["Body: short setup text", "Bullets: one point per line", "Layout: bullet-focus usually works best"],
    scoring: "Not scored.",
    example: "Use this for tool lists, PPE reminders, steps to remember, or before/after a video.",
  },
  review: {
    purpose: "Reinforce or explain a concept, often after a missed activity.",
    fields: ["Body: the explanation", "Bullets: the reminders", "Conditional checkbox: show only when the previous activity is missed"],
    scoring: "Not scored.",
    example: "Use this as a correction slide after a question or as a final summary.",
  },
  "image-slide": {
    purpose: "Show a visual example inside the SCORM deck.",
    fields: ["Image link: direct image URL", "Caption: what students should notice", "Body: short context"],
    scoring: "Not scored.",
    example: "Use this for tool photos, diagrams, labeled examples, or job-site visuals.",
  },
  "video-slide": {
    purpose: "Embed a video inside the SCORM deck.",
    fields: ["Video link: YouTube, youtu.be, Vimeo, or embed URL", "Caption: what students should watch for", "Body: short context"],
    scoring: "Not scored.",
    example: "Paste a YouTube watch link. The exporter converts it to an embed link automatically.",
  },
  "multiple-choice": {
    purpose: "Ask a scored question with several answer choices.",
    fields: ["Prompt: the question", "Choices: text | correct | feedback", "Mark exactly one choice as correct"],
    scoring: "Scored. One correct/incorrect result is counted for this slide.",
    example: "Safety glasses|correct|Correct, eye protection is required.",
  },
  "true-false": {
    purpose: "Ask a scored true/false check.",
    fields: ["Prompt: the statement", "Choices: keep True and False, mark one as correct"],
    scoring: "Scored. One correct/incorrect result is counted for this slide.",
    example: "True|correct|Correct. Inspect tools before use.",
  },
  checkpoint: {
    purpose: "Ask a scored mastery check near the end of a deck.",
    fields: ["Prompt: the checkpoint question", "Choices: text | correct | feedback"],
    scoring: "Scored. One correct/incorrect result is counted for this slide.",
    example: "Use this for the final knowledge check before completion.",
  },
  scenario: {
    purpose: "Ask students to choose the best action in a realistic situation.",
    fields: ["Prompt: the situation", "Choices: possible actions with feedback"],
    scoring: "Scored. One correct/incorrect result is counted for this slide.",
    example: "A coworker skips PPE. What should you do next?",
  },
  matching: {
    purpose: "Have students match items to the correct targets.",
    fields: ["Targets: id | label", "Items: item text | target id"],
    scoring: "Scored. All items must be matched correctly.",
    example: "Utility knife | shingles-target",
  },
  "drag-drop": {
    purpose: "Have students place items into the correct categories.",
    fields: ["Targets: id | label", "Items: item text | target id"],
    scoring: "Scored. All placements must be correct.",
    example: "Safety harness | fall-protection",
  },
  sorting: {
    purpose: "Have students sort examples into categories.",
    fields: ["Targets: category id | category label", "Items: item text | category id"],
    scoring: "Scored. All items must be sorted correctly.",
    example: "Tin snips | cutting-tools",
  },
  sequencing: {
    purpose: "Have students put steps in the correct order.",
    fields: ["Steps: one step per line, in the correct order"],
    scoring: "Scored. Every step must be in the correct order.",
    example: "Inspect PPE, check tools, stage materials, begin work.",
  },
  reflection: {
    purpose: "Ask students to explain an idea in their own words.",
    fields: ["Prompt: the reflection question", "Placeholder: hint text in the response box"],
    scoring: "Not auto-scored. It is marked complete when the student writes a response.",
    example: "Describe how you would choose tools for this job.",
  },
};

function getTileHelp(type: ObjectiveBlock["type"]) {
  return tileHelp[type] || {
    purpose: "Use this slide to support the SCORM deck.",
    fields: ["Title", "Body", "Layout"],
    scoring: "Scoring depends on the tile type.",
    example: "Edit the tile fields to match your lesson.",
  };
}

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

function createTileBlock(type: ObjectiveBlock["type"], index: number, content: string, title: string): ObjectiveBlock {
  const topic = contentTopics(content, title)[0] || title || "the source content";
  const topicLabel = shortTopic(topic);
  const base = {
    id: `${type}-${Date.now()}-${index}`,
    type,
    title: `${tileTypes.find((tile) => tile.type === type)?.title || "Slide"} ${index}`,
    summary: "",
    body: topic,
    theme: "ocean" as const,
    layoutStyle: "spotlight" as const,
  };

  if (type === "content-slide") {
    return {
      ...base,
      title: `Learn: ${topicLabel}`,
      summary: "Introduce the key idea.",
      callout: { label: "Key idea", text: "Add the rule, safety note, or takeaway here." },
      layoutStyle: "split",
    };
  }

  if (type === "bullet-slide") {
    return {
      ...base,
      title: `Key Points: ${topicLabel}`,
      summary: "Review the important details.",
      bullets: ["First key point", "Second key point", "Third key point"],
      layoutStyle: "bullet-focus",
    };
  }

  if (type === "review") {
    return {
      ...base,
      title: `Review: ${topicLabel}`,
      summary: "Reinforce the takeaway.",
      bullets: ["Review the source content.", "Apply it to the next activity."],
      layoutStyle: "callout",
    };
  }

  if (type === "image-slide") {
    return {
      ...base,
      title: "Visual Slide",
      summary: "Use an image to support the concept.",
      imageUrl: imageUrlsFromContent(content)[0] || "",
      caption: "",
      layoutStyle: "media-left",
    };
  }

  if (type === "video-slide") {
    return {
      ...base,
      title: "Video Slide",
      summary: "Use a video to support the concept.",
      videoUrl: "",
      caption: "",
      layoutStyle: "media-left",
    };
  }

  if (type === "multiple-choice" || type === "true-false" || type === "checkpoint" || type === "scenario") {
    return {
      ...base,
      title: type === "true-false" ? "True / False Check" : "Question Slide",
      summary: "Students select the best answer.",
      body: type === "true-false" ? `True or false: ${topicLabel}` : `Which answer best matches this content: ${topicLabel}`,
      choices:
        type === "true-false"
          ? [
              { id: "true", text: "True", isCorrect: true, feedback: "Correct." },
              { id: "false", text: "False", feedback: "Review the content and try again." },
            ]
          : [
              { id: "correct", text: "Correct answer", isCorrect: true, feedback: "Correct." },
              { id: "review", text: "Plausible distractor", feedback: "Review the content and try again." },
              { id: "not-yet", text: "Another distractor", feedback: "Review the content and try again." },
            ],
    };
  }

  if (type === "drag-drop" || type === "matching" || type === "sorting") {
    return {
      ...base,
      title: type === "matching" ? "Matching Activity" : type === "sorting" ? "Sorting Activity" : "Drag and Drop Activity",
      summary: "Students place each item in the correct target.",
      activityItems: [
        { id: "item-1", text: "Item one", targetId: "target-1" },
        { id: "item-2", text: "Item two", targetId: "target-2" },
      ],
      activityTargets: [
        { id: "target-1", label: "Target one", accepts: ["item-1"] },
        { id: "target-2", label: "Target two", accepts: ["item-2"] },
      ],
    };
  }

  if (type === "sequencing") {
    return {
      ...base,
      title: "Sequencing Activity",
      summary: "Students put steps in the correct order.",
      activityItems: [
        { id: "step-1", text: "First step", order: 1 },
        { id: "step-2", text: "Second step", order: 2 },
        { id: "step-3", text: "Third step", order: 3 },
      ],
    };
  }

  return {
    ...base,
    title: "Reflection Prompt",
    summary: "Students explain the concept in their own words.",
    body: `Explain this idea in your own words: ${topicLabel}`,
    placeholder: "Type your response here...",
    layoutStyle: "split",
  };
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
    isInteractiveBlockType(block.type) && block.type !== "reflection"
  ).length;
}

function isInteractiveBlockType(type: ObjectiveBlock["type"]) {
  return (
    type === "multiple-choice" ||
    type === "true-false" ||
    type === "checkpoint" ||
    type === "drag-drop" ||
    type === "matching" ||
    type === "sequencing" ||
    type === "sorting" ||
    type === "scenario" ||
    type === "reflection"
  );
}

function hasChoices(block: ObjectiveBlock) {
  return Boolean(block.choices?.length);
}

function hasActivityItems(block: ObjectiveBlock) {
  return Boolean(block.activityItems?.length);
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

function normalizeVideoUrl(value?: string) {
  const url = (value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsed.pathname.startsWith("/shorts/")) {
        const videoIdFromShort = parsed.pathname.split("/").filter(Boolean)[1];
        if (videoIdFromShort) return `https://www.youtube.com/embed/${videoIdFromShort}`;
      }
      if (parsed.pathname.startsWith("/embed/")) return url;
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (host === "vimeo.com") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }

    return url;
  } catch {
    return url;
  }
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

function buildManifest(title: string, identifier: string) {
  const safeTitle = xmlEscape(title || "MasteryPath SCORM Activity");
  const safeIdentifier = xmlEscape(identifier || "masterypath-scorm");
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${safeIdentifier}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${safeIdentifier}-org">
    <organization identifier="${safeIdentifier}-org">
      <title>${safeTitle}</title>
      <item identifier="${safeIdentifier}-item" identifierref="${safeIdentifier}-resource">
        <title>${safeTitle}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${safeIdentifier}-resource" type="webcontent" adlcp:scormtype="sco" href="index.html">
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
    *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:${background};color:#1a1528}.wrap{min-height:100vh;display:grid;place-items:center;padding:18px}.card{width:min(980px,100%);background:#fff;border:1px solid #e2dcf0;border-radius:10px;overflow:hidden;box-shadow:0 18px 50px rgba(91,69,224,.12)}.top{padding:16px 18px;border-bottom:1px solid #e8e2f5;display:flex;justify-content:space-between;gap:12px}.title{font-weight:700}.course{font-size:12px;color:#7068a0;margin-top:3px}.head{background:${accent};color:#fff;padding:16px 18px;display:flex;justify-content:space-between;gap:12px}.badge{font-size:11px;background:rgba(255,255,255,.2);border-radius:999px;padding:4px 10px}.layout{display:grid;grid-template-columns:170px minmax(0,1fr)}.nav{border-right:1px solid #e8e2f5;background:#faf9fd;padding:12px;display:grid;align-content:start;gap:6px}.nav button{border:1px solid #e2dcf0;background:#fff;border-radius:8px;padding:8px;text-align:left;font-size:12px;color:#51496e;cursor:pointer}.nav button.active{border-color:${accent};background:#edeafc;color:#1a1528;font-weight:700}.body{padding:24px 22px;display:grid;gap:16px}.body h1{font-size:28px;line-height:1.12;margin:0}.summary,.body p{font-size:15px;line-height:1.65;color:#51496e;margin:0}.choices,.stack{display:grid;gap:8px}.choice,.btn{border:1px solid #e2dcf0;background:#fff;border-radius:8px;padding:12px 14px;font:inherit;cursor:pointer;text-align:left}.choice.selected{border-color:${accent};background:#edeafc}.choice.correct{border-color:#0f9b6b;background:#e6faf4}.choice.wrong{border-color:#e03a5b;background:#fee8ed}.select-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center}.select-row select,textarea{width:100%;border:1px solid #e2dcf0;border-radius:8px;padding:10px;font:inherit}textarea{min-height:120px}.feedback{padding:12px;border-radius:8px;background:#fef5e0;color:#8a5200}.final{background:#e6faf4;color:#0a7050;padding:14px;border-radius:8px}.footer{padding:14px 18px;border-top:1px solid #e8e2f5;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.btn{font-weight:700;color:${accent};text-align:center}.btn.primary{background:${accent};border-color:${accent};color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.muted{font-size:12px;color:#7068a0}.pill{display:inline-flex;padding:4px 9px;border-radius:999px;background:#f4f1fb;color:${accent};font-size:12px;font-weight:700}ul{margin:0;padding-left:20px;line-height:1.7}.callout{border-left:5px solid ${accent};background:#f8f6fd;padding:14px;border-radius:8px}.callout b{display:block;margin-bottom:4px}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.stat{background:#f4f1fb;border:1px solid #e2dcf0;border-radius:8px;padding:12px}.stat strong{display:block;font-size:22px}.media{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center}.media img{width:100%;border-radius:8px;border:1px solid #e2dcf0}.caption{font-size:12px;color:#7068a0}@media(max-width:700px){.layout{grid-template-columns:1fr}.nav{grid-template-columns:repeat(4,minmax(0,1fr));border-right:0;border-bottom:1px solid #e8e2f5}.nav button{font-size:11px}.select-row,.media,.stats{grid-template-columns:1fr}.wrap{padding:0}.card{min-height:100vh;border-radius:0}.body h1{font-size:23px}}
  </style>
</head>
<body>
<div class="wrap"><main class="card">
  <div class="top"><div><div class="title" id="appTitle"></div><div class="course" id="appCourse"></div></div><div class="pill" id="scorePill">Score 0%</div></div>
  <div id="screen"></div>
</main></div>
<script>
const DATA = ${data};
DATA.blocks = Array.isArray(DATA.blocks) && DATA.blocks.length ? DATA.blocks : [{id:"empty",type:"content-slide",title:"No slides found",summary:"This SCORM package did not include slide data.",body:"Export the package again from the builder."}];
const screenEl = document.getElementById("screen");
const appTitleEl = document.getElementById("appTitle");
const appCourseEl = document.getElementById("appCourse");
const scorePillEl = document.getElementById("scorePill");
let index = 0;
let feedback = "";
let selected = "";
let responses = {};
let completed = {};
let correct = {};
let graded = {};
let initialized = false;
let started = false;

function findAPI(win){let tries=0;while(win&&tries<8){if(win.API)return win.API;tries++;win=win.parent}return null}
const API = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
function scormInit(){if(API&&!initialized){API.LMSInitialize("");initialized=true}}
function scormGet(k){if(API){return API.LMSGetValue(k)||""}return ""}
function scormSet(k,v){if(API){API.LMSSetValue(k,String(v));}}
function scormCommit(){if(API){API.LMSCommit("");}}
function scormFinish(score){scormInit();scormSet("cmi.core.score.raw",score);scormSet("cmi.core.score.min",0);scormSet("cmi.core.score.max",100);scormSet("cmi.core.lesson_status",score>=70?"passed":"completed");scormCommit();}

function isInteractive(block){return ["multiple-choice","true-false","checkpoint","drag-drop","matching","sequencing","sorting","scenario","reflection"].includes(block.type)}
function hasChoices(block){return Array.isArray(block.choices)&&block.choices.length}
function hasItems(block){return Array.isArray(block.activityItems)&&block.activityItems.length}
function label(type){return ({ "multiple-choice":"Multiple Choice","true-false":"True / False","checkpoint":"Checkpoint","drag-drop":"Drag / Drop","matching":"Matching","sequencing":"Sequencing","sorting":"Sorting","scenario":"Scenario","review":"Review","reflection":"Reflection","content-slide":"Content","bullet-slide":"Key Points" }[type]||"Activity")}
function shouldSkip(i){const block=DATA.blocks[i];if(!block||!block.showWhenPreviousIncorrect)return false;const previous=DATA.blocks[i-1];return Boolean(previous&&correct[previous.id])}
function reachable(i,dir){let next=i;while(next>=0&&next<DATA.blocks.length&&shouldSkip(next)){next+=dir}return next>=0&&next<DATA.blocks.length?next:null}
function isGraded(block){return isInteractive(block)&&block.type!=="reflection"}
function score(){const total=DATA.blocks.filter(isGraded).length;const got=DATA.blocks.filter(block=>isGraded(block)&&correct[block.id]).length;return total?Math.min(100,Math.max(0,Math.round((got/total)*100))):100}
function startDeck(){started=true;index=0;feedback="";selected="";render()}
function finish(){const s=score();scormFinish(s);screenEl.innerHTML='<div class="head"><span class="badge">Complete</span><span>'+DATA.blocks.length+' slides</span></div><div class="layout">'+renderNav()+'<section><div class="body"><div class="final"><strong>Complete</strong><p>Your score has been sent to the LMS.</p></div><p>Score: '+s+'%</p><button class="btn" data-action="review">Review slides</button> <button class="btn primary" data-action="retry">Retry</button></div></section></div>'}
function retry(){started=true;index=0;feedback="";selected="";responses={};completed={};correct={};graded={};render()}
function go(i){index=i;feedback="";selected="";render()}
function move(dir){const next=reachable(index+dir,dir);if(next==null){finish();return}index=next;feedback="";selected="";render()}
function mark(block,isCorrect){completed[block.id]=true;if(isGraded(block)){graded[block.id]=true;correct[block.id]=Boolean(isCorrect)}else if(isCorrect){correct[block.id]=true}}
function submit(block){
 if(feedback){move(1);return}
 if(hasChoices(block)){const choice=(block.choices||[]).find(c=>c.id===selected);if(!choice){feedback="Choose an answer before continuing.";render();return}const ok=Boolean(choice.isCorrect);mark(block,ok);feedback=ok?(choice.feedback||"Correct. Keep going."):"Not quite. Review and continue.";render();return}
 if(block.type==="reflection"){const text=(responses[block.id]||"").trim();if(!text){feedback="Add a short response before continuing.";render();return}mark(block,true);feedback="Response saved. Keep going.";render();return}
 if(hasItems(block)){const values=responses[block.id]||{};if(!(block.activityItems||[]).every(item=>values[item.id])){feedback="Answer every item before continuing.";render();return}const ok=(block.activityItems||[]).every(item=>block.type==="sequencing"?values[item.id]===String(item.order||1):values[item.id]===item.targetId);mark(block,ok);feedback=ok?"Correct. Keep going.":"Not quite. Review and continue.";render();return}
 mark(block,true);move(1);
}
function renderActivity(block){
 if(hasChoices(block)){return '<div class="choices">'+block.choices.map(choice=>'<button class="choice '+(selected===choice.id?'selected':'')+'" data-choice="'+choice.id+'">'+choice.text+'</button>').join('')+'</div>'}
 if(block.type==="reflection"){return '<textarea placeholder="'+(block.placeholder||"Type your response here...")+'" data-reflection="'+block.id+'">'+(responses[block.id]||"")+'</textarea>'}
 if(hasItems(block)){const targets=block.activityTargets||[];const values=responses[block.id]||{};return '<div class="stack">'+block.activityItems.map(item=>'<div class="select-row"><div>'+item.text+'</div><select data-block="'+block.id+'" data-item="'+item.id+'"><option value="">Select...</option>'+(block.type==="sequencing"?block.activityItems.map((_,i)=>'<option '+(values[item.id]===String(i+1)?'selected':'')+' value="'+(i+1)+'">'+(i+1)+'</option>').join(''):targets.map(t=>'<option '+(values[item.id]===t.id?'selected':'')+' value="'+t.id+'">'+t.label+'</option>').join(''))+'</select></div>').join('')+'</div>'}
 let html='';
 if(block.imageUrl){html+='<div class="media"><img src="'+block.imageUrl+'" alt="'+(block.imageAlt||block.title)+'"><div>'+(block.caption?'<p class="caption">'+block.caption+'</p>':'')+'</div></div>'}
 if(block.videoUrl){html+='<div class="media"><iframe src="'+block.videoUrl+'" title="'+block.title+'" style="width:100%;min-height:260px;border:0;border-radius:8px" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><div>'+(block.caption?'<p class="caption">'+block.caption+'</p>':'')+'</div></div>'}
 if(Array.isArray(block.bullets)&&block.bullets.length){html+='<ul>'+block.bullets.map(b=>'<li>'+b+'</li>').join('')+'</ul>'}
 if(block.callout&&block.callout.text){html+='<div class="callout"><b>'+block.callout.label+'</b><span>'+block.callout.text+'</span></div>'}
 if(Array.isArray(block.stats)&&block.stats.length){html+='<div class="stats">'+block.stats.map(s=>'<div class="stat"><strong>'+s.value+'</strong><span>'+s.label+'</span></div>').join('')+'</div>'}
 if(html)return html;
 return ''
}
function renderNav(){return '<nav class="nav" aria-label="Slides">'+DATA.blocks.map((block,i)=>'<button class="'+(i===index?'active':'')+'" data-go="'+i+'">'+(i+1)+'. '+label(block.type)+'</button>').join('')+'</nav>'}
function render(){
 scormInit();
 if(!started){
  appTitleEl.textContent=DATA.title||"MasteryPath SCORM";
  appCourseEl.textContent=DATA.course||"SCORM package";
  scorePillEl.textContent=DATA.blocks.length+" slides";
  screenEl.innerHTML='<div class="head"><span class="badge">SCORM Deck</span><span>'+DATA.blocks.length+' slides</span></div><div class="body"><div><h1>'+DATA.title+'</h1><p class="summary">'+(DATA.course||"Interactive SCORM activity")+'</p></div><div class="callout"><b>Ready to begin</b><span>This activity contains '+DATA.blocks.length+' slides. Use Next to move through the deck. Canvas will receive the final score when you finish.</span></div><button class="btn primary" data-action="start">Start Deck</button></div>';
  return;
 }
 const block=DATA.blocks[index];
 scormSet("cmi.core.lesson_location",String(index+1));
 scormSet("cmi.suspend_data",JSON.stringify({index,completed,correct,graded}));
 scormCommit();
 appTitleEl.textContent=DATA.title||"MasteryPath SCORM";
 appCourseEl.textContent=DATA.course||"SCORM package";
 scorePillEl.textContent="Score "+score()+"%";
 const next=reachable(index+1,1);
 const primary=feedback?(next==null?"Finish":"Continue"):(isInteractive(block)?"Submit":"Next");
 screenEl.innerHTML='<div class="head"><span class="badge">'+label(block.type)+'</span><span>Slide '+(index+1)+' of '+DATA.blocks.length+'</span></div><div class="layout">'+renderNav()+'<section><div class="body"><div><h1>'+block.title+'</h1>'+(block.summary?'<p class="summary">'+block.summary+'</p>':'')+'</div>'+(block.body?'<p>'+block.body+'</p>':'')+renderActivity(block)+(feedback?'<div class="feedback">'+feedback+'</div>':'')+'</div><div class="footer"><button class="btn" '+(reachable(index-1,-1)==null?'disabled':'')+' data-action="back">Back</button><span class="muted">'+Object.keys(completed).length+' completed</span><button class="btn primary" data-action="primary">'+primary+'</button></div></section></div>';
}
screenEl.addEventListener("click",function(event){const button=event.target.closest("button");if(!button)return;if(button.dataset.go!==undefined){go(Number(button.dataset.go));return}if(button.dataset.choice){selected=button.dataset.choice;render();return}if(button.dataset.action==="start"){startDeck();return}if(button.dataset.action==="review"){go(0);return}if(button.dataset.action==="retry"){retry();return}if(button.dataset.action==="back"){move(-1);return}if(button.dataset.action==="primary"){submit(DATA.blocks[index]);return}});
screenEl.addEventListener("input",function(event){const target=event.target;if(target.dataset&&target.dataset.reflection){responses[target.dataset.reflection]=target.value;}});
screenEl.addEventListener("change",function(event){const target=event.target;if(target.dataset&&target.dataset.block&&target.dataset.item){const blockId=target.dataset.block;responses[blockId]=responses[blockId]||{};responses[blockId][target.dataset.item]=target.value;render();}});
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
  const [selectedTheme, setSelectedTheme] = useState<SlideTheme>("ocean");
  const [deckStyle, setDeckStyle] = useState<DeckStyle>("trade");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [deckBlocks, setDeckBlocks] = useState<ObjectiveBlock[]>(() => [
    createTileBlock("content-slide", 1, "", ""),
    createTileBlock("multiple-choice", 2, "", ""),
  ]);
  const [draggedTileId, setDraggedTileId] = useState("");
  const [helpTileType, setHelpTileType] = useState<ObjectiveBlock["type"] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const finalBlocks = useMemo(
    () =>
      deckBlocks.map((block) => ({
        ...block,
        theme: selectedTheme,
      })),
    [deckBlocks, selectedTheme]
  );
  const requiredCorrectInteractions = Math.max(1, countGradableInteractions(finalBlocks));

  function addTile(type: ObjectiveBlock["type"]) {
    setDeckBlocks((previous) => [
      ...previous,
      createTileBlock(type, previous.length + 1, content, title),
    ]);
  }

  function updateTile(id: string, patch: Partial<ObjectiveBlock>) {
    setDeckBlocks((previous) =>
      previous.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  }

  function deleteTile(id: string) {
    setDeckBlocks((previous) => previous.filter((block) => block.id !== id));
  }

  function duplicateTile(block: ObjectiveBlock) {
    setDeckBlocks((previous) => [
      ...previous,
      { ...block, id: `${block.type}-${Date.now()}-${previous.length + 1}`, title: `${block.title} Copy` },
    ]);
  }

  function moveTile(targetId: string) {
    if (!draggedTileId || draggedTileId === targetId) return;
    setDeckBlocks((previous) => {
      const draggedIndex = previous.findIndex((block) => block.id === draggedTileId);
      const targetIndex = previous.findIndex((block) => block.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0) return previous;
      const next = [...previous];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraggedTileId("");
  }

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setContent(await file.text());
  }

  async function generateWithAi(mode: "starter" | "improve") {
    setAiBusy(true);
    setAiError("");

    try {
      const activityCounts = deckBlocks.reduce((counts, block) => {
        if (isInteractiveBlockType(block.type)) counts[block.type] = (counts[block.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      const slideCounts = deckBlocks.reduce((counts, block) => {
        if (!isInteractiveBlockType(block.type)) counts[block.type] = (counts[block.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      const response = await fetch("/api/masterypath/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "blocks",
          mode,
          title,
          course,
          sourceMode: "paste",
          content,
          desiredBlockCount: mode === "starter" ? 10 : deckBlocks.length,
          activityCounts: mode === "starter" ? undefined : activityCounts,
          slideCounts: mode === "starter" ? undefined : slideCounts,
          seedBlocks: mode === "starter" ? undefined : deckBlocks,
          deckStyle,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate deck.");
      }

      const nextBlocks = normalizeAiBlocks(payload.blocks);
      if (!nextBlocks.length) throw new Error("AI did not return deck tiles.");
      setDeckBlocks(nextBlocks);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to generate deck.");
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
      const packageId = `${slugify(packageTitle)}-${Date.now().toString(36)}`;
      const zip = createZip({
        "imsmanifest.xml": buildManifest(packageTitle, packageId),
        "index.html": buildScormHtml({
          title: packageTitle,
          course: course.trim() || "Course",
          blocks: finalBlocks.map((block) => ({
            ...block,
            videoUrl: normalizeVideoUrl(block.videoUrl),
          })),
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

  function updateChoiceText(block: ObjectiveBlock, value: string) {
    updateTile(block.id, {
      choices: value
        .split("\n")
        .map((line, index) => {
          const [text = "", correct = "", feedback = ""] = line.split("|");
          return {
            id: `choice-${index + 1}`,
            text: text.trim(),
            isCorrect: correct.trim().toLowerCase() === "correct",
            feedback: feedback.trim() || (correct.trim().toLowerCase() === "correct" ? "Correct." : "Review and try again."),
          };
        })
        .filter((choice) => choice.text),
    });
  }

  function updateItemsText(block: ObjectiveBlock, value: string) {
    const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (block.type === "sequencing") {
      updateTile(block.id, {
        activityItems: lines.map((text, index) => ({
          id: `step-${index + 1}`,
          text,
          order: index + 1,
        })),
      });
      return;
    }

    const targets = block.activityTargets?.length
      ? block.activityTargets
      : [
          { id: "target-1", label: "Target one", accepts: [] },
          { id: "target-2", label: "Target two", accepts: [] },
        ];
    updateTile(block.id, {
      activityTargets: targets,
      activityItems: lines.map((line, index) => {
        const [text = "", target = "target-1"] = line.split("|");
        return {
          id: `item-${index + 1}`,
          text: text.trim(),
          targetId: target.trim() || targets[0]?.id || "target-1",
        };
      }),
    });
  }

  function updateTargetsText(block: ObjectiveBlock, value: string) {
    updateTile(block.id, {
      activityTargets: value
        .split("\n")
        .map((line, index) => {
          const [id = `target-${index + 1}`, label = id] = line.split("|");
          return {
            id: id.trim() || `target-${index + 1}`,
            label: label.trim() || id.trim() || `Target ${index + 1}`,
            accepts: [],
          };
        })
        .filter((target) => target.label),
    });
  }

  function renderTileSettings(block: ObjectiveBlock) {
    return (
      <div className="tile-settings">
        <div className="grid compact">
          <div className="field">
            <label>Title</label>
            <input value={block.title} onChange={(event) => updateTile(block.id, { title: event.target.value })} />
          </div>
          <div className="field">
            <label>Layout</label>
            <select
              value={block.layoutStyle || "spotlight"}
              onChange={(event) => updateTile(block.id, { layoutStyle: event.target.value as ObjectiveBlock["layoutStyle"] })}
            >
              <option value="spotlight">Spotlight</option>
              <option value="split">Split</option>
              <option value="bullet-focus">Bullet focus</option>
              <option value="media-left">Media left</option>
              <option value="stat-grid">Stat grid</option>
              <option value="callout">Callout</option>
              <option value="process">Process</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Summary</label>
          <input value={block.summary} onChange={(event) => updateTile(block.id, { summary: event.target.value })} />
        </div>

        <div className="field">
          <label>{isInteractiveBlockType(block.type) ? "Prompt" : "Body"}</label>
          <textarea className="small-textarea" value={block.body} onChange={(event) => updateTile(block.id, { body: event.target.value })} />
        </div>

        {(block.type === "bullet-slide" || block.type === "review" || block.type === "content-slide") && (
          <div className="field">
            <label>Bullets, one per line</label>
            <textarea
              className="small-textarea"
              value={(block.bullets || []).join("\n")}
              onChange={(event) =>
                updateTile(block.id, {
                  bullets: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                })
              }
            />
          </div>
        )}

        {block.type === "content-slide" && (
          <div className="grid compact">
            <div className="field">
              <label>Callout label</label>
              <input
                value={block.callout?.label || ""}
                onChange={(event) =>
                  updateTile(block.id, {
                    callout: { label: event.target.value, text: block.callout?.text || "" },
                  })
                }
              />
            </div>
            <div className="field">
              <label>Callout text</label>
              <input
                value={block.callout?.text || ""}
                onChange={(event) =>
                  updateTile(block.id, {
                    callout: { label: block.callout?.label || "Key idea", text: event.target.value },
                  })
                }
              />
            </div>
          </div>
        )}

        {(block.type === "image-slide" || block.type === "video-slide") && (
          <div className="grid compact">
            <div className="field">
              <label>{block.type === "video-slide" ? "Video link" : "Image link"}</label>
              <input
                value={block.type === "video-slide" ? block.videoUrl || "" : block.imageUrl || ""}
                onChange={(event) =>
                  updateTile(block.id, block.type === "video-slide" ? { videoUrl: event.target.value } : { imageUrl: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Caption</label>
              <input value={block.caption || ""} onChange={(event) => updateTile(block.id, { caption: event.target.value })} />
            </div>
          </div>
        )}

        {hasChoices(block) && (
          <div className="field">
            <label>Choices: text | correct | feedback</label>
            <textarea
              className="small-textarea"
              value={(block.choices || []).map((choice) => `${choice.text}|${choice.isCorrect ? "correct" : ""}|${choice.feedback || ""}`).join("\n")}
              onChange={(event) => updateChoiceText(block, event.target.value)}
            />
          </div>
        )}

        {hasActivityItems(block) && (
          <>
            {block.type !== "sequencing" && (
              <div className="field">
                <label>Targets: id | label</label>
                <textarea
                  className="small-textarea"
                  value={(block.activityTargets || []).map((target) => `${target.id}|${target.label}`).join("\n")}
                  onChange={(event) => updateTargetsText(block, event.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>{block.type === "sequencing" ? "Steps, one per line" : "Items: text | target id"}</label>
              <textarea
                className="small-textarea"
                value={(block.activityItems || [])
                  .map((item) => (block.type === "sequencing" ? item.text : `${item.text}|${item.targetId || ""}`))
                  .join("\n")}
                onChange={(event) => updateItemsText(block, event.target.value)}
              />
            </div>
          </>
        )}

        {block.type === "reflection" && (
          <div className="field">
            <label>Placeholder</label>
            <input value={block.placeholder || ""} onChange={(event) => updateTile(block.id, { placeholder: event.target.value })} />
          </div>
        )}

        <label className="inline-check">
          <input
            checked={Boolean(block.showWhenPreviousIncorrect)}
            onChange={(event) => updateTile(block.id, { showWhenPreviousIncorrect: event.target.checked })}
            type="checkbox"
          />
          Show only after previous activity is missed
        </label>
      </div>
    );
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
        input, textarea, select {
          width: 100%;
          border: 1px solid #E2DCF0;
          border-radius: 8px;
          padding: 11px 12px;
          font: inherit;
          color: #1A1528;
          background: #fff;
        }
        textarea { min-height: 260px; resize: vertical; }
        .small-textarea { min-height: 84px; }
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
        .tile-palette {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tile-palette .btn { min-height: 34px; }
        .deck-timeline {
          display: grid;
          gap: 12px;
        }
        .deck-tile {
          border: 1px solid #E2DCF0;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
        }
        .deck-tile.dragging { opacity: .6; }
        .tile-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          background: #F8F6FD;
          border-bottom: 1px solid #E8E2F5;
        }
        .tile-handle {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #E2DCF0;
          display: grid;
          place-items: center;
          color: #7068A0;
          background: #fff;
          cursor: grab;
        }
        .tile-title { min-width: 0; }
        .tile-title strong {
          display: block;
          color: #1A1528;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tile-title span { color: #7068A0; font-size: 12px; }
        .tile-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .tile-settings {
          padding: 14px;
          display: grid;
          gap: 12px;
        }
        .grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .inline-check {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #4D456C;
          font-size: 12px;
          font-weight: 700;
        }
        .inline-check input { width: auto; }
        .help-modal {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(26,21,40,.38);
          display: grid;
          place-items: center;
          padding: 18px;
        }
        .help-panel {
          width: min(560px, 100%);
          background: #fff;
          border-radius: 10px;
          border: 1px solid #E2DCF0;
          box-shadow: 0 24px 70px rgba(26,21,40,.22);
          overflow: hidden;
        }
        .help-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 1px solid #E8E2F5;
          background: #F8F6FD;
        }
        .help-head strong { color: #1A1528; }
        .help-body {
          padding: 18px;
          display: grid;
          gap: 14px;
        }
        .help-body h4 {
          margin: 0 0 6px;
          font-size: 12px;
          color: #4D456C;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .help-body p, .help-body li {
          color: #5A5278;
          font-size: 13px;
          line-height: 1.55;
        }
        .help-body ul { margin: 0; padding-left: 18px; }
        .help-example {
          border-radius: 8px;
          background: #F4F1FB;
          border: 1px solid #E2DCF0;
          padding: 10px;
          color: #3D29B8;
          font-size: 12px;
          line-height: 1.5;
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
          .steps, .grid, .grid.compact, .toggle-row { grid-template-columns: 1fr; }
          .tile-head { grid-template-columns: auto minmax(0, 1fr); }
          .tile-actions { grid-column: 1 / -1; justify-content: flex-start; }
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
              ["2", "Deck", "Add and arrange tiles"],
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
                    ? "Build Deck"
                    : "Export SCORM Package"}
              </h2>
              <p>
                {step === 1
                  ? "The teacher writes the title and provides the material."
                  : step === 2
                    ? "Add tiles, edit their settings, and drag them into the exact slide order."
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
                    <strong>AI deck builder</strong>
                    <p>
                      Get a full suggested starting deck, or improve the tiles you already arranged.
                    </p>
                    <div className="toolbar">
                      <button
                        className="btn primary"
                        disabled={aiBusy || !title.trim() || !content.trim()}
                        onClick={() => generateWithAi("starter")}
                        type="button"
                      >
                        {aiBusy ? "Building deck..." : "Recommend Starter Deck"}
                      </button>
                      <button
                        className="btn"
                        disabled={aiBusy || !title.trim() || !content.trim() || !deckBlocks.length}
                        onClick={() => generateWithAi("improve")}
                        type="button"
                      >
                        Improve Current Deck
                      </button>
                    </div>
                    {aiError ? <div className="save-error">{aiError}</div> : null}
                  </div>

                  <div className="section-label">Add tiles</div>
                  <div className="tile-palette">
                    {tileTypes.map((tile) => (
                      <button className="btn" key={tile.type} onClick={() => addTile(tile.type)} type="button">
                        + {tile.title}
                      </button>
                    ))}
                  </div>

                  <div className="section-label">Deck timeline</div>
                  <div className="deck-timeline">
                    {deckBlocks.map((block, index) => (
                      <article
                        className={`deck-tile ${draggedTileId === block.id ? "dragging" : ""}`}
                        draggable
                        key={block.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggedTileId(block.id)}
                        onDrop={() => moveTile(block.id)}
                      >
                        <div className="tile-head">
                          <div className="tile-handle" aria-hidden="true">::</div>
                          <div className="tile-title">
                            <strong>{index + 1}. {block.title || "Untitled tile"}</strong>
                            <span>{tileTypes.find((tile) => tile.type === block.type)?.title || block.type}</span>
                          </div>
                          <div className="tile-actions">
                            <button className="btn" onClick={() => duplicateTile(block)} type="button">Duplicate</button>
                            <button className="btn" onClick={() => setHelpTileType(block.type)} type="button">?</button>
                            <button className="btn" disabled={deckBlocks.length <= 1} onClick={() => deleteTile(block.id)} type="button">Delete</button>
                          </div>
                        </div>
                        {renderTileSettings(block)}
                      </article>
                    ))}
                  </div>

                  <div className="card">
                    <strong>Deck preview</strong>
                    <p>
                      {finalBlocks.length} tiles will export in this exact order.
                    </p>
                    <div className="chips">
                      {finalBlocks.map((block) => (
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
                      {finalBlocks.map((block, index) => (
                        <span className="chip" key={block.id}>
                          {index + 1}. {tileTypes.find((tile) => tile.type === block.type)?.title || block.type}
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

      {helpTileType ? (
        <div className="help-modal" onClick={() => setHelpTileType(null)}>
          <div className="help-panel" onClick={(event) => event.stopPropagation()}>
            <div className="help-head">
              <strong>{tileTypes.find((tile) => tile.type === helpTileType)?.title || helpTileType}</strong>
              <button className="btn" onClick={() => setHelpTileType(null)} type="button">Close</button>
            </div>
            <div className="help-body">
              {(() => {
                const help = getTileHelp(helpTileType);
                return (
                  <>
                    <section>
                      <h4>Purpose</h4>
                      <p>{help.purpose}</p>
                    </section>
                    <section>
                      <h4>Fields</h4>
                      <ul>
                        {help.fields.map((field) => <li key={field}>{field}</li>)}
                      </ul>
                    </section>
                    <section>
                      <h4>Scoring</h4>
                      <p>{help.scoring}</p>
                    </section>
                    <section>
                      <h4>Example</h4>
                      <div className="help-example">{help.example}</div>
                    </section>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
