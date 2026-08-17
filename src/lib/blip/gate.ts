// The validation gate (spec section 4 / reference 4.2).
//
// Deterministic code between generation and queue. A prompt asks; a gate
// enforces. Price leakage and double outbound are hard fails that hold. Every
// other violation retries once with the violation named, then holds.

import type { GateSpec } from "@/lib/blip/compile";
import { isMissingPillar, type PillarSpec, type PillarValue } from "@/lib/lead-status";

export type Violation = {
  check: string;
  hard: boolean;
  message: string;
};

export type GateInput = {
  text: string;
  spec: GateSpec;
  /** Ordered history, oldest first. */
  transcript: Array<{ direction: string; body: string }>;
  pillarSpecs: PillarSpec[];
  pillars: Record<string, PillarValue>;
  callRequested: boolean;
  optedOut: boolean;
};

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const PRICE =
  /(\$)|(\b\d[\d,.]*\s*(?:\/\s*mo\b|per month\b|a month\b|monthly\b|dollars?\b|bucks\b))|(\bsetup\b[^.?!]{0,20}\b\d)|(\b\d[\d,.]*\s*(?:setup|deposit fee)\b)/i;
const CLAIM = /\b(we can|we could|we'll|we will|i can set|we set up|we do|we handle|we build|it can|that can)\b/i;
const QUESTION = /\?|\b(what|how|which|who|when|do you|are you|have you)\b/i;

export function sentenceCount(text: string) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function openingWords(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3).join(" ");
}

function trigrams(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let index = 0; index + 3 <= normalized.length; index += 1) {
    set.add(normalized.slice(index, index + 3));
  }
  return set;
}

/** Dice coefficient over character trigrams. 1 is identical. */
export function similarity(a: string, b: string) {
  const left = trigrams(a);
  const right = trigrams(b);
  if (!left.size || !right.size) return a.trim() === b.trim() ? 1 : 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

/** Words worth matching for "are you asking about a pillar we already know". */
function pillarKeywords(spec: PillarSpec) {
  const source = `${spec.label} ${spec.asks ?? ""} ${spec.key.replace(/_/g, " ")}`.toLowerCase();
  return Array.from(
    new Set(
      source
        .split(/[^a-z]+/)
        .filter((word) => word.length > 3 && !["your", "many", "does", "what", "with", "have", "type"].includes(word)),
    ),
  );
}

export function runGate(input: GateInput): Violation[] {
  const { text, spec } = input;
  const violations: Violation[] = [];
  const lower = text.toLowerCase();

  if (input.optedOut) {
    violations.push({
      check: "opted_out",
      hard: true,
      message: "This number opted out. Nothing may be sent to it.",
    });
  }

  // Banned vocabulary.
  const bannedHits = spec.bannedWords.filter((word) => word && lower.includes(word.toLowerCase()));
  if (bannedHits.length) {
    violations.push({
      check: "banned_vocabulary",
      hard: false,
      message: `used banned wording: ${bannedHits.slice(0, 4).join(", ")}`,
    });
  }

  // Punctuation.
  const punctuation: string[] = [];
  if (spec.blockEmDash && /[—–]/.test(text)) punctuation.push("em dash");
  if (spec.blockSemicolon && text.includes(";")) punctuation.push("semicolon");
  if (spec.blockExclamation && text.includes("!")) punctuation.push("exclamation point");
  if (spec.blockEllipsis && (text.includes("...") || text.includes("\u2026"))) punctuation.push("ellipsis");
  if (spec.blockEmoji && EMOJI.test(text)) punctuation.push("emoji");
  if (punctuation.length) {
    violations.push({
      check: "punctuation",
      hard: false,
      message: `used ${punctuation.join(", ")}`,
    });
  }

  // Length.
  const sentences = sentenceCount(text);
  if (sentences > spec.maxSentences) {
    violations.push({
      check: "length",
      hard: false,
      message: `${sentences} sentences, the ceiling is ${spec.maxSentences}`,
    });
  }

  // Price leakage. Hard fail, hold.
  if (spec.blockPrice && PRICE.test(text)) {
    violations.push({
      check: "price_leakage",
      hard: true,
      message: "named a price, a rate, or a setup figure",
    });
  }

  // Known-field ask.
  if (QUESTION.test(text)) {
    for (const pillarSpec of input.pillarSpecs) {
      if (isMissingPillar(input.pillars[pillarSpec.key])) continue;
      const keywords = pillarKeywords(pillarSpec);
      const hits = keywords.filter((word) => lower.includes(word));
      if (hits.length >= 2) {
        violations.push({
          check: "known_field_ask",
          hard: false,
          message: `asked about ${pillarSpec.label}, which is already known`,
        });
        break;
      }
    }
  }

  // Repetition.
  const outbound = input.transcript.filter((message) => message.direction === "outbound");
  const lastOutbound = outbound.at(-1);
  if (lastOutbound && similarity(text, lastOutbound.body) >= 0.8) {
    violations.push({
      check: "repetition",
      hard: false,
      message: "almost identical to the last message sent",
    });
  } else if (
    outbound.slice(-2).some((message) => openingWords(message.body) === openingWords(text))
  ) {
    violations.push({
      check: "repetition",
      hard: false,
      message: "opens with the same three words as a recent message",
    });
  }

  // Double outbound. Hard block.
  const last = input.transcript.at(-1);
  if (spec.blockDoubleOutbound && last && last.direction === "outbound") {
    violations.push({
      check: "double_outbound",
      hard: true,
      message: "the last message was already outbound with no reply since",
    });
  }

  // Stop asking once a call is requested.
  if (input.callRequested && QUESTION.test(text)) {
    violations.push({
      check: "asks_after_call_request",
      hard: false,
      message: "kept asking after a call was requested",
    });
  }

  // Promise detection: a capability claim with nothing in the knowledge pack
  // behind it, or a claim about something explicitly out of scope.
  if (CLAIM.test(text)) {
    const scopeHit = spec.scopeOut.find((item) => {
      const words = item.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 4);
      return words.length > 0 && words.every((word) => lower.includes(word));
    });
    if (scopeHit) {
      violations.push({
        check: "promise_detection",
        hard: false,
        message: `promised "${scopeHit}", which is out of scope`,
      });
    }
  }

  return violations;
}

export function violationSummary(violations: Violation[]) {
  return violations.map((violation) => `${violation.check}: ${violation.message}`).join("; ");
}

export function hasHardFail(violations: Violation[]) {
  return violations.some((violation) => violation.hard);
}
