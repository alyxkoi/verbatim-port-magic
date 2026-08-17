// Corrections (spec 8). The delta between what Blip drafted and what Alyx sent
// is the training signal. Detection is deterministic and only ever PROPOSES a
// category; Alyx confirms. One correction can promote to many areas.

export type CorrectionSignal = { area: string; why: string };

const PRICE = /\$\s?\d|\d+\s?(a month|\/mo|per month|dollars)/i;
const ASKS = /\?|\bwhat\b|\bhow\b|\bwhich\b|\bdo you\b/i;

export function correctionSignals(
  draft: string,
  actual: string,
  bannedWords: string[],
): CorrectionSignal[] {
  const signals: CorrectionSignal[] = [];
  const lower = draft.toLowerCase();

  const hits = bannedWords.filter((word) => word && lower.includes(word.toLowerCase()));
  if (hits.length) {
    signals.push({
      area: "behavior",
      why: `used ${hits.slice(0, 2).map((word) => `"${word}"`).join(" and ")}`,
    });
  }
  if (PRICE.test(draft)) {
    signals.push({ area: "knowledge", why: "named a price, which Blip may never do" });
  }
  if (!ASKS.test(draft) && ASKS.test(actual)) {
    signals.push({ area: "logic", why: "stopped instead of asking the next thing" });
  }
  if (!signals.length) {
    signals.push({ area: "example", why: "nothing broke a rule, yours was just better" });
  }
  return signals;
}

export const AREA_LABELS: Record<string, string> = {
  behavior: "Behavior",
  logic: "Logic",
  knowledge: "Knowledge",
  example: "Example",
  none: "One off",
};
