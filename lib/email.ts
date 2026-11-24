import nodemailer from "nodemailer";

// Sends transactional email (login codes).
//
// - Gmail: set GMAIL_USER and GMAIL_APP_PASSWORD (an app password from
//   https://myaccount.google.com/apppasswords, not the account password).
// - Resend (optional, needs a verified domain): set RESEND_API_KEY and
//   EMAIL_FROM. Used only when Gmail isn't configured.
// - Neither, outside production: the message is printed to the server
//   console, so local dev works with no email account.

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, RESEND_API_KEY } = process.env;

  if (GMAIL_USER && GMAIL_APP_PASSWORD) return sendWithGmail(email);
  if (RESEND_API_KEY) return sendWithResend(email, RESEND_API_KEY);

  if (process.env.NODE_ENV === "production") {
    console.error("No email sender configured (GMAIL_USER / RESEND_API_KEY).");
    return false;
  }
  console.log(
    `\n[email] to ${email.to}\n[email] ${email.subject}\n${email.text}\n`
  );
  return true;
}

async function sendWithGmail(email: Email): Promise<boolean> {
  const user = process.env.GMAIL_USER!;
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD! },
    // Fail fast so the sign-in form shows an error instead of hanging.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || `CPD · A Casa do Povo <${user}>`,
      ...email,
    });
    return true;
  } catch (err) {
    console.error("Gmail send failed:", err);
    return false;
  }
}

async function sendWithResend(email: Email, apiKey: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "CPD <onboarding@resend.dev>",
      ...email,
    }),
  });
  if (!res.ok) {
    console.error(`Resend error ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}
