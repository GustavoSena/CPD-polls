// Sends transactional email through Resend's HTTP API (no SDK needed).
// Without RESEND_API_KEY outside production, the message is printed to the
// server console instead, so local dev works with no email account.

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "CPD <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set; cannot send email.");
      return false;
    }
    console.log(
      `\n[email] to ${email.to}\n[email] ${email.subject}\n${email.text}\n`
    );
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...email }),
  });
  if (!res.ok) {
    console.error(`Resend error ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}
