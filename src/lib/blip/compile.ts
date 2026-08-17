// The prompt compiler (spec 6.1).
//
// Anything the validation gate enforces is compiled from the field the gate
// reads. Anything the gate does not check is authored prose in a named slot.
// Order is fixed: identity, compiled constraints, knowledge, examples, task.

import type { BlipConfig } from "@/lib/blip/config";
import { CAPABILITY_TAGS, TAG_ENUM } from "@/lib/blip/config";

/** Authored prose. Named slots, never generated, never gate-enforced. */
export const PROSE_SLOTS = {
  identity: [
    "You are texting on behalf of Alyx, who owns Alyxlab in Dallas.",
    "You are not a persona. You do not mention being an AI unless asked directly.",
  ].join("\n"),
  antiPatterns: [
    "INSTEAD OF -> WRITE",
    '"Great, thanks for sharing! So you have 8 employees across 2 locations. That makes sense. Now, what booking solution are you currently leveraging?" -> "got it. what are you using now for booking, and do you take a deposit up front or charge after"',
    '"I completely understand your frustration with missed calls. Let me help you streamline that process." -> "how many of those calls come in after you close"',
    '"Absolutely! We\'d love to help. Our solutions start around..." -> "i can give you an exact number once i finish these questions. depends on how many people you have and what you need it to do, so anything i said right now would be a guess"',
    '"Perfect! Just a few more questions to better understand your needs." -> "two more and i am done"',
    "The pattern in every bad example is the same: acknowledge, restate, transition, ask. Real people just ask.",
  ].join("\n"),
  replyTask:
    "TASK\nwrite the single next text message. return JSON only, no prose around it:\n" +
    '{"reply_text": string, "asks_pillars": string[], "needs_human": boolean, "needs_human_reason": string | null, "mirrored_terms": string[]}',
  extractTask:
    "TASK\nread the transcript and return every fact you can defend. JSON only:\n" +
    '{"extractions": [{"field": string, "value": string | number | boolean, "source_message_id": string, "confidence": number, "conflicts_with_existing": boolean}]}\n' +
    "never infer. if it was not said, do not return it.",
  tagTask:
    "TASK\nlabel the struggles this lead described. JSON only:\n" +
    '{"tags": string[], "evidence": {"<tag>": "<message id>"}}\n' +
    'use only the allowed tags. when you cannot tag confidently return ["unclear"]. you never price anything.',
  planTask:
    "TASK\nwrite the plan prose. the numbers are already decided and immutable: never restate, recalculate, or mention any price, and never write a currency token. JSON only:\n" +
    '{"headline": string, "situation": string, "problems": [{"title": string, "body": string}], "closing": string}',
};

/** Everything the gate reads, derived from config so the two cannot drift. */
export type GateSpec = {
  maxSentences: number;
  bannedWords: string[];
  blockEmDash: boolean;
  blockEmoji: boolean;
  blockExclamation: boolean;
  blockSemicolon: true;
  blockEllipsis: true;
  blockPrice: true;
  blockDoubleOutbound: true;
  knowledgePack: string[];
  scopeOut: string[];
};

export function gateSpecFor(config: BlipConfig): GateSpec {
  return {
    maxSentences: config.behavior.maxSentences,
    bannedWords: [...config.behavior.bannedWords],
    blockEmDash: config.behavior.noEmDash,
    blockEmoji: config.behavior.noEmoji,
    blockExclamation: config.behavior.noExclamation,
    blockSemicolon: true,
    blockEllipsis: true,
    blockPrice: true,
    blockDoubleOutbound: true,
    knowledgePack: config.knowledge.approved.map((entry) => entry.a),
    scopeOut: [...config.knowledge.scopeOut],
  };
}

function punctuationLine(config: BlipConfig) {
  return ["commas and periods"]
    .concat(config.behavior.noEmDash ? ["no em dashes"] : [])
    .concat(config.behavior.noEmoji ? ["no emoji"] : [])
    .concat(config.behavior.noExclamation ? ["no exclamation points"] : [])
    .concat(["no semicolons", "no ellipses"])
    .join(", ");
}

/** Compiled voice block. Every line here maps to a field the gate reads. */
function voiceBlock(config: BlipConfig) {
  const b = config.behavior;
  return [
    "HOW YOU WRITE",
    `one to ${b.maxSentences} sentence${b.maxSentences === 1 ? "" : "s"}, never more.`,
    b.lowercaseOpenings
      ? "lowercase sentence starts are fine."
      : "start sentences with a capital letter.",
    "contractions always.",
    b.mirroring ? "use their words. if they said chairs, say chairs, not stations." : "",
    "ask, do not narrate. never restate their answer before your next question.",
    `${punctuationLine(config)}.`,
    "write compounds plainly: walk ins, follow up, month to month.",
    "",
    "NEVER USE THESE WORDS",
    `${b.bannedWords.join(", ")}.`,
    "",
    "YOU MAY NEVER",
    "give a price, a range, a starting price, or a discount.",
    "approve or send a plan.",
    "promise a capability that is not in KNOWN SCOPE.",
    config.logic.stopOnCallRequest
      ? "keep asking questions after they ask for a call."
      : "",
    "send twice in a row without a reply.",
    "text a number that opted out.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function knowledgeBlock(config: BlipConfig) {
  const k = config.knowledge;
  return [
    "WILL NOT DO",
    `${k.scopeOut.map((item) => item.toLowerCase()).join(", ")}.`,
    "",
    "APPROVED ANSWERS",
    k.approved
      .filter((entry) => entry.q.trim())
      .map((entry) => `${entry.q} -> ${entry.a}`)
      .join("\n"),
  ].join("\n");
}

function followUpBlock(config: BlipConfig) {
  const l = config.logic;
  return [
    "FOLLOW UP",
    `nudge a quiet lead at most ${l.stallNudges} time${l.stallNudges === 1 ? "" : "s"}, then stop.`,
    l.escalateUnknown
      ? "if you cannot answer, send a holding line and flag it for alyx. never guess."
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export type CompiledPrompts = {
  reply: string;
  extract: string;
  tag: string;
  plan: string;
};

/**
 * Deterministic: the same config always compiles to the same bytes, which is
 * what makes storing them on a release meaningful.
 */
export function compileBlipPrompts(config: BlipConfig): CompiledPrompts {
  const reply = [
    PROSE_SLOTS.identity,
    "",
    voiceBlock(config),
    "",
    knowledgeBlock(config),
    "",
    followUpBlock(config),
    "",
    PROSE_SLOTS.antiPatterns,
    "",
    PROSE_SLOTS.replyTask,
  ].join("\n");

  const extract = [
    "You read one text conversation and pull out facts. You never write to the lead.",
    "",
    "RULES",
    "temperature zero behaviour: quote what was said, never guess.",
    "value types are enforced by code after you answer, so return the plain value.",
    "if a value contradicts what is already known, set conflicts_with_existing true.",
    "",
    PROSE_SLOTS.extractTask,
  ].join("\n");

  const tag = [
    "You label which operational struggles a lead described. Your output influences price, so it is an enum, never prose.",
    "",
    "ALLOWED TAGS",
    TAG_ENUM.filter(
      (item) => item === "unclear" || item === "after_hours" || config.logic.tagsEnabled[item],
    ).join(", "),
    "",
    "TIER FLOORS ARE NOT YOURS",
    `tags map to tier floors in a locked table (${CAPABILITY_TAGS.map(([t, floor]) => `${t}=${floor}`).join(", ")}). you never state or imply a price.`,
    "",
    PROSE_SLOTS.tagTask,
  ].join("\n");

  const plan = [
    PROSE_SLOTS.identity,
    "",
    voiceBlock(config),
    "",
    knowledgeBlock(config),
    "",
    PROSE_SLOTS.planTask,
  ].join("\n");

  return { reply, extract, tag, plan };
}

/**
 * Compile-time validation (spec 6.1): a banned word inside an approved answer
 * or an example is a contradiction and blocks promotion.
 */
export function compileTimeErrors(config: BlipConfig): string[] {
  const errors: string[] = [];
  const banned = config.behavior.bannedWords.map((word) => word.toLowerCase());
  for (const entry of config.knowledge.approved) {
    const text = `${entry.q} ${entry.a}`.toLowerCase();
    const hit = banned.find((word) => word && text.includes(word));
    if (hit) {
      errors.push(`Approved answer "${entry.q || entry.id}" contains the banned word "${hit}".`);
    }
  }
  if (config.behavior.maxSentences < 1) errors.push("The sentence ceiling must be at least 1.");
  if (config.logic.stallNudges < 0) errors.push("Stall nudges cannot be negative.");
  if (!config.knowledge.approved.some((entry) => entry.q.trim() && entry.a.trim())) {
    errors.push("At least one approved answer is required.");
  }
  return errors;
}
