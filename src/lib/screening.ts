// Deterministic screening — reference section 3.4. No scoring model.
//
//   Hard hold, immediately: honeypot filled, confirmed VoIP, unparseable text
//   Two soft flags: hold
//   One soft flag: log and continue
//   Out of area alone: never junks a lead

export type ScreeningInput = {
  honeypot?: string | null;
  message?: string | null;
  phone?: string | null;
  /** Milliseconds between form render and submit, when the form reports it. */
  fillMs?: number | null;
  /** Set by the caller after a phone/email match against existing leads. */
  duplicate?: boolean;
  /** Set by the caller from the area code lookup. */
  outOfArea?: boolean;
  /** Set by the caller when the carrier lookup confirms VoIP. */
  confirmedVoip?: boolean;
};

export type ScreeningResult = {
  /** clean | soft_flag | held | junk */
  state: "clean" | "soft_flag" | "held" | "junk";
  hardFlags: string[];
  softFlags: string[];
  flags: string[];
};

/** Texas area codes Alyx Lab sells into. */
const LOCAL_AREA_CODES = new Set([
  "214", "469", "972", "945", "817", "682", "430", "903", "512", "737",
  "713", "281", "832", "346", "210", "726", "254", "325", "361", "409",
  "432", "806", "830", "915", "936", "940", "956", "979",
]);

const VOWELS = /[aeiouy]/i;

/** Unparseable text: no letters, no vowels, or a single mashed token. */
function isUnparseable(message: string) {
  const text = message.trim();
  if (!text) return false;
  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length < 3) return true;
  if (!VOWELS.test(letters)) return true;
  const words = text.split(/\s+/).filter((word) => /[a-z]/i.test(word));
  if (words.length <= 1 && letters.length > 12) return true;
  const consonantRun = /[bcdfghjklmnpqrstvwxz]{7,}/i.test(letters);
  return consonantRun;
}

export function areaCodeOf(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length >= 10 ? national.slice(0, 3) : "";
}

export function isOutOfArea(phone: string | null | undefined) {
  const area = areaCodeOf(phone);
  if (!area) return false;
  return !LOCAL_AREA_CODES.has(area);
}

export function screenLead(input: ScreeningInput): ScreeningResult {
  const hardFlags: string[] = [];
  const softFlags: string[] = [];

  if (input.honeypot && String(input.honeypot).trim()) {
    hardFlags.push("Honeypot field tripped");
  }
  if (input.confirmedVoip) hardFlags.push("VoIP number");
  if (input.message && isUnparseable(input.message)) hardFlags.push("Garbage text");

  if (typeof input.fillMs === "number" && input.fillMs > 0 && input.fillMs < 3000) {
    softFlags.push(`Form completed in ${(input.fillMs / 1000).toFixed(1)} seconds`);
  }
  if (input.duplicate) softFlags.push("Duplicate submission");
  if (input.outOfArea) softFlags.push("Outside Texas");

  const flags = [...hardFlags, ...softFlags];

  // Honeypot is the only signal that files a lead straight to junk. Everything
  // else at worst holds the lead for a human decision.
  if (hardFlags.includes("Honeypot field tripped")) {
    return { state: "junk", hardFlags, softFlags, flags };
  }
  if (hardFlags.length) return { state: "held", hardFlags, softFlags, flags };

  // Out of area alone never holds a lead, let alone junks it.
  const holdingSoftFlags = softFlags.filter((flag) => flag !== "Outside Texas");
  if (softFlags.length >= 2 && holdingSoftFlags.length >= 1) {
    return { state: "held", hardFlags, softFlags, flags };
  }
  if (softFlags.length) return { state: "soft_flag", hardFlags, softFlags, flags };
  return { state: "clean", hardFlags, softFlags, flags };
}
