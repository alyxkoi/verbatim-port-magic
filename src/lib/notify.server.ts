// Transactional email only (Resend). A failed email never blocks the work
// that triggered it.

const OPERATOR_EMAIL = process.env["OPERATOR_EMAIL"] ?? "alyx@alyxlab.com";

export async function sendOperatorEmail(subject: string, text: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "ALYXLAB <hello@alyxlab.com>",
        to: [OPERATOR_EMAIL],
        subject,
        text,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
